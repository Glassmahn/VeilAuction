import { Connection, PublicKey, Keypair } from "@solana/web3.js"
import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { VeilAuction } from "../target/types/veil_auction"
import { randomBytes } from "crypto"
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getLookupTableAddress,
  getArciumProgram,
  x25519,
} from "@arcium-hq/client"
import * as fs from "fs"
import * as os from "os"

function splitPubkeyToU128s(pubkey: Uint8Array): { lo: bigint; hi: bigint } {
  const loBytes = pubkey.slice(0, 16);
  const hiBytes = pubkey.slice(16, 32);
  const lo = deserializeLE(loBytes);
  const hi = deserializeLE(hiBytes);
  return { lo, hi };
}

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries = 20,
  retryDelayMs = 500
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const key = await getMXEPublicKey(provider, programId);
      if (key) return key;
    } catch (error) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key`);
    }
    if (attempt < maxRetries) await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

function readKpJson(path: string): Keypair {
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, "utf8"))));
}

function print(...args: any[]) {
  console.log(new Date().toISOString().slice(11, 19), "|", ...args);
}

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://solana-devnet.api.onfinality.io/public";
  const walletKp = readKpJson(`${os.homedir()}/.config/solana/id.json`);
  const wallet = new anchor.Wallet(walletKp);
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed", skipPreflight: true });
  anchor.setProvider(provider);

  print("Wallet:", wallet.publicKey.toBase58());
  print("RPC:", rpcUrl);

  // We need the IDL directly since workspace won't work outside Anchor CLI
  const idl = JSON.parse(fs.readFileSync("target/idl/veil_auction.json", "utf8"));
  const program = new Program(idl as any, new PublicKey("zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4"), provider) as Program<VeilAuction>;

  const arciumEnv = getArciumEnv();
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);
  print("Arcium cluster offset:", arciumEnv.arciumClusterOffset);

  print("\n=== Step 0: Fetch MXE public key ===");
  const mxePublicKey = await getMXEPublicKeyWithRetry(provider, program.programId);
  print("MXE pubkey:", Buffer.from(mxePublicKey).toString("hex").slice(0, 16) + "...");

  const owner = walletKp;
  const bidderPubBytes = owner.publicKey.toBytes();
  const { lo: bidderLo, hi: bidderHi } = splitPubkeyToU128s(bidderPubBytes);

  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  const createOffset = new anchor.BN(randomBytes(8), "hex");
  const bidOffset = new anchor.BN(randomBytes(8), "hex");
  const resolveOffset = new anchor.BN(randomBytes(8), "hex");

  const [auctionPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), owner.publicKey.toBuffer()],
    program.programId
  );

  print("Auction PDA:", auctionPDA.toBase58());

  // ===== CREATE AUCTION =====
  print("\n=== Step 1: Create first-price auction ===");
  try {
    const sig = await (program.methods as any)
      .createAuction(createOffset, { firstPrice: {} }, new anchor.BN(100), new anchor.BN(120))
      .accountsPartial({
        authority: owner.publicKey,
        auction: auctionPDA,
        computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, createOffset),
        clusterAccount,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("init_auction_state")).readUInt32LE()),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    print("Create auction tx:", sig.slice(0, 20) + "...");
  } catch (e: any) {
    print("FAILED:", e.message?.slice(0, 120) ?? e);
    process.exit(1);
  }

  // ===== PLACE BID =====
  print("\n=== Step 2: Place bid 500 lamports ===");
  const bidAmount = BigInt(500);
  const nonce = randomBytes(16);
  const bidPlaintext = [bidderLo, bidderHi, bidAmount];
  const bidCiphertext = cipher.encrypt(bidPlaintext, nonce);

  try {
    const sig = await (program.methods as any)
      .placeBid(
        bidOffset,
        Array.from(bidCiphertext[0]),
        Array.from(bidCiphertext[1]),
        Array.from(bidCiphertext[2]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
      .accountsPartial({
        bidder: owner.publicKey,
        auction: auctionPDA,
        computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, bidOffset),
        clusterAccount,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });
    print("Place bid tx:", sig.slice(0, 20) + "...");
  } catch (e: any) {
    print("FAILED:", e.message?.slice(0, 120) ?? e);
    process.exit(1);
  }

  print("\n=== E2E Test PASSED ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
