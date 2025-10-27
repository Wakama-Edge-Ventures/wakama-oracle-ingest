/** CREATED BY WAKAMA.farm & Supported by Solana foundation */
import express from "express";
import fs from "fs-extra";
import { v4 as uuid } from "uuid";

const app = express();
app.use(express.json({ limit: "1mb" }));

const BATCH_SIZE = 50;
let buf = [];
const need = ["zone_id","device_id","sensor_type","ts","value","unit"];

app.post("/ingest", async (req,res)=>{
  const m = req.body;
  if(!need.every(k=>k in m)) return res.status(400).json({error:"bad schema"});
  buf.push(m);
  if(buf.length>=BATCH_SIZE){
    const id = uuid();
    const lot = { batch_id:id, ts_min:buf[0].ts, ts_max:buf.at(-1).ts, count:buf.length, measures:buf };
    const ts = new Date().toISOString().replace(/[:.]/g,"-");
    await fs.writeJson(`./batches/${ts}_${id}.json`, lot);
    buf=[];
  }
  res.json({ok:true, queued:buf.length});
});

app.listen(8080,()=>console.log("ingest listening on :8080"));
