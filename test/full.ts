// Run: npx tsx test/full.ts
import * as anchor from "@coral-xyz/anchor"
import { Program, IdlEvents, AnchorProvider } from "@coral-xyz/anchor"
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js"
import { randomBytes } from "crypto"
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
  getLookupTableAddress,
  getArciumProgram,
  x25519,
} from "@arcium-hq/client"
import * as fs from "fs"
import * as os from "os"

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
const IDL = JSON.parse(fs.readFileSync("target/idl/veil_auction.json", "utf8"))

function splitPubkeyToU128s(pubkey: Uint8Array): { lo: bigint; hi: bigint } {
  const loBytes = pubkey.slice(0, 16)
  const hiBytes = pubkey.slice(16, 32)
  return { lo: deserializeLE(loBytes), hi: deserializeLE(hiBytes) }
}

function readKpJson(path: string): Keypair {
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, "utf8"))))
}

async function getMXEPublicKeyWithRetry(
  conn: Connection,
  programId: PublicKey,
  maxRetries = 20,
  retryDelayMs = 500
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dummyKp = Keypair.generate()
      const dummyProvider = new AnchorProvider(
        conn,
        { publicKey: dummyKp.publicKey, signTransaction: async () => { throw new Error("nope") }, signAllTransactions: async () => { throw new Error("nope") } } as any,
        { commitment: "confirmed", skipPreflight: true }
      )
      const key = await getMXEPublicKey(dummyProvider as any, programId)
      if (key) return key
    } catch (e) {
      console.log(`  MXE key attempt ${attempt} failed`)
    }
    if (attempt < maxRetries) await new Promise(r => setTimeout(r, retryDelayMs))
  }
  throw new Error("Could not fetch MXE public key")
}

function print(...args: any[]) {
  console.log(new Date().toISOString().slice(11, 19), "|", ...args)
}

async function main() {
  print("=== VeilAuction End-to-End Test (Devnet) ===\n")

  const conn = new Connection(RPC, "confirmed")
  const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`)
  const programId = new PublicKey("zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4")
  const program = new Program(IDL, programId, { connection: conn } as any)
  const arciumEnv = getArciumEnv()
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset)

  print("Wallet:", owner.publicKey.toBase58())
  print("Program:", programId.toBase58())
  print("RPC:", RPC)

  // Get MXE x25519 key
  print("\nFetching MXE x25519 public key...")
  const mxePublicKey = await getMXEPublicKeyWithRetry(conn, programId)
  print("MXE x25519 key:", Buffer.from(mxePublicKey).toString("hex").slice(0, 16) + "...")

  // Init comp defs
  async function initCompDef(circuitName: string) {
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount")
    const offset = getCompDefAccOffset(circuitName)
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeed, programId.toBuffer(), offset],
      new PublicKey(getArciumProgramId())
    )[0]
    const mxeAccount = getMXEAccAddress(programId)
    const mxeAcc = await program.account.mxeAccount.fetch(mxeAccount)
    const lutAddress = getLookupTableAddress(programId, mxeAcc.lutOffsetSlot)

    const methodName = circuitName
      .split("_")
      .map((s, i) => i === 0 ? s : s[0].toUpperCase() + s.slice(1))
      .join("")
    const method = program.methods[`init${methodName[0].toUpperCase() + methodName.slice(1)}CompDef`]()

    const sig = await method
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" })

    const rawCircuit = fs.readFileSync(`build/${circuitName}.arcis`)
    await uploadCircuit(conn as any, circuitName, programId, rawCircuit, true)
    print(`  ${circuitName} comp def initialized: ${sig.slice(0, 16)}...`)
  }

  print("\n=== Initializing Computation Definitions ===\n")
  for (const name of ["init_auction_state", "place_bid", "determine_winner_first_price", "determine_winner_vickrey"]) {
    print(`  ${name}...`)
    await initCompDef(name)
  }
  print("All comp defs initialized.\n")

  // Helper: compute auction PDA
  function auctionPda(authority: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), authority.toBuffer()],
      programId
    )[0]
  }

  // Helper: wait for event
  async function awaitEvent(eventName: string, auctionKey?: PublicKey, timeoutMs = 120000): Promise<any> {
    return new Promise((res, rej) => {
      const listener = program.addEventListener(eventName, (event: any, slot: number) => {
        if (auctionKey && event.auction && !event.auction.equals(auctionKey)) return
        program.removeEventListener(listener)
        res(event)
      })
      setTimeout(() => {
        program.removeEventListener(listener)
        rej(new Error(`Event ${eventName} timed out`))
      }, timeoutMs)
    })
  }

  async function getValidatorTimestamp(): Promise<number> {
    const slot = await conn.getSlot("confirmed")
    return await conn.getBlockTime(slot) ?? 0
  }

  // ===== FIRST-PRICE AUCTION =====
  print("\n" + "=".repeat(50))
  print("FIRST-PRICE AUCTION TEST")
  print("=".repeat(50) + "\n")

  const bidder = owner
  const bidderPubkey = bidder.publicKey.toBytes()
  const { lo: bidderLo, hi: bidderHi } = splitPubkeyToU128s(bidderPubkey)
  const privateKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(privateKey)
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey)
  const cipher = new RescueCipher(sharedSecret)

  // Step 1: Create auction
  print("Step 1: Creating first-price auction...")
  const createCompOffset = new anchor.BN(randomBytes(8))
  const auctionPDA = auctionPda(owner.publicKey)
  const auctionCreatedPromise = awaitEvent("auctionCreatedEvent", auctionPDA)

  const createSig = await program.methods
    .createAuction(createCompOffset, { firstPrice: {} }, new anchor.BN(100), new anchor.BN(120))
    .accountsPartial({
      authority: owner.publicKey,
      auction: auctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, createCompOffset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("init_auction_state")).readUInt32LE()),
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  print("  Create tx:", createSig.slice(0, 16) + "...")

  await awaitComputationFinalization(conn as any, createCompOffset, programId, "confirmed")
  const createdEvent = await auctionCreatedPromise
  print("  Auction created:", createdEvent.auction.toBase58())
  console.assert(createdEvent.minBid.toNumber() === 100, "minBid mismatch")

  // Step 2: Place bid
  print("\nStep 2: Placing bid of 500 lamports...")
  const bidPlacedPromise = awaitEvent("bidPlacedEvent", auctionPDA)
  const bidCompOffset = new anchor.BN(randomBytes(8))
  const bidAmount = BigInt(500)
  const nonce = randomBytes(16)
  const bidCiphertext = cipher.encrypt([bidderLo, bidderHi, bidAmount], nonce)

  const placeBidSig = await program.methods
    .placeBid(
      bidCompOffset,
      Array.from(bidCiphertext[0]),
      Array.from(bidCiphertext[1]),
      Array.from(bidCiphertext[2]),
      Array.from(publicKey),
      new anchor.BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      bidder: bidder.publicKey,
      auction: auctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, bidCompOffset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  print("  Place bid tx:", placeBidSig.slice(0, 16) + "...")

  await awaitComputationFinalization(conn as any, bidCompOffset, programId, "confirmed")
  const bidPlacedEvent = await bidPlacedPromise
  print("  Bid placed, count:", bidPlacedEvent.bidCount)
  console.assert(bidPlacedEvent.bidCount === 1, "bidCount mismatch")

  // Step 3: Wait for auction to end and close
  print("\nStep 3: Waiting for auction to end...")
  const auctionAcc = await program.account.auction.fetch(auctionPDA)
  const endTime = auctionAcc.endTime.toNumber()
  while (true) {
    const now = await getValidatorTimestamp()
    if (now >= endTime) break
    print(`  Waiting ${endTime - now}s...`)
    await new Promise(r => setTimeout(r, 3000))
  }

  print("  Closing auction...")
  const closePromise = awaitEvent("auctionClosedEvent", auctionPDA)
  const closeSig = await program.methods
    .closeAuction()
    .accountsPartial({ authority: owner.publicKey, auction: auctionPDA })
    .rpc({ preflightCommitment: "confirmed", commitment: "confirmed" })
  print("  Close tx:", closeSig.slice(0, 16) + "...")
  await closePromise

  // Step 4: Determine winner
  print("\nStep 4: Determining winner (first-price)...")
  const resolvePromise = awaitEvent("auctionResolvedEvent", auctionPDA)
  const resolveCompOffset = new anchor.BN(randomBytes(8))

  const resolveSig = await program.methods
    .determineWinnerFirstPrice(resolveCompOffset)
    .accountsPartial({
      authority: owner.publicKey,
      auction: auctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, resolveCompOffset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("determine_winner_first_price")).readUInt32LE()),
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  print("  Determine winner tx:", resolveSig.slice(0, 16) + "...")

  await awaitComputationFinalization(conn as any, resolveCompOffset, programId, "confirmed")
  const resolvedEvent = await resolvePromise
  print("\n=== FIRST-PRICE RESULTS ===")
  print("  Payment amount:", resolvedEvent.paymentAmount.toNumber(), "lamports")
  console.assert(resolvedEvent.paymentAmount.toNumber() === 500, "payment should be 500")

  const expectedWinner = Buffer.from(bidderPubkey).toString("hex")
  const actualWinner = Buffer.from(resolvedEvent.winner).toString("hex")
  console.assert(actualWinner === expectedWinner, "winner mismatch")
  print("  Winner:", actualWinner.slice(0, 16) + "...")
  print("  First-Price PASSED!\n")

  // ===== VICKREY AUCTION =====
  print("=".repeat(50))
  print("VICKREY AUCTION TEST")
  print("=".repeat(50) + "\n")

  const vickreyAuth = Keypair.generate()
  const fundSig = await conn.requestAirdrop(vickreyAuth.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
  await conn.confirmTransaction(fundSig)
  print("Vickrey authority funded:", vickreyAuth.publicKey.toBase58())

  const vickreyAuctionPDA = auctionPda(vickreyAuth.publicKey)
  const bidder1 = owner
  const bidder1Pubkey = bidder1.publicKey.toBytes()
  const { lo: b1Lo, hi: b1Hi } = splitPubkeyToU128s(bidder1Pubkey)
  const privKey1 = x25519.utils.randomSecretKey()
  const pubKey1 = x25519.getPublicKey(privKey1)
  const sharedSecret1 = x25519.getSharedSecret(privKey1, mxePublicKey)
  const cipher1 = new RescueCipher(sharedSecret1)

  // Step 1: Create Vickrey auction
  print("Step 1: Creating Vickrey auction...")
  const vickreyCreateOffset = new anchor.BN(randomBytes(8))
  const vickreyCreatedPromise = awaitEvent("auctionCreatedEvent", vickreyAuctionPDA)

  const vickreyCreateSig = await program.methods
    .createAuction(vickreyCreateOffset, { vickrey: {} }, new anchor.BN(50), new anchor.BN(120))
    .accountsPartial({
      authority: vickreyAuth.publicKey,
      auction: vickreyAuctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, vickreyCreateOffset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("init_auction_state")).readUInt32LE()),
    })
    .signers([vickreyAuth])
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  print("  Create tx:", vickreyCreateSig.slice(0, 16) + "...")
  await awaitComputationFinalization(conn as any, vickreyCreateOffset, programId, "confirmed")
  await vickreyCreatedPromise
  print("  Vickrey auction created")

  // Step 2: Place first bid (1000 lamports)
  print("\nStep 2: Placing first bid of 1000 lamports...")
  const bid1PlacedPromise = awaitEvent("bidPlacedEvent", vickreyAuctionPDA)
  const bid1Offset = new anchor.BN(randomBytes(8))
  const bid1Amount = BigInt(1000)
  const nonce1 = randomBytes(16)
  const bid1Cipher = cipher1.encrypt([b1Lo, b1Hi, bid1Amount], nonce1)

  await program.methods
    .placeBid(
      bid1Offset,
      Array.from(bid1Cipher[0]),
      Array.from(bid1Cipher[1]),
      Array.from(bid1Cipher[2]),
      Array.from(pubKey1),
      new anchor.BN(deserializeLE(nonce1).toString())
    )
    .accountsPartial({
      bidder: bidder1.publicKey,
      auction: vickreyAuctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, bid1Offset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
    })
    .signers([vickreyAuth]) // bidder needs to be signer too
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  await awaitComputationFinalization(conn as any, bid1Offset, programId, "confirmed")
  await bid1PlacedPromise
  print("  Bid 1 placed")

  // Step 3: Place second bid (700 lamports)
  print("\nStep 3: Placing second bid of 700 lamports...")
  const bid2PlacedPromise = awaitEvent("bidPlacedEvent", vickreyAuctionPDA)
  const bid2Offset = new anchor.BN(randomBytes(8))
  const bid2Amount = BigInt(700)
  const nonce2 = randomBytes(16)
  const privKey2 = x25519.utils.randomSecretKey()
  const pubKey2 = x25519.getPublicKey(privKey2)
  const sharedSecret2 = x25519.getSharedSecret(privKey2, mxePublicKey)
  const cipher2 = new RescueCipher(sharedSecret2)
  const bid2Cipher = cipher2.encrypt([b1Lo, b1Hi, bid2Amount], nonce2)

  await program.methods
    .placeBid(
      bid2Offset,
      Array.from(bid2Cipher[0]),
      Array.from(bid2Cipher[1]),
      Array.from(bid2Cipher[2]),
      Array.from(pubKey2),
      new anchor.BN(deserializeLE(nonce2).toString())
    )
    .accountsPartial({
      bidder: bidder1.publicKey,
      auction: vickreyAuctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, bid2Offset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
    })
    .signers([vickreyAuth])
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  await awaitComputationFinalization(conn as any, bid2Offset, programId, "confirmed")
  const bid2Event = await bid2PlacedPromise
  console.assert(bid2Event.bidCount === 2, "should have 2 bids")
  print("  Bid 2 placed, count:", bid2Event.bidCount)

  // Step 4: Wait and close
  print("\nStep 4: Waiting for auction to end...")
  const vickreyAcc = await program.account.auction.fetch(vickreyAuctionPDA)
  const vickreyEnd = vickreyAcc.endTime.toNumber()
  while (true) {
    const now = await getValidatorTimestamp()
    if (now >= vickreyEnd) break
    await new Promise(r => setTimeout(r, 3000))
  }

  print("  Closing...")
  const vickreyClosePromise = awaitEvent("auctionClosedEvent", vickreyAuctionPDA)
  await program.methods
    .closeAuction()
    .accountsPartial({ authority: vickreyAuth.publicKey, auction: vickreyAuctionPDA })
    .signers([vickreyAuth])
    .rpc({ preflightCommitment: "confirmed", commitment: "confirmed" })
  await vickreyClosePromise
  print("  Auction closed")

  // Step 5: Determine Vickrey winner
  print("\nStep 5: Determining Vickrey winner...")
  const vickreyResolvePromise = awaitEvent("auctionResolvedEvent", vickreyAuctionPDA)
  const vickreyResolveOffset = new anchor.BN(randomBytes(8))

  await program.methods
    .determineWinnerVickrey(vickreyResolveOffset)
    .accountsPartial({
      authority: vickreyAuth.publicKey,
      auction: vickreyAuctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, vickreyResolveOffset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("determine_winner_vickrey")).readUInt32LE()),
    })
    .signers([vickreyAuth])
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  await awaitComputationFinalization(conn as any, vickreyResolveOffset, programId, "confirmed")
  const vickreyResolvedEvent = await vickreyResolvePromise

  print("\n=== VICKREY RESULTS ===")
  print("  Payment amount:", vickreyResolvedEvent.paymentAmount.toNumber(), "lamports")
  console.assert(vickreyResolvedEvent.paymentAmount.toNumber() === 700, "Vickrey: should pay second-highest (700)")
  print("  VICKREY PASSED!\n")

  print("=".repeat(50))
  print("ALL TESTS PASSED!")
  print("=".repeat(50))
}

main().catch((e) => {
  console.error("TEST FAILED:", e)
  process.exit(1)
})
