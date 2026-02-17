import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, isDatabaseAvailable } from '@/lib/db';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    // Validate inputs
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Display name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    if (displayName.trim().length > 30) {
      return NextResponse.json(
        { error: 'Display name must be 30 characters or fewer.' },
        { status: 400 }
      );
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable.' },
        { status: 503 }
      );
    }

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, display_name, name, "emailVerified")
      VALUES (
        ${email.toLowerCase().trim()},
        ${passwordHash},
        ${displayName.trim()},
        ${displayName.trim()},
        NOW()
      )
      RETURNING id, email, display_name
    `;

    // Link to existing newsletter subscriber if email matches
    const subscriber = await sql`
      SELECT id FROM newsletter_subscribers 
      WHERE email = ${email.toLowerCase().trim()} AND active = TRUE 
      LIMIT 1
    `;

    if (subscriber.length > 0) {
      await sql`
        UPDATE users SET newsletter_subscriber_id = ${subscriber[0].id}
        WHERE id = ${result[0].id}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
