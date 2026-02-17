import { NextResponse } from 'next/server';
import { initializeDatabase, initializeForecastTables } from '@/lib/db';
import { isAuthorized } from '@/lib/auth';

// POST /api/init-db - Initialize the database tables
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    await initializeForecastTables();
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully (including forecast tables)' 
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

// GET /api/init-db - Check if database is ready (for health checks)
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    await initializeForecastTables();
    return NextResponse.json({ 
      success: true, 
      message: 'Database is ready' 
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { success: false, error: 'Database not ready' },
      { status: 500 }
    );
  }
}
