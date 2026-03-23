import { createPublicClient, http, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DATA_DIR = path.resolve(__dirname, "../../data");
const OUTPUT_DIR = path.resolve(__dirname, "../../data/output");

async function main() {
  console.log("📦 SolvencyProof: Reserves Scanner\n");

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read reserves addresses
  const reservesPath = path.join(DATA_DIR, "reserves.json");
  if (!existsSync(reservesPath)) {
    console.error(`❌ File not found: ${reservesPath}`);
    process.exit(1);
  }

  const reservesData = JSON.parse(readFileSync(reservesPath, "utf-8"));
  const addresses: string[] = Array.isArray(reservesData) ? reservesData : (reservesData.addresses || []);

  if (addresses.length === 0) {
    console.log("⚠️  No reserve addresses found. Add addresses to data/reserves.json");
    console.log('   Format: ["0x...", "0x..."]');
    process.exit(1);
  }

  console.log(`📍 Scanning ${addresses.length} reserve address(es) on Sepolia\n`);

  // RPC URLs to try (in order of preference)
  const rpcUrls = [
    process.env.SEPOLIA_RPC_URL,
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://rpc.sepolia.org",
    "https://1rpc.io/sepolia",
  ].filter(Boolean) as string[];

  console.log(`   Using RPC: ${rpcUrls[0]}`);

  // Helper to fetch balance with retries across multiple RPCs
  async function fetchBalanceWithRetry(address: string): Promise<bigint> {
    for (const rpcUrl of rpcUrls) {
      try {
        const client = createPublicClient({
          chain: sepolia,
          transport: http(rpcUrl, { timeout: 15000 }),
        });
        const balance = await client.getBalance({
          address: address as `0x${string}`,
        });
        return balance;
      } catch (err) {
        console.log(`   ⚠️  RPC ${rpcUrl.slice(0, 30)}... failed, trying next...`);
      }
    }
    throw new Error(`All RPCs failed for ${address}`);
  }

  // Fetch balances
  const balances: { address: string; balance: string; balanceWei: string }[] = [];
  let totalWei = 0n;

  for (const address of addresses) {
    try {
      const balance = await fetchBalanceWithRetry(address);
      balances.push({
        address,
        balance: formatEther(balance),
        balanceWei: balance.toString(),
      });
      totalWei += balance;
      console.log(`   ${address}: ${formatEther(balance)} ETH`);
    } catch (err) {
      console.error(`   ❌ Failed to fetch ${address}:`, err);
    }
  }

  console.log(`\n💰 Total Reserves: ${formatEther(totalWei)} ETH`);
  console.log(`   (${totalWei.toString()} wei)\n`);

  // Read epoch
  const epochPath = path.join(DATA_DIR, "epoch.json");
  let epochData = { epoch_id: "epoch_001", timestamp: Date.now() };
  if (existsSync(epochPath)) {
    epochData = JSON.parse(readFileSync(epochPath, "utf-8"));
  }

  // Save reserves snapshot
  const snapshot = {
    epoch_id: epochData.epoch_id,
    timestamp: Date.now(),
    chain: "sepolia",
    chain_id: 11155111,
    addresses: balances,
    reserves_total: formatEther(totalWei),
    reserves_total_wei: totalWei.toString(),
  };

  writeFileSync(
    path.join(OUTPUT_DIR, "reserves_snapshot.json"),
    JSON.stringify(snapshot, null, 2)
  );
  console.log(`✅ Saved reserves_snapshot.json`);
  console.log("\n🎉 Reserves scan complete!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
