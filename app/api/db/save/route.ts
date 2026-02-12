import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST: Store warehouse data for a specific date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, data } = body; // date: YYYY-MM-DD, data: WarehouseStocksData

    if (!date || !data) {
      return NextResponse.json(
        { error: 'Date and data are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Insert or update data for each metal
    const metals = Object.keys(data);
    let inserted = 0;
    let updated = 0;

    for (const metal of metals) {
      const metalData = data[metal];
      if (!metalData || !metalData.totals) {
        continue;
      }

      try {
        // Use INSERT ... ON CONFLICT to handle duplicates
        await sql`
          INSERT INTO warehouse_snapshots (
            date, metal, report_date, activity_date,
            registered, eligible, total
          ) VALUES (
            ${date}::date,
            ${metal},
            ${metalData.report_date || null},
            ${metalData.activity_date || null},
            ${metalData.totals.registered || 0},
            ${metalData.totals.eligible || 0},
            ${metalData.totals.total || 0}
          )
          ON CONFLICT (date, metal) 
          DO UPDATE SET
            report_date = EXCLUDED.report_date,
            activity_date = EXCLUDED.activity_date,
            registered = EXCLUDED.registered,
            eligible = EXCLUDED.eligible,
            total = EXCLUDED.total,
            created_at = CURRENT_TIMESTAMP
        `;
        
        // Check if it was an insert or update by querying first
        const checkResult = await sql`
          SELECT COUNT(*) as count
          FROM warehouse_snapshots
          WHERE date = ${date}::date AND metal = ${metal}
        `;
        
        if ((checkResult as Record<string, unknown>[])[0].count === '1') {
          // Check if it was just created (within last second) or updated
          const existingResult = await sql`
            SELECT created_at
            FROM warehouse_snapshots
            WHERE date = ${date}::date AND metal = ${metal}
          `;
          const createdAt = new Date((existingResult as Record<string, unknown>[])[0].created_at as string);
          const now = new Date();
          if (now.getTime() - createdAt.getTime() < 2000) {
            inserted++;
          } else {
            updated++;
          }
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error saving ${metal}:`, errMsg);
        // Continue with other metals
      }
    }

    return NextResponse.json({
      success: true,
      date,
      inserted,
      updated,
      total: metals.length,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error storing data:', error);
    return NextResponse.json(
      { error: 'Failed to store data', details: errMsg },
      { status: 500 }
    );
  }
}
