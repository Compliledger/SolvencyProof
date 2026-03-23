# SolvencyProof

**Continuous solvency and liquidity monitoring engine — Algorand MVP (Phase 2)**

SolvencyProof continuously verifies and enforces both **capital backing** and **liquidity readiness**, ensuring reserves exceed liabilities and sufficient liquid assets remain available to satisfy near-term obligations over time.

The backend is the canonical state engine. It generates rolling epoch objects that are prepared for submission to Algorand through the shared `compliledger-algorand-adapter`.

> ⚠️ **Phase 2 Architectural Shift**
> - Phase 1 used Ethereum/Sepolia + ZK proofs (Groth16)
> - Phase 2 targets **Algorand** as the registry chain for MVP
> - The backend is now the source of truth, not the frontend
> - Development order: **backend → Algorand integration → frontend**

---

## What SolvencyProof Verifies

| Check | Formula |
|-------|---------|
| **Capital Backing** | `reserves_total >= total_liabilities` |
| **Liquidity Readiness** | `liquid_assets_total >= near_term_liabilities_total` |

### Combined Health Status

| `capital_backed` | `liquidity_ready` | Status |
|-----------------|------------------|--------|
| ✅ true | ✅ true | **HEALTHY** |
| ✅ true | ❌ false | **LIQUIDITY_STRESSED** |
| ❌ false | ✅ true | **UNDERCOLLATERALIZED** |
| ❌ false | ❌ false | **CRITICAL** |

---

## Architecture Overview

```
data/liabilities.csv          data/reserves.json
         │                             │
         ▼                             ▼
 connectors/liabilities_csv    connectors/reserves_json
         │                             │
         ▼                             ▼
  engine/liability_tree       engine/reserve_snapshot
         │                             │
         └──────────┬──────────────────┘
                    ▼
          engine/health_status
                    │
                    ▼
          engine/epoch_manager
                    │
                    ▼
          engine/epoch_builder
                    │
                    ▼
          proofs/proof_hash   (deterministic SHA-256 commitment)
                    │
                    ▼
       algorand/adapter_payload
                    │
                    ▼
    data/output/latest_epoch.json   ← ready for Algorand submission
```

---

## Backend Module Structure

```
SolvencyProff_Core-Backend/
  backend/src/
    connectors/
      liabilities_csv.ts    — parse + validate liabilities.csv
      reserves_json.ts      — parse + validate reserves.json
    engine/
      epoch_manager.ts      — rolling epoch_id, timestamp, valid_until
      liability_tree.ts     — Merkle root + totals from CSV (buildLiabilityState)
      reserve_snapshot.ts   — Merkle root + snapshot hash from JSON (buildReserveState)
      liquidity_evaluator.ts — evaluateLiquidityReadiness()
      solvency_evaluator.ts  — evaluateCapitalBacking()
      health_status.ts       — evaluateFinancialHealth() → four-state enum
      epoch_builder.ts       — buildSolvencyEpochObject() end-to-end builder
    proofs/
      proof_schema.ts       — canonical field list for hashing
      proof_hash.ts         — computeProofHash() (SHA-256 commitment)
    algorand/
      adapter_payload.ts    — toAlgorandSolvencyRegistryPayload()
    types/
      epoch.ts              — SolvencyEpochObject, LiabilityState, ReserveState
      health.ts             — HealthStatus, HealthEvaluation
      inputs.ts             — LiabilityEntry, ReserveEntry, EpochConfig
    scripts/
      build-epoch.ts        — CLI entrypoint
    tests/
      engine.test.ts        — unit tests for all new modules
```

---

## Input File Formats

**`data/liabilities.csv`** — liability entries

```csv
user_id,balance
user_alice,150000
user_bob,100000
user_charlie,50000
```

**`data/reserves.json`** — reserve sources

```json
[
  { "source_id": "wallet_1", "amount": 500000, "is_liquid": true },
  { "source_id": "wallet_2", "amount": 350000, "is_liquid": false }
]
```

> Connectors are designed to be replaced by API/webhook/stream sources without changing the engine.

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm

### Installation
```bash
git clone <repo-url>
cd SolvencyProof/SolvencyProff_Core-Backend
pnpm install
```

### Run the Epoch Builder (End-to-End)
```bash
pnpm build:epoch
# or from backend directory:
pnpm --filter @solvencyproof/backend build:epoch
```

**Example output:**
```
══════════════════════════════════════════════════
  SolvencyProof — Backend Epoch Builder
══════════════════════════════════════════════════

  EPOCH SUMMARY
──────────────────────────────────────────────────
  Entity ID:              compliledger-entity-01
  Epoch ID:               488968
  Reserves Total:         850,000
  Total Liabilities:      300,000
  Liquid Assets Total:    500,000
  Near-Term Liabilities:  300,000
──────────────────────────────────────────────────
  Capital Backed:         ✅ YES
  Liquidity Ready:        ✅ YES
  Health Status:          HEALTHY
══════════════════════════════════════════════════

✅ Payload written to: data/output/latest_epoch.json
```

### Run Tests
```bash
pnpm test
```

### Canonical Epoch Object Shape

```typescript
{
  entity_id: string,
  epoch_id: number,           // auto-generated, hourly bucket
  liability_root: string,     // keccak256 Merkle root
  reserve_root: string,       // keccak256 Merkle root
  reserve_snapshot_hash: string, // SHA-256 of sorted reserves
  proof_hash: string,         // SHA-256 deterministic commitment
  reserves_total: number,
  total_liabilities: number,
  near_term_liabilities_total: number,
  liquid_assets_total: number,
  capital_backed: boolean,
  liquidity_ready: boolean,
  health_status: "HEALTHY" | "LIQUIDITY_STRESSED" | "UNDERCOLLATERALIZED" | "CRITICAL",
  timestamp: number,          // Unix seconds
  valid_until: number,        // Unix seconds
  adapter_version: string,
  source_type: "backend"
}
```

---

## Assumptions

- `near_term_liabilities_total = total_liabilities` for now; structure supports future maturity bucketing
- `proof_hash` is a SHA-256 commitment over canonical fields — not a ZK proof for this phase
- Algorand on-chain submission is out of scope for Phase 2 MVP backend; the payload is written to disk
- Frontend is not the source of truth; the backend epoch engine drives all state

---

## Remaining Phases

| Phase | Description |
|-------|-------------|
| ✅ Backend | Continuous monitoring engine (this PR) |
| 🔲 Algorand | Submit `latest_epoch.json` via `compliledger-algorand-adapter` |
| 🔲 Frontend | Display live health status from backend |

---

Repository Layout

```
/contracts        Solidity contracts (Phase 1 — kept for reference)
/circuits         Circom ZK circuits (Phase 1 — kept for reference)
/backend          Core monitoring engine (TypeScript) — Phase 2 source of truth
/app              Next.js frontend (Phase 2 frontend TBD)
/data             Input files (CSV / JSON) and output artifacts
/scripts          Deployment & automation scripts
```

---
SolvencyProof does prove:
Cryptographic solvency at a point in time
Public ownership of reserve assets
User-verifiable inclusion in liabilities
Privacy of balances and identities
SolvencyProof does NOT prove:
Future solvency (proofs are point-in-time)
Completeness of undisclosed or off-ledger liabilities
Liquidity or immediate withdrawability
Absence of fraud or collusion
This system improves verifiability and privacy but does not replace audits, governance, or regulation.

## Yellow Network Integration 🟡

SolvencyProof integrates with **Yellow Network's Nitrolite protocol** for off-chain liability management using the real `@erc7824/nitrolite` SDK.

### How Yellow Improves SolvencyProof
- **Instant Off-Chain Updates**: Liability changes happen instantly via Yellow state channels
- **Session-Based Spending**: Users can update balances without gas fees
- **On-Chain Settlement**: Final state settles on Ethereum when session closes
- **Export to Proof System**: Session data exports directly to liabilities CSV for ZK proof generation
- **Real Nitrolite SDK**: Uses `@erc7824/nitrolite` for authentic Yellow Network integration

### Yellow API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/yellow/connect` | POST | Connect to Yellow ClearNode via WebSocket |
| `/api/yellow/authenticate` | POST | Authenticate with EIP-712 signature |
| `/api/yellow/status` | GET | Get connection & authentication status |
| `/api/yellow/session` | POST | Create new liability session |
| `/api/yellow/session/:id` | GET | Get session details |
| `/api/yellow/session/:id/allocations` | PUT | Update allocations (instant, no gas) |
| `/api/yellow/session/:id/close` | POST | Close session & trigger settlement |
| `/api/yellow/session/:id/settlement` | GET | Get settlement TX (Etherscan link) |
| `/api/yellow/session/:id/export` | POST | Export to liabilities.csv |
| `/api/yellow/session/:id/history` | GET | Get session state history |
| `/api/yellow/sessions` | GET | List all sessions |

### Yellow Integration Flow
1. `POST /api/yellow/connect` → Connect to ClearNode WebSocket
2. `POST /api/yellow/authenticate` → Authenticate with session key
3. `POST /api/yellow/session` → Create liability session with participants
4. `PUT /api/yellow/session/:id/allocations` → Update allocations instantly (no gas)
5. `POST /api/yellow/session/:id/close` → Close session & settle on-chain
6. `GET /api/yellow/session/:id/settlement` → View settlement TX on Etherscan
7. `POST /api/yellow/session/:id/export` → Export final liabilities
8. Generate ZK proof → Submit on-chain

### Key Features (Per Yellow Hackathon Requirements)
- ✅ **Uses Yellow SDK**: Real `@erc7824/nitrolite` SDK integration
- ✅ **Off-chain transaction logic**: Instant allocations without gas
- ✅ **Session-based spending**: Participants can update balances freely
- ✅ **On-chain settlement**: Final state settles via smart contracts
- ✅ **Working prototype**: Full API with real Sepolia deployment

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| **Groth16Verifier** | `0x5e22F8cB0CfbC0df5F2251009674E1266E1D2DD6` |
| **SolvencyProofRegistry** | `0x7a9f15BCD95FDD20cf31A480f37CAA9b708aB33d` |

View on Etherscan:
- [Groth16Verifier](https://sepolia.etherscan.io/address/0x5e22F8cB0CfbC0df5F2251009674E1266E1D2DD6)
- [SolvencyProofRegistry](https://sepolia.etherscan.io/address/0x7a9f15BCD95FDD20cf31A480f37CAA9b708aB33d)

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Wallet with Sepolia ETH

### Installation
```bash
# Clone and install
git clone <repo-url>
cd SolvencyProof
pnpm install

# Setup environment
cp contracts/.env.example contracts/.env
# Add your SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY
```

### Full Workflow

#### 1. Build Liabilities Merkle Tree
```bash
pnpm --filter @solvencyproof/backend build:liabilities
```

#### 2. Scan Reserve Addresses
```bash
pnpm --filter @solvencyproof/backend scan:reserves
```

#### 3. Generate ZK Solvency Proof
```bash
pnpm --filter @solvencyproof/backend prove:solvency
```

#### 4. Submit Proof On-Chain
```bash
pnpm --filter @solvencyproof/backend submit:proof
```

#### 5. Start Frontend
```bash
pnpm app:dev
# Open http://localhost:3000
```

### Frontend Features
- **Admin Dashboard**: Generate and submit solvency proofs
- **User Verification**: Check your inclusion in liabilities
- **Public Dashboard**: Verify on-chain solvency status
- **Yellow Session**: Manage liabilities via off-chain state channels

## Demo Flow

1. **Admin** uploads liabilities dataset (CSV)
2. System builds liabilities **Merkle root**
3. Admin scans **reserve wallets** on Ethereum Sepolia
4. **ZK proof** of solvency is generated (Groth16)
5. Proof is **verified on-chain**
6. Users privately verify **inclusion proofs**
7. Public verifies solvency via **dashboard**

### Yellow Network Demo
1. Connect to Yellow ClearNode
2. Start liabilities session
3. Update user balances (instant, no gas)
4. Close session (settles on-chain)
5. Export → Generate ZK proof

Hackathon Compliance
Built from scratch during ETHGlobal HackMoney 2026
Open-sourced during judging
Committed frequently with visible history
Submitted exclusively to HackMoney
Fully compliant with all ETHGlobal event rules

AI Usage Disclosure
AI tools were used to assist with documentation drafting, architectural reasoning, and development planning. All code was written, reviewed, and integrated by the project author.

MIT License
