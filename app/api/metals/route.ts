import { NextResponse } from 'next/server';
import { getWarehouseDataWithChanges, getLatestSnapshots } from '@/lib/db';

// ISR: metals data changes once/day, cache for 5 minutes
export const revalidate = 300;

// GET /api/metals - Get all metals data with percent changes
export async function GET() {
  try {
    const data = await getWarehouseDataWithChanges();
    
    // Check if we have data
    const snapshots = await getLatestSnapshots();
    if (snapshots.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No data available. Please run the data sync first.',
          data: null 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching metals data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metals data' },
      { status: 500 }
    );
  }
}
