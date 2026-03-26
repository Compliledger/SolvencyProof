/**
 * adapter_config.ts
 *
 * Reads and validates environment variables required for the real
 * compliledger-algorand-adapter integration.
 *
 * Call loadAlgorandAdapterConfig() when ALGORAND_ADAPTER_ENABLED=true.
 * The returned object is passed to createAlgorandAdapterRealClient().
 *
 * Required env vars when ALGORAND_ADAPTER_ENABLED=true:
 *   ALGORAND_APP_ID             – on-chain SolventRegistry application ID
 *
 * Optional env vars (have defaults suitable for Algorand TestNet):
 *   ALGORAND_ALGOD_URL          – Algod node URL     (default: public AlgoNode testnet)
 *   ALGORAND_ALGOD_TOKEN        – Algod auth token   (default: "" for public nodes)
 *   ALGORAND_ALGOD_PORT         – Algod port         (default: 443)
 *   ALGORAND_NETWORK            – "testnet" | "mainnet" (default: "testnet")
 *
 * Signing (required for submitEpoch; optional for read-only usage):
 *   ALGO_MNEMONIC               – 25-word Algorand mnemonic for signing transactions
 *   ALGORAND_SENDER_ADDRESS     – Override sender address (derived from mnemonic if omitted)
 */

export interface AlgorandAdapterEnvConfig {
  /** Algod node URL, e.g. "https://testnet-api.algonode.cloud" */
  algodUrl: string;
  /** Algod auth token — use "" for public nodes */
  algodToken: string;
  /** Algod port (typically 443 for HTTPS) */
  algodPort: number;
  /** On-chain application ID of the deployed SolventRegistry contract */
  appId: bigint;
  /** 25-word Algorand mnemonic for transaction signing (undefined = read-only mode) */
  mnemonic: string | undefined;
  /** Optional explicit sender address override */
  senderAddress: string | undefined;
  /** "testnet" or "mainnet" */
  network: string;
}

/**
 * Reads Algorand adapter env vars and returns a validated config object.
 *
 * @throws {Error} when ALGORAND_APP_ID is missing or not a valid integer
 */
export function loadAlgorandAdapterConfig(): AlgorandAdapterEnvConfig {
  const appIdStr = process.env.ALGORAND_APP_ID;
  if (!appIdStr) {
    throw new Error(
      "ALGORAND_APP_ID is required when ALGORAND_ADAPTER_ENABLED=true. " +
        "Set ALGORAND_APP_ID to the deployed SolventRegistry contract application ID."
    );
  }

  let appId: bigint;
  try {
    appId = BigInt(appIdStr.trim());
  } catch {
    throw new Error(
      `ALGORAND_APP_ID must be a valid integer (got "${appIdStr}").`
    );
  }

  const algodPortStr = process.env.ALGORAND_ALGOD_PORT;
  const algodPort =
    algodPortStr !== undefined ? parseInt(algodPortStr, 10) : 443;
  if (Number.isNaN(algodPort) || algodPort <= 0 || algodPort > 65535) {
    throw new Error(
      `ALGORAND_ALGOD_PORT must be a valid port number (got "${algodPortStr}").`
    );
  }

  return {
    algodUrl:
      process.env.ALGORAND_ALGOD_URL ?? "https://testnet-api.algonode.cloud",
    algodToken: process.env.ALGORAND_ALGOD_TOKEN ?? "",
    algodPort,
    appId,
    mnemonic: process.env.ALGO_MNEMONIC || undefined,
    senderAddress: process.env.ALGORAND_SENDER_ADDRESS || undefined,
    network: process.env.ALGORAND_NETWORK ?? "testnet",
  };
}
