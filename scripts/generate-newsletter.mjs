#!/usr/bin/env node
/**
 * Generate the daily newsletter and write HTML preview.
 * Runs the TypeScript generator via tsx.
 *
 * Usage: node --env-file=.env scripts/generate-newsletter.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsScript = join(__dirname, 'generate-newsletter.ts');

const child = spawn('npx', ['tsx', tsScript], {
  stdio: 'inherit',
  env: process.env,
  cwd: join(__dirname, '..'),
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
