import { put, list, head } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// GET: Retrieve historical data for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob token not configured' },
        { status: 500 }
      );
    }

    const blobName = `comex-data/${date}.json`;
    
    try {
      const blob = await head(blobName, {
        token: BLOB_READ_WRITE_TOKEN,
      });
      
      // Fetch the blob content
      const response = await fetch(blob.url);
      const data = await response.json();
      
      return NextResponse.json(data);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 404) {
        return NextResponse.json(
          { error: 'Data not found for this date' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    console.error('Error fetching blob data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST: Store historical data for a specific date
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob token not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { date, data } = body; // date: YYYY-MM-DD, data: WarehouseStocksData

    if (!date || !data) {
      return NextResponse.json(
        { error: 'Date and data are required' },
        { status: 400 }
      );
    }

    const blobName = `comex-data/${date}.json`;
    const jsonData = JSON.stringify(data, null, 2);

    const blob = await put(blobName, jsonData, {
      access: 'public',
      token: BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json',
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error: unknown) {
    console.error('Error storing blob data:', error);
    return NextResponse.json(
      { error: 'Failed to store data' },
      { status: 500 }
    );
  }
}

// List available dates
export async function LIST() {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob token not configured' },
        { status: 500 }
      );
    }

    const { blobs } = await list({
      prefix: 'comex-data/',
      token: BLOB_READ_WRITE_TOKEN,
    });

    const dates = blobs
      .map(blob => blob.pathname.replace('comex-data/', '').replace('.json', ''))
      .sort()
      .reverse(); // Most recent first

    return NextResponse.json({ dates });
  } catch (error: unknown) {
    console.error('Error listing blobs:', error);
    return NextResponse.json(
      { error: 'Failed to list data' },
      { status: 500 }
    );
  }
}
