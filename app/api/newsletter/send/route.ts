import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  getActiveSubscribers,
  getExpiredTrials,
  markExpiredTrials,
  isDatabaseAvailable,
  saveNewsletter,
} from '@/lib/db';
import { generateNewsletter } from '@/lib/newsletter-engine';
import { isAuthorized } from '@/lib/auth';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseAvailable()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    // ─── Step 1: Generate the newsletter via the analysis engine ───
    const newsletter = await generateNewsletter();

    if (!newsletter) {
      return NextResponse.json({ error: 'Analysis data not available — cannot generate newsletter' }, { status: 500 });
    }

    // ─── Step 2: Store the generated newsletter in the DB ───
    try {
      await saveNewsletter(
        newsletter.reportDate,
        newsletter.subject,
        newsletter.html,
        newsletter.metalsAnalyzed,
        newsletter.avgRiskScore,
      );
      console.log(`Newsletter for ${newsletter.reportDate} saved to DB`);
    } catch (err) {
      console.error('Failed to save newsletter to DB (continuing with send):', err);
    }

    // ─── Step 3: Send to active subscribers ───
    const subscribers = await getActiveSubscribers();
    if (subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Newsletter generated and stored, but no active subscribers to send to',
        sent: 0,
        date: newsletter.reportDate,
      });
    }

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      const unsubscribeUrl = `https://heavymetalstats.com/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;
      const personalizedHtml = newsletter.html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);

      try {
        await getResend().emails.send({
          from: 'Heavy Metal Stats <newsletter@heavymetalstats.com>',
          to: subscriber.email,
          subject: newsletter.subject,
          html: personalizedHtml,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${subscriber.email}:`, err);
        failed++;
      }
    }

    // ─── Step 4: Handle expired trials ───
    let trialExpired = 0;
    try {
      const expiredTrials = await getExpiredTrials();
      for (const subscriber of expiredTrials) {
        try {
          const unsubscribeUrl = `https://heavymetalstats.com/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;
          await getResend().emails.send({
            from: 'Heavy Metal Stats <newsletter@heavymetalstats.com>',
            to: subscriber.email,
            subject: 'Your free trial has ended — Continue for $5/month',
            html: buildTrialExpiredEmail(subscriber.email, unsubscribeUrl),
          });
          trialExpired++;
        } catch (err) {
          console.error(`Failed to send trial expiry email to ${subscriber.email}:`, err);
        }
      }
      await markExpiredTrials();
    } catch (err) {
      console.error('Error processing expired trials:', err);
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscribers.length,
      trialExpired,
      date: newsletter.reportDate,
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 });
  }
}

// ─── Trial Expired Email ───────────────────────────────────────────

function buildTrialExpiredEmail(_email: string, unsubscribeUrl: string): string {
  const checkoutUrl = 'https://buy.stripe.com/fZucN673N8GB5VU67Lfw401';

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
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#f8fafc;font-weight:700;">
                Your free trial has ended
              </h2>
              <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Your 5-day free trial of the Daily Bulletin Analysis is over. During your trial, you received:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#0f172a;border-radius:8px;border-left:3px solid #f59e0b;">
                    <ul style="margin:0;padding:0 0 0 20px;font-size:13px;color:#94a3b8;line-height:1.8;">
                      <li>Day-over-day risk analysis with plain-English insights</li>
                      <li>Risk radar with score changes across all 5 metals</li>
                      <li>Per-metal price, OI, and delivery breakdowns</li>
                      <li>Paper vs physical ratio alerts with context</li>
                      <li>Key alerts filtered for EXTREME and HIGH conditions</li>
                    </ul>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;color:#f8fafc;line-height:1.6;">
                Continue getting the daily COMEX analysis delivered to your inbox for just <strong style="color:#f59e0b;">$5/month</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:8px;">
                    <a href="${checkoutUrl}" style="display:inline-block;padding:16px 36px;font-size:16px;color:#0f172a;font-weight:800;text-decoration:none;">
                      Continue for $5/month &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;text-align:center;">
                Cancel anytime. No questions asked.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#475569;">
                Data sourced from CME Group. Informational only &mdash; not financial advice.
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
