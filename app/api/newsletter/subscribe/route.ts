import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { addSubscriber, isSubscribed, isDatabaseAvailable } from '@/lib/db';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Check if already subscribed
    const alreadySubscribed = await isSubscribed(email);
    if (alreadySubscribed) {
      return NextResponse.json(
        { success: true, message: 'You\'re already subscribed! Check your inbox for the daily bulletin.' }
      );
    }

    // Generate unique unsubscribe token
    const unsubscribeToken = crypto.randomUUID();

    // Add subscriber to database
    await addSubscriber(email, unsubscribeToken);

    // Send welcome email
    const unsubscribeUrl = `https://heavymetalstats.com/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

    await resend.emails.send({
      from: 'Heavy Metal Stats <newsletter@heavymetalstats.com>',
      to: email.toLowerCase().trim(),
      subject: 'Welcome to Heavy Metal Stats Daily Bulletin',
      html: getWelcomeEmailHtml(unsubscribeUrl),
    });

    return NextResponse.json({
      success: true,
      message: 'Free trial started! Check your inbox for a welcome email.',
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

function getWelcomeEmailHtml(unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#0f172a;font-weight:800;letter-spacing:-0.5px;">
                HEAVY METAL STATS
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#451a03;font-weight:500;">
                Daily COMEX Bulletin Analysis
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#f8fafc;font-weight:700;">
                Your free trial has started!
              </h2>
              <p style="margin:0 0 12px;font-size:15px;color:#94a3b8;line-height:1.6;">
                You now have <strong style="color:#f59e0b;">5 business days of free access</strong> to the Daily Bulletin Analysis from Heavy Metal Stats. Every trading day, you'll receive:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#0f172a;border-radius:8px;border-left:3px solid #f59e0b;">
                    <p style="margin:0 0 8px;font-size:14px;color:#f8fafc;font-weight:600;">What's in your daily email:</p>
                    <ul style="margin:0;padding:0 0 0 20px;font-size:13px;color:#94a3b8;line-height:1.8;">
                      <li>Executive market summary with analyst-style commentary</li>
                      <li>Risk rankings for Gold, Silver, Copper, Platinum/Palladium & Aluminum</li>
                      <li>Front-month price snapshots with daily changes</li>
                      <li>Paper vs physical ratio alerts</li>
                      <li>Notable delivery activity and key findings</li>
                    </ul>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:14px;color:#64748b;line-height:1.6;">
                Your first bulletin will arrive after the next CME data update (nightly at 9:30 PM EST, data delayed one day per CME release schedule).
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
                After your free trial, continue receiving the daily analysis for just <strong style="color:#f59e0b;">$5/month</strong>. We'll send you a reminder before your trial ends.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:8px;">
                    <a href="https://heavymetalstats.com" style="display:inline-block;padding:14px 28px;font-size:14px;color:#0f172a;font-weight:700;text-decoration:none;">
                      View Live Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#475569;">
                Data sourced from CME Group. Informational only — not financial advice.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
                &nbsp;&bull;&nbsp;
                <a href="https://heavymetalstats.com/privacy" style="color:#64748b;text-decoration:underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
