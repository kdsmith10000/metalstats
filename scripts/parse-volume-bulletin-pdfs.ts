import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import { neon } from "@neondatabase/serverless";

// ─── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");

const VOLUME_PDF = path.join(
  DATA_DIR,
  "Section02B_Summary_Volume_And_Open_Interest_Metals_Futures_And_Options.pdf"
);
const BULLETIN_PDF = path.join(
  DATA_DIR,
  "Section62_Metals_Futures_Products.pdf"
);

const VOLUME_SYMBOLS = [
  "MGC", "SIL", "GC", "1OZ", "SI", "HG", "MHG", "PL", "QO", "QI", "PA", "ALI", "QC",
];

const BULLETIN_SYMBOLS = [
  "1OZ", "GC", "SI", "SIL", "HG", "PL", "PA", "ALI", "MGC", "MHG", "QO", "QI", "QC",
];

const SYMBOL_NAMES: Record<string, string> = {
  MGC: "MICRO GOLD FUTURES",
  SIL: "MICRO SILVER FUTURES",
  GC: "COMEX GOLD FUTURES",
  "1OZ": "1 OUNCE GOLD FUTURES",
  SI: "COMEX SILVER FUTURES",
  HG: "COMEX COPPER FUTURES",
  MHG: "COMEX MICRO COPPER FUTURES",
  PL: "NYMEX PLATINUM FUTURES",
  QO: "E-MINI GOLD FUTURES",
  QI: "E-MINI SILVER FUTURES",
  PA: "NYMEX PALLADIUM FUTURES",
  ALI: "COMEX PHYSICAL ALUMINUM FUTURES",
  QC: "COMEX E-MINI COPPER FUTURES",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadEnv(): void {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        process.env[key] = rest.join("=");
      }
    }
  }
}

async function extractPdfText(pdfPath: string): Promise<string> {
  const buf = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buf) } as any);
  const result = await parser.getText({
    cellSeparator: " | ",
    lineThreshold: 2,
  });
  return result.text;
}

function parseNum(s: string): number {
  if (!s || s.trim() === "" || s.includes("----") || s === "UNCH") return 0;
  const cleaned = s.replace(/,/g, "").replace(/\s+/g, "").replace(/[BA]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseInt2(s: string): number {
  return Math.round(parseNum(s));
}

function parseHeader(text: string): { bulletinNumber: number; date: string; parsedDate: string } {
  let bulletinNumber = 0;
  let date = "";
  let parsedDate = "";

  const bulletinMatch = text.match(/BULLETIN\s*#\s*(\d+)/i);
  if (bulletinMatch) bulletinNumber = parseInt(bulletinMatch[1]);

  const dateMatch = text.match(
    /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (dateMatch) {
    date = dateMatch[0].toLowerCase();
    const monthMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const month = monthMap[dateMatch[2].toLowerCase()] || 1;
    const day = parseInt(dateMatch[3]);
    const year = parseInt(dateMatch[4]);
    parsedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return { bulletinNumber, date, parsedDate };
}

// ─── Section 02B: Volume & Open Interest ─────────────────────────────────────

interface VolumeProduct {
  symbol: string;
  name: string;
  globex_volume: number;
  total_volume: number;
  open_interest: number;
  oi_change: number;
  yoy_volume: number;
  yoy_open_interest: number;
}

function parseVolumeSummary(text: string): VolumeProduct[] {
  const products: VolumeProduct[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line ends with a known symbol after ' | '
    for (const symbol of VOLUME_SYMBOLS) {
      const symbolSuffix = ` | ${symbol}`;
      if (!trimmed.endsWith(symbolSuffix)) continue;

      // Split by ' | '
      const parts = trimmed.split(" | ");
      if (parts.length < 4) continue;

      const sym = parts[parts.length - 1].trim();
      if (sym !== symbol) continue;

      // Determine if product has PNT volume (extra column before symbol)
      // Products with PNT: parts = [OI, "NAME VOL +/- OI_CHG", "GLOBEX YOY_OI", "YOY_VOL", "PNT", "SYMBOL"]
      // Products without PNT: parts = [OI, "NAME VOL +/- OI_CHG", "GLOBEX YOY_OI", "YOY_VOL", "SYMBOL"]
      const hasPnt = parts.length >= 6;

      const oiStr = parts[0].trim();
      const mainPart = parts[1].trim(); // "NAME TOTAL_VOL +/- OI_CHANGE"
      const globexYoyPart = parts[2].trim(); // "GLOBEX_VOL YOY_OI"
      const yoyVolPart = hasPnt ? parts[3].trim() : parts[parts.length - 2].trim();
      const pntStr = hasPnt ? parts[parts.length - 2].trim() : "0";

      // Parse OI
      const openInterest = parseInt2(oiStr);

      // Parse main part: extract numbers and +/- sign
      // e.g., "COMEX GOLD FUTURES 145433 + 6503" or "MICRO GOLD FUTURES 424873 + 2678"
      const mainMatch = mainPart.match(/(\d[\d,]*)\s+([+-])\s+(\d[\d,]*)\s*$/);
      let totalVolume = 0;
      let oiChange = 0;

      if (mainMatch) {
        totalVolume = parseInt2(mainMatch[1]);
        const sign = mainMatch[2] === "+" ? 1 : -1;
        oiChange = sign * parseInt2(mainMatch[3]);
      } else {
        // Try without sign (some products might not have OI change)
        const numMatch = mainPart.match(/(\d[\d,]*)\s*$/);
        if (numMatch) totalVolume = parseInt2(numMatch[1]);
      }

      // Parse globex volume and yoy OI
      const globexParts = globexYoyPart.split(/\s+/);
      const globexVolume = globexParts.length > 0 ? parseInt2(globexParts[0]) : 0;
      const yoyOi = globexParts.length > 1 ? parseInt2(globexParts[1]) : 0;

      // Parse YoY volume
      const yoyVolume = parseInt2(yoyVolPart);

      products.push({
        symbol,
        name: SYMBOL_NAMES[symbol] || symbol,
        globex_volume: globexVolume,
        total_volume: totalVolume,
        open_interest: openInterest,
        oi_change: oiChange,
        yoy_volume: yoyVolume,
        yoy_open_interest: yoyOi,
      });

      console.log(
        `  [02B] ${symbol}: Vol=${totalVolume.toLocaleString()}, OI=${openInterest.toLocaleString()}, ` +
          `OI Chg=${oiChange >= 0 ? "+" : ""}${oiChange.toLocaleString()}, ` +
          `Globex=${globexVolume.toLocaleString()}, YoY Vol=${yoyVolume.toLocaleString()}`
      );
      break;
    }
  }

  return products;
}

// ─── Section 62: Bulletin (Settlement Prices) ────────────────────────────────

interface BulletinContract {
  month: string;
  settle: number;
  change: number;
  globex_volume: number;
  pnt_volume: number;
  oi_change: number;
}

interface BulletinProduct {
  symbol: string;
  name: string;
  contracts: BulletinContract[];
  total_volume: number;
  total_open_interest: number;
  total_oi_change: number;
}

function parseBulletin(text: string): BulletinProduct[] {
  const products: BulletinProduct[] = [];
  const lines = text.split("\n");

  for (const symbol of BULLETIN_SYMBOLS) {
    // Find product header: "GC FUT COMEX GOLD FUTURES" or "1OZ FUT 1 OUNCE GOLD FUTURES"
    const headerPattern = new RegExp(`^${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} FUT\\s+`, "i");
    let headerIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (headerPattern.test(lines[i].trim())) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      console.log(`  [62] ${symbol}: header not found, skipping`);
      continue;
    }

    const contracts: BulletinContract[] = [];
    let totalVolume = 0;
    let totalOi = 0;
    let totalOiChange = 0;
    let foundTotal = false;

    // Parse contract month rows after header
    for (let i = headerIdx + 1; i < lines.length && !foundTotal; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for TOTAL row
      // Formats: "140639 | TOTAL GC FUT 412911 | 4794 6503 | +"
      //          "424873 | TOTAL MGC FUT 61413 2678 | +"
      //          "TOTAL AEP FUT 3537"
      const totalPatternWithGlobex = new RegExp(
        `^(\\d[\\d,]*)\\s*\\|\\s*TOTAL\\s+${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+FUT`,
        "i"
      );
      const totalPatternSimple = new RegExp(
        `TOTAL\\s+${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+FUT`,
        "i"
      );

      if (totalPatternWithGlobex.test(line)) {
        foundTotal = true;
        // Parse total row
        const parts = line.split("|").map((s) => s.trim());
        const globexTotal = parseInt2(parts[0]);

        // Find OI and OI change from middle part
        // "TOTAL GC FUT 412911" → extract OI
        const totalMatch = parts[1]?.match(/FUT\s+([\d,]+)/i);
        totalOi = totalMatch ? parseInt2(totalMatch[1]) : 0;

        // Check for PNT and OI change
        if (parts.length >= 4) {
          // Has PNT: "4794 6503" and sign "+"
          const pntOiPart = parts[2]?.trim();
          const pntOiNums = pntOiPart?.match(/([\d,]+)\s+([\d,]+)/);
          const signPart = parts[3]?.trim();
          const sign = signPart === "-" ? -1 : 1;

          if (pntOiNums) {
            const pntTotal = parseInt2(pntOiNums[1]);
            totalOiChange = sign * parseInt2(pntOiNums[2]);
            totalVolume = globexTotal + pntTotal;
          } else {
            // Single number = OI change
            const singleNum = pntOiPart?.match(/([\d,]+)/);
            if (singleNum) totalOiChange = sign * parseInt2(singleNum[1]);
            totalVolume = globexTotal;
          }
        } else if (parts.length === 3) {
          // No PNT: OI change in the total part itself
          // "TOTAL MGC FUT 61413 2678" → OI and OI change
          const totalNums = parts[1]?.match(/FUT\s+([\d,]+)\s+([\d,]+)/i);
          if (totalNums) {
            totalOi = parseInt2(totalNums[1]);
            const oiChgVal = parseInt2(totalNums[2]);
            const signPart = parts[2]?.trim();
            const sign = signPart === "-" ? -1 : 1;
            totalOiChange = sign * oiChgVal;
          }
          totalVolume = globexTotal;
        }
        break;
      } else if (totalPatternSimple.test(line) && !line.match(/^\d/)) {
        foundTotal = true;
        const totalMatch = line.match(/FUT\s+([\d,]+)/i);
        if (totalMatch) totalOi = parseInt2(totalMatch[1]);
        break;
      }

      // Check if we hit another product header (stop)
      if (/^[A-Z0-9]+ FUT\s+/.test(line) && !line.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i)) {
        break;
      }

      // Parse contract month row
      // Format: "APR26 + 120686 | 97.90 | 5046.30 | 5069.10 /4907.10 283012 + 3234 | 4950.00 2330"
      //     or: "DEC26 ---- | UNCH | 265.00 | ---- 140 UNCH | ---- ----"
      const monthMatch = line.match(
        /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2}\s/i
      );
      if (!monthMatch) continue;

      const parts = line.split("|").map((s) => s.trim());
      if (parts.length < 4) continue;

      // Part 0: "APR26 + 120686" or "APR26 - 120686" or "DEC26 ----"
      const p0 = parts[0];
      const monthCode = p0.substring(0, 5).toUpperCase();

      // Extract change sign and globex volume from part 0
      const p0Match = p0.match(/^[A-Z]{3}\d{2}\s+([+-])\s+([\d,]+)/i);
      const p0Dashes = p0.match(/^[A-Z]{3}\d{2}\s+(----)/i);
      let changeSign = 1;
      let globexVol = 0;

      if (p0Match) {
        changeSign = p0Match[1] === "-" ? -1 : 1;
        globexVol = parseInt2(p0Match[2]);
      } else if (p0Dashes) {
        globexVol = 0;
      }

      // Part 1: change amount "97.90" or "UNCH"
      const changeStr = parts[1]?.trim();
      const changeAmt = changeStr === "UNCH" ? 0 : parseNum(changeStr);
      const change = changeSign * changeAmt;

      // Part 2: settlement price "5046.30"
      const settle = parseNum(parts[2]?.trim() || "0");

      // Part 3: "5069.10 /4907.10 283012 + 3234" or "---- 140 UNCH"
      // Extract OI and OI change
      const p3 = parts[3]?.trim() || "";
      let oi = 0;
      let oiChangeSign = 1;
      let oiChange = 0;

      // Try to find OI with +/- change
      const oiWithChange = p3.match(/([\d,]+)\s+([+-])\s+([\d,]+)\s*$/);
      const oiUnch = p3.match(/([\d,]+)\s+UNCH\s*$/);
      const oiOnly = p3.match(/([\d,]+)\s*$/);

      if (oiWithChange) {
        oi = parseInt2(oiWithChange[1]);
        oiChangeSign = oiWithChange[2] === "-" ? -1 : 1;
        oiChange = oiChangeSign * parseInt2(oiWithChange[3]);
      } else if (oiUnch) {
        oi = parseInt2(oiUnch[1]);
        oiChange = 0;
      } else if (oiOnly) {
        oi = parseInt2(oiOnly[1]);
      }

      // Part 4: "4950.00 2330" or "---- ----" → open and PNT
      const p4 = parts[4]?.trim() || "";
      const pntMatch = p4.match(/([\d,.]+)\s+([\d,]+)\s*$/);
      const pntVol = pntMatch ? parseInt2(pntMatch[2]) : 0;

      if (settle > 0 || globexVol > 0 || oi > 0) {
        contracts.push({
          month: monthCode,
          settle,
          change,
          globex_volume: globexVol,
          pnt_volume: pntVol,
          oi_change: oiChange,
        });
      }
    }

    if (contracts.length > 0 || totalOi > 0) {
      // If we didn't get total volume from TOTAL row, sum from contracts
      if (totalVolume === 0) {
        totalVolume = contracts.reduce((sum, c) => sum + c.globex_volume + c.pnt_volume, 0);
      }

      // Sort contracts by globex_volume descending
      contracts.sort((a, b) => b.globex_volume - a.globex_volume);

      products.push({
        symbol,
        name: SYMBOL_NAMES[symbol] || symbol,
        contracts,
        total_volume: totalVolume,
        total_open_interest: totalOi,
        total_oi_change: totalOiChange,
      });

      const frontMonth = contracts[0];
      console.log(
        `  [62] ${symbol}: ${contracts.length} contracts, ` +
          `Front=${frontMonth?.month} @ ${frontMonth?.settle}, ` +
          `Vol=${totalVolume.toLocaleString()}, OI=${totalOi.toLocaleString()}, ` +
          `OI Chg=${totalOiChange >= 0 ? "+" : ""}${totalOiChange.toLocaleString()}`
      );
    }
  }

  return products;
}

// ─── Database Upload ─────────────────────────────────────────────────────────

async function uploadToDatabase(
  volumeData: { parsedDate: string; products: VolumeProduct[] },
  bulletinData: { parsedDate: string; products: BulletinProduct[] }
): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("\n[WARN] DATABASE_URL not set, skipping database upload");
    return;
  }

  const sql = neon(dbUrl);

  // Ensure bulletin_snapshots table exists
  await sql`
    CREATE TABLE IF NOT EXISTS bulletin_snapshots (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      front_month_settle DECIMAL(15, 6),
      front_month_change DECIMAL(15, 6),
      total_volume BIGINT NOT NULL DEFAULT 0,
      total_open_interest BIGINT NOT NULL DEFAULT 0,
      total_oi_change INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, date)
    )
  `;
  console.log("  [DB] bulletin_snapshots table ensured");

  // Ensure open_interest_snapshots table exists
  await sql`
    CREATE TABLE IF NOT EXISTS open_interest_snapshots (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      report_date DATE NOT NULL,
      open_interest BIGINT NOT NULL DEFAULT 0,
      oi_change INTEGER NOT NULL DEFAULT 0,
      total_volume BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, report_date)
    )
  `;
  console.log("  [DB] open_interest_snapshots table ensured");

  // Upload volume data
  let volCount = 0;
  for (const p of volumeData.products) {
    try {
      await sql`
        INSERT INTO open_interest_snapshots (symbol, report_date, open_interest, oi_change, total_volume)
        VALUES (${p.symbol}, ${volumeData.parsedDate}, ${p.open_interest}, ${p.oi_change}, ${p.total_volume})
        ON CONFLICT (symbol, report_date)
        DO UPDATE SET
          open_interest = EXCLUDED.open_interest,
          oi_change = EXCLUDED.oi_change,
          total_volume = EXCLUDED.total_volume
      `;
      volCount++;
    } catch (err: any) {
      console.log(`  [DB] Error inserting volume for ${p.symbol}: ${err.message}`);
    }
  }
  console.log(`  [DB] Uploaded ${volCount} volume records to open_interest_snapshots`);

  // Upload bulletin data
  let bulCount = 0;
  for (const p of bulletinData.products) {
    const frontMonth = p.contracts[0];
    try {
      await sql`
        INSERT INTO bulletin_snapshots (symbol, date, front_month_settle, front_month_change, total_volume, total_open_interest, total_oi_change)
        VALUES (${p.symbol}, ${bulletinData.parsedDate}, ${frontMonth?.settle || 0}, ${frontMonth?.change || 0}, ${p.total_volume}, ${p.total_open_interest}, ${p.total_oi_change})
        ON CONFLICT (symbol, date)
        DO UPDATE SET
          front_month_settle = EXCLUDED.front_month_settle,
          front_month_change = EXCLUDED.front_month_change,
          total_volume = EXCLUDED.total_volume,
          total_open_interest = EXCLUDED.total_open_interest,
          total_oi_change = EXCLUDED.total_oi_change
      `;
      bulCount++;
    } catch (err: any) {
      console.log(`  [DB] Error inserting bulletin for ${p.symbol}: ${err.message}`);
    }
  }
  console.log(`  [DB] Uploaded ${bulCount} bulletin records to bulletin_snapshots`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=".repeat(70));
  console.log("  CME Metals PDF Parser (Volume Summary + Bulletin)");
  console.log("=".repeat(70));
  console.log();

  loadEnv();

  // ── Parse Section 02B: Volume & Open Interest ───────────────────────────
  console.log("[1/5] Extracting text from Section 02B PDF...");
  const volText = await extractPdfText(VOLUME_PDF);
  console.log(`  Extracted ${volText.length} characters`);

  const header02b = parseHeader(volText);
  console.log(`  Bulletin #${header02b.bulletinNumber} — ${header02b.date} (${header02b.parsedDate})`);

  console.log("\n[2/5] Parsing Volume & Open Interest data...");
  const volumeProducts = parseVolumeSummary(volText);
  console.log(`  Found ${volumeProducts.length} products`);

  // ── Parse Section 62: Bulletin ──────────────────────────────────────────
  console.log("\n[3/5] Extracting text from Section 62 PDF...");
  const bulText = await extractPdfText(BULLETIN_PDF);
  console.log(`  Extracted ${bulText.length} characters`);

  const header62 = parseHeader(bulText);
  console.log(`  Bulletin #${header62.bulletinNumber} — ${header62.date} (${header62.parsedDate})`);

  console.log("\n[4/5] Parsing Bulletin (settlement prices)...");
  const bulletinProducts = parseBulletin(bulText);
  console.log(`  Found ${bulletinProducts.length} products`);

  // ── Write JSON files ────────────────────────────────────────────────────
  console.log("\n[5/5] Writing JSON files & uploading to database...");

  const volumeSummary = {
    bulletin_number: header02b.bulletinNumber,
    date: header02b.date,
    parsed_date: header02b.parsedDate,
    products: volumeProducts,
    totals: {},
    last_updated: new Date().toISOString(),
  };

  const volumeJsonPath = path.join(PUBLIC_DIR, "volume_summary.json");
  fs.writeFileSync(volumeJsonPath, JSON.stringify(volumeSummary, null, 2));
  console.log(`  Wrote ${volumeJsonPath}`);

  const bulletinJson = {
    bulletin_number: header62.bulletinNumber,
    date: header62.date,
    parsed_date: header62.parsedDate,
    products: bulletinProducts,
    last_updated: new Date().toISOString(),
  };

  const bulletinJsonPath = path.join(PUBLIC_DIR, "bulletin.json");
  fs.writeFileSync(bulletinJsonPath, JSON.stringify(bulletinJson, null, 2));
  console.log(`  Wrote ${bulletinJsonPath}`);

  // ── Upload to database ──────────────────────────────────────────────────
  await uploadToDatabase(
    { parsedDate: header02b.parsedDate, products: volumeProducts },
    { parsedDate: header62.parsedDate, products: bulletinProducts }
  );

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("  Summary");
  console.log("=".repeat(70));
  console.log(`  Date: ${header02b.parsedDate}`);
  console.log(`  Volume products parsed: ${volumeProducts.length}`);
  console.log(`  Bulletin products parsed: ${bulletinProducts.length}`);
  console.log(
    `  Total bulletin contracts: ${bulletinProducts.reduce((s, p) => s + p.contracts.length, 0)}`
  );
  console.log("  Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
