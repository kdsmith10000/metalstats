#!/usr/bin/env node
/**
 * Generate newsletter, save to Neon DB, and email to a specific address.
 * Usage: node --env-file=.env scripts/send-newsletter-to-email.mjs [email]
 * Default email: kdsmith1000@protonmail.com
 */

import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const TARGET_EMAIL = process.argv[2] || 'kdsmith1000@protonmail.com';

const sql = neon(process.env.DATABASE_URL);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function main() {
  console.log('[1/4] Generating newsletter...');
  execSync('npx tsx --env-file=.env scripts/generate-newsletter.ts', {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  const html = readFileSync(join(process.cwd(), 'public', 'newsletter-preview.html'), 'utf-8');

  const dateRows = await sql`
    SELECT DISTINCT report_date FROM risk_score_snapshots ORDER BY report_date DESC LIMIT 1
  `;
  const reportDate = dateRows[0]?.report_date
    ? (dateRows[0].report_date instanceof Date
        ? dateRows[0].report_date.toISOString().split('T')[0]
        : String(dateRows[0].report_date).split('T')[0])
    : new Date().toISOString().split('T')[0];

  const releaseDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const subject = `COMEX Daily Analysis — ${releaseDate}`;

  console.log(`[2/4] Saving to Neon DB (report_date=${reportDate})...`);
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
  console.log('  [OK] Newsletter saved/updated in DB');

  if (!resend) {
    console.log(`\n[SKIP] RESEND_API_KEY not set — newsletter saved to DB but not emailed.`);
    console.log(`Add RESEND_API_KEY to .env and re-run to send to ${TARGET_EMAIL}`);
    console.log(`Get a key at https://resend.com/api-keys`);
    return;
  }

  console.log(`[3/4] Sending to ${TARGET_EMAIL}...`);
  const unsubscribePlaceholder = 'https://heavymetalstats.com';
  const personalizedHtml = html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribePlaceholder);

  const { error } = await resend.emails.send({
    from: 'Heavy Metal Stats <newsletter@heavymetalstats.com>',
    to: TARGET_EMAIL,
    subject,
    html: personalizedHtml,
  });

  if (error) {
    console.error('[FAIL]', error.message || error);
    process.exit(1);
  }
  console.log('  [OK] Email sent!');
  console.log(`\nDone! Newsletter delivered to ${TARGET_EMAIL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
