# Algorand Testnet E2E — Sample Output

This document shows representative output from running the end-to-end Algorand
testnet integration script against a live SolventRegistry deployment.

## Command

```bash
# From the repository root
npm run test:algorand:e2e

# Or from the backend workspace root
pnpm run test:algorand:e2e

# Or directly
cd backend/backend
npx tsx src/scripts/test-algorand-e2e.ts
```

## Required Environment Variables

```bash
ALGORAND_ADAPTER_ENABLED=true
ALGORAND_APP_ID=<deployed SolventRegistry app id>
ALGO_MNEMONIC=<25-word funded testnet mnemonic>

# Optional (defaults shown)
ALGORAND_ALGOD_URL=https://testnet-api.algonode.cloud
ALGORAND_ALGOD_TOKEN=
ALGORAND_ALGOD_PORT=443
ALGORAND_NETWORK=testnet
ENTITY_ID=compliledger-entity-01
```

Set `READ_ONLY=true` to skip submission and exercise only the read path.

---

## Sample Output

```
╔════════════════════════════════════════════════════════╗
║  SolvencyProof — Algorand Testnet E2E                  ║
╚════════════════════════════════════════════════════════╝

── Step 0: Validate environment ─────────────────────────
  Network:                       testnet
  Algod URL:                     https://testnet-api.algonode.cloud
  App ID:                        741965234
  Entity ID:                     compliledger-entity-01
  Has signer:                    YES
  Read-only mode:                NO

── Step 1: Build epoch from local input data ────────────
  Liabilities:                   /…/data/liabilities.csv
  Reserves:                      /…/data/reserves.json
  Epoch ID:                      484173
  Health Status:                 HEALTHY
  Capital Backed:                ✅ YES
  Liquidity Ready:               ✅ YES
  Proof Hash:                    3a7f2c91d84e650b1f8c4d29e5a0b376f1c2d8e9a4b5c6d7e8f9a0b1c2d3e4f5

── Step 2: Build universal proof artifact ───────────────
  Module:                        solvency
  Decision Result:               health_status=HEALTHY capital_backed=true liquidity_ready=true
  Reason Codes:                  CAPITAL_BACKED,LIQUIDITY_READY
  Bundle Hash:                   9b2e4f8d1a3c5e7f0b2d4f6a8c0e2f4a6b8d0f2c4e6a8c0e2f4b6d8f0a2c4e6

── Step 3: Map to Algorand adapter payload ──────────────
  Entity ID:                     compliledger-entity-01
  Epoch ID:                      484173
  Reserves Total:                850000
  Health Status:                 HEALTHY
  Adapter Version:               algorand-adapter-v1

── Step 4: Submit epoch to Algorand testnet ─────────────
  ⏳ Submitting epoch…
  ✅ Tx ID:                      VU3BTJFHK6QZUJKD2TPNJ3MFSXN3SJEYWXMEYYWRM36NMYXUAA
  Epoch ID:                      484173
  Confirmed At:                  2026-03-26T21:07:14.000Z
  App ID:                        741965234
  Network:                       testnet

── Step 5: Fetch latest on-chain state ──────────────────
  Entity ID:                     compliledger-entity-01
  Epoch ID:                      484173
  Health Status:                 HEALTHY
  Timestamp:                     2026-03-26T21:05:20.000Z
  Valid Until:                   2026-03-26T22:05:20.000Z
  Anchored At:                   2026-03-26T21:07:14.000Z
  Proof Hash:                    3a7f2c91d84e650b1f8c4d29e5a0b376f1c2d8e9a4b5c6d7e8f9a0b1c2d3e4f5

── Step 6: Fetch specific epoch record ──────────────────
  Entity ID:                     compliledger-entity-01
  Epoch ID:                      484173
  Health Status:                 HEALTHY
  Liability Root:                b4c8d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0
  Reserve Root:                  c5d9e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1
  Proof Hash:                    3a7f2c91d84e650b1f8c4d29e5a0b376f1c2d8e9a4b5c6d7e8f9a0b1c2d3e4f5

── Step 7: Verify stored on-chain record ────────────────
  Verified:                      ✅ YES
  Entity ID:                     compliledger-entity-01
  Epoch ID:                      484173
  Message:                       on-chain record found; proof_hash matches

── Step 8: Health status and freshness ──────────────────
  Health Status:                 HEALTHY
  Is Healthy:                    ✅ YES
  Is Fresh:                      ✅ YES
  Valid Until:                   2026-03-26T22:05:20.000Z

╔════════════════════════════════════════════════════════╗
║  E2E Summary                                           ║
╚════════════════════════════════════════════════════════╝

  Entity ID:                     compliledger-entity-01
  Epoch ID:                      484173
  Tx ID:                         VU3BTJFHK6QZUJKD2TPNJ3MFSXN3SJEYWXMEYYWRM36NMYXUAA
  App ID:                        741965234
  Anchored At:                   2026-03-26T21:07:14.000Z
  Health Status:                 HEALTHY
  Is Healthy:                    true
  Verify Result:                 ✅ VERIFIED

✅ E2E complete.
```

---

## Output Fields

| Field           | Description                                                   |
|-----------------|---------------------------------------------------------------|
| `entity_id`     | Reporting entity identifier                                    |
| `epoch_id`      | Monotonically-increasing hourly epoch bucket (Unix ms / 3600000) |
| `tx_id`         | Algorand transaction ID of the confirmed on-chain submission   |
| `app_id`        | Deployed SolventRegistry smart-contract application ID         |
| `anchored_at`   | ISO-8601 timestamp when the epoch was confirmed on-chain       |
| `health_status` | `HEALTHY` \| `LIQUIDITY_STRESSED` \| `UNDERCOLLATERALIZED` \| `CRITICAL` |

## Read-Only Mode

Running with `READ_ONLY=true` skips the submission step and exercises only the
read path (steps 5–8). Useful for verifying an already-submitted epoch without
spending ALGO on fees:

```bash
READ_ONLY=true ALGORAND_ADAPTER_ENABLED=true \
  ALGORAND_APP_ID=741965234 \
  npm run test:algorand:e2e
```
