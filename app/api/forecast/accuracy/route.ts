import { NextResponse } from 'next/server';
import { isDatabaseAvailable, getForecastAccuracySummary } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

// ISR: accuracy data changes once/day, cache for 5 minutes
export const revalidate = 300;

export async function GET() {
  // Try DB first
  if (isDatabaseAvailable()) {
    try {
      const summary = await getForecastAccuracySummary(90);
      if (summary.overall.total > 0 || Object.keys(summary.metals).length > 0) {
        return NextResponse.json({ success: true, source: 'database', data: summary });
      }
    } catch (error) {
      console.error('Error fetching accuracy from DB:', error);
    }
  }

  // Fallback to JSON file
  try {
    const filePath = path.join(process.cwd(), 'public', 'forecast_history.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({ success: true, source: 'file', data: data.accuracy || null });
  } catch {
    return NextResponse.json({ success: true, source: 'none', data: null });
  }
}
