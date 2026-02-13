import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'forecast.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error reading forecast data:', msg);
    return NextResponse.json(
      { success: false, error: 'Forecast data not available', details: msg },
      { status: 503 }
    );
  }
}
