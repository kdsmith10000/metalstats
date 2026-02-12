#!/usr/bin/env node
/**
 * Regenerate newsletter, save to Neon DB, and send to all active subscribers.
 *
 * Usage: node --env-file=.env scripts/send-newsletter-now.mjs
 */

import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL);
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Step 1: Generate newsletter via tsx subprocess ───
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('[1/4] Regenerating newsletter...');
execSync('npx tsx --env-file=.env scripts/generate-newsletter.ts', {
  cwd: process.cwd(),
  stdio: 'inherit',
});

const html = readFileSync(join(process.cwd(), 'public', 'newsletter-preview.html'), 'utf-8');

// Parse report date + subject from the HTML
const bulletinMatch = html.match(/Based on CME (.+?) settlement data/);
const reportDateLabel = bulletinMatch ? bulletinMatch[1] : 'Unknown';

// Derive the report date (YYYY-MM-DD) from the DB
const dateRows = await sql`
  SELECT DISTINCT report_date FROM risk_score_snapshots ORDER BY report_date DESC LIMIT 1
`;
const reportDate = dateRows[0]?.report_date
  ? (dateRows[0].report_date instanceof Date
      ? dateRows[0].report_date.toISOString().split('T')[0]
      : String(dateRows[0].report_date).split('T')[0])
  : 'unknown';

// Release date = today (the date the newsletter is generated/sent)
const releaseDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const subject = `COMEX Daily Analysis — ${releaseDate}`;

console.log(`[2/4] Saving to DB (report_date=${reportDate})...`);
await sql`
  INSERT INTO newsletters (report_date, subject, html_content, metals_analyzed, avg_risk_score)
  VALUES (${reportDate}, ${subject}, ${html}, 7, 52)
  ON CONFLICT (report_date)
  DO UPDATE SET
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    metals_analyzed = EXCLUDED.metals_analyzed,
    avg_risk_score = EXCLUDED.avg_risk_score,
    created_at = CURRENT_TIMESTAMP
`;
console.log('  [OK] Newsletter saved/overwritten in DB');

// ─── Step 3: Get active subscribers ───
console.log('[3/4] Fetching active subscribers...');
const subscribers = await sql`
  SELECT email, unsubscribe_token FROM newsletter_subscribers
  WHERE active = TRUE
    AND (subscription_status = 'paid' OR (subscription_status = 'trial' AND trial_ends_at > NOW()))
  ORDER BY subscribed_at ASC
`;
console.log(`  Found ${subscribers.length} active subscriber(s)`);

// ─── Step 4: Send via Resend ───
console.log('[4/4] Sending emails...');
let sent = 0;
let failed = 0;

for (const sub of subscribers) {
  const unsubscribeUrl = `https://heavymetalstats.com/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
  const personalizedHtml = html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);

  try {
    await resend.emails.send({
      from: 'Heavy Metal Stats <newsletter@heavymetalstats.com>',
      to: sub.email,
      subject,
      html: personalizedHtml,
    });
    console.log(`  [OK] Sent to ${sub.email}`);
    sent++;
  } catch (err) {
    console.error(`  [FAIL] ${sub.email}:`, err.message || err);
    failed++;
  }
}

console.log(`\nDone! Sent: ${sent}, Failed: ${failed}`);
