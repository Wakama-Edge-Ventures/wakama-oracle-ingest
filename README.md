# wakama-oracle-ingest
HTTP API that buffers incoming measurements and writes batches of 50 to `./batches`.

## POST /ingest
Body = one measurement JSON. On 50 collected, writes a batch JSON to `./batches`.

**Signature:** CREATED BY WAKAMA.farm & Supported by Solana foundation
