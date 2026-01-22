import { neon } from '@neondatabase/serverless';

// Create a SQL query function using the DATABASE_URL
const sql = neon(process.env.DATABASE_URL!);

export { sql };

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

// Get snapshot from N days ago for a metal
export async function getSnapshotFromDaysAgo(metal: string, daysAgo: number): Promise<MetalSnapshot | null> {
  try {
    const result = await sql`
      SELECT id, metal, report_date, activity_date, registered, eligible, total, created_at
      FROM metal_snapshots
      WHERE metal = ${metal}
        AND report_date <= CURRENT_DATE - ${daysAgo}::integer
      ORDER BY report_date DESC
      LIMIT 1
    `;
    return result.length > 0 ? result[0] as MetalSnapshot : null;
  } catch (error) {
    console.error(`Error fetching snapshot from ${daysAgo} days ago:`, error);
    throw error;
  }
}

// Get snapshot from approximately 30 days ago (for month-over-month)
export async function getMonthAgoSnapshot(metal: string): Promise<MetalSnapshot | null> {
  return getSnapshotFromDaysAgo(metal, 30);
}

// Get yesterday's snapshot (for day-over-day)
export async function getYesterdaySnapshot(metal: string): Promise<MetalSnapshot | null> {
  return getSnapshotFromDaysAgo(metal, 1);
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
