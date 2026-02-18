import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const forecastPath = join(__dirname, '..', 'public', 'forecast.json');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const forecast = JSON.parse(readFileSync(forecastPath, 'utf-8'));
const forecastDate = forecast.generated_at.slice(0, 10); // YYYY-MM-DD

async function main() {
  console.log(`Syncing forecast for ${forecastDate} to Neon DB...`);

  await sql`
    CREATE TABLE IF NOT EXISTS forecast_snapshots (
      id SERIAL PRIMARY KEY,
      metal VARCHAR(50) NOT NULL,
      forecast_date DATE NOT NULL,
      direction VARCHAR(20) NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 0,
      composite_score DECIMAL(6, 2) NOT NULL DEFAULT 50,
      price_at_forecast DECIMAL(15, 4) NOT NULL DEFAULT 0,
      squeeze_probability INTEGER NOT NULL DEFAULT 0,
      regime VARCHAR(20) DEFAULT 'UNKNOWN',
      trend_score DECIMAL(6, 2) DEFAULT 50,
      physical_score DECIMAL(6, 2) DEFAULT 50,
      arima_score DECIMAL(6, 2) DEFAULT 50,
      market_score DECIMAL(6, 2) DEFAULT 50,
      forecast_5d_low DECIMAL(15, 4),
      forecast_5d_mid DECIMAL(15, 4),
      forecast_5d_high DECIMAL(15, 4),
      forecast_20d_low DECIMAL(15, 4),
      forecast_20d_mid DECIMAL(15, 4),
      forecast_20d_high DECIMAL(15, 4),
      key_drivers TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metal, forecast_date)
    )
  `;

  let count = 0;
  for (const [metal, fc] of Object.entries(forecast.metals)) {
    const signals = fc.signals || {};
    const fc5d = fc.forecast_5d;
    const fc20d = fc.forecast_20d;

    await sql`
      INSERT INTO forecast_snapshots (
        metal, forecast_date, direction, confidence, composite_score,
        price_at_forecast, squeeze_probability, regime,
        trend_score, physical_score, arima_score, market_score,
        forecast_5d_low, forecast_5d_mid, forecast_5d_high,
        forecast_20d_low, forecast_20d_mid, forecast_20d_high,
        key_drivers
      ) VALUES (
        ${metal}, ${forecastDate}::date, ${fc.direction}, ${fc.confidence}, ${fc.composite_score},
        ${fc.current_price}, ${fc.squeeze_probability}, ${fc.regime},
        ${signals.trend_momentum?.score ?? 50},
        ${signals.physical_stress?.score ?? 50},
        ${signals.arima_model?.score ?? 50},
        ${signals.market_activity?.score ?? 50},
        ${fc5d?.low ?? null}, ${fc5d?.mid ?? null}, ${fc5d?.high ?? null},
        ${fc20d?.low ?? null}, ${fc20d?.mid ?? null}, ${fc20d?.high ?? null},
        ${(fc.key_drivers || []).join(' | ')}
      )
      ON CONFLICT (metal, forecast_date)
      DO UPDATE SET
        direction = EXCLUDED.direction,
        confidence = EXCLUDED.confidence,
        composite_score = EXCLUDED.composite_score,
        price_at_forecast = EXCLUDED.price_at_forecast,
        squeeze_probability = EXCLUDED.squeeze_probability,
        regime = EXCLUDED.regime,
        trend_score = EXCLUDED.trend_score,
        physical_score = EXCLUDED.physical_score,
        arima_score = EXCLUDED.arima_score,
        market_score = EXCLUDED.market_score,
        forecast_5d_low = EXCLUDED.forecast_5d_low,
        forecast_5d_mid = EXCLUDED.forecast_5d_mid,
        forecast_5d_high = EXCLUDED.forecast_5d_high,
        forecast_20d_low = EXCLUDED.forecast_20d_low,
        forecast_20d_mid = EXCLUDED.forecast_20d_mid,
        forecast_20d_high = EXCLUDED.forecast_20d_high,
        key_drivers = EXCLUDED.key_drivers,
        created_at = CURRENT_TIMESTAMP
    `;
    count++;
    console.log(`  ✓ ${metal}: ${fc.direction} (conf=${fc.confidence}%, price=$${fc.current_price})`);
  }

  console.log(`\nDone — upserted ${count} forecast snapshots for ${forecastDate}`);
}

main().catch(err => { console.error(err); process.exit(1); });
