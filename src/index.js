/** CREATED BY WAKAMA.farm & Supported by Solana foundation */
import express from "express";
import fs from "fs-extra";
import { v4 as uuid } from "uuid";

const app = express();
app.use(express.json({ limit: "1mb" }));

const BATCH_SIZE = 50;
let buf = [];

// Schéma minimal existant (ne pas casser)
const need = ["zone_id", "device_id", "sensor_type", "ts", "value", "unit"];

// M2 canonical team key
const CANONICAL_TEAM_ID = "Wakama_team";
const INGEST_SOURCE = "ingest";

function normalizeMeasure(m) {
  // On accepte quelques variantes legacy si jamais elles apparaissent
  const rawTeam =
    (typeof m.team === "string" && m.team.trim()) ? m.team.trim()
    : (typeof m.team_id === "string" && m.team_id.trim()) ? m.team_id.trim()
    : (typeof m.teamKey === "string" && m.teamKey.trim()) ? m.teamKey.trim()
    : "";

  const team =
    rawTeam === "team_wakama" || rawTeam === "Wakama Core"
      ? CANONICAL_TEAM_ID
      : rawTeam || CANONICAL_TEAM_ID;

  // Ajout doux de source (si déjà fourni, on respecte)
  const source =
    (typeof m.source === "string" && m.source.trim())
      ? m.source.trim()
      : INGEST_SOURCE;

  return { ...m, team, source };
}

app.post("/ingest", async (req, res) => {
  const m = req.body;

  if (!m || typeof m !== "object") {
    return res.status(400).json({ error: "bad schema" });
  }

  if (!need.every((k) => k in m)) {
    return res.status(400).json({ error: "bad schema" });
  }

  // Normalisation team (sans rendre team obligatoire)
  const normalized = normalizeMeasure(m);

  buf.push(normalized);

  if (buf.length >= BATCH_SIZE) {
    const id = uuid();

    // Assure l'existence du dossier batches
    await fs.ensureDir("./batches");

    const tsMin = buf[0]?.ts;
    const tsMax = buf[buf.length - 1]?.ts;

    const lot = {
      batch_id: id,
      team: CANONICAL_TEAM_ID, // label batch-level par défaut (Wakama interne)
      source: INGEST_SOURCE,
      ts_min: tsMin,
      ts_max: tsMax,
      count: buf.length,
      measures: buf,
    };

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeJson(`./batches/${ts}_${id}.json`, lot, { spaces: 2 });

    buf = [];
  }

  res.json({ ok: true, queued: buf.length });
});

app.listen(8080, () => console.log("ingest listening on :8080"));
