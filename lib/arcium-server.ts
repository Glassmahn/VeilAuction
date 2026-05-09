import { Connection, PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction } from "@solana/web3.js"
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor"
import crypto from "crypto"

const VEIL_PROGRAM_ID = process.env.NEXT_PUBLIC_VEIL_AUCTION_PROGRAM_ID || "zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4"

function makeProvider(connection: Connection): AnchorProvider {
  const dummyKp = Keypair.generate()
  const dummyWallet = {
    publicKey: dummyKp.publicKey,
    signTransaction: async (tx: Transaction) => { tx.sign(dummyKp); return tx },
    signAllTransactions: async (txs: Transaction[]) => { txs.forEach(tx => tx.sign(dummyKp)); return txs },
  }
  return new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" })
}

const IDL = {
  version: "0.1.0",
  name: "veil_auction",
  address: VEIL_PROGRAM_ID,
  instructions: [
    {
      name: "createAuction",
      discriminator: [234, 6, 201, 246, 47, 219, 176, 107],
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "computationOffset", type: "u64" },
        { name: "auctionType", type: { defined: { name: "AuctionType" } } },
        { name: "minBid", type: "u64" },
        { name: "duration", type: "i64" },
      ],
    },
    {
      name: "placeBid",
      discriminator: [238, 77, 148, 91, 200, 151, 92, 146],
      accounts: [
        { name: "bidder", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "computationOffset", type: "u64" },
        { name: "encryptedBidderLo", type: { array: ["u8", 32] } },
        { name: "encryptedBidderHi", type: { array: ["u8", 32] } },
        { name: "encryptedAmount", type: { array: ["u8", 32] } },
        { name: "bidderPubkey", type: { array: ["u8", 32] } },
        { name: "nonce", type: "u128" },
      ],
    },
    { name: "closeAuction", discriminator: [225, 129, 91, 48, 215, 73, 203, 172], accounts: [
      { name: "authority", isMut: true, isSigner: true },
      { name: "auction", isMut: true, isSigner: false },
    ], args: [] },
    {
      name: "determineWinnerFirstPrice",
      discriminator: [41, 137, 132, 233, 250, 216, 40, 48],
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "computationOffset", type: "u64" }],
    },
    {
      name: "determineWinnerVickrey",
      discriminator: [107, 38, 185, 71, 251, 130, 217, 19],
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "signPdaAccount", isMut: true, isSigner: false },
        { name: "mxeAccount", isMut: false, isSigner: false },
        { name: "mempoolAccount", isMut: true, isSigner: false },
        { name: "executingPool", isMut: true, isSigner: false },
        { name: "computationAccount", isMut: true, isSigner: false },
        { name: "compDefAccount", isMut: false, isSigner: false },
        { name: "clusterAccount", isMut: true, isSigner: false },
        { name: "poolAccount", isMut: true, isSigner: false },
        { name: "clockAccount", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "arciumProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "computationOffset", type: "u64" }],
    },
  ],
  types: [
    { name: "AuctionType", type: { kind: "enum", variants: [{ name: "FirstPrice" }, { name: "Vickrey" }] } },
    { name: "AuctionStatus", type: { kind: "enum", variants: [{ name: "Open" }, { name: "Closed" }, { name: "Resolved" }] } },
  ],
}

export interface ArciumAccounts {
  signPdaAccount: PublicKey
  mxeAccount: PublicKey
  mempoolAccount: PublicKey
  executingPool: PublicKey
  computationAccount: PublicKey
  compDefAccount: PublicKey
  clusterAccount: PublicKey
  poolAccount: PublicKey
  clockAccount: PublicKey
  systemProgram: PublicKey
  arciumProgram: PublicKey
}

export interface BidEncryptionMetadata {
  bidderX25519SecretKey: string
  nonce: string
  amount: number
}

async function loadArciumClient() {
  const client = await import("@arcium-hq/client")
  return client
}

function deserializeLE(bytes: Uint8Array): bigint {
  let result = BigInt(0)
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) | BigInt(bytes[i])
  }
  return result
}

function splitPubkeyToU128s(pubkey: Uint8Array): { lo: bigint; hi: bigint } {
  const loBytes = pubkey.slice(0, 16)
  const hiBytes = pubkey.slice(16, 32)
  return { lo: deserializeLE(loBytes), hi: deserializeLE(hiBytes) }
}

async function deriveArciumAccounts(
  programId: PublicKey,
  computationOffset: BN,
  compDefName: string
): Promise<ArciumAccounts> {
  const client = await loadArciumClient()

  const env = client.getArciumEnv()
  const clusterOffset = (env as any).arciumClusterOffset ?? 0

  const clusterAccount = client.getClusterAccAddress(clusterOffset)
  const mxeAccount = client.getMXEAccAddress(programId)
  const mempoolAccount = client.getMempoolAccAddress(clusterOffset)
  const executingPool = client.getExecutingPoolAccAddress(clusterOffset)
  const computationAccount = client.getComputationAccAddress(clusterOffset, computationOffset)

  const compDefOffset = Buffer.from(client.getCompDefAccOffset(compDefName)).readUInt32LE()
  const compDefAccount = client.getCompDefAccAddress(programId, compDefOffset)

  const SIGN_PDA_SEED = Buffer.from("ArciumSignerAccount")
  const [signPdaAccount] = PublicKey.findProgramAddressSync([SIGN_PDA_SEED], programId)
  const arciumProgramId = new PublicKey(client.getArciumProgramId())

  const poolAccount = client.getFeePoolAccAddress()
  const clockAccount = client.getClockAccAddress()

  return {
    signPdaAccount,
    mxeAccount: new PublicKey(mxeAccount),
    mempoolAccount: new PublicKey(mempoolAccount),
    executingPool: new PublicKey(executingPool),
    computationAccount: new PublicKey(computationAccount),
    compDefAccount: new PublicKey(compDefAccount),
    clusterAccount: new PublicKey(clusterAccount),
    poolAccount,
    clockAccount,
    systemProgram: SystemProgram.programId,
    arciumProgram: arciumProgramId,
  }
}

function buildIx(
  program: Program,
  ixName: string,
  args: Record<string, any>,
  accounts: Record<string, PublicKey>
): TransactionInstruction {
  const ixDef = (IDL.instructions as any[]).find((ix: any) => ix.name === ixName)
  if (!ixDef) throw new Error(`Instruction ${ixName} not found in IDL`)

  const data = (program as any).coder.instruction.encode(ixName, args)
  const keys = ixDef.accounts.map((acc: any) => ({
    pubkey: accounts[acc.name],
    isSigner: acc.isSigner,
    isWritable: acc.isMut,
  }))

  return new TransactionInstruction({
    programId: program.programId,
    keys,
    data,
  })
}

export async function buildCreateAuctionTx(
  authority: string,
  auctionType: "first-price" | "vickrey",
  minBid: number,
  durationHours: number,
  rpcUrl: string
): Promise<{ txBase64: string; auctionPda: string }> {
  const connection = new Connection(rpcUrl, "confirmed")
  const programId = new PublicKey(VEIL_PROGRAM_ID)
  const authorityPubkey = new PublicKey(authority)

  const computationOffset = new BN(crypto.randomBytes(8))
  const duration = new BN(durationHours * 3600)

  const [auctionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), authorityPubkey.toBuffer()],
    programId
  )

  const arciumAccounts = await deriveArciumAccounts(
    programId,
    computationOffset,
    "init_auction_state"
  )

  const auctionTypeVariant = auctionType === "first-price"
    ? { firstPrice: {} }
    : { vickrey: {} }

  const provider = makeProvider(connection)
  const veilProgram = new Program(IDL as any, provider) as Program

  const ix = buildIx(veilProgram, "createAuction", {
    computationOffset,
    auctionType: auctionTypeVariant,
    minBid: new BN(minBid),
    duration,
  }, {
    authority: authorityPubkey,
    auction: auctionPda,
    ...arciumAccounts,
  })

  const blockhash = await connection.getLatestBlockhash()
  const tx = new Transaction({
    feePayer: authorityPubkey,
    recentBlockhash: blockhash.blockhash,
  }).add(ix)

  return {
    txBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
    auctionPda: auctionPda.toBase58(),
  }
}

async function getMXEX25519PublicKey(programId: PublicKey, rpcUrl: string): Promise<Uint8Array> {
  const client = await loadArciumClient()

  const dummyKp = Keypair.generate()
  const connection = new Connection(rpcUrl, "confirmed")
  const dummyProvider = new AnchorProvider(
    connection,
    { publicKey: dummyKp.publicKey, signTransaction: async () => { throw new Error("not implemented") }, signAllTransactions: async () => { throw new Error("not implemented") } } as any,
    { commitment: "confirmed", skipPreflight: true }
  )

  const mxePubkey = await client.getMXEPublicKey(dummyProvider, programId)
  if (!mxePubkey) {
    throw new Error("Failed to fetch MXE x25519 public key — ensure Arcium nodes are running and the MXE account is initialized")
  }
  return mxePubkey
}

export async function buildPlaceBidTx(
  bidder: string,
  auctionPda: string,
  bidAmountLamports: number,
  rpcUrl: string
): Promise<{ txBase64: string; encryptionMetadata: BidEncryptionMetadata }> {
  const client = await loadArciumClient()
  const connection = new Connection(rpcUrl, "confirmed")
  const programId = new PublicKey(VEIL_PROGRAM_ID)
  const bidderPubkey = new PublicKey(bidder)
  const auctionPubkey = new PublicKey(auctionPda)

  const bidderSolBytes = bidderPubkey.toBytes()
  const { lo: bidderLo, hi: bidderHi } = splitPubkeyToU128s(bidderSolBytes)

  const bidAmount = BigInt(bidAmountLamports)

  const privateKey = client.x25519.utils.randomSecretKey()
  const publicKey = client.x25519.getPublicKey(privateKey)
  const mxePublicKey = await getMXEX25519PublicKey(programId, rpcUrl)
  const sharedSecret = client.x25519.getSharedSecret(privateKey, mxePublicKey)

  const cipher = new client.RescueCipher(sharedSecret)

  const nonce = crypto.randomBytes(16)
  const nonceBigInt = deserializeLE(nonce)

  const bidPlaintext = [bidderLo, bidderHi, bidAmount]
  const bidCiphertext = cipher.encrypt(bidPlaintext, nonce)

  const encryptedBidderLo = Array.from(bidCiphertext[0])
  const encryptedBidderHi = Array.from(bidCiphertext[1])
  const encryptedAmount = Array.from(bidCiphertext[2])
  const bidderPubkeyBytes = Array.from(publicKey)
  const nonceU128 = new BN(nonceBigInt.toString())

  const computationOffset = new BN(crypto.randomBytes(8))
  const arciumAccounts = await deriveArciumAccounts(programId, computationOffset, "place_bid")

  const provider = makeProvider(connection)
  const veilProgram = new Program(IDL as any, provider) as Program

  const ix = buildIx(veilProgram, "placeBid", {
    computationOffset,
    encryptedBidderLo,
    encryptedBidderHi,
    encryptedAmount,
    bidderPubkeyBytes,
    nonce: nonceU128,
  }, {
    bidder: bidderPubkey,
    auction: auctionPubkey,
    ...arciumAccounts,
  })

  const blockhash = await connection.getLatestBlockhash()
  const tx = new Transaction({
    feePayer: bidderPubkey,
    recentBlockhash: blockhash.blockhash,
  }).add(ix)

  const encryptionMetadata: BidEncryptionMetadata = {
    bidderX25519SecretKey: Buffer.from(privateKey).toString("hex"),
    nonce: Buffer.from(nonce).toString("hex"),
    amount: bidAmountLamports,
  }

  return {
    txBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
    encryptionMetadata,
  }
}

export async function buildCloseAuctionTx(
  authority: string,
  auctionPda: string,
  rpcUrl: string
): Promise<{ txBase64: string }> {
  const connection = new Connection(rpcUrl, "confirmed")
  const authorityPubkey = new PublicKey(authority)
  const auctionPubkey = new PublicKey(auctionPda)

  const provider = makeProvider(connection)
  const veilProgram = new Program(IDL as any, provider) as Program

  const ix = buildIx(veilProgram, "closeAuction", {}, {
    authority: authorityPubkey,
    auction: auctionPubkey,
  })

  const blockhash = await connection.getLatestBlockhash()
  const tx = new Transaction({
    feePayer: authorityPubkey,
    recentBlockhash: blockhash.blockhash,
  }).add(ix)

  return {
    txBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
  }
}

export async function buildDetermineWinnerTx(
  authority: string,
  auctionPda: string,
  auctionType: "first-price" | "vickrey",
  rpcUrl: string
): Promise<{ txBase64: string }> {
  const connection = new Connection(rpcUrl, "confirmed")
  const programId = new PublicKey(VEIL_PROGRAM_ID)
  const authorityPubkey = new PublicKey(authority)
  const auctionPubkey = new PublicKey(auctionPda)

  const computationOffset = new BN(crypto.randomBytes(8))
  const compDefName = auctionType === "first-price"
    ? "determine_winner_first_price"
    : "determine_winner_vickrey"

  const arciumAccounts = await deriveArciumAccounts(
    programId,
    computationOffset,
    compDefName
  )

  const provider = makeProvider(connection)
  const veilProgram = new Program(IDL as any, provider) as Program
  const methodName = auctionType === "first-price"
    ? "determineWinnerFirstPrice"
    : "determineWinnerVickrey"

  const ix = buildIx(veilProgram, methodName, { computationOffset }, {
    authority: authorityPubkey,
    auction: auctionPubkey,
    ...arciumAccounts,
  })

  const blockhash = await connection.getLatestBlockhash()
  const tx = new Transaction({
    feePayer: authorityPubkey,
    recentBlockhash: blockhash.blockhash,
  }).add(ix)

  return {
    txBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
  }
}
