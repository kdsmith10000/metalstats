/**
 * Parse COMEX warehouse stock XLS files and sync to data.json + Neon database.
 *
 * Usage: npx tsx scripts/parse-xls-stocks.ts
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";

// ── Paths ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DATA_JSON = path.join(ROOT, "public", "data.json");
const ENV_FILE = path.join(ROOT, ".env");

// ── Types ────────────────────────────────────────────────────────────────────

interface Depository {
  name: string;
  registered: number;
  eligible: number;
  total: number;
}

interface MetalEntry {
  metal: string;
  report_date: string;
  activity_date: string;
  depositories: Depository[];
  totals: { registered: number; eligible: number; total: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!fs.existsSync(ENV_FILE)) return vars;
  const lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    vars[key] = val;
  }
  return vars;
}

/** Convert M/DD/YYYY -> YYYY-MM-DD for database */
function toIsoDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return dateStr;
}

// ── XLS Parsing ──────────────────────────────────────────────────────────────

const TOTAL_TODAY_COL = 7; // column H in all CME reports

/**
 * Extract report_date and activity_date from the header rows.
 * They appear as "Report Date: M/DD/YYYY" in column 6 of the metal‐title row
 * and the next row respectively.
 */
function extractDates(
  rows: unknown[][],
  startRow: number = 0,
  endRow?: number
): { report_date: string; activity_date: string } {
  let report_date = "";
  let activity_date = "";
  const limit = endRow ?? Math.min(rows.length, startRow + 25);

  for (let i = startRow; i < limit; i++) {
    const row = rows[i];
    if (!row) continue;

    for (const cell of row) {
      const s = String(cell ?? "");
      const rm = s.match(/Report Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (rm) report_date = rm[1];
      const am = s.match(/Activity Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (am) activity_date = am[1];
    }
    if (report_date && activity_date) break;
  }

  return { report_date, activity_date };
}

/**
 * Check whether a first‐column value is a "category" label rather than a
 * depository name (e.g. "Registered", "Eligible", "Total", "Pledged").
 */
function isCategoryLabel(val: string): boolean {
  const trimmed = val.trim();
  return /^(Registered|Eligible|Total|Pledged)/i.test(trimmed);
}

/**
 * Check whether a first‐column value is a summary/totals row that should
 * be skipped entirely.
 */
function isSummaryRow(val: string): boolean {
  const upper = val.toUpperCase().trim();
  return (
    upper.startsWith("TOTAL REGISTERED") ||
    upper.startsWith("TOTAL ELIGIBLE") ||
    upper.startsWith("COMBINED TOTAL") ||
    upper.startsWith("TOTAL COPPER") ||
    upper.startsWith("TOTAL ALUMINUM") ||
    upper.startsWith("TOTAL ZINC") ||
    upper.startsWith("TOTAL SILVER") ||
    upper.startsWith("TOTAL GOLD") ||
    upper.startsWith("GRAND TOTAL") ||
    upper === "TOTAL"
  );
}

/**
 * Parse a single‐metal section of rows into a list of depositories + totals.
 * `rows` is the full sheet; we only inspect `startRow` to `endRow`.
 */
function parseSection(
  rows: unknown[][],
  startRow: number,
  endRow: number
): Depository[] {
  const depositories: Depository[] = [];
  let currentName: string | null = null;
  let currentReg = 0;
  let currentElig = 0;

  function flush() {
    if (currentName !== null && (currentReg !== 0 || currentElig !== 0)) {
      depositories.push({
        name: currentName,
        registered: currentReg,
        eligible: currentElig,
        total: currentReg + currentElig,
      });
    }
    currentName = null;
    currentReg = 0;
    currentElig = 0;
  }

  for (let i = startRow; i < endRow; i++) {
    const row = rows[i];
    if (!row) continue;

    const first = String(row[0] ?? "").trimEnd();
    if (!first || first === "NaN") continue;

    // Skip metal‐section headers, column headers, disclaimers
    const upper = first.toUpperCase().trim();
    if (
      upper === "DEPOSITORY" ||
      upper === "DELIVERY POINT" ||
      upper.startsWith("COMMODITY EXCHANGE") ||
      upper.startsWith("NEW YORK MERCANTILE") ||
      upper.startsWith("METAL ") ||
      upper.startsWith("THE INFORMATION") ||
      upper.startsWith("FOR QUESTIONS") ||
      upper.includes("REGISTRAR") ||
      /^(PLATINUM|PALLADIUM|GOLD|SILVER|COPPER|ALUMINUM|ZINC)/i.test(upper) ||
      /^(TROY OUNCE|SHORT TON|METRIC TON)/i.test(upper)
    ) {
      continue;
    }

    // Skip summary rows
    if (isSummaryRow(first)) continue;

    if (isCategoryLabel(first)) {
      // This is a Registered / Eligible / Total row → grab the TOTAL TODAY value
      const val = Number(row[TOTAL_TODAY_COL] ?? 0) || 0;
      const trimUpper = first.trim().toUpperCase();

      if (trimUpper.startsWith("REGISTERED")) {
        currentReg = val;
      } else if (trimUpper.startsWith("ELIGIBLE")) {
        currentElig = val;
      }
      // "Total" rows are ignored; we compute total = reg + elig
    } else {
      // New depository name
      flush();
      currentName = first.trim();
    }
  }
  flush();

  return depositories;
}

/**
 * Parse a single‐metal XLS file (Aluminum, Copper, Silver, Zinc).
 */
function parseSingleMetal(filePath: string, metalName: string): MetalEntry | null {
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] File not found: ${filePath}`);
    return null;
  }

  console.log(`\nParsing ${metalName} from ${path.basename(filePath)}...`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
  });

  const { report_date, activity_date } = extractDates(rows);
  console.log(`  Report Date : ${report_date}`);
  console.log(`  Activity Date: ${activity_date}`);

  const depositories = parseSection(rows, 0, rows.length);

  const totals = depositories.reduce(
    (acc, d) => ({
      registered: acc.registered + d.registered,
      eligible: acc.eligible + d.eligible,
      total: acc.total + d.total,
    }),
    { registered: 0, eligible: 0, total: 0 }
  );

  console.log(`  Depositories : ${depositories.length}`);
  console.log(
    `  Totals       : Reg=${totals.registered.toLocaleString()}, Elig=${totals.eligible.toLocaleString()}, Total=${totals.total.toLocaleString()}`
  );

  return { metal: metalName, report_date, activity_date, depositories, totals };
}

/**
 * Parse the combined Platinum / Palladium XLS file.
 * Returns [platinumEntry, palladiumEntry].
 */
function parsePlatinumPalladium(
  filePath: string
): [MetalEntry | null, MetalEntry | null] {
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] File not found: ${filePath}`);
    return [null, null];
  }

  console.log(`\nParsing Platinum & Palladium from ${path.basename(filePath)}...`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
  });

  // Find section boundaries by looking for "PLATINUM" and "PALLADIUM" in column 0
  let platinumRow = -1;
  let palladiumRow = -1;

  for (let i = 0; i < rows.length; i++) {
    const cell = String(rows[i]?.[0] ?? "").trim().toUpperCase();
    if (cell === "PLATINUM" && platinumRow === -1) {
      platinumRow = i;
    } else if (cell === "PALLADIUM" && palladiumRow === -1) {
      palladiumRow = i;
    }
  }

  console.log(`  Platinum section starts at row ${platinumRow}`);
  console.log(`  Palladium section starts at row ${palladiumRow}`);

  // Parse Platinum section
  let platinum: MetalEntry | null = null;
  if (platinumRow >= 0) {
    const endRow = palladiumRow >= 0 ? palladiumRow : rows.length;
    const dates = extractDates(rows, platinumRow, endRow);
    const deps = parseSection(rows, platinumRow, endRow);
    const totals = deps.reduce(
      (acc, d) => ({
        registered: acc.registered + d.registered,
        eligible: acc.eligible + d.eligible,
        total: acc.total + d.total,
      }),
      { registered: 0, eligible: 0, total: 0 }
    );
    platinum = {
      metal: "Platinum",
      report_date: dates.report_date,
      activity_date: dates.activity_date,
      depositories: deps,
      totals,
    };
    console.log(`  Platinum: ${deps.length} depositories, Reg=${totals.registered.toLocaleString()}, Elig=${totals.eligible.toLocaleString()}`);
  }

  // Parse Palladium section
  let palladium: MetalEntry | null = null;
  if (palladiumRow >= 0) {
    const dates = extractDates(rows, palladiumRow, rows.length);
    const deps = parseSection(rows, palladiumRow, rows.length);
    const totals = deps.reduce(
      (acc, d) => ({
        registered: acc.registered + d.registered,
        eligible: acc.eligible + d.eligible,
        total: acc.total + d.total,
      }),
      { registered: 0, eligible: 0, total: 0 }
    );
    palladium = {
      metal: "Palladium",
      report_date: dates.report_date,
      activity_date: dates.activity_date,
      depositories: deps,
      totals,
    };
    console.log(`  Palladium: ${deps.length} depositories, Reg=${totals.registered.toLocaleString()}, Elig=${totals.eligible.toLocaleString()}`);
  }

  return [platinum, palladium];
}

// ── Database Upload ──────────────────────────────────────────────────────────

async function uploadToDatabase(
  allData: Record<string, MetalEntry>,
  databaseUrl: string
) {
  console.log("\n" + "=".repeat(70));
  console.log("  Uploading to Neon Database");
  console.log("=".repeat(70));

  const sql = neon(databaseUrl);

  // Ensure tables exist
  await sql`
    CREATE TABLE IF NOT EXISTS metal_snapshots (
      id SERIAL PRIMARY KEY,
      metal VARCHAR(50) NOT NULL,
      report_date DATE NOT NULL,
      activity_date DATE,
      registered DECIMAL(20, 3) NOT NULL DEFAULT 0,
      eligible DECIMAL(20, 3) NOT NULL DEFAULT 0,
      total DECIMAL(20, 3) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metal, report_date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS depository_snapshots (
      id SERIAL PRIMARY KEY,
      metal_snapshot_id INTEGER REFERENCES metal_snapshots(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      registered DECIMAL(20, 3) NOT NULL DEFAULT 0,
      eligible DECIMAL(20, 3) NOT NULL DEFAULT 0,
      total DECIMAL(20, 3) NOT NULL DEFAULT 0
    )
  `;

  let successCount = 0;
  let failCount = 0;

  for (const [key, entry] of Object.entries(allData)) {
    const reportDate = toIsoDate(entry.report_date);
    const activityDate = entry.activity_date
      ? toIsoDate(entry.activity_date)
      : null;

    try {
      // Upsert metal snapshot
      const result = await sql`
        INSERT INTO metal_snapshots (metal, report_date, activity_date, registered, eligible, total)
        VALUES (${key}, ${reportDate}, ${activityDate}, ${entry.totals.registered}, ${entry.totals.eligible}, ${entry.totals.total})
        ON CONFLICT (metal, report_date)
        DO UPDATE SET
          activity_date = EXCLUDED.activity_date,
          registered = EXCLUDED.registered,
          eligible = EXCLUDED.eligible,
          total = EXCLUDED.total,
          created_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const snapshotId = result[0].id;

      // Delete old depositories for this snapshot, then insert fresh
      await sql`DELETE FROM depository_snapshots WHERE metal_snapshot_id = ${snapshotId}`;

      for (const dep of entry.depositories) {
        await sql`
          INSERT INTO depository_snapshots (metal_snapshot_id, name, registered, eligible, total)
          VALUES (${snapshotId}, ${dep.name}, ${dep.registered}, ${dep.eligible}, ${dep.total})
        `;
      }

      console.log(
        `  [OK] ${key}: report_date=${reportDate}, ${entry.depositories.length} depositories`
      );
      successCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [ERROR] ${key}: ${msg}`);
      failCount++;
    }
  }

  console.log(`\n  Database sync complete: ${successCount} OK, ${failCount} failed`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  COMEX Warehouse Stocks XLS Parser (TypeScript)");
  console.log("=".repeat(70));

  // ── 1. Parse each XLS file ────────────────────────────────────────────

  // Gold file may have a browser download suffix like "(1)"
  const goldFile = ["Gold_Stocks.xls", "Gold_Stocks (1).xls"]
    .map((f) => path.join(DATA_DIR, f))
    .find((p) => fs.existsSync(p));
  const gold = goldFile ? parseSingleMetal(goldFile, "Gold") : null;

  const silver = parseSingleMetal(
    path.join(DATA_DIR, "Silver_stocks.xls"),
    "Silver"
  );
  const copper = parseSingleMetal(
    path.join(DATA_DIR, "Copper_Stocks.xls"),
    "Copper"
  );
  const aluminum = parseSingleMetal(
    path.join(DATA_DIR, "Aluminum_Stocks.xls"),
    "Aluminum"
  );
  const zinc = parseSingleMetal(
    path.join(DATA_DIR, "Zinc_Stocks.xls"),
    "Zinc"
  );

  const [platinum, palladium] = parsePlatinumPalladium(
    path.join(DATA_DIR, "PA-PL_Stck_Rprt.xls")
  );

  // ── 2. Load existing data.json (to preserve Gold & other metals) ──────

  let existing: Record<string, unknown> = {};
  if (fs.existsSync(DATA_JSON)) {
    try {
      existing = JSON.parse(fs.readFileSync(DATA_JSON, "utf-8"));
      console.log(`\nLoaded existing data.json`);
    } catch {
      console.log(`\nCould not parse existing data.json; starting fresh`);
    }
  }

  // ── 3. Build the output data object ───────────────────────────────────

  const output: Record<string, unknown> = {};

  // Newly parsed metals in canonical order (Gold first)
  const parsedMetals: [string, MetalEntry | null][] = [
    ["Gold", gold],
    ["Silver", silver],
    ["Copper", copper],
    ["Platinum", platinum],
    ["Palladium", palladium],
    ["Aluminum", aluminum],
    ["Zinc", zinc],
  ];

  const allForDb: Record<string, MetalEntry> = {};

  for (const [name, entry] of parsedMetals) {
    if (entry && entry.depositories.length > 0) {
      output[name] = {
        metal: name,
        report_date: entry.report_date,
        activity_date: entry.activity_date,
        depositories: entry.depositories,
        totals: entry.totals,
      };
      allForDb[name] = entry;
    } else if (existing[name]) {
      output[name] = existing[name];
      console.log(`  Keeping existing ${name} data`);
    }
  }

  // Build combined Platinum_Palladium entry
  if (platinum && palladium) {
    const combinedDeps = [...platinum.depositories, ...palladium.depositories];
    const combinedTotals = combinedDeps.reduce(
      (acc, d) => ({
        registered: acc.registered + d.registered,
        eligible: acc.eligible + d.eligible,
        total: acc.total + d.total,
      }),
      { registered: 0, eligible: 0, total: 0 }
    );

    const ppEntry: MetalEntry = {
      metal: "Platinum_Palladium",
      report_date: platinum.report_date,
      activity_date: platinum.activity_date,
      depositories: combinedDeps,
      totals: combinedTotals,
    };

    output["Platinum_Palladium"] = {
      metal: "Platinum_Palladium",
      report_date: ppEntry.report_date,
      activity_date: ppEntry.activity_date,
      depositories: ppEntry.depositories,
      totals: ppEntry.totals,
    };
    allForDb["Platinum_Palladium"] = ppEntry;

    console.log(
      `\n  Combined Platinum_Palladium: ${combinedDeps.length} depositories, Total=${combinedTotals.total.toLocaleString()}`
    );
  } else if (existing["Platinum_Palladium"]) {
    output["Platinum_Palladium"] = existing["Platinum_Palladium"];
    console.log(`  Keeping existing Platinum_Palladium data`);
  }

  // Metadata
  const now = new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  output["_metadata"] = {
    last_updated: `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`,
    source: "CME Group",
  };

  // ── 4. Write data.json ────────────────────────────────────────────────

  fs.writeFileSync(DATA_JSON, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n[OK] Written to ${DATA_JSON}`);

  // ── 5. Upload to Neon database ────────────────────────────────────────

  const env = loadEnv();
  const dbUrl = process.env.DATABASE_URL || env["DATABASE_URL"];

  if (!dbUrl) {
    console.log("\n[WARN] DATABASE_URL not found; skipping database upload");
    return;
  }

  await uploadToDatabase(allForDb, dbUrl);

  // ── 6. Summary ────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(70));
  console.log("  Summary");
  console.log("=".repeat(70));

  for (const [key, val] of Object.entries(output)) {
    if (key === "_metadata") continue;
    const m = val as MetalEntry;
    console.log(
      `  ${key.padEnd(22)} Report: ${(m.report_date || "N/A").padEnd(12)} Deps: ${String(m.depositories?.length ?? 0).padEnd(4)} Total: ${(m.totals?.total ?? 0).toLocaleString()}`
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("  Done!");
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
