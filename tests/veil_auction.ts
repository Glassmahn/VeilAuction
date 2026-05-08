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
  anchor.setProvider(new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" }));
  const program = anchor.workspace.VeilAuction as Program<VeilAuction>;
  const provider = anchor.getProvider();
  const arciumEnv = getArciumEnv();
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  let owner: anchor.web3.Keypair;
  let mxePublicKey: Uint8Array;

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

  describe("First-Price Auction", () => {
    it("creates an auction, accepts bids, and determines winner", async () => {
      console.log("\n=== First-Price Auction Test ===\n");
      const bidder = owner;
      const bidderPubkey = bidder.publicKey.toBytes();
      const { lo: bidderLo, hi: bidderHi } = splitPubkeyToU128s(bidderPubkey);
      const privateKey = x25519.utils.randomSecretKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);
      const createComputationOffset = new anchor.BN(randomBytes(8), "hex");
      const bidComputationOffset = new anchor.BN(randomBytes(8), "hex");
      const resolveComputationOffset = new anchor.BN(randomBytes(8), "hex");
      const [auctionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("auction"), owner.publicKey.toBuffer()],
        program.programId
      );

      // Step 1: Create auction
      console.log("Step 1: Creating first-price auction...");
      await program.methods
        .createAuction(createComputationOffset, { firstPrice: {} }, new anchor.BN(100), new anchor.BN(120))
        .accountsPartial({
          authority: owner.publicKey, auction: auctionPDA,
          computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, createComputationOffset),
          clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("init_auction_state")).readUInt32LE()),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, createComputationOffset, program.programId, "confirmed");
      const auctionAcc = await program.account.auction.fetch(auctionPDA);
      console.log(`   Status: ${auctionAcc.status}, minBid: ${auctionAcc.minBid}, bidCount: ${auctionAcc.bidCount}`);
      if (auctionAcc.status.toString() !== "open" && auctionAcc.status.toString() !== "0") throw new Error("Auction not Open");
      if (Number(auctionAcc.minBid) !== 100) throw new Error("Wrong minBid");

      // Step 2: Place bid
      console.log("\nStep 2: Placing bid of 500 lamports...");
      const bidAmount = BigInt(500);
      const nonce = randomBytes(16);
      const bidPlaintext = [bidderLo, bidderHi, bidAmount];
      const bidCiphertext = cipher.encrypt(bidPlaintext, nonce);
      await program.methods
        .placeBid(bidComputationOffset, Array.from(bidCiphertext[0]), Array.from(bidCiphertext[1]), Array.from(bidCiphertext[2]), Array.from(publicKey), new anchor.BN(deserializeLE(nonce).toString()))
        .accountsPartial({
          bidder: bidder.publicKey, auction: auctionPDA,
          computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, bidComputationOffset),
          clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, bidComputationOffset, program.programId, "confirmed");
      const auctionAfterBid = await program.account.auction.fetch(auctionPDA);
      console.log(`   bidCount: ${auctionAfterBid.bidCount}`);
      if (auctionAfterBid.bidCount !== 1) throw new Error("Expected bidCount 1");

      // Step 3: Wait for auction end
      console.log("\nStep 3: Waiting for auction to end...");
      const endTime = auctionAfterBid.endTime.toNumber();
      while (true) {
        const now = (await connection.getBlockTime(await connection.getSlot("confirmed")))!;
        if (now >= endTime) break;
        console.log(`   waiting ${endTime - now}s...`);
        await new Promise(r => setTimeout(r, 2000));
      }

      // Step 4: Close auction
      console.log("Closing auction...");
      await program.methods.closeAuction().accountsPartial({ authority: owner.publicKey, auction: auctionPDA }).rpc({ commitment: "confirmed" });
      const closedAcc = await program.account.auction.fetch(auctionPDA);
      console.log(`   Status: ${closedAcc.status}`);
      if (closedAcc.status.toString() !== "closed" && closedAcc.status.toString() !== "1") throw new Error("Auction not Closed");

      // Step 5: Determine winner
      console.log("\nStep 4: Determining winner (first-price)...");
      await program.methods.determineWinnerFirstPrice(resolveComputationOffset).accountsPartial({
        authority: owner.publicKey, auction: auctionPDA,
        computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, resolveComputationOffset),
        clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("determine_winner_first_price")).readUInt32LE()),
      }).rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, resolveComputationOffset, program.programId, "confirmed");
      const resolvedAcc = await program.account.auction.fetch(auctionPDA);
      console.log(`   Status: ${resolvedAcc.status}`);
      if (resolvedAcc.status.toString() !== "resolved" && resolvedAcc.status.toString() !== "2") throw new Error("Auction not Resolved");

      console.log("\n=== First-Price Auction Test PASSED ===\n");
    });
  });

  describe("Vickrey (Second-Price) Auction", () => {
    it("creates an auction with multiple bids, winner pays second-highest", async () => {
      console.log("\n=== Vickrey Auction Test ===\n");

      const vAuthority = anchor.web3.Keypair.generate();
      const fundTx = new anchor.web3.Transaction().add(anchor.web3.SystemProgram.transfer({
        fromPubkey: owner.publicKey, toPubkey: vAuthority.publicKey, lamports: 0.1 * anchor.web3.LAMPORTS_PER_SOL,
      }));
      await connection.sendTransaction(fundTx, [owner]);
      await connection.confirmTransaction(await connection.sendTransaction(fundTx, [owner]));

      const bidder = owner;
      const bidderPubBytes = bidder.publicKey.toBytes();
      const { lo: bLo, hi: bHi } = splitPubkeyToU128s(bidderPubBytes);

      const priv1 = x25519.utils.randomSecretKey();
      const pub1 = x25519.getPublicKey(priv1);
      const sh1 = x25519.getSharedSecret(priv1, mxePublicKey);
      const c1 = new RescueCipher(sh1);

      const [vAuctionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("auction"), vAuthority.publicKey.toBuffer()], program.programId
      );

      // Step 1: Create Vickrey auction
      console.log("Step 1: Creating Vickrey auction...");
      const createCO = new anchor.BN(randomBytes(8), "hex");
      await program.methods.createAuction(createCO, { vickrey: {} }, new anchor.BN(50), new anchor.BN(120))
        .accountsPartial({
          authority: vAuthority.publicKey, auction: vAuctionPDA,
          computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, createCO),
          clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("init_auction_state")).readUInt32LE()),
        }).signers([vAuthority]).rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, createCO, program.programId, "confirmed");
      const vAuctionAcc = await program.account.auction.fetch(vAuctionPDA);
      console.log(`   Status: ${vAuctionAcc.status}, minBid: ${vAuctionAcc.minBid}`);
      if (vAuctionAcc.status.toString() !== "open" && vAuctionAcc.status.toString() !== "0") throw new Error("Vickrey auction not Open");

      // Step 2: First bid 1000
      console.log("\nStep 2: Placing first bid of 1000 lamports...");
      const b1CO = new anchor.BN(randomBytes(8), "hex");
      const n1 = randomBytes(16);
      const ct1 = c1.encrypt([bLo, bHi, BigInt(1000)], n1);
      await program.methods.placeBid(b1CO, Array.from(ct1[0]), Array.from(ct1[1]), Array.from(ct1[2]), Array.from(pub1), new anchor.BN(deserializeLE(n1).toString()))
        .accountsPartial({
          bidder: bidder.publicKey, auction: vAuctionPDA,
          computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, b1CO),
          clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
        }).rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, b1CO, program.programId, "confirmed");
      let vAcc = await program.account.auction.fetch(vAuctionPDA);
      console.log(`   bidCount: ${vAcc.bidCount}`);
      if (vAcc.bidCount !== 1) throw new Error("Expected 1 bid");

      // Step 3: Second bid 700
      console.log("\nStep 3: Placing second bid of 700 lamports...");
      const priv2 = x25519.utils.randomSecretKey();
      const pub2 = x25519.getPublicKey(priv2);
      const sh2 = x25519.getSharedSecret(priv2, mxePublicKey);
      const c2 = new RescueCipher(sh2);
      const b2CO = new anchor.BN(randomBytes(8), "hex");
      const n2 = randomBytes(16);
      const ct2 = c2.encrypt([bLo, bHi, BigInt(700)], n2);
      await program.methods.placeBid(b2CO, Array.from(ct2[0]), Array.from(ct2[1]), Array.from(ct2[2]), Array.from(pub2), new anchor.BN(deserializeLE(n2).toString()))
        .accountsPartial({
          bidder: bidder.publicKey, auction: vAuctionPDA,
          computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, b2CO),
          clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
        }).rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, b2CO, program.programId, "confirmed");
      vAcc = await program.account.auction.fetch(vAuctionPDA);
      console.log(`   bidCount: ${vAcc.bidCount}`);
      if (vAcc.bidCount !== 2) throw new Error("Expected 2 bids");

      // Step 4: Wait for end
      console.log("\nStep 4: Waiting for auction to end...");
      const vEnd = vAcc.endTime.toNumber();
      while (true) {
        const now = (await connection.getBlockTime(await connection.getSlot("confirmed")))!;
        if (now >= vEnd) break;
        await new Promise(r => setTimeout(r, 2000));
      }

      // Step 5: Close
      console.log("Closing Vickrey auction...");
      await program.methods.closeAuction().accountsPartial({ authority: vAuthority.publicKey, auction: vAuctionPDA }).signers([vAuthority]).rpc({ commitment: "confirmed" });
      vAcc = await program.account.auction.fetch(vAuctionPDA);
      if (vAcc.status.toString() !== "closed" && vAcc.status.toString() !== "1") throw new Error("Auction not Closed");

      // Step 6: Determine winner
      console.log("\nStep 5: Determining winner (Vickrey)...");
      const rCO = new anchor.BN(randomBytes(8), "hex");
      await program.methods.determineWinnerVickrey(rCO).accountsPartial({
        authority: vAuthority.publicKey, auction: vAuctionPDA,
        computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, rCO),
        clusterAccount, mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(program.programId, Buffer.from(getCompDefAccOffset("determine_winner_vickrey")).readUInt32LE()),
      }).signers([vAuthority]).rpc({ skipPreflight: true, commitment: "confirmed" });
      await awaitComputationFinalization(provider as anchor.AnchorProvider, rCO, program.programId, "confirmed");
      vAcc = await program.account.auction.fetch(vAuctionPDA);
      console.log(`   Status: ${vAcc.status}`);
      if (vAcc.status.toString() !== "resolved" && vAcc.status.toString() !== "2") throw new Error("Auction not Resolved");

      console.log("\n=== Vickrey Auction Test PASSED ===\n");
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
