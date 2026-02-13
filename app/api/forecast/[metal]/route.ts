import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_METALS = ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ metal: string }> }
) {
  const { metal } = await params;

  // Normalize: capitalize first letter
  const normalized = metal.charAt(0).toUpperCase() + metal.slice(1).toLowerCase();

  if (!VALID_METALS.includes(normalized)) {
    return NextResponse.json(
      { success: false, error: `Invalid metal: ${metal}`, validMetals: VALID_METALS },
      { status: 400 }
    );
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'forecast.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);

    const metalForecast = data.metals?.[normalized];
    if (!metalForecast) {
      return NextResponse.json(
        { success: false, error: `No forecast available for ${normalized}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      metal: normalized,
      generated_at: data.generated_at,
      model_version: data.model_version,
      forecast: metalForecast,
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
