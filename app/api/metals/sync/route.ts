import { NextResponse } from 'next/server';
import { upsertMetalSnapshot, initializeDatabase } from '@/lib/db';
import { isAuthorized } from '@/lib/auth';

interface DepositoryData {
  name: string;
  registered: number;
  eligible: number;
  total: number;
}

interface MetalData {
  metal: string;
  report_date: string | null;
  activity_date: string | null;
  depositories: DepositoryData[];
  totals: {
    registered: number;
    eligible: number;
    total: number;
  };
}

// POST /api/metals/sync - Sync metals data to the database
// This endpoint receives data from the Python script or can be called with JSON payload
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ensure database tables exist
    await initializeDatabase();

    const body = await request.json();
    
    // Validate the data structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid data format' },
        { status: 400 }
      );
    }

    const results: { metal: string; success: boolean; error?: string }[] = [];

    // Process each metal in the payload
    for (const [metalKey, metalData] of Object.entries(body)) {
      try {
        const data = metalData as MetalData;
        
        // Skip if no valid data
        if (!data.totals || data.totals.total === 0) {
          results.push({ metal: metalKey, success: false, error: 'No data' });
          continue;
        }

        // Use report_date or current date
        const reportDate = data.report_date || new Date().toISOString().split('T')[0];

        await upsertMetalSnapshot(
          metalKey,
          reportDate,
          data.activity_date,
          data.totals.registered,
          data.totals.eligible,
          data.totals.total,
          data.depositories || []
        );

        results.push({ metal: metalKey, success: true });
      } catch (error) {
        console.error(`Error syncing ${metalKey}:`, error);
        results.push({ 
          metal: metalKey, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `Synced ${successCount} metals, ${failCount} failed`,
      results
    });
  } catch (error) {
    console.error('Error syncing metals data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync metals data' },
      { status: 500 }
    );
  }
}
