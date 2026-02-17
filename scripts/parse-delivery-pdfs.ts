import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PDFParse } from "pdf-parse";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");

// ─── .env loading ──────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = join(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

const METAL_MAP: Record<string, { metal: string; symbol: string }> = {
  GOLD: { metal: "Gold", symbol: "GC" },
  SILVER: { metal: "Silver", symbol: "SI" },
  COPPER: { metal: "Copper", symbol: "HG" },
  PLATINUM: { metal: "Platinum", symbol: "PL" },
  PALLADIUM: { metal: "Palladium", symbol: "PA" },
  ALUMINUM: { metal: "Aluminum", symbol: "ALI" },
};

function identifyMetal(
  name: string
): { metal: string; symbol: string } | null {
  const upper = name.toUpperCase();
  if (upper.includes("MICRO GOLD")) return { metal: "Micro Gold", symbol: "MGC" };
  if (upper.includes("MICRO SILVER")) return { metal: "Micro Silver", symbol: "MSI" };
  for (const [keyword, info] of Object.entries(METAL_MAP)) {
    if (upper.includes(keyword)) return info;
  }
  return null;
}

function extractContractMonth(contractName: string): string | null {
  const monthMap: Record<string, string> = {
    JANUARY: "JAN", FEBRUARY: "FEB", MARCH: "MAR", APRIL: "APR",
    MAY: "MAY", JUNE: "JUN", JULY: "JUL", AUGUST: "AUG",
    SEPTEMBER: "SEP", OCTOBER: "OCT", NOVEMBER: "NOV", DECEMBER: "DEC",
  };
  const m = contractName.match(
    /(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})/i
  );
  if (!m) return null;
  const abbr = monthMap[m[1].toUpperCase()] ?? m[1].slice(0, 3).toUpperCase();
  return `${abbr}${m[2].slice(2)}`;
}

function mmddyyyyToIso(dateStr: string): string {
  const [mm, dd, yyyy] = dateStr.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function parseNumber(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

function parseDecimal(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

async function extractPdfText(pdfPath: string): Promise<string> {
  const buf = readFileSync(pdfPath);
  const uint8 = new Uint8Array(buf);
  const parser = new PDFParse(uint8);
  const result = await parser.getText();
  return result.text;
}

// ─── DAILY REPORT PARSER ───────────────────────────────────────────────────────

interface Firm {
  code: string;
  org: string;
  name: string;
  issued: number;
  stopped: number;
}

interface DailyDelivery {
  metal: string;
  symbol: string;
  contract_name: string;
  contract_month: string | null;
  settlement: number | null;
  delivery_date: string | null;
  daily_issued: number;
  daily_stopped: number;
  month_to_date: number;
  firms: Firm[];
}

interface DailyReport {
  business_date: string | null;
  parsed_date: string | null;
  deliveries: DailyDelivery[];
  last_updated: string;
}

function parseDailyReport(text: string): DailyReport {
  const bdMatch = text.match(/BUSINESS DATE:\s*(\d{2}\/\d{2}\/\d{4})/);
  const businessDate = bdMatch ? bdMatch[1] : null;
  const parsedDate = businessDate ? mmddyyyyToIso(businessDate) : null;

  const deliveries: DailyDelivery[] = [];

  // Split text into contract sections
  const sections = text.split(/CONTRACT:\s*/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split("\n");
    const contractName = lines[0].trim();

    const metalInfo = identifyMetal(contractName);
    if (!metalInfo) continue;

    const contractMonth = extractContractMonth(contractName);

    // Settlement price
    const settleMatch = section.match(
      /SETTLEMENT:\s*([\d,]+\.?\d*)\s*USD/
    );
    const settlement = settleMatch ? parseDecimal(settleMatch[1]) : null;

    // Delivery date
    const ddMatch = section.match(
      /DELIVERY DATE:\s*(\d{2}\/\d{2}\/\d{4})/
    );
    const deliveryDate = ddMatch ? ddMatch[1] : null;

    // TOTAL line
    const totalMatch = section.match(
      /TOTAL:\s*([\d,]+)\s+([\d,]+)/
    );
    const dailyIssued = totalMatch ? parseNumber(totalMatch[1]) : 0;
    const dailyStopped = totalMatch ? parseNumber(totalMatch[2]) : 0;

    // Month to date
    const mtdMatch = section.match(
      /MONTH TO DATE:\s*([\d,]+)/
    );
    const monthToDate = mtdMatch ? parseNumber(mtdMatch[1]) : 0;

    // Parse firm lines: CODE ORG NAME [NUMBER] [NUMBER]
    const firms: Firm[] = [];
    const firmRegex =
      /^(\d{3})\s+([CH])\s+([A-Z][A-Z\s&,.'()-]+?)\s+([\d,]+)(?:\s+([\d,]+))?\s*$/gm;
    let fm;
    while ((fm = firmRegex.exec(section)) !== null) {
      const issued = parseNumber(fm[4]);
      const stopped = fm[5] ? parseNumber(fm[5]) : 0;
      if (issued > 0 || stopped > 0) {
        firms.push({
          code: fm[1],
          org: fm[2],
          name: fm[3].trim(),
          issued,
          stopped,
        });
      }
    }

    deliveries.push({
      metal: metalInfo.metal,
      symbol: metalInfo.symbol,
      contract_name: contractName,
      contract_month: contractMonth,
      settlement,
      delivery_date: deliveryDate,
      daily_issued: dailyIssued,
      daily_stopped: dailyStopped,
      month_to_date: monthToDate,
      firms,
    });
  }

  // Some contracts may split across pages and appear as separate entries
  // (e.g. copper header on page 1, firms on page 2). Merge them.
  const merged = mergeDailyDeliveries(deliveries);

  return {
    business_date: businessDate,
    parsed_date: parsedDate,
    deliveries: merged,
    last_updated: new Date().toISOString(),
  };
}

function mergeDailyDeliveries(deliveries: DailyDelivery[]): DailyDelivery[] {
  const map = new Map<string, DailyDelivery>();

  for (const d of deliveries) {
    const key = `${d.metal}_${d.symbol}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...d });
    } else {
      // Prefer non-zero values
      if (!existing.settlement && d.settlement) existing.settlement = d.settlement;
      if (!existing.delivery_date && d.delivery_date) existing.delivery_date = d.delivery_date;
      if (!existing.contract_month && d.contract_month) existing.contract_month = d.contract_month;
      if (d.daily_issued > 0) existing.daily_issued = d.daily_issued;
      if (d.daily_stopped > 0) existing.daily_stopped = d.daily_stopped;
      if (d.month_to_date > existing.month_to_date) existing.month_to_date = d.month_to_date;
      // Merge firms, avoiding duplicates
      const firmKeys = new Set(
        existing.firms.map((f) => `${f.code}_${f.org}`)
      );
      for (const firm of d.firms) {
        const fk = `${firm.code}_${firm.org}`;
        if (!firmKeys.has(fk)) {
          existing.firms.push(firm);
          firmKeys.add(fk);
        }
      }
    }
  }

  return Array.from(map.values());
}

// ─── MTD REPORT PARSER ─────────────────────────────────────────────────────────

interface MtdDayEntry {
  date: string;
  iso_date: string;
  daily: number;
  cumulative: number;
}

interface MtdContract {
  metal: string;
  symbol: string;
  contract_name: string;
  contract_month: string | null;
  daily_data: MtdDayEntry[];
  total_cumulative: number;
}

interface MtdReport {
  business_date: string | null;
  parsed_date: string | null;
  contracts: MtdContract[];
  last_updated: string;
}

function parseMtdReport(text: string): MtdReport {
  const bdMatch = text.match(/BUSINESS DATE:\s*(\d{2}\/\d{2}\/\d{4})/);
  const businessDate = bdMatch ? bdMatch[1] : null;
  const parsedDate = businessDate ? mmddyyyyToIso(businessDate) : null;

  const rawContracts: MtdContract[] = [];

  const sections = text.split(/CONTRACT:\s*/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split("\n");
    const contractName = lines[0].trim();

    const metalInfo = identifyMetal(contractName);
    if (!metalInfo) continue;

    const contractMonth = extractContractMonth(contractName);

    // Parse daily rows: MM/DD/YYYY  DAILY_TOTAL  CUMULATIVE
    const dailyData: MtdDayEntry[] = [];
    const rowRegex = /(\d{2}\/\d{2}\/\d{4})\s+([\d,]+)\s+([\d,]+)/g;
    let rm;
    while ((rm = rowRegex.exec(section)) !== null) {
      dailyData.push({
        date: rm[1],
        iso_date: mmddyyyyToIso(rm[1]),
        daily: parseNumber(rm[2]),
        cumulative: parseNumber(rm[3]),
      });
    }

    if (dailyData.length === 0) continue;

    rawContracts.push({
      metal: metalInfo.metal,
      symbol: metalInfo.symbol,
      contract_name: contractName,
      contract_month: contractMonth,
      daily_data: dailyData,
      total_cumulative: dailyData[dailyData.length - 1].cumulative,
    });
  }

  // Merge duplicate contracts (same metal+symbol split across pages)
  const merged = new Map<string, MtdContract>();
  for (const c of rawContracts) {
    const key = `${c.metal}_${c.symbol}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...c });
    } else {
      const existingDates = new Set(existing.daily_data.map((d) => d.date));
      for (const day of c.daily_data) {
        if (!existingDates.has(day.date)) {
          existing.daily_data.push(day);
        }
      }
      existing.daily_data.sort(
        (a, b) => a.iso_date.localeCompare(b.iso_date)
      );
      existing.total_cumulative =
        existing.daily_data[existing.daily_data.length - 1].cumulative;
    }
  }

  return {
    business_date: businessDate,
    parsed_date: parsedDate,
    contracts: Array.from(merged.values()),
    last_updated: new Date().toISOString(),
  };
}

// ─── YTD REPORT PARSER ─────────────────────────────────────────────────────────

interface YtdFirm {
  code: string;
  name: string;
  org: string;
  issued: Record<string, number>;
  stopped: Record<string, number>;
  total_issued: number;
  total_stopped: number;
  total_activity: number;
}

interface YtdProduct {
  metal: string;
  symbol: string;
  product_name: string;
  monthly_totals: Record<string, number>;
  firms: YtdFirm[];
}

interface YtdReport {
  business_date: string | null;
  parsed_date: string | null;
  products: YtdProduct[];
  last_updated: string;
}

const MONTH_LABELS = [
  "prev_dec", "jan", "feb", "mar", "apr", "may",
  "jun", "jul", "aug", "sep", "oct", "nov", "dec",
];

function parsePipeValues(valuesStr: string): Record<string, number> {
  const result: Record<string, number> = {};
  const parts = valuesStr.split("|");
  for (let i = 0; i < parts.length && i < MONTH_LABELS.length; i++) {
    const val = parts[i].trim().replace(/,/g, "");
    if (val !== "" && /^\d+$/.test(val)) {
      result[MONTH_LABELS[i]] = parseInt(val, 10);
    }
  }
  return result;
}

function parseYtdReport(text: string): YtdReport {
  const bdMatch = text.match(/BUSINESS DATE:\s*(\d{2}\/\d{2}\/\d{4})/);
  const businessDate = bdMatch ? bdMatch[1] : null;
  const parsedDate = businessDate ? mmddyyyyToIso(businessDate) : null;

  // Split into pages by the report header
  const pages = text.split(/DLV665-T\s+CME CLEARING/);

  // Group pages by product
  const productPages = new Map<
    string,
    { metal: string; symbol: string; productName: string; pageTexts: string[] }
  >();

  for (let i = 1; i < pages.length; i++) {
    const page = pages[i];

    // Find the PRODUCT line (skip PRODUCT GROUP:)
    const productMatch = page.match(/^PRODUCT\s+(?!GROUP:)(.+)$/m);
    if (!productMatch) continue;

    const productName = productMatch[1].trim();
    const metalInfo = identifyMetal(productName);
    if (!metalInfo) continue;

    const key = `${metalInfo.metal}_${metalInfo.symbol}`;
    if (!productPages.has(key)) {
      productPages.set(key, {
        metal: metalInfo.metal,
        symbol: metalInfo.symbol,
        productName,
        pageTexts: [],
      });
    }
    productPages.get(key)!.pageTexts.push(page);
  }

  // Parse each product
  const products: YtdProduct[] = [];
  for (const [, info] of productPages) {
    const product = parseYtdProduct(info);
    if (product) products.push(product);
  }

  return {
    business_date: businessDate,
    parsed_date: parsedDate,
    products,
    last_updated: new Date().toISOString(),
  };
}

function parseYtdProduct(info: {
  metal: string;
  symbol: string;
  productName: string;
  pageTexts: string[];
}): YtdProduct {
  const allFirms: Array<{
    code: string;
    name: string;
    org: string;
    issued: Record<string, number>;
    stopped: Record<string, number>;
  }> = [];
  let monthlyTotals: Record<string, number> = {};

  const combinedText = info.pageTexts.join("\n");

  // Extract TOTALS line
  const totalsMatch = combinedText.match(/TOTALS:\s*\|(.+)/);
  if (totalsMatch) {
    monthlyTotals = parsePipeValues(totalsMatch[1]);
  }

  // Parse firm blocks from each page
  // Firm blocks are separated by ______ lines
  // Each block has two lines:
  //   CODE           | | I | val | val | val| ...
  //   FIRM_NAME      |O| S | val | val | val| ...
  const issuedRegex = /^\s*(\d{3})\s+\|\s*\|\s*I\s*\|(.+)$/gm;
  const stoppedRegex = /^(.+?)\s*\|([CH])\|\s*S\s*\|(.+)$/gm;

  for (const page of info.pageTexts) {
    // Split by underscore separators
    const blocks = page.split(/_{10,}/);

    for (const block of blocks) {
      const trimmed = block.trim();
      if (
        !trimmed ||
        trimmed.includes("TOTALS:") ||
        trimmed.includes("FIRM NBR")
      )
        continue;

      // Reset regex lastIndex
      issuedRegex.lastIndex = 0;
      stoppedRegex.lastIndex = 0;

      const issuedMatch = issuedRegex.exec(trimmed);
      const stoppedMatch = stoppedRegex.exec(trimmed);

      if (issuedMatch && stoppedMatch) {
        const firmCode = issuedMatch[1];
        const issuedValues = parsePipeValues(issuedMatch[2]);

        const firmName = stoppedMatch[1].trim();
        const orgType = stoppedMatch[2];
        const stoppedValues = parsePipeValues(stoppedMatch[3]);

        allFirms.push({
          code: firmCode,
          name: firmName,
          org: orgType,
          issued: issuedValues,
          stopped: stoppedValues,
        });
      }
    }
  }

  // Aggregate firms by code+org
  const aggregated = aggregateYtdFirms(allFirms);

  return {
    metal: info.metal,
    symbol: info.symbol,
    product_name: info.productName,
    monthly_totals: monthlyTotals,
    firms: aggregated,
  };
}

function aggregateYtdFirms(
  firms: Array<{
    code: string;
    name: string;
    org: string;
    issued: Record<string, number>;
    stopped: Record<string, number>;
  }>
): YtdFirm[] {
  const agg = new Map<
    string,
    {
      code: string;
      name: string;
      org: string;
      issued: Record<string, number>;
      stopped: Record<string, number>;
    }
  >();

  for (const firm of firms) {
    const key = `${firm.code}_${firm.org}`;
    if (!agg.has(key)) {
      agg.set(key, {
        code: firm.code,
        name: firm.name,
        org: firm.org,
        issued: { ...firm.issued },
        stopped: { ...firm.stopped },
      });
    } else {
      const existing = agg.get(key)!;
      for (const [month, val] of Object.entries(firm.issued)) {
        if (val > 0 || !(month in existing.issued)) {
          existing.issued[month] = val;
        }
      }
      for (const [month, val] of Object.entries(firm.stopped)) {
        if (val > 0 || !(month in existing.stopped)) {
          existing.stopped[month] = val;
        }
      }
    }
  }

  const result: YtdFirm[] = [];
  for (const [, firm] of agg) {
    const totalIssued = Object.values(firm.issued).reduce(
      (a, b) => a + b,
      0
    );
    const totalStopped = Object.values(firm.stopped).reduce(
      (a, b) => a + b,
      0
    );
    result.push({
      code: firm.code,
      name: firm.name,
      org: firm.org,
      issued: firm.issued,
      stopped: firm.stopped,
      total_issued: totalIssued,
      total_stopped: totalStopped,
      total_activity: totalIssued + totalStopped,
    });
  }

  result.sort((a, b) => b.total_activity - a.total_activity);
  return result;
}

// ─── DATABASE UPLOAD ────────────────────────────────────────────────────────────

async function uploadToDatabase(dailyReport: DailyReport) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("[SKIP] DATABASE_URL not set, skipping database upload");
    return;
  }

  const sql = neon(databaseUrl);

  console.log("\n[INFO] Uploading to Neon database...");

  // Ensure tables exist
  await sql`
    CREATE TABLE IF NOT EXISTS delivery_snapshots (
      id SERIAL PRIMARY KEY,
      metal VARCHAR(50) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      report_date DATE NOT NULL,
      contract_month VARCHAR(20) NOT NULL,
      settlement_price DECIMAL(15, 6) NOT NULL DEFAULT 0,
      daily_issued INTEGER NOT NULL DEFAULT 0,
      daily_stopped INTEGER NOT NULL DEFAULT 0,
      month_to_date INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metal, report_date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS delivery_firm_snapshots (
      id SERIAL PRIMARY KEY,
      delivery_snapshot_id INTEGER REFERENCES delivery_snapshots(id) ON DELETE CASCADE,
      firm_code VARCHAR(10) NOT NULL,
      firm_org VARCHAR(5) NOT NULL,
      firm_name VARCHAR(255) NOT NULL,
      issued INTEGER NOT NULL DEFAULT 0,
      stopped INTEGER NOT NULL DEFAULT 0
    )
  `;

  const reportDate = dailyReport.parsed_date;
  if (!reportDate) {
    console.log("  [SKIP] No report date available");
    return;
  }

  let successCount = 0;

  for (const delivery of dailyReport.deliveries) {
    try {
      const settlement = delivery.settlement ?? 0;
      const contractMonth = delivery.contract_month ?? "";

      // Upsert delivery snapshot
      const result = await sql`
        INSERT INTO delivery_snapshots (
          metal, symbol, report_date, contract_month, settlement_price,
          daily_issued, daily_stopped, month_to_date
        ) VALUES (
          ${delivery.metal}, ${delivery.symbol}, ${reportDate},
          ${contractMonth}, ${settlement},
          ${delivery.daily_issued}, ${delivery.daily_stopped},
          ${delivery.month_to_date}
        )
        ON CONFLICT (metal, report_date)
        DO UPDATE SET
          symbol = EXCLUDED.symbol,
          contract_month = EXCLUDED.contract_month,
          settlement_price = EXCLUDED.settlement_price,
          daily_issued = EXCLUDED.daily_issued,
          daily_stopped = EXCLUDED.daily_stopped,
          month_to_date = EXCLUDED.month_to_date,
          created_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const snapshotId = result[0].id;

      // Clear existing firm data for this snapshot
      await sql`
        DELETE FROM delivery_firm_snapshots
        WHERE delivery_snapshot_id = ${snapshotId}
      `;

      // Insert firm data
      for (const firm of delivery.firms) {
        await sql`
          INSERT INTO delivery_firm_snapshots (
            delivery_snapshot_id, firm_code, firm_org, firm_name, issued, stopped
          ) VALUES (
            ${snapshotId}, ${firm.code}, ${firm.org}, ${firm.name},
            ${firm.issued}, ${firm.stopped}
          )
        `;
      }

      console.log(
        `  [OK] ${delivery.metal}: date=${reportDate}, daily=${delivery.daily_issued}, MTD=${delivery.month_to_date}, ${delivery.firms.length} firms`
      );
      successCount++;
    } catch (error: any) {
      console.error(
        `  [ERROR] ${delivery.metal}: ${error.message}`
      );
    }
  }

  console.log(`[OK] Uploaded ${successCount} delivery snapshots to database`);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  CME Delivery PDF Parser (TypeScript)");
  console.log("=".repeat(70));
  console.log();

  loadEnv();

  const dataDir = join(PROJECT_ROOT, "data");
  const publicDir = join(PROJECT_ROOT, "public");

  // ── 1. Parse Daily Report ──────────────────────────────────────────────────

  const dailyPdf = join(dataDir, "MetalsIssuesAndStopsReport.pdf");
  console.log("[1/3] Parsing Daily Report...");

  let dailyReport: DailyReport | null = null;
  if (existsSync(dailyPdf)) {
    const dailyText = await extractPdfText(dailyPdf);
    dailyReport = parseDailyReport(dailyText);

    console.log(`  Business Date: ${dailyReport.business_date}`);
    console.log(`  Deliveries found: ${dailyReport.deliveries.length}`);
    for (const d of dailyReport.deliveries) {
      const firmCount = d.firms.length;
      console.log(
        `    ${d.metal} (${d.symbol}): Daily=${d.daily_issued}, MTD=${d.month_to_date}, Settle=${d.settlement ?? "N/A"}, ${firmCount} firms`
      );
    }

    const dailyPath = join(publicDir, "delivery.json");
    writeFileSync(dailyPath, JSON.stringify(dailyReport, null, 2));
    console.log(`  -> Saved to ${dailyPath}`);
  } else {
    console.log(`  [SKIP] PDF not found: ${dailyPdf}`);
  }

  // ── 2. Parse MTD Report ────────────────────────────────────────────────────

  const mtdPdf = join(dataDir, "MetalsIssuesAndStopsMTDReport.pdf");
  console.log("\n[2/3] Parsing MTD Report...");

  if (existsSync(mtdPdf)) {
    const mtdText = await extractPdfText(mtdPdf);
    const mtdReport = parseMtdReport(mtdText);

    console.log(`  Business Date: ${mtdReport.business_date}`);
    console.log(`  Contracts found: ${mtdReport.contracts.length}`);
    for (const c of mtdReport.contracts) {
      console.log(
        `    ${c.metal} (${c.symbol}): ${c.daily_data.length} days, Cumulative=${c.total_cumulative}`
      );
    }

    const mtdPath = join(publicDir, "delivery_mtd.json");
    writeFileSync(mtdPath, JSON.stringify(mtdReport, null, 2));
    console.log(`  -> Saved to ${mtdPath}`);
  } else {
    console.log(`  [SKIP] PDF not found: ${mtdPdf}`);
  }

  // ── 3. Parse YTD Report ────────────────────────────────────────────────────

  const ytdPdf = join(dataDir, "MetalsIssuesAndStopsYTDReport.pdf");
  console.log("\n[3/3] Parsing YTD Report...");

  if (existsSync(ytdPdf)) {
    const ytdText = await extractPdfText(ytdPdf);
    const ytdReport = parseYtdReport(ytdText);

    console.log(`  Business Date: ${ytdReport.business_date}`);
    console.log(`  Products found: ${ytdReport.products.length}`);
    for (const p of ytdReport.products) {
      console.log(
        `    ${p.metal} (${p.symbol}): ${p.firms.length} firms, Totals=${JSON.stringify(p.monthly_totals)}`
      );
    }

    const ytdPath = join(publicDir, "delivery_ytd.json");
    writeFileSync(ytdPath, JSON.stringify(ytdReport, null, 2));
    console.log(`  -> Saved to ${ytdPath}`);
  } else {
    console.log(`  [SKIP] PDF not found: ${ytdPdf}`);
  }

  // ── 4. Upload Daily to Database ────────────────────────────────────────────

  if (dailyReport) {
    await uploadToDatabase(dailyReport);
  }

  console.log("\n" + "=".repeat(70));
  console.log("  Done!");
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
