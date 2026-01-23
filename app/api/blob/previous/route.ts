import { list, head } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// GET: Retrieve previous day's data (most recent before today)
export async function GET(request: NextRequest) {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob token not configured' },
        { status: 500 }
      );
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // List all available blobs
    const { blobs } = await list({
      prefix: 'comex-data/',
      token: BLOB_READ_WRITE_TOKEN,
    });

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: 'No historical data available' },
        { status: 404 }
      );
    }

    // Find the most recent date that's not today
    const dates = blobs
      .map(blob => blob.pathname.replace('comex-data/', '').replace('.json', ''))
      .filter(date => date < todayStr)
      .sort()
      .reverse();

    if (dates.length === 0) {
      return NextResponse.json(
        { error: 'No previous day data available' },
        { status: 404 }
      );
    }

    const previousDate = dates[0];
    const blobName = `comex-data/${previousDate}.json`;

    try {
      const blob = await head(blobName, {
        token: BLOB_READ_WRITE_TOKEN,
      });

      // Fetch the blob content
      const response = await fetch(blob.url);
      const data = await response.json();

      return NextResponse.json({
        date: previousDate,
        data,
      });
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Previous day data not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error fetching previous day data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch previous day data', details: error.message },
      { status: 500 }
    );
  }
}
