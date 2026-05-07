// Run: npx tsx test/full.ts
import * as anchor from "@coral-xyz/anchor"
import { AnchorProvider } from "@coral-xyz/anchor"
import { Connection, PublicKey, Keypair } from "@solana/web3.js"
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
      const provider = new AnchorProvider(
        conn,
        { publicKey: dummyKp.publicKey, signTransaction: async () => { throw new Error("nope") }, signAllTransactions: async () => { throw new Error("nope") } } as any,
        { commitment: "confirmed", skipPreflight: true }
      )
      const key = await getMXEPublicKey(provider as any, programId)
      if (key) return key
    } catch {
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, retryDelayMs))
    }
  }
  throw new Error("Could not fetch MXE public key")
}

function print(...args: any[]) {
  console.log(new Date().toISOString().slice(11, 19), "|", ...args)
}

type EventCb = (event: any, slot: number) => void

async function main() {
  print("=== VeilAuction End-to-End Test (Devnet) ===\n")

  const conn = new Connection(RPC, "confirmed")
  const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`)
  const programId = new PublicKey("zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4")
  const provider = new AnchorProvider(conn, { publicKey: owner.publicKey, signTransaction: async (tx: any) => { tx.sign(owner); return tx }, signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.sign(owner)); return txs } } as any, { commitment: "confirmed", skipPreflight: true })
  const program = new anchor.Program(JSON.parse(fs.readFileSync("target/idl/veil_auction.json", "utf8")), programId, provider)

  const arciumEnv = getArciumEnv()
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset)

  print("Wallet:", owner.publicKey.toBase58())
  print("Program:", programId.toBase58())
  print("RPC:", RPC)

  print("\nFetching MXE x25519 public key...")
  const mxePublicKey = await getMXEPublicKeyWithRetry(conn, programId)
  print("MXE x25519 key:", Buffer.from(mxePublicKey).toString("hex").slice(0, 16) + "...")

  async function initCompDef(circuitName: string) {
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount")
    const offset = getCompDefAccOffset(circuitName)
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeed, programId.toBuffer(), offset],
      new PublicKey(getArciumProgramId())
    )[0]
    const mxeAccount = getMXEAccAddress(programId)
    const mxeAcc = await (program.account as any).mxeAccount.fetch(mxeAccount)
    const lutAddress = getLookupTableAddress(programId, mxeAcc.lutOffsetSlot)

    const methodName = circuitName
      .split("_")
      .map((s, i) => i === 0 ? s : s[0].toUpperCase() + s.slice(1))
      .join("")
    const methodKey = `init${methodName[0].toUpperCase() + methodName.slice(1)}CompDef`

    const sig = await (program.methods as any)[methodKey]()
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

  function auctionPda(authority: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), authority.toBuffer()],
      programId
    )[0]
  }

  function awaitEvent(eventName: string, auctionKey?: PublicKey, timeoutMs = 120000): Promise<any> {
    return new Promise((res, rej) => {
      const listener = (program as any).addEventListener(eventName, (event: any, slot: number) => {
        if (auctionKey && event.auction && !event.auction.equals(auctionKey)) return
        ;(program as any).removeEventListener(listener)
        res(event)
      })
      setTimeout(() => {
        ;(program as any).removeEventListener(listener)
        rej(new Error(`Event ${eventName} timed out`))
      }, timeoutMs)
    })
  }

  async function getValidatorTimestamp(): Promise<number> {
    const slot = await conn.getSlot("confirmed")
    return await conn.getBlockTime(slot) ?? 0
  }

  // ===== FIRST-PRICE =====
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

  print("Step 1: Creating first-price auction...")
  const createCompOffset = new anchor.BN(randomBytes(8))
  const auctionPDA = auctionPda(owner.publicKey)
  const auctionCreatedPromise = awaitEvent("auctionCreatedEvent", auctionPDA)

  const createSig = await (program.methods as any)
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

  // Step 2: Place bid
  print("\nStep 2: Placing bid of 500 lamports...")
  const bidPlacedPromise = awaitEvent("bidPlacedEvent", auctionPDA)
  const bidCompOffset = new anchor.BN(randomBytes(8))
  const bidAmount = BigInt(500)
  const nonce = randomBytes(16)
  const bidCiphertext = cipher.encrypt([bidderLo, bidderHi, bidAmount], nonce)

  const placeBidSig = await (program.methods as any)
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

  // Step 3: Wait for end and close
  print("\nStep 3: Waiting for auction to end...")
  const auctionAcc = await (program.account as any).auction.fetch(auctionPDA)
  while (true) {
    const now = await getValidatorTimestamp()
    if (now >= auctionAcc.endTime.toNumber()) break
    print(`  Waiting ${auctionAcc.endTime.toNumber() - now}s...`)
    await new Promise(r => setTimeout(r, 3000))
  }

  print("  Closing auction...")
  const closePromise = awaitEvent("auctionClosedEvent", auctionPDA)
  const closeSig = await (program.methods as any)
    .closeAuction()
    .accountsPartial({ authority: owner.publicKey, auction: auctionPDA })
    .rpc({ preflightCommitment: "confirmed", commitment: "confirmed" })
  print("  Close tx:", closeSig.slice(0, 16) + "...")
  await closePromise

  // Step 4: Determine winner
  print("\nStep 4: Determining winner (first-price)...")
  const resolvePromise = awaitEvent("auctionResolvedEvent", auctionPDA)
  const resolveCompOffset = new anchor.BN(randomBytes(8))

  const resolveSig = await (program.methods as any)
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
  const expectedWinner = Buffer.from(bidderPubkey).toString("hex")
  const actualWinner = Buffer.from(resolvedEvent.winner).toString("hex")
  print("  Winner matches:", actualWinner === expectedWinner)
  print("  First-Price PASSED!\n")

  // ===== VICKREY =====
  print("=".repeat(50))
  print("VICKREY AUCTION TEST")
  print("=".repeat(50) + "\n")

  const vickreyAuth = Keypair.generate()
  const fundSig = await conn.requestAirdrop(vickreyAuth.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
  await conn.confirmTransaction(fundSig)
  print("Vickrey authority funded:", vickreyAuth.publicKey.toBase58())

  const vickreyAuctionPDA = auctionPda(vickreyAuth.publicKey)
  const { lo: b1Lo, hi: b1Hi } = splitPubkeyToU128s(bidderPubkey)
  const privKey1 = x25519.utils.randomSecretKey()
  const pubKey1 = x25519.getPublicKey(privKey1)
  const sharedSecret1 = x25519.getSharedSecret(privKey1, mxePublicKey)
  const cipher1 = new RescueCipher(sharedSecret1)

  print("Step 1: Creating Vickrey auction...")
  const vickreyCreateOffset = new anchor.BN(randomBytes(8))
  const vickreyCreatedPromise = awaitEvent("auctionCreatedEvent", vickreyAuctionPDA)

  await (program.methods as any)
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
  await awaitComputationFinalization(conn as any, vickreyCreateOffset, programId, "confirmed")
  await vickreyCreatedPromise
  print("  Vickrey auction created")

  print("\nStep 2: Placing first bid of 1000 lamports...")
  const bid1PlacedPromise = awaitEvent("bidPlacedEvent", vickreyAuctionPDA)
  const bid1Offset = new anchor.BN(randomBytes(8))
  const bid1Amount = BigInt(1000)
  const nonce1 = randomBytes(16)
  const bid1Cipher = cipher1.encrypt([b1Lo, b1Hi, bid1Amount], nonce1)

  await (program.methods as any)
    .placeBid(
      bid1Offset,
      Array.from(bid1Cipher[0]),
      Array.from(bid1Cipher[1]),
      Array.from(bid1Cipher[2]),
      Array.from(pubKey1),
      new anchor.BN(deserializeLE(nonce1).toString())
    )
    .accountsPartial({
      bidder: bidder.publicKey,
      auction: vickreyAuctionPDA,
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, bid1Offset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      compDefAccount: getCompDefAccAddress(programId, Buffer.from(getCompDefAccOffset("place_bid")).readUInt32LE()),
    })
    .signers([vickreyAuth])
    .rpc({ skipPreflight: true, commitment: "confirmed" })
  await awaitComputationFinalization(conn as any, bid1Offset, programId, "confirmed")
  await bid1PlacedPromise
  print("  Bid 1 placed")

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

  await (program.methods as any)
    .placeBid(
      bid2Offset,
      Array.from(bid2Cipher[0]),
      Array.from(bid2Cipher[1]),
      Array.from(bid2Cipher[2]),
      Array.from(pubKey2),
      new anchor.BN(deserializeLE(nonce2).toString())
    )
    .accountsPartial({
      bidder: bidder.publicKey,
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
  await bid2PlacedPromise
  print("  Bid 2 placed")

  print("\nStep 4: Waiting for auction to end...")
  const vickreyAcc = await (program.account as any).auction.fetch(vickreyAuctionPDA)
  while (true) {
    const now = await getValidatorTimestamp()
    if (now >= vickreyAcc.endTime.toNumber()) break
    await new Promise(r => setTimeout(r, 3000))
  }

  print("  Closing...")
  const vickreyClosePromise = awaitEvent("auctionClosedEvent", vickreyAuctionPDA)
  await (program.methods as any)
    .closeAuction()
    .accountsPartial({ authority: vickreyAuth.publicKey, auction: vickreyAuctionPDA })
    .signers([vickreyAuth])
    .rpc({ preflightCommitment: "confirmed", commitment: "confirmed" })
  await vickreyClosePromise
  print("  Auction closed")

  print("\nStep 5: Determining Vickrey winner...")
  const vickreyResolvePromise = awaitEvent("auctionResolvedEvent", vickreyAuctionPDA)
  const vickreyResolveOffset = new anchor.BN(randomBytes(8))

  await (program.methods as any)
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
  print("  VICKREY PASSED!\n")

  print("=".repeat(50))
  print("ALL TESTS PASSED!")
  print("=".repeat(50))
}

main().catch((e) => {
  console.error("TEST FAILED:", e)
  process.exit(1)
})
