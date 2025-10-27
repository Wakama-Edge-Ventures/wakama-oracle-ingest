# wakama-oracle-ingest
HTTP API that buffers incoming measurements and writes batches of 50 to `./batches`.

## POST /ingest
Body = one measurement JSON. When 50 are collected, a batch JSON is written to `./batches`.

**Signature:** CREATED BY WAKAMA.farm & Supported by Solana foundation
