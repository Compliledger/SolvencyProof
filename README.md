# SolvencyProof

> Continuous Solvency + Liquidity Verification for Digital Financial Systems

---

## What SolvencyProof Does

SolvencyProof continuously verifies and enforces two critical financial health conditions for digital financial systems:

- **Capital Backing**: Total reserves >= total liabilities — the system holds enough assets to cover all obligations.
- **Liquidity Readiness**: Liquid assets >= near-term obligations — the system can meet upcoming payment demands without needing to liquidate long-term holdings.

These checks run on a rolling epoch basis. Each epoch produces a canonical state object that captures the full verification result, which can then be submitted to a blockchain registry for public auditability.

---

## Health Status Model

Each evaluated epoch is assigned one of the following health states:

| Status | Meaning |
|---|---|
| `HEALTHY` | Both capital backing and liquidity readiness conditions are satisfied. |
| `LIQUIDITY_STRESSED` | Capital backing is satisfied, but liquid assets are insufficient to meet near-term obligations. |
| `UNDERCOLLATERALIZED` | Reserves are below total liabilities. Liquidity state is secondary. |
| `CRITICAL` | Both capital backing and liquidity readiness have failed simultaneously. |
| `EXPIRED` | The epoch has exceeded its validity window and has not been renewed. |

---

## Architecture

SolvencyProof follows a backend-first architecture. The backend is the source of truth. The frontend, if present, is a visibility layer only and contains no evaluation logic.

```
Customer Systems
  → Connector Layer
  → Commitment & Evaluation Engine
  → Canonical Epoch Object
  → Algorand Adapter
  → Algorand Solvent Registry
  → Public Verifiers / Consumers
```

**Customer Systems** supply structured liability and reserve data via the connector layer.

**Connector Layer** normalises and ingests input files (`liabilities.csv`, `reserves.json`) into the evaluation pipeline.

**Commitment & Evaluation Engine** computes Merkle roots, reserve hashes, solvency ratios, and liquidity ratios, then assigns a health status.

**Canonical Epoch Object** is the single signed output of each evaluation cycle. It is the unit of record for downstream consumers.

**Algorand Adapter** prepares and submits the epoch object to the Algorand Solvent Registry. The backend itself is chain-agnostic; the adapter is swappable.

**Algorand Solvent Registry** is the on-chain state layer for MVP Phase 2. It stores epoch records so that any party can independently verify them.

**Public Verifiers / Consumers** query the registry or the backend API to confirm the current health of a system without needing to trust any operator.

---

## Core Backend Responsibilities

The backend performs the following steps in each evaluation cycle:

1. Parse `liabilities.csv` — extract individual liability records and amounts.
2. Parse `reserves.json` — extract asset balances, liquidity classifications, and metadata.
3. Compute **liability Merkle root** — a cryptographic commitment to the full liability set.
4. Compute **reserve snapshot hash** — a deterministic hash of the reserve state at evaluation time.
5. Evaluate **solvency** — compare total reserves against total liabilities.
6. Evaluate **liquidity** — compare liquid assets against near-term obligations.
7. Generate **rolling epoch state** — assign epoch ID, timestamps, and validity window.
8. Produce a **canonical epoch object** — the signed, structured output record.
9. Prepare an **Algorand submission payload** — formatted for the chain adapter.

---

## Canonical Epoch Object

Each evaluation cycle produces a canonical epoch object. Example:

```json
{
  "entity_id": "entity-001",
  "epoch_id": "epoch-2026-03-23T18:00:00Z",
  "liability_root": "0xabc123...",
  "reserve_root": "0xdef456...",
  "reserve_snapshot_hash": "0x789abc...",
  "proof_hash": "0x112233...",
  "reserves_total": 12500000.00,
  "total_liabilities": 10000000.00,
  "near_term_liabilities_total": 2500000.00,
  "liquid_assets_total": 3000000.00,
  "capital_backed": true,
  "liquidity_ready": true,
  "health_status": "HEALTHY",
  "timestamp": "2026-03-23T18:00:00Z",
  "valid_until": "2026-03-24T18:00:00Z",
  "adapter_version": "algorand-adapter@0.1.0",
  "source_type": "csv+json"
}
```

---

## Blockchain Strategy

- The backend is **chain-agnostic**. All evaluation logic is independent of any specific blockchain.
- **Algorand** is the target state layer for MVP Phase 2. It was selected for its low transaction costs, deterministic finality, and suitability for structured data anchoring.
- Blockchain submission is handled via the shared **`compliledger-algorand-adapter`** package, which manages both submission and querying of epoch records.
- Alternative adapters (e.g., EVM-compatible chains) may be added without modifying the core evaluation engine.

---

## Input Formats

### `liabilities.csv`

```csv
liability_id,account_id,amount,currency,due_date,category
liab-001,acct-1001,50000.00,USD,2026-04-01,withdrawal
liab-002,acct-1002,120000.00,USD,2026-04-15,loan_repayment
liab-003,acct-1003,30000.00,USD,2026-03-30,withdrawal
```

### `reserves.json`

```json
{
  "entity_id": "entity-001",
  "snapshot_time": "2026-03-23T18:00:00Z",
  "assets": [
    { "asset_id": "res-001", "amount": 5000000.00, "currency": "USD", "liquid": true },
    { "asset_id": "res-002", "amount": 4500000.00, "currency": "USD", "liquid": true },
    { "asset_id": "res-003", "amount": 3000000.00, "currency": "USD", "liquid": false }
  ]
}
```

---

## Running the Backend

Install dependencies:

```bash
pnpm install
```

Run the epoch evaluation pipeline:

```bash
pnpm run build:epoch
```

Output is written to:

```
data/output/latest_epoch.json
```

---

## Testing

The test suite covers:

- **Solvency evaluation** — verifies correct comparison of reserves vs. total liabilities.
- **Liquidity evaluation** — verifies correct comparison of liquid assets vs. near-term obligations.
- **Health status mapping** — confirms all five health states are correctly assigned under the corresponding conditions.
- **Proof hash determinism** — ensures the same inputs always produce the same proof hash.
- **Epoch object generation** — validates the structure and completeness of the canonical epoch output.

Run tests:

```bash
pnpm run test
```

---

## Vision / Roadmap

| Phase | Description |
|---|---|
| **Phase 1** | Backend solvency + liquidity engine. Parses structured inputs, evaluates health, generates canonical epoch objects with deterministic proof hashes. |
| **Phase 2** | Algorand Solvent Registry. Backend submits epoch objects on-chain via the `compliledger-algorand-adapter`. Public verifiers can query confirmed health states trustlessly. |
| **Phase 3** | Real-time streaming inputs and enforcement hooks. Continuous ingestion of live data feeds, automated alerts, and integration with downstream enforcement or notification systems. |

---

## Important Notes

- SolvencyProof provides **verifiable financial state**, not guarantees. The health status reflects the state of the data submitted. It does not guarantee that the underlying entity will remain solvent.
- The **backend is the source of truth**. All evaluation logic resides in the backend pipeline. No other component — including any frontend — should be treated as authoritative.
- The **frontend is a visibility layer**, not the logic layer. It may display epoch results but does not perform any evaluation, and its output should always be traced back to a signed epoch object from the backend.
- On-chain anchoring (Phase 2) provides tamper-evidence and public auditability, but does not replace the need for accurate input data from the submitting entity.

---

## Repository Structure

```
SolvencyProof/
├── backend/      # Core evaluation engine, API, data pipeline
│   ├── backend/  # API layer and epoch evaluation logic
│   ├── data/     # Input and output data directories
│   └── scripts/  # Pipeline scripts
├── frontend/     # Optional visibility layer (React dashboard)
├── algorand/     # Algorand adapter and on-chain integration
├── docs/         # Documentation
└── data/         # Shared data directory
```

---

## License

See [LICENSE](./backend/LICENSE).
