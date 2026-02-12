import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getActiveSubscribers, getExpiredTrials, markExpiredTrials, isDatabaseAvailable } from '@/lib/db';
import { readFileSync } from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

// Verify cron secret for Vercel Cron Jobs
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadJsonFile(filename: string): any {
  try {
    const filePath = path.join(process.cwd(), 'public', filename);
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseAvailable()) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    const subscribers = await getActiveSubscribers();
    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, message: 'No active subscribers', sent: 0 });
    }

    // Load analysis data
    const analysis = loadJsonFile('analysis_summary.json');
    const bulletin = loadJsonFile('bulletin.json');

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis data not available' }, { status: 500 });
    }

    const emailHtml = buildNewsletterHtml(analysis, bulletin);
    const bulletinDate = analysis.report_date || 'Unknown';
    const subject = `COMEX Bulletin Analysis — ${formatDate(bulletinDate)}`;

    let sent = 0;
    let failed = 0;

    // Send to each subscriber with personalized unsubscribe link
    for (const subscriber of subscribers) {
      const unsubscribeUrl = `https://heavymetalstats.com/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;
      const personalizedHtml = emailHtml.replace(/{{UNSUBSCRIBE_URL}}/g, unsubscribeUrl);

      try {
        await resend.emails.send({
          from: 'Heavy Metal Stats <newsletter@heavymetalstats.com>',
          to: subscriber.email,
          subject,
          html: personalizedHtml,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${subscriber.email}:`, err);
        failed++;
      }
    }

    // Handle expired trials - send upgrade emails before marking as expired
    let trialExpired = 0;
    try {
      const expiredTrials = await getExpiredTrials();
      for (const subscriber of expiredTrials) {
        try {
          const unsubscribeUrl = `https://heavymetalstats.com/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;
          await resend.emails.send({
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
      // Mark all expired trials in the database
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
      date: bulletinDate,
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 });
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatPrice(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function getRiskColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'EXTREME': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'WARNING': return '#eab308';
    case 'MODERATE': return '#3b82f6';
    case 'LOW': return '#22c55e';
    default: return '#64748b';
  }
}

function getRiskBgColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'EXTREME': return '#451a1a';
    case 'HIGH': return '#431407';
    case 'WARNING': return '#422006';
    case 'MODERATE': return '#172554';
    case 'LOW': return '#052e16';
    default: return '#1e293b';
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'EXTREME': return '&#9888;';  // warning triangle
    case 'HIGH': return '&#9650;';     // up triangle
    case 'WARNING': return '&#9679;';  // circle
    case 'INFO': return '&#8505;';     // info
    default: return '&#8226;';         // bullet
  }
}

// Generate the executive summary narrative from data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateExecutiveSummary(analysis: any): string {
  const overview = analysis.market_overview;
  const rankings = overview?.risk_ranking || [];
  const findings = analysis.key_findings || [];

  const parts: string[] = [];

  // Overall risk assessment
  const avgScore = overview?.average_risk_score;
  const avgLevel = overview?.average_risk_level;
  const highRisk = overview?.high_risk_metals || 0;
  const total = overview?.metals_analyzed || 0;

  if (avgScore && avgLevel) {
    parts.push(
      `The COMEX precious metals complex carries an average risk score of <strong style="color:${getRiskColor(avgLevel)}">${avgScore}/100 (${avgLevel})</strong>, with ${highRisk} of ${total} metals in elevated territory.`
    );
  }

  // Highlight the highest and lowest risk metals
  if (rankings.length >= 2) {
    const highest = rankings[0];
    const lowest = rankings[rankings.length - 1];
    parts.push(
      `<strong style="color:${getRiskColor(highest.level)}">${highest.metal}</strong> leads risk at ${highest.score}/100 driven by ${highest.dominant_factor.toLowerCase()}, while <strong style="color:${getRiskColor(lowest.level)}">${lowest.metal}</strong> sits at ${lowest.score}/100 — the most stable in the complex.`
    );
  }

  // Pick up the most severe finding for color
  const extremeFindings = findings.filter((f: { severity: string }) => f.severity === 'EXTREME');
  if (extremeFindings.length > 0) {
    const f = extremeFindings[0];
    parts.push(
      `Key alert: ${f.metal} shows <span style="color:#ef4444">extreme conditions</span> — ${f.finding.toLowerCase()}`
    );
  }

  return parts.join(' ');
}

// Generate "What Changed Today" narrative
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateWhatChanged(analysis: any): string {
  const metals = analysis.metals || {};
  const changes: string[] = [];

  for (const [name, data] of Object.entries(metals)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metal = data as any;
    const market = metal.market;
    if (!market) continue;

    // Notable price moves (> $10 change or > 1% for copper)
    if (market.front_month_change && Math.abs(market.front_month_change) > 10) {
      const direction = market.front_month_change > 0 ? 'up' : 'down';
      const arrow = market.front_month_change > 0 ? '&#9650;' : '&#9660;';
      changes.push(
        `<strong>${name}</strong> settled ${direction} ${arrow} $${formatPrice(Math.abs(market.front_month_change))} to $${formatPrice(market.front_month_settle)}.`
      );
    }

    // Big OI shifts (> 2000 contracts)
    if (market.oi_change && Math.abs(market.oi_change) > 2000) {
      const direction = market.oi_change > 0 ? 'added' : 'shed';
      changes.push(
        `${name} open interest ${direction} ${formatNumber(Math.abs(market.oi_change))} contracts.`
      );
    }

    // Heavy delivery activity
    const delivery = metal.delivery;
    if (delivery && delivery.month_to_date_contracts > 5000) {
      changes.push(
        `${name} MTD deliveries at ${formatNumber(delivery.month_to_date_contracts)} contracts — watch for continued drain on registered inventory.`
      );
    }
  }

  if (changes.length === 0) {
    return 'Markets were relatively quiet with no standout moves across the metals complex.';
  }

  return changes.slice(0, 5).join(' ');
}

// Build the full newsletter HTML
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNewsletterHtml(analysis: any, bulletin: any): string {
  const reportDate = analysis.report_date || 'Unknown';
  const activityDate = analysis.activity_date || reportDate;
  const bulletinNumber = bulletin?.bulletin_number || '';
  const overview = analysis.market_overview || {};
  const rankings = overview.risk_ranking || [];
  const metals = analysis.metals || {};
  const findings = analysis.key_findings || [];

  const executiveSummary = generateExecutiveSummary(analysis);
  const whatChanged = generateWhatChanged(analysis);

  // Build risk ranking rows
  const riskRows = rankings.map((r: { metal: string; score: number; level: string; dominant_factor: string }) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #334155;font-size:14px;color:#f8fafc;font-weight:600;">${r.metal.replace('_', '/')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #334155;text-align:center;">
        <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;color:${getRiskColor(r.level)};background-color:${getRiskBgColor(r.level)};">${r.score}/100</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #334155;text-align:center;">
        <span style="color:${getRiskColor(r.level)};font-size:13px;font-weight:600;">${r.level}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #334155;font-size:12px;color:#94a3b8;">${r.dominant_factor}</td>
    </tr>
  `).join('');

  // Build price snapshot rows
  const metalOrder = ['Gold', 'Silver', 'Copper', 'Platinum_Palladium', 'Aluminum'];
  const priceRows = metalOrder.filter(m => metals[m]?.market).map(m => {
    const market = metals[m].market;
    const change = market.front_month_change || 0;
    const arrow = change >= 0 ? '&#9650;' : '&#9660;';
    const changeColor = change >= 0 ? '#22c55e' : '#ef4444';
    const changeSign = change >= 0 ? '+' : '';
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;font-size:14px;color:#f8fafc;font-weight:600;">${m.replace('_', '/')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;font-size:14px;color:#f8fafc;text-align:right;">$${formatPrice(market.front_month_settle)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;text-align:right;font-size:13px;color:${changeColor};">
        ${arrow} ${changeSign}${formatPrice(change)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;text-align:right;font-size:12px;color:#94a3b8;">${formatNumber(market.total_volume)} vol</td>
    </tr>`;
  }).join('');

  // Build paper/physical rows
  const ppRows = metalOrder.filter(m => metals[m]?.paper_physical).map(m => {
    const pp = metals[m].paper_physical;
    const riskColor = getRiskColor(pp.risk_level);
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;font-size:14px;color:#f8fafc;font-weight:600;">${m.replace('_', '/')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;text-align:center;font-size:16px;color:${riskColor};font-weight:700;">${pp.ratio_display}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;text-align:center;">
        <span style="color:${riskColor};font-size:12px;font-weight:600;">${pp.risk_level}</span>
      </td>
    </tr>`;
  }).join('');

  // Build key findings (top 6)
  const findingsHtml = findings.slice(0, 6).map((f: { severity: string; metal?: string; finding: string }) => {
    const color = getRiskColor(f.severity);
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;vertical-align:top;">
        <span style="color:${color};font-size:14px;">${getSeverityIcon(f.severity)}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #334155;">
        <span style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;">${f.severity}${f.metal ? ` — ${f.metal.replace('_', '/')}` : ''}</span>
        <p style="margin:4px 0 0;font-size:13px;color:#cbd5e1;line-height:1.4;">${f.finding}</p>
      </td>
    </tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:20px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;max-width:100%;">
          
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;color:#0f172a;font-weight:800;letter-spacing:-0.5px;">
                HEAVY METAL STATS
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:#451a03;font-weight:600;">
                Daily Bulletin Analysis &bull; ${formatDate(reportDate)}${bulletinNumber ? ` &bull; #${bulletinNumber}` : ''}
              </p>
            </td>
          </tr>

          <!-- EXECUTIVE SUMMARY -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Executive Summary
              </h2>
              <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.7;">
                ${executiveSummary}
              </p>
            </td>
          </tr>

          <!-- MARKET PULSE -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;border-right:1px solid #334155;" width="33%">
                    <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Avg Risk Score</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:${getRiskColor(overview.average_risk_level || 'MODERATE')};">${overview.average_risk_score || '—'}</p>
                  </td>
                  <td style="padding:16px 20px;text-align:center;border-right:1px solid #334155;" width="33%">
                    <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Risk Level</p>
                    <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:${getRiskColor(overview.average_risk_level || 'MODERATE')};">${overview.average_risk_level || '—'}</p>
                  </td>
                  <td style="padding:16px 20px;text-align:center;" width="33%">
                    <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Elevated Metals</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#f97316;">${overview.high_risk_metals || 0}<span style="font-size:14px;color:#64748b;">/${overview.metals_analyzed || 0}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- RISK RANKING -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Risk Rankings
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                <tr>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Metal</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Score</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Level</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Driver</th>
                </tr>
                ${riskRows}
              </table>
            </td>
          </tr>

          <!-- PRICE SNAPSHOT -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Price Snapshot
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                <tr>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Metal</th>
                  <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Settle</th>
                  <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Change</th>
                  <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Volume</th>
                </tr>
                ${priceRows}
              </table>
            </td>
          </tr>

          <!-- WHAT CHANGED TODAY -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                What Changed Today
              </h2>
              <p style="margin:0;padding:16px;background-color:#0f172a;border-radius:8px;border-left:3px solid #f59e0b;font-size:13px;color:#cbd5e1;line-height:1.7;">
                ${whatChanged}
              </p>
            </td>
          </tr>

          <!-- PAPER vs PHYSICAL -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Paper vs Physical Ratios
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                <tr>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Metal</th>
                  <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Ratio</th>
                  <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Risk</th>
                </tr>
                ${ppRows}
              </table>
              <p style="margin:8px 0 0;font-size:11px;color:#475569;line-height:1.5;">
                Ratio = paper claims (open interest in units) &divide; registered physical inventory. Higher ratios indicate greater leverage on deliverable supply.
              </p>
            </td>
          </tr>

          <!-- KEY FINDINGS -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Key Findings
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                ${findingsHtml}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:8px;">
                    <a href="https://heavymetalstats.com" style="display:inline-block;padding:14px 32px;font-size:14px;color:#0f172a;font-weight:700;text-decoration:none;">
                      View Full Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 32px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:#475569;">
                Activity date: ${activityDate} &bull; Data sourced from CME Group &bull; Updated nightly at 9:30 PM EST
              </p>
              <p style="margin:0 0 6px;font-size:11px;color:#475569;">
                Informational only — not financial advice. Data is delayed one day per CME release schedule.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                <a href="{{UNSUBSCRIBE_URL}}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
                &nbsp;&bull;&nbsp;
                <a href="https://heavymetalstats.com/privacy" style="color:#64748b;text-decoration:underline;">Privacy</a>
                &nbsp;&bull;&nbsp;
                <a href="https://heavymetalstats.com" style="color:#64748b;text-decoration:underline;">heavymetalstats.com</a>
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
                      <li>Executive market summary with analyst-style commentary</li>
                      <li>Risk rankings for Gold, Silver, Copper, Platinum/Palladium &amp; Aluminum</li>
                      <li>Front-month price snapshots with daily changes</li>
                      <li>Paper vs physical ratio alerts</li>
                      <li>Notable delivery activity and key findings</li>
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
