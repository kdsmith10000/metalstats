import { readFileSync } from 'fs';
import path from 'path';
import {
  buildLatestAnalysisFromDb,
  getPreviousRiskScores,
  getPreviousOpenInterest,
  getPreviousPaperPhysical,
  type RiskScoreSnapshot,
  type OpenInterestSnapshot,
  type PaperPhysicalSnapshot,
} from './db';

// ============================================
// DATA LOADING
// ============================================

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

// ============================================
// FORMATTING HELPERS
// ============================================

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function shortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatPrice(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return String(num);
  const hasCents = Math.abs(n % 1) >= 0.005;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function metalLabel(name: string): string {
  return name.replace('_', '/');
}

function getRiskColor(level: string): string {
  switch ((level || '').toUpperCase()) {
    case 'EXTREME': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'WARNING': return '#eab308';
    case 'MODERATE': return '#3b82f6';
    case 'LOW': return '#22c55e';
    default: return '#64748b';
  }
}

function getRiskBgColor(level: string): string {
  switch ((level || '').toUpperCase()) {
    case 'EXTREME': return '#451a1a';
    case 'HIGH': return '#431407';
    case 'WARNING': return '#422006';
    case 'MODERATE': return '#172554';
    case 'LOW': return '#052e16';
    default: return '#1e293b';
  }
}

function changeArrow(current: number, previous: number | null): string {
  if (previous === null) return '';
  if (current > previous) return '<span style="color:#ef4444">&#9650;</span>';
  if (current < previous) return '<span style="color:#22c55e">&#9660;</span>';
  return '<span style="color:#64748b">&#8212;</span>';
}

function changeDelta(current: number, previous: number | null): string {
  if (previous === null) return 'N/A';
  const diff = current - previous;
  const sign = diff >= 0 ? '+' : '';
  return sign + diff.toString();
}

// ============================================
// NARRATIVE GENERATION
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateMarketSnapshot(analysis: any, prevRiskScores: RiskScoreSnapshot[]): string {
  const overview = analysis.market_overview || {};
  const avgScore = overview.average_risk_score || 0;
  const avgLevel = overview.average_risk_level || 'UNKNOWN';
  const highRisk = overview.high_risk_metals || 0;
  const total = overview.metals_analyzed || 0;
  const reportDate = analysis.report_date || 'Unknown';

  // Calculate previous average
  let prevAvg: number | null = null;
  if (prevRiskScores.length > 0) {
    const sum = prevRiskScores.reduce((a, b) => a + Number(b.composite_score), 0);
    prevAvg = Math.round(sum / prevRiskScores.length);
  }

  let trend = '';
  if (prevAvg !== null) {
    const diff = avgScore - prevAvg;
    if (diff > 2) trend = `The average risk score climbed from ${prevAvg} to ${avgScore}, signaling increasing stress across the complex.`;
    else if (diff < -2) trend = `The average risk score improved from ${prevAvg} to ${avgScore}, suggesting easing conditions.`;
    else trend = `The average risk score held steady at ${avgScore}, largely unchanged from the prior session.`;
  } else {
    trend = `The average risk score stands at ${avgScore}.`;
  }

  return `On <strong>${shortDate(reportDate)}</strong>, the COMEX precious metals complex registered an average risk level of <strong style="color:${getRiskColor(avgLevel)}">${avgLevel}</strong> across ${total} metals, with ${highRisk} in elevated territory. ${trend}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateWhatChanged(analysis: any, prevRiskScores: RiskScoreSnapshot[], prevOI: OpenInterestSnapshot[], prevPP: PaperPhysicalSnapshot[]): string {
  const metals = analysis.metals || {};
  const metalOrder = ['Gold', 'Silver', 'Copper', 'Platinum_Palladium', 'Aluminum'];
  const symbolMap: Record<string, string> = { Gold: 'GC', Silver: 'SI', Copper: 'HG', Platinum_Palladium: 'PL', Aluminum: 'ALI' };

  const sections: string[] = [];

  for (const name of metalOrder) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metal = metals[name] as any;
    if (!metal) continue;

    const bullets: string[] = [];
    const market = metal.market;
    const riskScore = metal.risk_score;
    const delivery = metal.delivery;
    const pp = metal.paper_physical;

    // Previous data lookups
    const prevRisk = prevRiskScores.find(r => r.metal === name);
    const symbol = symbolMap[name];
    const prevOIData = prevOI.find(o => o.symbol === symbol);
    const prevPPData = prevPP.find(p => p.metal === name);

    // Price movement
    if (market && market.front_month_settle && market.front_month_change != null) {
      const change = market.front_month_change;
      const settle = market.front_month_settle;
      if (Math.abs(change) > 0) {
        const direction = change > 0 ? 'rose' : 'fell';
        const magnitude = Math.abs(change) > 50 ? 'surged' : Math.abs(change) > 20 ? direction : 'moved';
        const verb = change > 0 ? (Math.abs(change) > 50 ? 'surged' : 'rose') : (Math.abs(change) < -50 ? 'plunged' : 'fell');
        bullets.push(`Settled at <strong>$${formatPrice(settle)}</strong>, ${verb} $${formatPrice(Math.abs(change))} on the day.`);
      }
    }

    // Volume and OI
    if (market && market.oi_change) {
      const oiChange = market.oi_change;
      if (Math.abs(oiChange) > 500) {
        const direction = oiChange > 0 ? 'added' : 'shed';
        const implication = oiChange > 0 ? 'suggesting new money entering the market' : 'indicating position liquidation or roll-off';
        bullets.push(`Open interest ${direction} ${formatNumber(Math.abs(oiChange))} contracts, ${implication}.`);
      }
    }

    // Risk score comparison
    if (riskScore && prevRisk) {
      const curr = riskScore.composite;
      const prev = Number(prevRisk.composite_score);
      const diff = curr - prev;
      if (Math.abs(diff) >= 2) {
        const direction = diff > 0 ? 'rose' : 'fell';
        bullets.push(`Risk score ${direction} from ${prev} to <strong style="color:${getRiskColor(riskScore.level)}">${curr} (${riskScore.level})</strong>. Primary driver: ${riskScore.dominant_factor.toLowerCase()}.`);
      } else {
        bullets.push(`Risk score steady at <strong style="color:${getRiskColor(riskScore.level)}">${curr} (${riskScore.level})</strong>.`);
      }
    } else if (riskScore) {
      bullets.push(`Risk score at <strong style="color:${getRiskColor(riskScore.level)}">${riskScore.composite} (${riskScore.level})</strong>. Driven by ${riskScore.dominant_factor.toLowerCase()}.`);
    }

    // Paper/physical comparison
    if (pp && prevPPData) {
      const currRatio = pp.ratio;
      const prevRatio = Number(prevPPData.paper_physical_ratio);
      const diff = currRatio - prevRatio;
      if (Math.abs(diff) > 0.1) {
        const direction = diff > 0 ? 'widened' : 'tightened';
        bullets.push(`Paper/physical ratio ${direction} from ${prevRatio.toFixed(1)}:1 to <strong>${pp.ratio_display}</strong> (${pp.risk_level}).`);
      }
    }

    // Delivery activity
    if (delivery && delivery.month_to_date_contracts > 100) {
      bullets.push(`MTD deliveries: ${formatNumber(delivery.month_to_date_contracts)} contracts (${formatNumber(delivery.daily_issued)} issued today). Top issuer: ${delivery.top_issuers?.[0]?.name || 'N/A'}.`);
    }

    if (bullets.length > 0) {
      sections.push(`
        <tr>
          <td style="padding:16px;border-bottom:1px solid #334155;">
            <h3 style="margin:0 0 8px;font-size:15px;color:#f8fafc;font-weight:700;">${metalLabel(name)}</h3>
            <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#cbd5e1;line-height:1.8;">
              ${bullets.map(b => `<li>${b}</li>`).join('')}
            </ul>
          </td>
        </tr>
      `);
    }
  }

  return sections.join('');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateRiskRadar(analysis: any, prevRiskScores: RiskScoreSnapshot[]): string {
  const rankings = analysis.market_overview?.risk_ranking || [];

  const rows = rankings.map((r: { metal: string; score: number; level: string; dominant_factor: string }) => {
    const prev = prevRiskScores.find(p => p.metal === r.metal);
    const prevScore = prev ? Number(prev.composite_score) : null;
    const arrow = changeArrow(r.score, prevScore);
    const delta = changeDelta(r.score, prevScore);

    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;font-size:14px;color:#f8fafc;font-weight:600;">${metalLabel(r.metal)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;text-align:center;">
          <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;color:${getRiskColor(r.level)};background-color:${getRiskBgColor(r.level)};">${r.score}/100</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;text-align:center;font-size:13px;">${arrow} ${delta}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;text-align:center;">
          <span style="color:${getRiskColor(r.level)};font-size:13px;font-weight:600;">${r.level}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;font-size:12px;color:#94a3b8;">${r.dominant_factor}</td>
      </tr>
    `;
  }).join('');

  return rows;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateKeyAlerts(analysis: any): string {
  const findings = (analysis.key_findings || [])
    .filter((f: { severity: string }) => f.severity === 'EXTREME' || f.severity === 'HIGH')
    .slice(0, 4);

  if (findings.length === 0) return '<p style="font-size:13px;color:#94a3b8;">No critical alerts today.</p>';

  return findings.map((f: { severity: string; metal?: string; finding: string }) => {
    const color = getRiskColor(f.severity);
    const metalTag = f.metal ? `<strong>${metalLabel(f.metal)}</strong> — ` : '';
    return `
      <div style="padding:12px 16px;margin-bottom:8px;background-color:#0f172a;border-radius:8px;border-left:3px solid ${color};">
        <span style="font-size:10px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${f.severity}</span>
        <p style="margin:4px 0 0;font-size:13px;color:#cbd5e1;line-height:1.5;">${metalTag}${f.finding}</p>
      </div>
    `;
  }).join('');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generatePaperPhysicalCheck(analysis: any, prevPP: PaperPhysicalSnapshot[]): string {
  const metals = analysis.metals || {};
  const metalOrder = ['Gold', 'Silver', 'Copper', 'Platinum_Palladium', 'Aluminum'];

  const rows = metalOrder.filter(m => metals[m]?.paper_physical).map(m => {
    const pp = metals[m].paper_physical;
    const prev = prevPP.find(p => p.metal === m);
    const prevRatio = prev ? Number(prev.paper_physical_ratio) : null;
    const color = getRiskColor(pp.risk_level);

    let context = '';
    if (prevRatio !== null) {
      const diff = pp.ratio - prevRatio;
      if (Math.abs(diff) > 0.1) {
        context = diff > 0 ? `Up from ${prevRatio.toFixed(1)}:1 yesterday.` : `Down from ${prevRatio.toFixed(1)}:1 yesterday.`;
      } else {
        context = 'Unchanged from yesterday.';
      }
    }

    // Plain-English explanation for extreme ratios
    let explanation = '';
    if (pp.ratio > 20) {
      explanation = `For every unit in registered vaults, there are ${Math.round(pp.ratio)} units of paper claims.`;
    } else if (pp.ratio > 5) {
      explanation = `Paper leverage remains elevated at ${pp.ratio_display}.`;
    }

    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;font-size:14px;color:#f8fafc;font-weight:600;">${metalLabel(m)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;text-align:center;font-size:16px;color:${color};font-weight:700;">${pp.ratio_display}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;text-align:center;">
          <span style="color:${color};font-size:12px;font-weight:600;">${pp.risk_level}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #334155;font-size:11px;color:#94a3b8;">${explanation} ${context}</td>
      </tr>
    `;
  }).join('');

  return rows;
}

// ============================================
// FORECAST SUMMARY
// ============================================

function getDirectionColor(direction: string): string {
  switch (direction.toUpperCase()) {
    case 'BULLISH': return '#22c55e';
    case 'BEARISH': return '#ef4444';
    default: return '#94a3b8';
  }
}

function getDirectionBg(direction: string): string {
  switch (direction.toUpperCase()) {
    case 'BULLISH': return '#052e16';
    case 'BEARISH': return '#451a1a';
    default: return '#1e293b';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateForecastSummary(forecast: any): string {
  if (!forecast || !forecast.metals) return '';

  const metalOrder = ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium'];
  const rows: string[] = [];

  for (const metal of metalOrder) {
    const fc = forecast.metals[metal];
    if (!fc) continue;

    const dir = fc.direction || 'NEUTRAL';
    const conf = fc.confidence || 0;
    const price = fc.current_price || 0;
    const fc5d = fc.forecast_5d;
    const signals = fc.signals || {};

    const topSignal = fc.key_drivers?.[0] || '';
    const rangeStr = fc5d ? `$${formatPrice(fc5d.low)} – $${formatPrice(fc5d.high)}` : 'N/A';
    const pctStr = fc5d && fc5d.pct_change !== 0 ? `${fc5d.pct_change > 0 ? '+' : ''}${fc5d.pct_change.toFixed(1)}%` : 'flat';

    const signalBars = Object.entries(signals).map(([key, val]: [string, unknown]) => {
      const s = val as { score: number };
      const score = s.score || 50;
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const barColor = score >= 60 ? '#22c55e' : score <= 40 ? '#ef4444' : '#64748b';
      return `<span style="display:inline-block;margin-right:8px;font-size:11px;color:${barColor};font-weight:600;">${label}: ${Math.round(score)}</span>`;
    }).join('');

    rows.push(`
      <tr>
        <td style="padding:14px 12px;border-bottom:1px solid #334155;">
          <div style="margin-bottom:6px;">
            <span style="font-size:14px;color:#f8fafc;font-weight:700;">${metal}</span>
            <span style="display:inline-block;margin-left:8px;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;color:${getDirectionColor(dir)};background-color:${getDirectionBg(dir)};">${dir} (${conf}%)</span>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">
            Price: <strong style="color:#f8fafc;">$${formatPrice(price)}</strong> &nbsp;|&nbsp; 5-Day Range: ${rangeStr} (${pctStr})
          </div>
          <div style="margin-bottom:4px;">${signalBars}</div>
          ${topSignal ? `<div style="font-size:11px;color:#64748b;font-style:italic;">Top driver: ${topSignal}</div>` : ''}
        </td>
      </tr>
    `);
  }

  if (rows.length === 0) return '';

  return rows.join('');
}

// ============================================
// MAIN GENERATOR
// ============================================

export interface GeneratedNewsletter {
  subject: string;
  html: string;
  reportDate: string;
  releaseDate: string;
  metalsAnalyzed: number;
  avgRiskScore: number;
}

export async function generateNewsletter(): Promise<GeneratedNewsletter | null> {
  // Prefer DB (most recent data); fall back to static JSON if DB unavailable or empty
  let analysis = await buildLatestAnalysisFromDb();
  if (!analysis) {
    analysis = loadJsonFile('analysis_summary.json');
    if (analysis) {
      console.log('[Newsletter] Using analysis_summary.json (DB had no data)');
    }
  } else {
    console.log(`[Newsletter] Using DB analysis for ${analysis.report_date}`);
  }

  const bulletin = loadJsonFile('bulletin.json');
  const forecast = loadJsonFile('forecast.json');

  if (!analysis) {
    console.error('No analysis data available (DB empty and analysis_summary.json not found)');
    return null;
  }

  const reportDate = String(analysis.report_date || 'Unknown');
  const bulletinNumber = bulletin?.bulletin_number ?? '';
  const overview = (analysis.market_overview || {}) as { metals_analyzed?: number; average_risk_score?: number };

  // Release date = today (the date the newsletter is actually generated/sent)
  const releaseDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  // Load previous day data from DB for comparison
  const [prevRiskScores, prevOI, prevPP] = await Promise.all([
    getPreviousRiskScores(),
    getPreviousOpenInterest(),
    getPreviousPaperPhysical(),
  ]);

  // Generate all narrative sections
  const marketSnapshot = generateMarketSnapshot(analysis, prevRiskScores);
  const whatChangedRows = generateWhatChanged(analysis, prevRiskScores, prevOI, prevPP);
  const riskRadarRows = generateRiskRadar(analysis, prevRiskScores);
  const keyAlerts = generateKeyAlerts(analysis);
  const forecastRows = generateForecastSummary(forecast);
  const ppRows = generatePaperPhysicalCheck(analysis, prevPP);

  const subject = `COMEX Daily Analysis — ${formatDate(releaseDate)}`;

  const html = `
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
                ${formatDate(releaseDate)}
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#78350f;font-weight:500;">
                Based on CME ${shortDate(reportDate)} settlement data${bulletinNumber ? ` &bull; Bulletin #${bulletinNumber}` : ''}
              </p>
            </td>
          </tr>

          <!-- MARKET SNAPSHOT -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Market Snapshot
              </h2>
              <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.7;">
                ${marketSnapshot}
              </p>
            </td>
          </tr>

          <!-- RISK RADAR -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Risk Radar
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                <tr>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Metal</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Score</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Chg</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Level</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Driver</th>
                </tr>
                ${riskRadarRows}
              </table>
            </td>
          </tr>

          <!-- WHAT CHANGED -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                What Changed Since Yesterday
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                ${whatChangedRows}
              </table>
            </td>
          </tr>

          <!-- KEY ALERTS -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Key Alerts
              </h2>
              ${keyAlerts}
            </td>
          </tr>

          <!-- FORECAST OUTLOOK -->
          ${forecastRows ? `<tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Forecast Outlook
              </h2>
              <p style="margin:0 0 12px;font-size:12px;color:#64748b;">
                Generated ${forecast?.generated_at ? new Date(forecast.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'today'} using trend, ARIMA, physical stress &amp; market activity signals.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                ${forecastRows}
              </table>
            </td>
          </tr>` : ''}

          <!-- PAPER vs PHYSICAL -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                Paper vs Physical Check
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px;overflow:hidden;">
                <tr>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Metal</th>
                  <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Ratio</th>
                  <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Risk</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155;">Context</th>
                </tr>
                ${ppRows}
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

          <!-- DISCLAIMER & FOOTER -->
          <tr>
            <td style="padding:24px 32px;background-color:#0f172a;border-top:1px solid #334155;">
              <p style="margin:0 0 12px;font-size:11px;color:#64748b;line-height:1.6;text-align:left;font-style:italic;">
                This newsletter is for informational purposes only and does not constitute financial advice. Heavy Metal Stats is not a registered investment advisor. All data is sourced from CME Group and is delayed by one business day. Always consult a qualified financial professional before making investment decisions.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;text-align:center;">
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

  return {
    subject,
    html,
    reportDate,
    releaseDate,
    metalsAnalyzed: overview.metals_analyzed || 0,
    avgRiskScore: overview.average_risk_score || 0,
  };
}
