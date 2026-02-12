#!/usr/bin/env node
/**
 * Generate the daily newsletter and write HTML preview.
 * 
 * Usage: node --env-file=.env -r tsx/cjs scripts/generate-newsletter.ts
 * Or: npx tsx --env-file=.env scripts/generate-newsletter.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateNewsletter } from '../lib/newsletter-engine';

const rootDir = join(process.cwd());
const outputPath = join(rootDir, 'public', 'newsletter-preview.html');

async function main() {
  console.log('[Newsletter] Generating...');
  const newsletter = await generateNewsletter();

  if (!newsletter) {
    console.error('[Newsletter] Failed: No analysis data available');
    process.exit(1);
  }

  writeFileSync(outputPath, newsletter.html, 'utf-8');
  console.log(`[Newsletter] Wrote: ${outputPath}`);
  console.log(`[Newsletter] Subject: ${newsletter.subject}`);
  console.log(`[Newsletter] Report date: ${newsletter.reportDate}`);
  console.log(`[Newsletter] Metals analyzed: ${newsletter.metalsAnalyzed}`);
  console.log(`[Newsletter] Avg risk score: ${newsletter.avgRiskScore}`);
}

main().catch((err) => {
  console.error('[Newsletter] Error:', err);
  process.exit(1);
});
