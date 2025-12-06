// tools/generate.cjs
// CommonJS, Node >=18

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CANONICAL_TEAM_ID = 'Wakama_team';
const DEFAULT_SOURCE = 'simulated';

function strTrim(x) {
  return (x || '').toString().trim();
}

function normalizeTeam(raw) {
  const t = strTrim(raw);
  if (!t) return CANONICAL_TEAM_ID;

  if (
    t === 'team_wakama' ||
    t === 'Wakama Core' ||
    t === 'Wakama Team' ||
    t === 'Wakama team' ||
    t === 'Wakama_team'
  ) {
    return CANONICAL_TEAM_ID;
  }

  return t;
}

function rndn(mu, s) {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return mu + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clip(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function one(ts, zone, dev, sensor, team, source) {
  let v, u;

  if (sensor === 'dht22_temp') {
    v = clip(rndn(28, 2) + 0.002 * ((ts / 1000) % 3600), 15, 45);
    u = '°C';
  } else if (sensor === 'dht22_hum') {
    v = clip(rndn(70, 5), 20, 100);
    u = '%';
  } else if (sensor === 'ds18b20') {
    v = clip(rndn(27, 1.5), 10, 50);
    u = '°C';
  } else if (sensor === 'soil_moisture') {
    v = clip(rndn(55, 8), 5, 100);
    u = '%';
  } else {
    v = rndn(0, 1);
    u = 'u';
  }

  if (Math.random() < 0.01) {
    v *= Math.random() < 0.5 ? 0.5 : 1.5;
  }

  const iso = new Date(ts).toISOString();
  const tNorm = normalizeTeam(team);
  const sNorm = strTrim(source) || DEFAULT_SOURCE;

  return {
    zone_id: zone,
    device_id: dev,
    sensor_type: sensor,
    ts: iso,
    value: Math.round(v * 10) / 10,
    unit: u,
    team: tNorm,
    source: sNorm,
  };
}

(function main() {
  // Args:
  // node tools/generate.cjs <N> <zone> <device> [team] [source]
  const Nraw = parseInt(process.argv[2] || '50', 10);
  const N = Number.isFinite(Nraw) && Nraw > 0 ? Nraw : 50;

  const zone = process.argv[3] || 'raviart';
  const dev = process.argv[4] || 'esp32-cam-01';
  const teamArg = process.argv[5];
  const sourceArg = process.argv[6];

  const team = normalizeTeam(teamArg);
  const source = strTrim(sourceArg) || DEFAULT_SOURCE;

  const sensors = ['dht22_temp', 'dht22_hum', 'ds18b20', 'soil_moisture'];
  const t0 = Date.now();
  const measures = [];

  for (let i = 0; i < N; i++) {
    measures.push(
      one(t0 + i * 1000, zone, dev, sensors[i % sensors.length], team, source),
    );
  }

  const batch = {
    batch_id: crypto.randomUUID(),
    team,
    source,
    zone_id: zone,
    device_id: dev,
    ts_min: measures[0]?.ts || '',
    ts_max: measures[measures.length - 1]?.ts || '',
    count: measures.length,
    measures,
  };

  const outDir = path.join(process.cwd(), 'batches');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const safeTs = String(batch.ts_min || new Date().toISOString()).replace(/[:.]/g, '-');
  const name = `${safeTs}_${batch.batch_id}.json`;
  const outPath = path.join(outDir, name);

  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2), 'utf8');
  console.log(outPath);
})();
