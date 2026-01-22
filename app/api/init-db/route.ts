import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

// POST /api/init-db - Initialize the database tables
export async function POST() {
  try {
    await initializeDatabase();
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
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
export async function GET() {
  try {
    await initializeDatabase();
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
