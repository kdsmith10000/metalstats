import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Lazy database connection - only connects when actually used
let _sql: NeonQueryFunction<false, false> | null = null;

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql(strings, ...values);
}

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

// Types for database records
export interface MetalSnapshot {
  id: number;
  metal: string;
  report_date: string;
  activity_date: string | null;
  registered: number;
  eligible: number;
  total: number;
  created_at: Date;
}

export interface DepositorySnapshot {
  id: number;
  metal_snapshot_id: number;
  name: string;
  registered: number;
  eligible: number;
  total: number;
}

export interface PercentChange {
  metal: string;
  current_registered: number;
  current_eligible: number;
  current_total: number;
  day_change_registered: number | null;
  day_change_eligible: number | null;
  day_change_total: number | null;
  month_change_registered: number | null;
  month_change_eligible: number | null;
  month_change_total: number | null;
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create metal_snapshots table for daily data
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

    // Create depository_snapshots table
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

    // Create indexes for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_metal_snapshots_metal_date 
      ON metal_snapshots(metal, report_date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_depository_snapshots_metal_id 
      ON depository_snapshots(metal_snapshot_id)
    `;

    // Create newsletter_subscribers table
    await sql`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        unsubscribe_token VARCHAR(64) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        subscription_status VARCHAR(20) DEFAULT 'trial',
        trial_ends_at TIMESTAMP WITH TIME ZONE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255)
      )
    `;

    // Add new columns to existing tables (safe to run multiple times)
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial'`;
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`;
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)`;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_newsletter_email
      ON newsletter_subscribers(email)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_newsletter_token
      ON newsletter_subscribers(unsubscribe_token)
    `;

    // Create newsletters archive table
    await sql`
      CREATE TABLE IF NOT EXISTS newsletters (
        id SERIAL PRIMARY KEY,
        report_date DATE UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        metals_analyzed INTEGER DEFAULT 0,
        avg_risk_score INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_newsletters_date
      ON newsletters(report_date DESC)
    `;

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Insert or update a metal snapshot
export async function upsertMetalSnapshot(
  metal: string,
  reportDate: string,
  activityDate: string | null,
  registered: number,
  eligible: number,
  total: number,
  depositories: Array<{ name: string; registered: number; eligible: number; total: number }>
): Promise<number> {
  try {
    // Parse the date properly (handle MM/DD/YYYY format)
    const parsedReportDate = parseDate(reportDate);
    const parsedActivityDate = activityDate ? parseDate(activityDate) : null;

    // Upsert the metal snapshot
    const result = await sql`
      INSERT INTO metal_snapshots (metal, report_date, activity_date, registered, eligible, total)
      VALUES (${metal}, ${parsedReportDate}, ${parsedActivityDate}, ${registered}, ${eligible}, ${total})
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

    // Delete existing depositories for this snapshot
    await sql`
      DELETE FROM depository_snapshots WHERE metal_snapshot_id = ${snapshotId}
    `;

    // Insert new depositories
    for (const dep of depositories) {
      await sql`
        INSERT INTO depository_snapshots (metal_snapshot_id, name, registered, eligible, total)
        VALUES (${snapshotId}, ${dep.name}, ${dep.registered}, ${dep.eligible}, ${dep.total})
      `;
    }

    return snapshotId;
  } catch (error) {
    console.error(`Error upserting metal snapshot for ${metal}:`, error);
    throw error;
  }
}

// Get the latest snapshot for each metal
export async function getLatestSnapshots(): Promise<MetalSnapshot[]> {
  try {
    const result = await sql`
      SELECT DISTINCT ON (metal) 
        id, metal, report_date, activity_date, registered, eligible, total, created_at
      FROM metal_snapshots
      ORDER BY metal, report_date DESC
    `;
    return result as MetalSnapshot[];
  } catch (error) {
    console.error('Error fetching latest snapshots:', error);
    throw error;
  }
}

// Get depositories for a snapshot
export async function getDepositories(snapshotId: number): Promise<DepositorySnapshot[]> {
  try {
    const result = await sql`
      SELECT id, metal_snapshot_id, name, registered, eligible, total
      FROM depository_snapshots
      WHERE metal_snapshot_id = ${snapshotId}
    `;
    return result as DepositorySnapshot[];
  } catch (error) {
    console.error('Error fetching depositories:', error);
    throw error;
  }
}

// Get the previous snapshot before the latest one for a metal
export async function getPreviousSnapshot(metal: string): Promise<MetalSnapshot | null> {
  try {
    // Get the second most recent snapshot (the one before the latest)
    const result = await sql`
      SELECT id, metal, report_date, activity_date, registered, eligible, total, created_at
      FROM metal_snapshots
      WHERE metal = ${metal}
      ORDER BY report_date DESC
      LIMIT 1 OFFSET 1
    `;
    return result.length > 0 ? result[0] as MetalSnapshot : null;
  } catch (error) {
    console.error(`Error fetching previous snapshot for ${metal}:`, error);
    throw error;
  }
}

// Get snapshot from approximately N days before the latest for a metal
export async function getSnapshotDaysBeforeLatest(metal: string, daysAgo: number): Promise<MetalSnapshot | null> {
  try {
    // First get the latest report date for this metal
    const latestResult = await sql`
      SELECT report_date FROM metal_snapshots
      WHERE metal = ${metal}
      ORDER BY report_date DESC
      LIMIT 1
    `;
    
    if (latestResult.length === 0) return null;
    
    const latestDate = latestResult[0].report_date;
    
    // Get the snapshot from approximately N days before the latest
    const result = await sql`
      SELECT id, metal, report_date, activity_date, registered, eligible, total, created_at
      FROM metal_snapshots
      WHERE metal = ${metal}
        AND report_date <= ${latestDate}::date - ${daysAgo}::integer
      ORDER BY report_date DESC
      LIMIT 1
    `;
    return result.length > 0 ? result[0] as MetalSnapshot : null;
  } catch (error) {
    console.error(`Error fetching snapshot from ${daysAgo} days before latest:`, error);
    throw error;
  }
}

// Get snapshot from approximately 30 days ago (for month-over-month)
export async function getMonthAgoSnapshot(metal: string): Promise<MetalSnapshot | null> {
  return getSnapshotDaysBeforeLatest(metal, 30);
}

// Get yesterday's snapshot (for day-over-day) - returns the previous snapshot
export async function getYesterdaySnapshot(metal: string): Promise<MetalSnapshot | null> {
  return getPreviousSnapshot(metal);
}

// Calculate percent change
function calculatePercentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Get all metals with percent changes
export async function getMetalsWithPercentChanges(): Promise<PercentChange[]> {
  try {
    const latestSnapshots = await getLatestSnapshots();
    const results: PercentChange[] = [];

    for (const snapshot of latestSnapshots) {
      const yesterdaySnapshot = await getYesterdaySnapshot(snapshot.metal);
      const monthAgoSnapshot = await getMonthAgoSnapshot(snapshot.metal);

      results.push({
        metal: snapshot.metal,
        current_registered: Number(snapshot.registered),
        current_eligible: Number(snapshot.eligible),
        current_total: Number(snapshot.total),
        day_change_registered: calculatePercentChange(
          Number(snapshot.registered),
          yesterdaySnapshot ? Number(yesterdaySnapshot.registered) : null
        ),
        day_change_eligible: calculatePercentChange(
          Number(snapshot.eligible),
          yesterdaySnapshot ? Number(yesterdaySnapshot.eligible) : null
        ),
        day_change_total: calculatePercentChange(
          Number(snapshot.total),
          yesterdaySnapshot ? Number(yesterdaySnapshot.total) : null
        ),
        month_change_registered: calculatePercentChange(
          Number(snapshot.registered),
          monthAgoSnapshot ? Number(monthAgoSnapshot.registered) : null
        ),
        month_change_eligible: calculatePercentChange(
          Number(snapshot.eligible),
          monthAgoSnapshot ? Number(monthAgoSnapshot.eligible) : null
        ),
        month_change_total: calculatePercentChange(
          Number(snapshot.total),
          monthAgoSnapshot ? Number(monthAgoSnapshot.total) : null
        ),
      });
    }

    return results;
  } catch (error) {
    console.error('Error calculating percent changes:', error);
    throw error;
  }
}

// Get full warehouse data with percent changes (for API/frontend)
export async function getWarehouseDataWithChanges() {
  try {
    const latestSnapshots = await getLatestSnapshots();
    const percentChanges = await getMetalsWithPercentChanges();
    
    const data: Record<string, {
      metal: string;
      report_date: string | null;
      activity_date: string | null;
      last_synced: string | null;
      depositories: Array<{ name: string; registered: number; eligible: number; total: number }>;
      totals: { registered: number; eligible: number; total: number };
      changes: {
        day: { registered: number | null; eligible: number | null; total: number | null };
        month: { registered: number | null; eligible: number | null; total: number | null };
      };
    }> = {};

    for (const snapshot of latestSnapshots) {
      const depositories = await getDepositories(snapshot.id);
      const changes = percentChanges.find(p => p.metal === snapshot.metal);

      data[snapshot.metal] = {
        metal: snapshot.metal,
        report_date: snapshot.report_date,
        activity_date: snapshot.activity_date,
        last_synced: snapshot.created_at ? new Date(snapshot.created_at).toISOString() : null,
        depositories: depositories.map(d => ({
          name: d.name,
          registered: Number(d.registered),
          eligible: Number(d.eligible),
          total: Number(d.total),
        })),
        totals: {
          registered: Number(snapshot.registered),
          eligible: Number(snapshot.eligible),
          total: Number(snapshot.total),
        },
        changes: {
          day: {
            registered: changes?.day_change_registered ?? null,
            eligible: changes?.day_change_eligible ?? null,
            total: changes?.day_change_total ?? null,
          },
          month: {
            registered: changes?.month_change_registered ?? null,
            eligible: changes?.month_change_eligible ?? null,
            total: changes?.month_change_total ?? null,
          },
        },
      };
    }

    return data;
  } catch (error) {
    console.error('Error fetching warehouse data with changes:', error);
    throw error;
  }
}

// Helper function to parse date strings (handles MM/DD/YYYY and ISO formats)
function parseDate(dateStr: string): string {
  // If already in ISO format (YYYY-MM-DD), return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Fallback: try to parse with Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  throw new Error(`Unable to parse date: ${dateStr}`);
}

// Get historical data for a metal (for charts)
export async function getMetalHistory(metal: string, days: number = 90): Promise<MetalSnapshot[]> {
  try {
    const result = await sql`
      SELECT id, metal, report_date, activity_date, registered, eligible, total, created_at
      FROM metal_snapshots
      WHERE metal = ${metal}
        AND report_date >= CURRENT_DATE - ${days}::integer
      ORDER BY report_date ASC
    `;
    return result as MetalSnapshot[];
  } catch (error) {
    console.error(`Error fetching history for ${metal}:`, error);
    throw error;
  }
}

// ============================================
// OPEN INTEREST / PAPER DATA
// ============================================

export interface OpenInterestSnapshot {
  id: number;
  symbol: string;
  report_date: string;
  open_interest: number;
  oi_change: number;
  total_volume: number;
  created_at: Date;
}

export interface PaperPhysicalSnapshot {
  id: number;
  metal: string;
  report_date: string;
  futures_symbol: string;
  open_interest: number;
  open_interest_units: number;
  registered_inventory: number;
  paper_physical_ratio: number;
  risk_level: string;
  created_at: Date;
}

// Initialize open interest tables
export async function initializeOpenInterestTables() {
  try {
    // Create open_interest_snapshots table for daily futures data
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

    // Create paper_physical_snapshots table for computed ratios
    await sql`
      CREATE TABLE IF NOT EXISTS paper_physical_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        futures_symbol VARCHAR(20) NOT NULL,
        open_interest BIGINT NOT NULL DEFAULT 0,
        open_interest_units DECIMAL(20, 3) NOT NULL DEFAULT 0,
        registered_inventory DECIMAL(20, 3) NOT NULL DEFAULT 0,
        paper_physical_ratio DECIMAL(10, 4) NOT NULL DEFAULT 0,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
      )
    `;

    // Create indexes for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_oi_snapshots_symbol_date 
      ON open_interest_snapshots(symbol, report_date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_paper_physical_metal_date 
      ON paper_physical_snapshots(metal, report_date DESC)
    `;

    console.log('Open interest tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing open interest tables:', error);
    throw error;
  }
}

// Upsert open interest data for a symbol
export async function upsertOpenInterest(
  symbol: string,
  reportDate: string,
  openInterest: number,
  oiChange: number,
  totalVolume: number
): Promise<number> {
  try {
    const parsedDate = parseDate(reportDate);
    
    const result = await sql`
      INSERT INTO open_interest_snapshots (symbol, report_date, open_interest, oi_change, total_volume)
      VALUES (${symbol}, ${parsedDate}, ${openInterest}, ${oiChange}, ${totalVolume})
      ON CONFLICT (symbol, report_date) 
      DO UPDATE SET 
        open_interest = EXCLUDED.open_interest,
        oi_change = EXCLUDED.oi_change,
        total_volume = EXCLUDED.total_volume,
        created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    return result[0].id;
  } catch (error) {
    console.error(`Error upserting open interest for ${symbol}:`, error);
    throw error;
  }
}

// Upsert paper/physical ratio data
export async function upsertPaperPhysicalRatio(
  metal: string,
  reportDate: string,
  futuresSymbol: string,
  openInterest: number,
  openInterestUnits: number,
  registeredInventory: number,
  paperPhysicalRatio: number,
  riskLevel: string
): Promise<number> {
  try {
    const parsedDate = parseDate(reportDate);
    
    const result = await sql`
      INSERT INTO paper_physical_snapshots (
        metal, report_date, futures_symbol, open_interest, 
        open_interest_units, registered_inventory, paper_physical_ratio, risk_level
      )
      VALUES (
        ${metal}, ${parsedDate}, ${futuresSymbol}, ${openInterest},
        ${openInterestUnits}, ${registeredInventory}, ${paperPhysicalRatio}, ${riskLevel}
      )
      ON CONFLICT (metal, report_date) 
      DO UPDATE SET 
        futures_symbol = EXCLUDED.futures_symbol,
        open_interest = EXCLUDED.open_interest,
        open_interest_units = EXCLUDED.open_interest_units,
        registered_inventory = EXCLUDED.registered_inventory,
        paper_physical_ratio = EXCLUDED.paper_physical_ratio,
        risk_level = EXCLUDED.risk_level,
        created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    return result[0].id;
  } catch (error) {
    console.error(`Error upserting paper/physical ratio for ${metal}:`, error);
    throw error;
  }
}

// Get latest open interest for all symbols
export async function getLatestOpenInterest(): Promise<OpenInterestSnapshot[]> {
  try {
    const result = await sql`
      SELECT DISTINCT ON (symbol) 
        id, symbol, report_date, open_interest, oi_change, total_volume, created_at
      FROM open_interest_snapshots
      ORDER BY symbol, report_date DESC
    `;
    return result as OpenInterestSnapshot[];
  } catch (error) {
    console.error('Error fetching latest open interest:', error);
    throw error;
  }
}

// Get latest paper/physical ratios for all metals
export async function getLatestPaperPhysicalRatios(): Promise<PaperPhysicalSnapshot[]> {
  try {
    const result = await sql`
      SELECT DISTINCT ON (metal) 
        id, metal, report_date, futures_symbol, open_interest, 
        open_interest_units, registered_inventory, paper_physical_ratio, risk_level, created_at
      FROM paper_physical_snapshots
      ORDER BY metal, report_date DESC
    `;
    return result as PaperPhysicalSnapshot[];
  } catch (error) {
    console.error('Error fetching latest paper/physical ratios:', error);
    throw error;
  }
}

// Get paper/physical history for a metal (for charts)
export async function getPaperPhysicalHistory(metal: string, days: number = 90): Promise<PaperPhysicalSnapshot[]> {
  try {
    const result = await sql`
      SELECT id, metal, report_date, futures_symbol, open_interest, 
             open_interest_units, registered_inventory, paper_physical_ratio, risk_level, created_at
      FROM paper_physical_snapshots
      WHERE metal = ${metal}
        AND report_date >= CURRENT_DATE - ${days}::integer
      ORDER BY report_date ASC
    `;
    return result as PaperPhysicalSnapshot[];
  } catch (error) {
    console.error(`Error fetching paper/physical history for ${metal}:`, error);
    throw error;
  }
}

// Get open interest history for a symbol (for charts)
export async function getOpenInterestHistory(symbol: string, days: number = 90): Promise<OpenInterestSnapshot[]> {
  try {
    const result = await sql`
      SELECT id, symbol, report_date, open_interest, oi_change, total_volume, created_at
      FROM open_interest_snapshots
      WHERE symbol = ${symbol}
        AND report_date >= CURRENT_DATE - ${days}::integer
      ORDER BY report_date ASC
    `;
    return result as OpenInterestSnapshot[];
  } catch (error) {
    console.error(`Error fetching open interest history for ${symbol}:`, error);
    throw error;
  }
}

// ============================================
// RISK SCORE DATA
// ============================================

export interface RiskScoreSnapshot {
  id: number;
  metal: string;
  report_date: string;
  composite_score: number;
  risk_level: string;
  coverage_risk: number;
  paper_physical_risk: number;
  inventory_trend_risk: number;
  delivery_velocity_risk: number;
  market_activity_risk: number;
  dominant_factor: string;
  commentary: string;
  created_at: Date;
}

// Initialize risk score tables
export async function initializeRiskScoreTables() {
  try {
    // Create risk_score_snapshots table for daily computed risk scores
    await sql`
      CREATE TABLE IF NOT EXISTS risk_score_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        composite_score INTEGER NOT NULL DEFAULT 0,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
        coverage_risk INTEGER NOT NULL DEFAULT 0,
        paper_physical_risk INTEGER NOT NULL DEFAULT 0,
        inventory_trend_risk INTEGER NOT NULL DEFAULT 0,
        delivery_velocity_risk INTEGER NOT NULL DEFAULT 0,
        market_activity_risk INTEGER NOT NULL DEFAULT 0,
        dominant_factor VARCHAR(100) NOT NULL DEFAULT '',
        commentary TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
      )
    `;

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_risk_score_metal_date 
      ON risk_score_snapshots(metal, report_date DESC)
    `;

    console.log('Risk score tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing risk score tables:', error);
    throw error;
  }
}

// Upsert risk score data
export async function upsertRiskScore(
  metal: string,
  reportDate: string,
  compositeScore: number,
  riskLevel: string,
  coverageRisk: number,
  paperPhysicalRisk: number,
  inventoryTrendRisk: number,
  deliveryVelocityRisk: number,
  marketActivityRisk: number,
  dominantFactor: string,
  commentary: string
): Promise<number> {
  try {
    const parsedDate = parseDate(reportDate);
    
    const result = await sql`
      INSERT INTO risk_score_snapshots (
        metal, report_date, composite_score, risk_level,
        coverage_risk, paper_physical_risk, inventory_trend_risk,
        delivery_velocity_risk, market_activity_risk,
        dominant_factor, commentary
      )
      VALUES (
        ${metal}, ${parsedDate}, ${compositeScore}, ${riskLevel},
        ${coverageRisk}, ${paperPhysicalRisk}, ${inventoryTrendRisk},
        ${deliveryVelocityRisk}, ${marketActivityRisk},
        ${dominantFactor}, ${commentary}
      )
      ON CONFLICT (metal, report_date) 
      DO UPDATE SET 
        composite_score = EXCLUDED.composite_score,
        risk_level = EXCLUDED.risk_level,
        coverage_risk = EXCLUDED.coverage_risk,
        paper_physical_risk = EXCLUDED.paper_physical_risk,
        inventory_trend_risk = EXCLUDED.inventory_trend_risk,
        delivery_velocity_risk = EXCLUDED.delivery_velocity_risk,
        market_activity_risk = EXCLUDED.market_activity_risk,
        dominant_factor = EXCLUDED.dominant_factor,
        commentary = EXCLUDED.commentary,
        created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    return result[0].id;
  } catch (error) {
    console.error(`Error upserting risk score for ${metal}:`, error);
    throw error;
  }
}

// Get latest risk scores for all metals
export async function getLatestRiskScores(): Promise<RiskScoreSnapshot[]> {
  try {
    const result = await sql`
      SELECT DISTINCT ON (metal) 
        id, metal, report_date, composite_score, risk_level,
        coverage_risk, paper_physical_risk, inventory_trend_risk,
        delivery_velocity_risk, market_activity_risk,
        dominant_factor, commentary, created_at
      FROM risk_score_snapshots
      ORDER BY metal, report_date DESC
    `;
    return result as RiskScoreSnapshot[];
  } catch (error) {
    console.error('Error fetching latest risk scores:', error);
    throw error;
  }
}

// Get risk score history for a metal (for charts)
export async function getRiskScoreHistory(metal: string, days: number = 90): Promise<RiskScoreSnapshot[]> {
  try {
    const result = await sql`
      SELECT id, metal, report_date, composite_score, risk_level,
             coverage_risk, paper_physical_risk, inventory_trend_risk,
             delivery_velocity_risk, market_activity_risk,
             dominant_factor, commentary, created_at
      FROM risk_score_snapshots
      WHERE metal = ${metal}
        AND report_date >= CURRENT_DATE - ${days}::integer
      ORDER BY report_date ASC
    `;
    return result as RiskScoreSnapshot[];
  } catch (error) {
    console.error(`Error fetching risk score history for ${metal}:`, error);
    throw error;
  }
}

// ============================================
// DELIVERY DATA
// ============================================

export interface DeliverySnapshot {
  id: number;
  metal: string;
  symbol: string;
  report_date: string;
  contract_month: string;
  settlement_price: number;
  daily_issued: number;
  daily_stopped: number;
  month_to_date: number;
  created_at: Date;
}

export interface DeliveryFirmSnapshot {
  id: number;
  delivery_snapshot_id: number;
  firm_code: string;
  firm_org: string;
  firm_name: string;
  issued: number;
  stopped: number;
}

// Initialize delivery tables
export async function initializeDeliveryTables() {
  try {
    // Create delivery_snapshots table for daily delivery data
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

    // Create delivery_firm_snapshots table for firm-level breakdown
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

    // Create indexes for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_delivery_snapshots_metal_date 
      ON delivery_snapshots(metal, report_date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_delivery_firm_snapshots_delivery_id 
      ON delivery_firm_snapshots(delivery_snapshot_id)
    `;

    console.log('Delivery tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing delivery tables:', error);
    throw error;
  }
}

// Upsert delivery snapshot
export async function upsertDeliverySnapshot(
  metal: string,
  symbol: string,
  reportDate: string,
  contractMonth: string,
  settlementPrice: number,
  dailyIssued: number,
  dailyStopped: number,
  monthToDate: number,
  firms: Array<{ code: string; org: string; name: string; issued: number; stopped: number }>
): Promise<number> {
  try {
    const parsedDate = parseDate(reportDate);
    
    // Upsert the delivery snapshot
    const result = await sql`
      INSERT INTO delivery_snapshots (
        metal, symbol, report_date, contract_month, settlement_price,
        daily_issued, daily_stopped, month_to_date
      )
      VALUES (
        ${metal}, ${symbol}, ${parsedDate}, ${contractMonth}, ${settlementPrice},
        ${dailyIssued}, ${dailyStopped}, ${monthToDate}
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

    // Delete existing firm data for this snapshot
    await sql`
      DELETE FROM delivery_firm_snapshots WHERE delivery_snapshot_id = ${snapshotId}
    `;

    // Insert new firm data
    for (const firm of firms) {
      await sql`
        INSERT INTO delivery_firm_snapshots (delivery_snapshot_id, firm_code, firm_org, firm_name, issued, stopped)
        VALUES (${snapshotId}, ${firm.code}, ${firm.org}, ${firm.name}, ${firm.issued}, ${firm.stopped})
      `;
    }

    return snapshotId;
  } catch (error) {
    console.error(`Error upserting delivery snapshot for ${metal}:`, error);
    throw error;
  }
}

// Get latest delivery snapshots for all metals
export async function getLatestDeliverySnapshots(): Promise<DeliverySnapshot[]> {
  try {
    const result = await sql`
      SELECT DISTINCT ON (metal) 
        id, metal, symbol, report_date, contract_month, settlement_price,
        daily_issued, daily_stopped, month_to_date, created_at
      FROM delivery_snapshots
      ORDER BY metal, report_date DESC
    `;
    return result as DeliverySnapshot[];
  } catch (error) {
    console.error('Error fetching latest delivery snapshots:', error);
    throw error;
  }
}

// Get delivery firms for a snapshot
export async function getDeliveryFirms(snapshotId: number): Promise<DeliveryFirmSnapshot[]> {
  try {
    const result = await sql`
      SELECT id, delivery_snapshot_id, firm_code, firm_org, firm_name, issued, stopped
      FROM delivery_firm_snapshots
      WHERE delivery_snapshot_id = ${snapshotId}
      ORDER BY issued DESC
    `;
    return result as DeliveryFirmSnapshot[];
  } catch (error) {
    console.error('Error fetching delivery firms:', error);
    throw error;
  }
}

// Get delivery history for a metal (for charts)
export async function getDeliveryHistory(metal: string, days: number = 90): Promise<DeliverySnapshot[]> {
  try {
    const result = await sql`
      SELECT id, metal, symbol, report_date, contract_month, settlement_price,
             daily_issued, daily_stopped, month_to_date, created_at
      FROM delivery_snapshots
      WHERE metal = ${metal}
        AND report_date >= CURRENT_DATE - ${days}::integer
      ORDER BY report_date ASC
    `;
    return result as DeliverySnapshot[];
  } catch (error) {
    console.error(`Error fetching delivery history for ${metal}:`, error);
    throw error;
  }
}

// ============================================
// NEWSLETTER SUBSCRIBERS
// ============================================

export interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribed_at: Date;
  unsubscribe_token: string;
  active: boolean;
  subscription_status: 'trial' | 'paid' | 'expired' | 'cancelled';
  trial_ends_at: Date | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

// Initialize newsletter subscribers table
export async function initializeNewsletterTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        unsubscribe_token VARCHAR(64) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        subscription_status VARCHAR(20) DEFAULT 'trial',
        trial_ends_at TIMESTAMP WITH TIME ZONE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255)
      )
    `;

    // Add new columns to existing tables (safe to run multiple times)
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial'`;
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`;
    await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)`;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_newsletter_email
      ON newsletter_subscribers(email)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_newsletter_token
      ON newsletter_subscribers(unsubscribe_token)
    `;

    console.log('Newsletter subscribers table initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing newsletter table:', error);
    throw error;
  }
}

// Add a new subscriber with trial status (or reactivate if previously unsubscribed)
export async function addSubscriber(email: string, unsubscribeToken: string): Promise<NewsletterSubscriber> {
  try {
    // 7 calendar days = ~5 business days
    const result = await sql`
      INSERT INTO newsletter_subscribers (email, unsubscribe_token, active, subscription_status, trial_ends_at)
      VALUES (${email.toLowerCase().trim()}, ${unsubscribeToken}, TRUE, 'trial', NOW() + INTERVAL '7 days')
      ON CONFLICT (email)
      DO UPDATE SET
        active = TRUE,
        unsubscribe_token = EXCLUDED.unsubscribe_token,
        subscribed_at = CURRENT_TIMESTAMP,
        subscription_status = CASE
          WHEN newsletter_subscribers.subscription_status = 'paid' THEN 'paid'
          ELSE 'trial'
        END,
        trial_ends_at = CASE
          WHEN newsletter_subscribers.subscription_status = 'paid' THEN newsletter_subscribers.trial_ends_at
          ELSE NOW() + INTERVAL '7 days'
        END
      RETURNING id, email, subscribed_at, unsubscribe_token, active, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id
    `;
    return result[0] as NewsletterSubscriber;
  } catch (error) {
    console.error('Error adding subscriber:', error);
    throw error;
  }
}

// Unsubscribe by token
export async function removeSubscriber(token: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE newsletter_subscribers
      SET active = FALSE
      WHERE unsubscribe_token = ${token} AND active = TRUE
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error removing subscriber:', error);
    throw error;
  }
}

// Get all eligible subscribers (paid OR active trial)
export async function getActiveSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const result = await sql`
      SELECT id, email, subscribed_at, unsubscribe_token, active,
             subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id
      FROM newsletter_subscribers
      WHERE active = TRUE
        AND (
          subscription_status = 'paid'
          OR (subscription_status = 'trial' AND trial_ends_at > NOW())
        )
      ORDER BY subscribed_at ASC
    `;
    return result as NewsletterSubscriber[];
  } catch (error) {
    console.error('Error fetching active subscribers:', error);
    throw error;
  }
}

// Get subscribers whose trial has expired (for sending upgrade emails)
export async function getExpiredTrials(): Promise<NewsletterSubscriber[]> {
  try {
    const result = await sql`
      SELECT id, email, subscribed_at, unsubscribe_token, active,
             subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id
      FROM newsletter_subscribers
      WHERE active = TRUE
        AND subscription_status = 'trial'
        AND trial_ends_at <= NOW()
      ORDER BY trial_ends_at ASC
    `;
    return result as NewsletterSubscriber[];
  } catch (error) {
    console.error('Error fetching expired trials:', error);
    throw error;
  }
}

// Update subscription status (used by Stripe webhook)
export async function updateSubscriptionStatus(
  email: string,
  status: 'trial' | 'paid' | 'expired' | 'cancelled',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE newsletter_subscribers
      SET subscription_status = ${status},
          stripe_customer_id = COALESCE(${stripeCustomerId || null}, stripe_customer_id),
          stripe_subscription_id = COALESCE(${stripeSubscriptionId || null}, stripe_subscription_id)
      WHERE email = ${email.toLowerCase().trim()}
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

// Mark expired trials
export async function markExpiredTrials(): Promise<number> {
  try {
    const result = await sql`
      UPDATE newsletter_subscribers
      SET subscription_status = 'expired'
      WHERE subscription_status = 'trial'
        AND trial_ends_at <= NOW()
        AND active = TRUE
      RETURNING id
    `;
    return result.length;
  } catch (error) {
    console.error('Error marking expired trials:', error);
    throw error;
  }
}

// Check if an email is already subscribed (active)
export async function isSubscribed(email: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM newsletter_subscribers
      WHERE email = ${email.toLowerCase().trim()} AND active = TRUE
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Error checking subscription:', error);
    throw error;
  }
}

// Get subscriber by email (for Stripe checkout)
export async function getSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
  try {
    const result = await sql`
      SELECT id, email, subscribed_at, unsubscribe_token, active,
             subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id
      FROM newsletter_subscribers
      WHERE email = ${email.toLowerCase().trim()}
    `;
    return result.length > 0 ? result[0] as NewsletterSubscriber : null;
  } catch (error) {
    console.error('Error fetching subscriber by email:', error);
    throw error;
  }
}

// ============================================
// NEWSLETTER ARCHIVE
// ============================================

export interface Newsletter {
  id: number;
  report_date: string;
  subject: string;
  html_content: string;
  metals_analyzed: number;
  avg_risk_score: number;
  created_at: Date;
}

// Save a generated newsletter (upsert by date)
export async function saveNewsletter(
  reportDate: string,
  subject: string,
  htmlContent: string,
  metalsAnalyzed: number,
  avgRiskScore: number
): Promise<Newsletter> {
  try {
    const result = await sql`
      INSERT INTO newsletters (report_date, subject, html_content, metals_analyzed, avg_risk_score)
      VALUES (${reportDate}, ${subject}, ${htmlContent}, ${metalsAnalyzed}, ${avgRiskScore})
      ON CONFLICT (report_date)
      DO UPDATE SET
        subject = EXCLUDED.subject,
        html_content = EXCLUDED.html_content,
        metals_analyzed = EXCLUDED.metals_analyzed,
        avg_risk_score = EXCLUDED.avg_risk_score,
        created_at = CURRENT_TIMESTAMP
      RETURNING id, report_date, subject, html_content, metals_analyzed, avg_risk_score, created_at
    `;
    return result[0] as Newsletter;
  } catch (error) {
    console.error('Error saving newsletter:', error);
    throw error;
  }
}

// Get the most recent newsletter
export async function getLatestNewsletter(): Promise<Newsletter | null> {
  try {
    const result = await sql`
      SELECT id, report_date, subject, html_content, metals_analyzed, avg_risk_score, created_at
      FROM newsletters
      ORDER BY report_date DESC
      LIMIT 1
    `;
    return result.length > 0 ? result[0] as Newsletter : null;
  } catch (error) {
    console.error('Error fetching latest newsletter:', error);
    throw error;
  }
}

// Get a newsletter by date
export async function getNewsletterByDate(reportDate: string): Promise<Newsletter | null> {
  try {
    const result = await sql`
      SELECT id, report_date, subject, html_content, metals_analyzed, avg_risk_score, created_at
      FROM newsletters
      WHERE report_date = ${reportDate}
    `;
    return result.length > 0 ? result[0] as Newsletter : null;
  } catch (error) {
    console.error('Error fetching newsletter by date:', error);
    throw error;
  }
}

// Get previous day's risk scores for comparison
export async function getPreviousRiskScores(): Promise<RiskScoreSnapshot[]> {
  try {
    // Get the two most recent dates
    const dates = await sql`
      SELECT DISTINCT report_date FROM risk_score_snapshots
      ORDER BY report_date DESC LIMIT 2
    `;
    if (dates.length < 2) return [];
    const prevDate = dates[1].report_date;
    const result = await sql`
      SELECT id, metal, report_date, composite_score, risk_level,
             coverage_risk, paper_physical_risk, inventory_trend_risk,
             delivery_velocity_risk, market_activity_risk,
             dominant_factor, commentary, created_at
      FROM risk_score_snapshots
      WHERE report_date = ${prevDate}
    `;
    return result as RiskScoreSnapshot[];
  } catch (error) {
    console.error('Error fetching previous risk scores:', error);
    return [];
  }
}

// Get previous day's open interest for comparison
export async function getPreviousOpenInterest(): Promise<OpenInterestSnapshot[]> {
  try {
    const dates = await sql`
      SELECT DISTINCT report_date FROM open_interest_snapshots
      ORDER BY report_date DESC LIMIT 2
    `;
    if (dates.length < 2) return [];
    const prevDate = dates[1].report_date;
    const result = await sql`
      SELECT id, symbol, report_date, open_interest, oi_change, total_volume, created_at
      FROM open_interest_snapshots
      WHERE report_date = ${prevDate}
    `;
    return result as OpenInterestSnapshot[];
  } catch (error) {
    console.error('Error fetching previous open interest:', error);
    return [];
  }
}

// Get previous day's paper/physical ratios for comparison
export async function getPreviousPaperPhysical(): Promise<PaperPhysicalSnapshot[]> {
  try {
    const dates = await sql`
      SELECT DISTINCT report_date FROM paper_physical_snapshots
      ORDER BY report_date DESC LIMIT 2
    `;
    if (dates.length < 2) return [];
    const prevDate = dates[1].report_date;
    const result = await sql`
      SELECT id, metal, report_date, futures_symbol, open_interest,
             open_interest_units, registered_inventory, paper_physical_ratio, risk_level, created_at
      FROM paper_physical_snapshots
      WHERE report_date = ${prevDate}
    `;
    return result as PaperPhysicalSnapshot[];
  } catch (error) {
    console.error('Error fetching previous paper/physical:', error);
    return [];
  }
}

// Get delivery history for all metals (for charts)
export async function getAllDeliveryHistory(days: number = 30): Promise<DeliverySnapshot[]> {
  try {
    const result = await sql`
      SELECT id, metal, symbol, report_date, contract_month, settlement_price,
             daily_issued, daily_stopped, month_to_date, created_at
      FROM delivery_snapshots
      WHERE report_date >= CURRENT_DATE - ${days}::integer
      ORDER BY report_date ASC, metal
    `;
    return result as DeliverySnapshot[];
  } catch (error) {
    console.error('Error fetching all delivery history:', error);
    throw error;
  }
}

// ============================================
// BUILD ANALYSIS FROM DB (for newsletter)
// ============================================

const SYMBOL_TO_METAL: Record<string, string> = {
  GC: 'Gold', '1OZ': 'Gold', MGC: 'Gold',
  SI: 'Silver', SIL: 'Silver',
  HG: 'Copper',
  PL: 'Platinum', PA: 'Palladium',
  ALI: 'Aluminum',
};

/** Build the full analysis_summary structure from the most recent DB data */
export async function buildLatestAnalysisFromDb(): Promise<Record<string, unknown> | null> {
  try {
    // 1. Get latest report_date from risk_score_snapshots
    const dateResult = await sql`
      SELECT report_date FROM risk_score_snapshots
      ORDER BY report_date DESC LIMIT 1
    `;
    if (dateResult.length === 0) return null;

    const reportDate = typeof dateResult[0].report_date === 'string'
      ? dateResult[0].report_date
      : (dateResult[0].report_date as Date).toISOString().split('T')[0];

    // 2. Fetch all data for that date
    const [riskScores, ppRatios, deliveries, metalSnaps, oiRows, bulletinRows] = await Promise.all([
      sql`SELECT metal, composite_score, risk_level, dominant_factor, commentary
         FROM risk_score_snapshots WHERE report_date = ${reportDate}`,
      sql`SELECT metal, futures_symbol, open_interest, open_interest_units, registered_inventory,
             paper_physical_ratio, risk_level FROM paper_physical_snapshots WHERE report_date = ${reportDate}`,
      sql`SELECT d.id, d.metal, d.symbol, d.contract_month, d.settlement_price, d.daily_issued,
             d.daily_stopped, d.month_to_date,
             (SELECT COALESCE(json_agg(json_build_object('name', f.firm_name, 'issued', f.issued, 'stopped', f.stopped)), '[]'::json)
              FROM delivery_firm_snapshots f WHERE f.delivery_snapshot_id = d.id) as firms
         FROM delivery_snapshots d WHERE report_date = ${reportDate}`,
      sql`SELECT metal, report_date, activity_date, registered, eligible, total
         FROM metal_snapshots WHERE report_date = ${reportDate}`,
      sql`SELECT symbol, open_interest, oi_change, total_volume
         FROM open_interest_snapshots WHERE report_date = ${reportDate}`,
      sql`SELECT symbol, front_month_settle, front_month_change, total_volume, total_open_interest, total_oi_change
         FROM bulletin_snapshots WHERE date = ${reportDate}::date`,
    ]);

    const riskMap = Object.fromEntries((riskScores as { metal: string; composite_score: number; risk_level: string; dominant_factor: string; commentary: string }[])
      .map(r => [r.metal, r]));
    const ppMap = Object.fromEntries((ppRatios as { metal: string; futures_symbol: string; open_interest: number; open_interest_units: number; registered_inventory: number; paper_physical_ratio: number; risk_level: string }[])
      .map(p => [p.metal, p]));
    const delMap = Object.fromEntries((deliveries as { metal: string; symbol: string; contract_month: string; settlement_price: number; daily_issued: number; daily_stopped: number; month_to_date: number; firms: unknown }[])
      .map(d => [d.metal, d]));
    const metalMap = Object.fromEntries((metalSnaps as { metal: string; report_date: string; activity_date: string | null; registered: number; eligible: number; total: number }[])
      .map(m => [m.metal, m]));

    // Map symbol -> market data (bulletin + OI)
    const bulletinBySym = Object.fromEntries((bulletinRows as { symbol: string; front_month_settle: number | null; front_month_change: number | null; total_volume: number; total_open_interest: number; total_oi_change: number }[])
      .map(b => [b.symbol, b]));
    const oiBySym = Object.fromEntries((oiRows as { symbol: string; open_interest: number; oi_change: number; total_volume: number }[])
      .map(o => [o.symbol, o]));

    const metalOrder = ['Gold', 'Silver', 'Copper', 'Platinum_Palladium', 'Aluminum'];
    const symbolForMetal: Record<string, string[]> = {
      Gold: ['GC', '1OZ', 'MGC'],
      Silver: ['SI', 'SIL'],
      Copper: ['HG'],
      Platinum_Palladium: ['PL', 'PA'],
      Aluminum: ['ALI'],
    };

    const metals: Record<string, unknown> = {};

    for (const metal of metalOrder) {
      const symbols = symbolForMetal[metal] || [];
      let bulletinRow = null;
      let oiRow = null;
      for (const sym of symbols) {
        bulletinRow = bulletinBySym[sym] || bulletinRow;
        oiRow = oiBySym[sym] || oiRow;
      }
      if (!bulletinRow && symbols.length > 0) bulletinRow = bulletinBySym[symbols[0]];
      if (!oiRow && symbols.length > 0) oiRow = oiBySym[symbols[0]];

      const metalSnap = metalMap[metal];
      const pp = ppMap[metal];
      const del = delMap[metal];
      const risk = riskMap[metal];

      const total = metalSnap ? Number(metalSnap.total) : 0;
      const reg = metalSnap ? Number(metalSnap.registered) : 0;
      const regPct = total > 0 ? (reg / total * 100).toFixed(1) : '0';

      const bs = bulletinRow as { front_month_settle?: number; front_month_change?: number; total_volume?: number; total_open_interest?: number; total_oi_change?: number } | null;
      const oi = oiRow as { open_interest?: number; oi_change?: number; total_volume?: number } | null;

      const frontSettle = bs?.front_month_settle ?? null;
      const frontChange = bs?.front_month_change ?? null;
      const totalVol = bs?.total_volume ?? oi?.total_volume ?? 0;
      const oiChange = bs?.total_oi_change ?? oi?.oi_change ?? 0;

      metals[metal] = {
        warehouse: metalSnap ? {
          registered: Number(metalSnap.registered),
          eligible: Number(metalSnap.eligible),
          total: Number(metalSnap.total),
          registered_pct: regPct,
          eligible_pct: (100 - parseFloat(regPct)).toFixed(1),
          depositories: [],
          depository_count: 0,
        } : null,
        paper_physical: pp ? {
          open_interest: Number(pp.open_interest),
          open_interest_units: Number(pp.open_interest_units),
          registered_inventory: Number(pp.registered_inventory),
          ratio: Number(pp.paper_physical_ratio),
          ratio_display: `${Number(pp.paper_physical_ratio).toFixed(2)}:1`,
          risk_level: pp.risk_level,
          unit: metal === 'Copper' ? 'short tons' : metal === 'Aluminum' ? 'metric tons' : 'oz',
        } : null,
        delivery: del ? {
          contract_month: del.contract_month,
          settlement_price: Number(del.settlement_price),
          daily_issued: del.daily_issued || 0,
          daily_stopped: del.daily_stopped || 0,
          month_to_date_contracts: del.month_to_date || 0,
          month_to_date_units: 0,
          top_issuers: (Array.isArray(del.firms) ? del.firms : [])
            .filter((f: unknown): f is { name?: string; issued?: number } => f != null && typeof f === 'object' && ((f as { issued?: number }).issued ?? 0) > 0)
            .sort((a, b) => (b.issued ?? 0) - (a.issued ?? 0))
            .slice(0, 3)
            .map((f) => ({ name: f.name || 'N/A', issued: f.issued ?? 0 })),
          top_stoppers: [],
        } : null,
        market: {
          total_volume: totalVol,
          oi_change: oiChange,
          front_month_settle: frontSettle,
          front_month_change: frontChange,
        },
        risk_score: risk ? {
          composite: Number(risk.composite_score),
          level: risk.risk_level,
          dominant_factor: risk.dominant_factor,
          commentary: risk.commentary,
        } : null,
      };
    }

    // Build risk ranking (sorted by score desc)
    const ranking = (riskScores as { metal: string; composite_score: number; risk_level: string; dominant_factor: string }[])
      .map(r => ({ metal: r.metal, score: Number(r.composite_score), level: r.risk_level, dominant_factor: r.dominant_factor }))
      .sort((a, b) => b.score - a.score);

    const avgScore = ranking.length > 0
      ? Math.round(ranking.reduce((s, r) => s + r.score, 0) / ranking.length)
      : 0;
    const highRisk = ranking.filter(r => ['EXTREME', 'HIGH'].includes(r.level)).length;
    const avgLevel = avgScore >= 75 ? 'EXTREME' : avgScore >= 60 ? 'HIGH' : avgScore >= 45 ? 'WARNING' : avgScore >= 30 ? 'MODERATE' : 'LOW';

    // Build key_findings from risk scores
    const keyFindings: { severity: string; metal?: string; score?: number; finding: string }[] = [];
    for (const r of ranking) {
      const risk = riskMap[r.metal];
      if (risk && ['EXTREME', 'HIGH'].includes(r.level)) {
        keyFindings.push({ severity: r.level, metal: r.metal, score: r.score, finding: (risk as { commentary: string }).commentary });
      }
    }
    for (const [metal, pp] of Object.entries(ppMap)) {
      const p = pp as { paper_physical_ratio: number; open_interest_units: number; registered_inventory: number; risk_level: string };
      if (['EXTREME', 'HIGH'].includes(p.risk_level)) {
        keyFindings.push({
          severity: 'WARNING',
          metal,
          finding: `Paper/physical ratio at ${Number(p.paper_physical_ratio).toFixed(2)}:1 - ${p.risk_level} risk. ${Number(p.open_interest_units).toLocaleString()} in paper claims vs ${Number(p.registered_inventory).toLocaleString()} registered.`,
        });
      }
    }

    return {
      report_date: reportDate,
      activity_date: reportDate,
      generated_at: new Date().toISOString(),
      metals,
      key_findings: keyFindings,
      market_overview: {
        report_date: reportDate,
        metals_analyzed: ranking.length,
        average_risk_score: avgScore,
        average_risk_level: avgLevel,
        high_risk_metals: highRisk,
        risk_ranking: ranking,
      },
    };
  } catch (error) {
    console.error('Error building analysis from DB:', error);
    return null;
  }
}


// ============================================
// FORECAST TABLES
// ============================================

export interface ForecastSnapshot {
  id: number;
  metal: string;
  forecast_date: string;
  direction: string;
  confidence: number;
  composite_score: number;
  price_at_forecast: number;
  squeeze_probability: number;
  regime: string;
  trend_score: number;
  physical_score: number;
  arima_score: number;
  market_score: number;
  forecast_5d_low: number | null;
  forecast_5d_mid: number | null;
  forecast_5d_high: number | null;
  forecast_20d_low: number | null;
  forecast_20d_mid: number | null;
  forecast_20d_high: number | null;
  key_drivers: string;
  created_at: Date;
}

export interface ForecastAccuracy {
  id: number;
  forecast_snapshot_id: number;
  metal: string;
  forecast_date: string;
  direction: string;
  price_at_forecast: number;
  eval_date: string;
  eval_horizon_days: number;
  price_at_eval: number;
  price_change: number;
  price_change_pct: number;
  correct: boolean;
  created_at: Date;
}

export interface ForecastPriceTracking {
  id: number;
  metal: string;
  forecast_date: string;
  tracking_date: string;
  days_since_forecast: number;
  price_at_forecast: number;
  live_price: number;
  price_change: number;
  price_change_pct: number;
  direction_at_forecast: string;
  is_tracking: boolean;
  created_at: Date;
}

// Initialize forecast tables
export async function initializeForecastTables() {
  try {
    // forecast_snapshots: one row per metal per forecast run
    await sql`
      CREATE TABLE IF NOT EXISTS forecast_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        forecast_date DATE NOT NULL,
        direction VARCHAR(20) NOT NULL,
        confidence INTEGER NOT NULL DEFAULT 0,
        composite_score DECIMAL(6, 2) NOT NULL DEFAULT 50,
        price_at_forecast DECIMAL(15, 4) NOT NULL DEFAULT 0,
        squeeze_probability INTEGER NOT NULL DEFAULT 0,
        regime VARCHAR(20) DEFAULT 'UNKNOWN',
        trend_score DECIMAL(6, 2) DEFAULT 50,
        physical_score DECIMAL(6, 2) DEFAULT 50,
        arima_score DECIMAL(6, 2) DEFAULT 50,
        market_score DECIMAL(6, 2) DEFAULT 50,
        forecast_5d_low DECIMAL(15, 4),
        forecast_5d_mid DECIMAL(15, 4),
        forecast_5d_high DECIMAL(15, 4),
        forecast_20d_low DECIMAL(15, 4),
        forecast_20d_mid DECIMAL(15, 4),
        forecast_20d_high DECIMAL(15, 4),
        key_drivers TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, forecast_date)
      )
    `;

    // forecast_accuracy: evaluated correctness of past forecasts
    await sql`
      CREATE TABLE IF NOT EXISTS forecast_accuracy (
        id SERIAL PRIMARY KEY,
        forecast_snapshot_id INTEGER REFERENCES forecast_snapshots(id) ON DELETE CASCADE,
        metal VARCHAR(50) NOT NULL,
        forecast_date DATE NOT NULL,
        direction VARCHAR(20) NOT NULL,
        price_at_forecast DECIMAL(15, 4) NOT NULL,
        eval_date DATE NOT NULL,
        eval_horizon_days INTEGER NOT NULL,
        price_at_eval DECIMAL(15, 4) NOT NULL,
        price_change DECIMAL(15, 4) NOT NULL DEFAULT 0,
        price_change_pct DECIMAL(10, 4) NOT NULL DEFAULT 0,
        correct BOOLEAN NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, forecast_date, eval_horizon_days)
      )
    `;

    // forecast_price_tracking: periodic live price captures vs forecast price
    await sql`
      CREATE TABLE IF NOT EXISTS forecast_price_tracking (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        forecast_date DATE NOT NULL,
        tracking_date DATE NOT NULL,
        days_since_forecast INTEGER NOT NULL,
        price_at_forecast DECIMAL(15, 4) NOT NULL,
        live_price DECIMAL(15, 4) NOT NULL,
        price_change DECIMAL(15, 4) NOT NULL DEFAULT 0,
        price_change_pct DECIMAL(10, 4) NOT NULL DEFAULT 0,
        direction_at_forecast VARCHAR(20) NOT NULL,
        is_tracking BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, forecast_date, tracking_date)
      )
    `;

    // Indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_forecast_snapshots_metal_date
      ON forecast_snapshots(metal, forecast_date DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_metal_date
      ON forecast_accuracy(metal, forecast_date DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_forecast_price_tracking_metal
      ON forecast_price_tracking(metal, forecast_date DESC, tracking_date DESC)
    `;

    console.log('Forecast tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing forecast tables:', error);
    throw error;
  }
}

// Upsert a forecast snapshot
export async function upsertForecastSnapshot(
  metal: string,
  forecastDate: string,
  direction: string,
  confidence: number,
  compositeScore: number,
  priceAtForecast: number,
  squeezeProbability: number,
  regime: string,
  trendScore: number,
  physicalScore: number,
  arimaScore: number,
  marketScore: number,
  forecast5d: { low: number; mid: number; high: number } | null,
  forecast20d: { low: number; mid: number; high: number } | null,
  keyDrivers: string[],
): Promise<number> {
  try {
    const result = await sql`
      INSERT INTO forecast_snapshots (
        metal, forecast_date, direction, confidence, composite_score,
        price_at_forecast, squeeze_probability, regime,
        trend_score, physical_score, arima_score, market_score,
        forecast_5d_low, forecast_5d_mid, forecast_5d_high,
        forecast_20d_low, forecast_20d_mid, forecast_20d_high,
        key_drivers
      ) VALUES (
        ${metal}, ${forecastDate}::date, ${direction}, ${confidence}, ${compositeScore},
        ${priceAtForecast}, ${squeezeProbability}, ${regime},
        ${trendScore}, ${physicalScore}, ${arimaScore}, ${marketScore},
        ${forecast5d?.low ?? null}, ${forecast5d?.mid ?? null}, ${forecast5d?.high ?? null},
        ${forecast20d?.low ?? null}, ${forecast20d?.mid ?? null}, ${forecast20d?.high ?? null},
        ${keyDrivers.join(' | ')}
      )
      ON CONFLICT (metal, forecast_date)
      DO UPDATE SET
        direction = EXCLUDED.direction,
        confidence = EXCLUDED.confidence,
        composite_score = EXCLUDED.composite_score,
        price_at_forecast = EXCLUDED.price_at_forecast,
        squeeze_probability = EXCLUDED.squeeze_probability,
        regime = EXCLUDED.regime,
        trend_score = EXCLUDED.trend_score,
        physical_score = EXCLUDED.physical_score,
        arima_score = EXCLUDED.arima_score,
        market_score = EXCLUDED.market_score,
        forecast_5d_low = EXCLUDED.forecast_5d_low,
        forecast_5d_mid = EXCLUDED.forecast_5d_mid,
        forecast_5d_high = EXCLUDED.forecast_5d_high,
        forecast_20d_low = EXCLUDED.forecast_20d_low,
        forecast_20d_mid = EXCLUDED.forecast_20d_mid,
        forecast_20d_high = EXCLUDED.forecast_20d_high,
        key_drivers = EXCLUDED.key_drivers,
        created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    return (result[0] as { id: number }).id;
  } catch (error) {
    console.error(`Error upserting forecast snapshot for ${metal}:`, error);
    throw error;
  }
}

// Insert an accuracy evaluation
export async function insertForecastAccuracy(
  forecastSnapshotId: number,
  metal: string,
  forecastDate: string,
  direction: string,
  priceAtForecast: number,
  evalDate: string,
  evalHorizonDays: number,
  priceAtEval: number,
): Promise<void> {
  const priceChange = priceAtEval - priceAtForecast;
  const priceChangePct = priceAtForecast > 0
    ? (priceChange / priceAtForecast) * 100
    : 0;
  const correct =
    (direction === 'BULLISH' && priceChange > 0) ||
    (direction === 'BEARISH' && priceChange < 0);

  try {
    await sql`
      INSERT INTO forecast_accuracy (
        forecast_snapshot_id, metal, forecast_date, direction,
        price_at_forecast, eval_date, eval_horizon_days,
        price_at_eval, price_change, price_change_pct, correct
      ) VALUES (
        ${forecastSnapshotId}, ${metal}, ${forecastDate}::date, ${direction},
        ${priceAtForecast}, ${evalDate}::date, ${evalHorizonDays},
        ${priceAtEval}, ${priceChange}, ${priceChangePct}, ${correct}
      )
      ON CONFLICT (metal, forecast_date, eval_horizon_days) DO UPDATE SET
        price_at_eval = EXCLUDED.price_at_eval,
        price_change = EXCLUDED.price_change,
        price_change_pct = EXCLUDED.price_change_pct,
        correct = EXCLUDED.correct,
        eval_date = EXCLUDED.eval_date,
        created_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error(`Error inserting forecast accuracy for ${metal}:`, error);
    throw error;
  }
}

// Insert a price tracking entry
export async function upsertForecastPriceTracking(
  metal: string,
  forecastDate: string,
  trackingDate: string,
  daysSinceForecast: number,
  priceAtForecast: number,
  livePrice: number,
  directionAtForecast: string,
): Promise<void> {
  const priceChange = livePrice - priceAtForecast;
  const priceChangePct = priceAtForecast > 0
    ? (priceChange / priceAtForecast) * 100
    : 0;
  const isTracking =
    (directionAtForecast === 'BULLISH' && priceChange > 0) ||
    (directionAtForecast === 'BEARISH' && priceChange < 0);

  try {
    await sql`
      INSERT INTO forecast_price_tracking (
        metal, forecast_date, tracking_date, days_since_forecast,
        price_at_forecast, live_price, price_change, price_change_pct,
        direction_at_forecast, is_tracking
      ) VALUES (
        ${metal}, ${forecastDate}::date, ${trackingDate}::date, ${daysSinceForecast},
        ${priceAtForecast}, ${livePrice}, ${priceChange}, ${priceChangePct},
        ${directionAtForecast}, ${isTracking}
      )
      ON CONFLICT (metal, forecast_date, tracking_date) DO UPDATE SET
        live_price = EXCLUDED.live_price,
        price_change = EXCLUDED.price_change,
        price_change_pct = EXCLUDED.price_change_pct,
        is_tracking = EXCLUDED.is_tracking,
        created_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error(`Error upserting price tracking for ${metal}:`, error);
    throw error;
  }
}

// Get forecast history for accuracy display
export async function getForecastAccuracySummary(days: number = 90): Promise<{
  metals: Record<string, { total: number; correct: number; incorrect: number; pending: number; hit_rate: number | null }>;
  overall: { total: number; correct: number; hit_rate: number | null };
  history: ForecastAccuracy[];
}> {
  try {
    // Get evaluated accuracy records
    const accuracyRows = await sql`
      SELECT id, forecast_snapshot_id, metal, forecast_date, direction,
             price_at_forecast, eval_date, eval_horizon_days,
             price_at_eval, price_change, price_change_pct, correct, created_at
      FROM forecast_accuracy
      WHERE forecast_date >= CURRENT_DATE - ${days}
      ORDER BY forecast_date DESC, metal
    `;

    // Get pending (unevaluated) forecast count
    const pendingRows = await sql`
      SELECT fs.metal, COUNT(*) as cnt
      FROM forecast_snapshots fs
      LEFT JOIN forecast_accuracy fa
        ON fs.metal = fa.metal AND fs.forecast_date = fa.forecast_date AND fa.eval_horizon_days = 5
      WHERE fs.forecast_date >= CURRENT_DATE - ${days}
        AND fs.direction != 'NEUTRAL'
        AND fa.id IS NULL
      GROUP BY fs.metal
    `;

    const pendingByMetal: Record<string, number> = {};
    for (const row of pendingRows as { metal: string; cnt: string }[]) {
      pendingByMetal[row.metal] = parseInt(row.cnt);
    }

    // Aggregate by metal
    const metals: Record<string, { total: number; correct: number; incorrect: number; pending: number; hit_rate: number | null }> = {};
    let totalCorrect = 0;
    let totalEvaluated = 0;

    for (const row of accuracyRows as ForecastAccuracy[]) {
      if (!metals[row.metal]) {
        metals[row.metal] = { total: 0, correct: 0, incorrect: 0, pending: pendingByMetal[row.metal] || 0, hit_rate: null };
      }
      metals[row.metal].total += 1;
      if (row.correct) {
        metals[row.metal].correct += 1;
        totalCorrect += 1;
      } else {
        metals[row.metal].incorrect += 1;
      }
      totalEvaluated += 1;
    }

    // Compute hit rates
    for (const metal of Object.keys(metals)) {
      const evaluated = metals[metal].correct + metals[metal].incorrect;
      metals[metal].hit_rate = evaluated > 0 ? Math.round(metals[metal].correct / evaluated * 100) : null;
    }

    return {
      metals,
      overall: {
        total: totalEvaluated,
        correct: totalCorrect,
        hit_rate: totalEvaluated > 0 ? Math.round(totalCorrect / totalEvaluated * 100) : null,
      },
      history: accuracyRows as ForecastAccuracy[],
    };
  } catch (error) {
    console.error('Error fetching forecast accuracy:', error);
    return { metals: {}, overall: { total: 0, correct: 0, hit_rate: null }, history: [] };
  }
}

// Get price tracking for a specific metal
export async function getForecastPriceTracking(metal: string, days: number = 30): Promise<ForecastPriceTracking[]> {
  try {
    const result = await sql`
      SELECT id, metal, forecast_date, tracking_date, days_since_forecast,
             price_at_forecast, live_price, price_change, price_change_pct,
             direction_at_forecast, is_tracking, created_at
      FROM forecast_price_tracking
      WHERE metal = ${metal}
        AND forecast_date >= CURRENT_DATE - ${days}
      ORDER BY forecast_date DESC, tracking_date DESC
    `;
    return result as ForecastPriceTracking[];
  } catch (error) {
    console.error(`Error fetching price tracking for ${metal}:`, error);
    return [];
  }
}

// Get all forecast snapshots history
export async function getForecastHistory(days: number = 90): Promise<ForecastSnapshot[]> {
  try {
    const result = await sql`
      SELECT id, metal, forecast_date, direction, confidence, composite_score,
             price_at_forecast, squeeze_probability, regime,
             trend_score, physical_score, arima_score, market_score,
             forecast_5d_low, forecast_5d_mid, forecast_5d_high,
             forecast_20d_low, forecast_20d_mid, forecast_20d_high,
             key_drivers, created_at
      FROM forecast_snapshots
      WHERE forecast_date >= CURRENT_DATE - ${days}
      ORDER BY forecast_date DESC, metal
    `;
    return result as ForecastSnapshot[];
  } catch (error) {
    console.error('Error fetching forecast history:', error);
    return [];
  }
}
