const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CANONICAL_TEAM_ID = 'Wakama_team';

function normalizeTeam(raw) {
  const t = (raw || '').toString().trim();
  if (!t) return CANONICAL_TEAM_ID;
  if (t === 'team_wakama' || t === 'Wakama Core') return CANONICAL_TEAM_ID;
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

function one(ts, zone, dev, s, team) {
  let v, u;

  if (s === 'dht22_temp') {
    v = clip(rndn(28, 2) + 0.002 * ((ts / 1000) % 3600), 15, 45);
    u = '°C';
  } else if (s === 'dht22_hum') {
    v = clip(rndn(70, 5), 20, 100);
    u = '%';
  } else if (s === 'ds18b20') {
    v = clip(rndn(27, 1.5), 10, 50);
    u = '°C';
  } else if (s === 'soil_moisture') {
    v = clip(rndn(55, 8), 5, 100);
    u = '%';
  } else {
    v = rndn(0, 1);
    u = 'u';
  }

  if (Math.random() < 0.01) {
    v *= Math.random() < 0.5 ? 0.5 : 1.5;
  }

  return {
    zone_id: zone,
    device_id: dev,
    sensor_type: s,
    ts: new Date(ts).toISOString(),
    value: Math.round(v * 10) / 10,
    unit: u,
    team: normalizeTeam(team), // ✅ M2 canonical
  };
}

(function main() {
  // Args compat + option team en 5e position
  const N = parseInt(process.argv[2] || '50', 10);
  const zone = process.argv[3] || 'raviart';
  const dev = process.argv[4] || 'esp32-cam-01';
  const teamArg = process.argv[5];

  const team = normalizeTeam(teamArg);

  const sensors = ['dht22_temp', 'dht22_hum', 'ds18b20', 'soil_moisture'];
  const t0 = Date.now();
  const m = [];

  for (let i = 0; i < N; i++) {
    m.push(one(t0 + i * 1000, zone, dev, sensors[i % sensors.length], team));
  }

  const b = {
    batch_id: crypto.randomUUID(),
    team,                // ✅ batch-level canonical
    source: 'simulated', // ✅ cohérent publishers/dashboard
    ts_min: m[0].ts,
    ts_max: m[m.length - 1].ts,
    count: m.length,
    measures: m,
  };

  const outDir = path.join(process.cwd(), 'batches');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const safeTs = String(b.ts_min).replace(/[:.]/g, '-');
  const name = `${safeTs}_${b.batch_id}.json`;
  const outPath = path.join(outDir, name);

  fs.writeFileSync(outPath, JSON.stringify(b, null, 2), 'utf8');
  console.log(outPath);
})();
