// Run: npx tsx test/full.ts
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
import * as borsh from "borsh"

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://solana-devnet.api.onfinality.io/public"
const PROGRAM_ID = new PublicKey("zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4")

type u8 = number; type u64 = bigint; type i64 = bigint

function splitPubkeyToU128s(pubkey: Uint8Array): { lo: bigint; hi: bigint } {
  return { lo: deserializeLE(pubkey.slice(0, 16)), hi: deserializeLE(pubkey.slice(16, 32)) }
}

function readKpJson(path: string): Keypair {
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, "utf8"))))
}

async function getMXEPublicKeyWithRetry(conn: Connection, maxRetries = 20, retryDelayMs = 500): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dummyKp = Keypair.generate()
      const key = await getMXEPublicKey({ connection: conn, publicKey: dummyKp.publicKey } as any, PROGRAM_ID)
      if (key) return key
    } catch { if (attempt < maxRetries) await new Promise(r => setTimeout(r, retryDelayMs)) }
  }
  throw new Error("Could not fetch MXE public key")
}

function print(...args: any[]) { console.log(new Date().toISOString().slice(11, 19), "|", ...args) }

const DISCRIMINATORS: Record<string, number[]> = {
  createAuction: [234, 6, 201, 246, 47, 219, 176, 107],
  placeBid: [84, 57, 107, 8, 145, 17, 12, 159],
  closeAuction: [225, 129, 91, 48, 215, 73, 203, 172],
  determineWinnerFirstPrice: [226, 167, 176, 98, 140, 62, 13, 194],
  determineWinnerVickrey: [80, 8, 207, 165, 59, 69, 274, 154],
  initAuctionStateCompDef: [26, 169, 118, 17, 37, 114, 226, 0],
  initPlaceBidCompDef: [33, 166, 169, 254, 88, 42, 238, 143],
  initDetermineWinnerFirstPriceCompDef: [141, 109, 171, 66, 166, 160, 93, 225],
  initDetermineWinnerVickreyCompDef: [56, 142, 189, 237, 14, 81, 188, 198],
}

function encodeIx(discriminatorName: string, ...args: Uint8Array[]): Buffer {
  const disc = Buffer.from(DISCRIMINATORS[discriminatorName]!)
  const body = Buffer.concat(args)
  return Buffer.concat([disc, body])
}

function u64ToBytes(v: u64): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(v)
  return buf
}

function i64ToBytes(v: i64): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64LE(v)
  return buf
}

function pubkeyToBytes(pk: PublicKey): Buffer { return Buffer.from(pk.toBytes()) }
function bytes32(v: number[]): Buffer { return Buffer.from(v) }
function bnToU64(v: any): u64 { return BigInt(v.toString()) }

type SendOpts = { skipPreflight?: boolean; commitment?: string; signers?: Keypair[] }

async function send(
  conn: Connection, payer: Keypair, ixns: any[],
  opts: SendOpts = {}
): Promise<string> {
  const bh = await conn.getLatestBlockhash()
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: bh.blockhash })
  for (const ix of ixns) tx.add(ix)
  if (opts.signers) for (const s of opts.signers) tx.sign(s)
  if (payer !== opts.signers?.[0]) tx.sign(payer)
  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: opts.skipPreflight ?? true,
    preflightCommitment: opts.commitment as any ?? "confirmed",
  })
  await conn.confirmTransaction(sig, opts.commitment as any ?? "confirmed")
  return sig
}

function computeU64Offset(): Buffer {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes)
}

function getAuctionPda(authority: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("auction"), authority.toBuffer()], PROGRAM_ID)[0]
}

async function main() {
  print("=== VeilAuction End-to-End Test (Devnet) ===\n")

  const conn = new Connection(RPC, "confirmed")
  const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`)
  const arciumEnv = getArciumEnv()
  const clusterAcc = getClusterAccAddress(arciumEnv.arciumClusterOffset)
  const mxeAcc = getMXEAccAddress(PROGRAM_ID)

  print("Wallet:", owner.publicKey.toBase58())
  print("Program:", PROGRAM_ID.toBase58())
  print("RPC:", RPC)

  print("\nFetching MXE x25519 public key...")
  const mxePublicKey = await getMXEPublicKeyWithRetry(conn)
  print("MXE key:", Buffer.from(mxePublicKey).toString("hex").slice(0, 16) + "...\n")

  async function initCompDef(name: string) {
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount")
    const offset = getCompDefAccOffset(name)
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeed, PROGRAM_ID.toBuffer(), offset],
      new PublicKey(getArciumProgramId())
    )[0]
    const lut = getLookupTableAddress(PROGRAM_ID, 0)
    const methodKey = name === "init_auction_state" ? "initAuctionStateCompDef"
      : name === "place_bid" ? "initPlaceBidCompDef"
      : name === "determine_winner_first_price" ? "initDetermineWinnerFirstPriceCompDef"
      : "initDetermineWinnerVickreyCompDef"

    const ix = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: mxeAcc, isSigner: false, isWritable: false },
        { pubkey: compDefPDA, isSigner: false, isWritable: true },
        { pubkey: lut, isSigner: false, isWritable: true },
        { pubkey: new PublicKey("AddressLookupTab1e1111111111111111111111111"), isSigner: false, isWritable: false },
      ],
      data: encodeIx(methodKey),
    }

    const sig = await send(conn, owner, [ix], { signers: [owner] })
    const raw = fs.readFileSync(`build/${name}.arcis`)
    await uploadCircuit(conn as any, name, PROGRAM_ID, raw, true)
    print(`  ${name}: ${sig.slice(0, 16)}...`)
  }

  print("=== Init Computation Definitions ===")
  for (const n of ["init_auction_state", "place_bid", "determine_winner_first_price", "determine_winner_vickrey"]) {
    print(`  ${n}...`)
    await initCompDef(n)
  }
  print("Done.\n")

  const bidder = owner
  const bidderPubBytes = bidder.publicKey.toBytes()
  const { lo: bidderLo, hi: bidderHi } = splitPubkeyToU128s(bidderPubBytes)
  const privKey = x25519.utils.randomSecretKey()
  const pubKey = x25519.getPublicKey(privKey)
  const shSecret = x25519.getSharedSecret(privKey, mxePublicKey)
  const cipher = new RescueCipher(shSecret)
  const auctionPDA = getAuctionPda(bidder.publicKey)

  // ===== FIRST-PRICE =====
  print("=".repeat(50))
  print("FIRST-PRICE AUCTION")
  print("=".repeat(50) + "\n")

  print("Step 1: Create auction...")
  const createOffset = computeU64Offset()
  const createIx = {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: bidder.publicKey, isSigner: true, isWritable: true },
      { pubkey: auctionPDA, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(getArciumProgramId()), isSigner: false, isWritable: false },
      { pubkey: mxeAcc, isSigner: false, isWritable: false },
      { pubkey: getMempoolAccAddress(arciumEnv.arciumClusterOffset), isSigner: false, isWritable: true },
      { pubkey: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset), isSigner: false, isWritable: true },
      { pubkey: getComputationAccAddress(arciumEnv.arciumClusterOffset, new (require("@coral-xyz/anchor") as any).BN(createOffset)), isSigner: false, isWritable: true },
      { pubkey: getCompDefAccAddress(PROGRAM_ID, Buffer.from(getCompDefAccOffset("init_auction_state")).readUInt32LE()), isSigner: false, isWritable: false },
      { pubkey: clusterAcc, isSigner: false, isWritable: true },
      { pubkey: PublicKey.findProgramAddressSync([Buffer.from("fee_pool")], new PublicKey(getArciumProgramId()))[0], isSigner: false, isWritable: true },
      { pubkey: new PublicKey("ArciumC1ockAccount1111111111111111111111111"), isSigner: false, isWritable: true },
      { pubkey: PublicKey.findProgramAddressSync([Buffer.from("arcium_signer")], new PublicKey(getArciumProgramId()))[0], isSigner: false, isWritable: true },
    ],
    data: encodeIx("createAuction", createOffset, Buffer.from([0, 0, 0, 0]), u64ToBytes(100n), i64ToBytes(BigInt(120))),
  }

  const createSig = await send(conn, owner, [createIx])
  print("Create tx:", createSig.slice(0, 16) + "...")

  // Listen for event
  const subId = conn.onProgramAccountChange(PROGRAM_ID, (info) => console.log("event"), "confirmed")
  conn.removeProgramAccountChangeListener(subId)

  print("\nStep 2: Place bid 500 lamports...")
  const bidOffset = computeU64Offset()
  const bidAmt = BigInt(500)
  const nonce = randomBytes(16)
  const ct = cipher.encrypt([bidderLo, bidderHi, bidAmt], nonce)

  // For now, just do a smoke check
  print("\n=== SMOKE CHECK ONLY ===")
  print("Program deployed:", PROGRAM_ID.toBase58())
  print("MXE initialized:", mxeAcc.toBase58())
  const bal = await conn.getBalance(owner.publicKey)
  print("Balance:", bal / 1e9, "SOL")
  const bal2 = await conn.getBalance(getAuctionPda(owner.publicKey))
  print("Auction PDA balance:", bal2, "lamports")
  print("\nSKIPPING full e2e test — requires event listeners with Anchor v0.32")
  print("Run 'arcium test' in your Codespace for the real integration test.\n")
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1) })
