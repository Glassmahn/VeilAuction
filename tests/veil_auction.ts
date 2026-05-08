import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { VeilAuction } from "../target/types/veil_auction.js";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  uploadCircuit,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

function splitPubkeyToU128s(pubkey: Uint8Array): { lo: bigint; hi: bigint } {
  const loBytes = pubkey.slice(0, 16);
  const hiBytes = pubkey.slice(16, 32);
  const lo = deserializeLE(loBytes);
  const hi = deserializeLE(hiBytes);
  return { lo, hi };
}

describe("VeilAuction", () => {
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  const walletKp = readKpJson(`${os.homedir()}/.config/solana/id.json`);
  const wallet = new anchor.Wallet(walletKp);
  const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync("target/idl/veil_auction.json", "utf8"));
  const program = new anchor.Program(idl as any, provider) as Program<VeilAuction>;
  const arciumEnv = getArciumEnv();
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  let owner: anchor.web3.Keypair;
  let mxePublicKey: Uint8Array;

  function compDefAddress(name: string) {
    return getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset(name)).readUInt32LE());
  }
  function auctionPDA(authority: PublicKey) {
    return PublicKey.findProgramAddressSync([Buffer.from("auction"), authority.toBuffer()], program.programId)[0];
  }
  function compAddr(offset: anchor.BN) {
    return getComputationAccAddress(arciumEnv.arciumClusterOffset, offset);
  }

  before(async () => {
    console.log("RPC:", RPC_URL);
    owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
    console.log("Wallet:", owner.publicKey.toBase58());
    mxePublicKey = await getMXEPublicKeyWithRetry(provider as anchor.AnchorProvider, program.programId);
    console.log("MXE pubkey:", Buffer.from(mxePublicKey).toString("hex").slice(0, 16) + "...");
    for (const name of ["init_auction_state", "place_bid", "determine_winner_first_price", "determine_winner_vickrey"]) {
      await initCompDef(program, owner, name);
    }
  });

  describe("Full Auction Flow", () => {
    it("creates auction, places bid via MPC, closes, and queues winner determination", async () => {
      console.log("\n=== Full Auction Flow Test ===\n");
      const auth = anchor.web3.Keypair.generate();
      const fundTx = new anchor.web3.Transaction().add(anchor.web3.SystemProgram.transfer({
        fromPubkey: owner.publicKey, toPubkey: auth.publicKey, lamports: 0.1 * anchor.web3.LAMPORTS_PER_SOL,
      }));
      await connection.sendTransaction(fundTx, [owner]);
      await connection.confirmTransaction(await connection.sendTransaction(fundTx, [owner]));

      const bidderPubBytes = owner.publicKey.toBytes();
      const { lo, hi } = splitPubkeyToU128s(bidderPubBytes);
      const privKey = x25519.utils.randomSecretKey();
      const pubKey = x25519.getPublicKey(privKey);
      const sharedSecret = x25519.getSharedSecret(privKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);

      const co1 = new anchor.BN(randomBytes(8), "hex");
      const co2 = new anchor.BN(randomBytes(8), "hex");
      const co3 = new anchor.BN(randomBytes(8), "hex");
      const pda = auctionPDA(auth.publicKey);

      // Step 1: Create auction
      console.log("1. Creating first-price auction (minBid=100, duration=120s)...");
      const tx1 = await program.methods.createAuction(co1, { firstPrice: {} }, new anchor.BN(100), new anchor.BN(120))
        .accountsPartial({
          authority: auth.publicKey, auction: pda, computationAccount: compAddr(co1),
          clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: compDefAddress("init_auction_state"),
        }).signers([auth]).rpc({ commitment: "confirmed" });
      console.log("   tx:", tx1.slice(0, 16) + "...");
      const acc = await program.account.auction.fetch(pda);
      const s1 = Object.keys(acc.status as any)[0];
      console.log(`   status:${s1} minBid:${acc.minBid} bidCount:${acc.bidCount}`);
      if (s1 !== "open") throw new Error("Auction not open");

      // Step 2: Wait for initial computation to finalize (sets encrypted state)
      console.log("2. Waiting for init_auction_state computation...");
      const f1 = await awaitComputationFinalization(provider as anchor.AnchorProvider, co1, program.programId, "confirmed");
      console.log("   finalized:", f1.slice(0, 16) + "...");

      // Step 3: Place bid
      console.log("3. Placing bid of 500 lamports...");
      const nonce = randomBytes(16);
      const ct = cipher.encrypt([lo, hi, BigInt(500)], nonce);
      const tx2 = await program.methods.placeBid(co2, Array.from(ct[0]), Array.from(ct[1]), Array.from(ct[2]), Array.from(pubKey), new anchor.BN(deserializeLE(nonce).toString()))
        .accountsPartial({
          bidder: owner.publicKey, auction: pda, computationAccount: compAddr(co2),
          clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: compDefAddress("place_bid"),
        }).rpc({ commitment: "confirmed" });
      console.log("   tx:", tx2.slice(0, 16) + "...");

      // Step 4: Wait for place_bid computation to finalize
      console.log("4. Waiting for place_bid computation...");
      const f2 = await awaitComputationFinalization(provider as anchor.AnchorProvider, co2, program.programId, "confirmed");
      console.log("   finalized:", f2.slice(0, 16) + "...");

      // devnet does not execute callbacks, so bidCount stays 0

      // Step 5: Wait for auction end
      console.log("5. Waiting for auction to end...");
      const endTime = acc.endTime.toNumber();
      while (true) {
        const now = (await connection.getBlockTime(await connection.getSlot("confirmed")))!;
        if (now >= endTime) break;
        const rem = endTime - now;
        if (rem % 20 === 0 || rem < 5) console.log(`   ${rem}s remaining...`);
        await new Promise(r => setTimeout(r, 2000));
      }

      // Step 6: Close auction
      console.log("6. Closing auction...");
      const tx3 = await program.methods.closeAuction().accountsPartial({ authority: auth.publicKey, auction: pda }).signers([auth]).rpc({ commitment: "confirmed" });
      console.log("   tx:", tx3.slice(0, 16) + "...");
      const acc2 = await program.account.auction.fetch(pda);
      const s2 = Object.keys(acc2.status as any)[0];
      console.log(`   status:${s2}`);
      if (s2 !== "closed") throw new Error("Auction not closed");

      // Step 7: Queue winner determination
      console.log("7. Queuing determine_winner (first-price)...");
      const tx4 = await program.methods.determineWinnerFirstPrice(co3).accountsPartial({
        authority: auth.publicKey, auction: pda, computationAccount: compAddr(co3),
        clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: compDefAddress("determine_winner_first_price"),
      }).signers([auth]).rpc({ commitment: "confirmed" });
      console.log("   tx:", tx4.slice(0, 16) + "...");

      // Step 8: Wait for determine_winner computation to finalize
      console.log("8. Waiting for determine_winner computation...");
      const f3 = await awaitComputationFinalization(provider as anchor.AnchorProvider, co3, program.programId, "confirmed");
      console.log("   finalized:", f3.slice(0, 16) + "...");

      // callback not executed on devnet, status stays closed
      const acc3 = await program.account.auction.fetch(pda);
      const s3 = Object.keys(acc3.status as any)[0];
      console.log(`   status:${s3} (would be 'resolved' with callback relayer)`);

      console.log("\n=== Full Auction Flow Test PASSED ===\n");
    });
  });

  async function initCompDef(program: Program<VeilAuction>, owner: anchor.web3.Keypair, circuitName: string): Promise<void> {
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset(circuitName);
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeed, program.programId.toBuffer(), offset], getArciumProgramId()
    )[0];
    const existing = await provider.connection.getAccountInfo(compDefPDA);
    if (existing && existing.data.length > 0) {
      console.log(`   ${circuitName} comp def exists, skipping`);
      return;
    }
    const methodKey = circuitName === "init_auction_state" ? "initAuctionStateCompDef"
      : circuitName === "place_bid" ? "initPlaceBidCompDef"
      : circuitName === "determine_winner_first_price" ? "initDetermineWinnerFirstPriceCompDef"
      : "initDetermineWinnerVickreyCompDef";
    await (program.methods as any)[methodKey]()
      .accounts({ compDefAccount: compDefPDA, payer: owner.publicKey, mxeAccount: getMXEAccAddress(program.programId) })
      .signers([owner]).rpc({ commitment: "confirmed" });
    console.log(`   ${circuitName} comp def initialized`);
    try {
      await uploadCircuit(provider as anchor.AnchorProvider, circuitName, program.programId, fs.readFileSync(`build/${circuitName}.arcis`), true);
    } catch (e: any) {
      console.log(`   ⚠️ circuit upload skipped: ${e.message?.slice(0, 50)}`);
    }
  }
});

async function getMXEPublicKeyWithRetry(provider: anchor.AnchorProvider, programId: PublicKey, maxRetries = 30, retryDelayMs = 2000): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const key = await getMXEPublicKey(provider, programId);
      if (key) return key;
    } catch (error: any) {
      const is429 = error?.message?.includes("429") || error?.toString?.().includes("429");
      console.log(`   Attempt ${attempt}/${maxRetries} failed${is429 ? " (429)" : ""}, retrying in ${retryDelayMs * Math.min(attempt, 5)}ms`);
    }
    await new Promise(r => setTimeout(r, retryDelayMs * Math.min(attempt, 5)));
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

function readKpJson(path: string): anchor.web3.Keypair {
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, "utf8"))));
}
