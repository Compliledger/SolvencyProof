/**
 * algorand/client/registry_client.ts
 *
 * TypeScript client for the Algorand Solvent Registry contract.
 *
 * Responsibilities:
 *  - Prepare and submit epoch payloads to the on-chain registry
 *  - Read latest state and historical epoch records from box storage
 *  - Query health status and freshness flags
 *
 * This client is designed to be consumed by the compliledger-algorand-adapter.
 * It does NOT compute solvency — it is a thin state-store interface.
 */
import algosdk from "algosdk";
import { HealthStatus, AMOUNT_SCALE, HEALTH_STATUS_STRING_MAP, makeEpochBoxKey, makeLatestBoxKey, } from "../types/registry.js";
// ============================================================
// PAYLOAD CONVERSION
// ============================================================
/**
 * Converts a canonical epoch object (the backend's output) into the
 * AlgorandRegistryPayload expected by submitEpoch().
 *
 * Transformations applied:
 *  - health_status:  string  → numeric HealthStatus enum
 *  - reserves_total, liquid_assets_total, near_term_liabilities_total:
 *                   USD float → micro-units bigint (× AMOUNT_SCALE)
 *  - timestamp, valid_until: ISO-8601 string → Unix seconds bigint
 */
export function toAlgorandSolventRegistryPayload(epoch) {
    const healthStatus = HEALTH_STATUS_STRING_MAP[epoch.health_status.toUpperCase()] ??
        HealthStatus.UNKNOWN;
    const scaleAmount = (usd) => BigInt(Math.round(usd * Number(AMOUNT_SCALE)));
    const toUnixSeconds = (iso) => BigInt(Math.floor(new Date(iso).getTime() / 1000));
    return {
        entity_id: epoch.entity_id,
        epoch_id: epoch.epoch_id,
        liability_root: epoch.liability_root,
        reserve_root: epoch.reserve_root,
        reserve_snapshot_hash: epoch.reserve_snapshot_hash,
        proof_hash: epoch.proof_hash,
        reserves_total: scaleAmount(epoch.reserves_total),
        liquid_assets_total: scaleAmount(epoch.liquid_assets_total),
        near_term_liabilities_total: scaleAmount(epoch.near_term_liabilities_total),
        capital_backed: epoch.capital_backed,
        liquidity_ready: epoch.liquidity_ready,
        health_status: healthStatus,
        timestamp: toUnixSeconds(epoch.timestamp),
        valid_until: toUnixSeconds(epoch.valid_until),
    };
}
// ============================================================
// BOX ENCODING / DECODING
// ============================================================
/**
 * Encodes an AlgorandRegistryPayload (plus computed flags) into the
 * deterministic binary format used as box storage values.
 *
 * Wire format (all big-endian):
 *   [uint16: len(entity_id)][entity_id bytes]
 *   [uint16: len(epoch_id)][epoch_id bytes]
 *   [uint16: len(liability_root)][liability_root bytes]
 *   [uint16: len(reserve_root)][reserve_root bytes]
 *   [uint16: len(reserve_snapshot_hash)][reserve_snapshot_hash bytes]
 *   [uint16: len(proof_hash)][proof_hash bytes]
 *   [uint64: reserves_total]
 *   [uint64: liquid_assets_total]
 *   [uint64: near_term_liabilities_total]
 *   [uint8:  capital_backed  0|1]
 *   [uint8:  liquidity_ready 0|1]
 *   [uint8:  health_status   0–5]
 *   [uint64: timestamp]
 *   [uint64: valid_until]
 *   [uint8:  insolvency_flag     0|1]
 *   [uint8:  liquidity_stress_flag 0|1]
 */
export function encodeState(payload, insolvencyFlag, liquidityStressFlag) {
    const enc = new TextEncoder();
    const strings = [
        payload.entity_id,
        payload.epoch_id,
        payload.liability_root,
        payload.reserve_root,
        payload.reserve_snapshot_hash,
        payload.proof_hash,
    ].map((s) => enc.encode(s));
    // Calculate total length
    const stringBytes = strings.reduce((acc, s) => acc + 2 + s.length, 0);
    const fixedBytes = 3 * 8 + 3 * 1 + 2 * 8 + 2 * 1; // uint64s + uint8s
    const buf = new Uint8Array(stringBytes + fixedBytes);
    const view = new DataView(buf.buffer);
    let offset = 0;
    // Variable-length strings with 2-byte length prefix
    for (const s of strings) {
        view.setUint16(offset, s.length, false);
        offset += 2;
        buf.set(s, offset);
        offset += s.length;
    }
    // Fixed-size numeric fields
    view.setBigUint64(offset, payload.reserves_total, false);
    offset += 8;
    view.setBigUint64(offset, payload.liquid_assets_total, false);
    offset += 8;
    view.setBigUint64(offset, payload.near_term_liabilities_total, false);
    offset += 8;
    view.setUint8(offset++, payload.capital_backed ? 1 : 0);
    view.setUint8(offset++, payload.liquidity_ready ? 1 : 0);
    view.setUint8(offset++, payload.health_status);
    view.setBigUint64(offset, payload.timestamp, false);
    offset += 8;
    view.setBigUint64(offset, payload.valid_until, false);
    offset += 8;
    view.setUint8(offset++, insolvencyFlag ? 1 : 0);
    view.setUint8(offset++, liquidityStressFlag ? 1 : 0);
    return buf;
}
/**
 * Decodes the binary box value (produced by encodeState or the PyTeal contract)
 * back into a structured EpochRecord.
 */
export function decodeState(raw) {
    const dec = new TextDecoder();
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    let offset = 0;
    const readString = () => {
        const len = view.getUint16(offset, false);
        offset += 2;
        const str = dec.decode(raw.slice(offset, offset + len));
        offset += len;
        return str;
    };
    const entity_id = readString();
    const epoch_id = readString();
    const liability_root = readString();
    const reserve_root = readString();
    const reserve_snapshot_hash = readString();
    const proof_hash = readString();
    const reserves_total = view.getBigUint64(offset, false);
    offset += 8;
    const liquid_assets_total = view.getBigUint64(offset, false);
    offset += 8;
    const near_term_liabilities_total = view.getBigUint64(offset, false);
    offset += 8;
    const capital_backed = view.getUint8(offset++) === 1;
    const liquidity_ready = view.getUint8(offset++) === 1;
    const health_status = view.getUint8(offset++);
    const timestamp = view.getBigUint64(offset, false);
    offset += 8;
    const valid_until = view.getBigUint64(offset, false);
    offset += 8;
    const insolvency_flag = view.getUint8(offset++) === 1;
    const liquidity_stress_flag = view.getUint8(offset++) === 1;
    return {
        entity_id,
        epoch_id,
        liability_root,
        reserve_root,
        reserve_snapshot_hash,
        proof_hash,
        reserves_total,
        liquid_assets_total,
        near_term_liabilities_total,
        capital_backed,
        liquidity_ready,
        health_status,
        timestamp,
        valid_until,
        insolvency_flag,
        liquidity_stress_flag,
    };
}
// ============================================================
// REGISTRY CLIENT
// ============================================================
/**
 * SolventRegistryClient provides a typed interface to the on-chain
 * Algorand Solvent Registry contract.
 *
 * Read-only methods (getLatestState, getEpochRecord, isHealthy,
 * getHealthStatus) do not require a signer.
 *
 * Write methods (submitEpoch) require signer + senderAddress.
 */
export class SolventRegistryClient {
    algodClient;
    appId;
    signer;
    senderAddress;
    constructor(config) {
        this.algodClient = new algosdk.Algodv2(config.nodeToken ?? "", config.nodeUrl, config.nodePort ?? 443);
        this.appId = config.appId;
        this.signer = config.signer;
        this.senderAddress = config.senderAddress;
    }
    // ----------------------------------------------------------
    // WRITE
    // ----------------------------------------------------------
    /**
     * Submits a new epoch record to the on-chain registry.
     *
     * Calls the `submit_epoch` ABI method on the SolventRegistry contract.
     * The on-chain contract enforces epoch monotonicity (no overwrite of existing epoch).
     *
     * @param payload - AlgorandRegistryPayload (use toAlgorandSolventRegistryPayload() to build it)
     * @returns Transaction ID of the confirmed submission
     */
    async submitEpoch(payload) {
        if (!this.signer || !this.senderAddress) {
            throw new Error("submitEpoch requires signer and senderAddress in client config");
        }
        const suggestedParams = await this.algodClient.getTransactionParams().do();
        // Box references required by the contract for this call
        const latestBoxKey = makeLatestBoxKey(payload.entity_id);
        const epochBoxKey = makeEpochBoxKey(payload.entity_id, payload.epoch_id);
        const boxes = [
            { appIndex: 0, name: latestBoxKey },
            { appIndex: 0, name: epochBoxKey },
        ];
        const methodArgs = [
            payload.entity_id,
            payload.epoch_id,
            payload.liability_root,
            payload.reserve_root,
            payload.reserve_snapshot_hash,
            payload.proof_hash,
            payload.reserves_total,
            payload.liquid_assets_total,
            payload.near_term_liabilities_total,
            payload.capital_backed,
            payload.liquidity_ready,
            payload.health_status,
            payload.timestamp,
            payload.valid_until,
        ];
        const abiMethod = algosdk.ABIMethod.fromSignature("submit_epoch(string,string,string,string,string,string,uint64,uint64,uint64,bool,bool,uint8,uint64,uint64)void");
        const atc = new algosdk.AtomicTransactionComposer();
        atc.addMethodCall({
            appID: Number(this.appId),
            method: abiMethod,
            methodArgs,
            sender: this.senderAddress,
            suggestedParams,
            signer: this.signer,
            boxes,
        });
        const result = await atc.execute(this.algodClient, 4);
        return result.txIDs[0];
    }
    // ----------------------------------------------------------
    // READ
    // ----------------------------------------------------------
    /**
     * Returns the latest state for an entity, or null if none has been submitted.
     */
    async getLatestState(entityId) {
        const boxKey = makeLatestBoxKey(entityId);
        return this._readBox(boxKey);
    }
    /**
     * Returns a specific historical epoch record, or null if not found.
     */
    async getEpochRecord(entityId, epochId) {
        const boxKey = makeEpochBoxKey(entityId, epochId);
        return this._readBox(boxKey);
    }
    /**
     * Returns true if the entity's latest state has health_status == HEALTHY
     * and the current time is before valid_until.
     */
    async isHealthy(entityId) {
        const state = await this.getLatestState(entityId);
        if (!state)
            return false;
        const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
        return (state.health_status === HealthStatus.HEALTHY &&
            nowSeconds <= state.valid_until);
    }
    /**
     * Returns the current health status enum value for an entity.
     * Returns HealthStatus.UNKNOWN if no state has been submitted or the
     * epoch's validity window has expired.
     */
    async getHealthStatus(entityId) {
        const state = await this.getLatestState(entityId);
        if (!state)
            return HealthStatus.UNKNOWN;
        const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
        if (nowSeconds > state.valid_until)
            return HealthStatus.EXPIRED;
        return state.health_status;
    }
    // ----------------------------------------------------------
    // INTERNAL HELPERS
    // ----------------------------------------------------------
    async _readBox(boxKey) {
        try {
            const boxName = Buffer.from(boxKey).toString("base64");
            const response = await this.algodClient
                .getApplicationBoxByName(Number(this.appId), boxKey)
                .do();
            // algosdk returns value as Uint8Array
            const raw = response.value;
            return decodeState(raw);
        }
        catch {
            // Box not found → entity/epoch does not exist
            return null;
        }
    }
}
// ============================================================
// FACTORY / CONVENIENCE
// ============================================================
/**
 * Creates a SolventRegistryClient configured for Algorand TestNet
 * using the public AlgoNode endpoint.
 */
export function createTestnetClient(appId, signer, senderAddress) {
    return new SolventRegistryClient({
        nodeUrl: "https://testnet-api.algonode.cloud",
        nodePort: 443,
        appId,
        signer,
        senderAddress,
    });
}
/**
 * Creates a SolventRegistryClient configured for Algorand MainNet
 * using the public AlgoNode endpoint.
 */
export function createMainnetClient(appId, signer, senderAddress) {
    return new SolventRegistryClient({
        nodeUrl: "https://mainnet-api.algonode.cloud",
        nodePort: 443,
        appId,
        signer,
        senderAddress,
    });
}
/**
 * Creates a SolventRegistryClient for Algorand TestNet, initialised from a
 * 25-word mnemonic. The derived account is used as both the signer and sender
 * for submit_epoch transactions.
 *
 * @param appId    - On-chain application ID of the deployed SolventRegistry
 * @param mnemonic - 25-word Algorand mnemonic (BIP-39 not supported; use
 *                   the algosdk-generated format from `goal account new`)
 */
export function createTestnetClientFromMnemonic(appId, mnemonic) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const signer = algosdk.makeBasicAccountTransactionSigner(account);
    return createTestnetClient(appId, signer, account.addr);
}
export { HealthStatus, AMOUNT_SCALE };
