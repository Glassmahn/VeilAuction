import { NextRequest, NextResponse } from "next/server"
import { PublicKey, Transaction, SystemProgram, Keypair, TransactionInstruction, Connection } from "@solana/web3.js"
import { Program, AnchorProvider } from "@coral-xyz/anchor"
import { classifyArciumError } from "@/lib/arcium-errors"

const VEIL_PROGRAM_ID = process.env.NEXT_PUBLIC_VEIL_AUCTION_PROGRAM_ID || "zTkNvsczL8Uvg97KDFKo1PTnPSi8RdAKryyd7d3f2H4"

const IDL = {
  version: "0.1.0",
  name: "veil_auction",
  address: VEIL_PROGRAM_ID,
  instructions: [
    {
      name: "claimWinnings",
      discriminator: [161, 215, 24, 59, 14, 236, 242, 221],
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "winnerEscrow", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  types: [
    { name: "AuctionType", type: { kind: "enum", variants: [{ name: "FirstPrice" }, { name: "Vickrey" }] } },
    { name: "AuctionStatus", type: { kind: "enum", variants: [{ name: "Open" }, { name: "Closed" }, { name: "Resolved" }] } },
  ],
}

export async function POST(req: NextRequest) {
  try {
    const { authority, auctionPda } = await req.json()
    if (!authority || !auctionPda) {
      return NextResponse.json({ error: "Missing authority or auctionPda" }, { status: 400 })
    }

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com", "confirmed")
    const programId = new PublicKey(VEIL_PROGRAM_ID)
    const authorityPubkey = new PublicKey(authority)
    const auctionPubkey = new PublicKey(auctionPda)

    const [winnerEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bid_escrow"), auctionPubkey.toBuffer(), Buffer.from(new Uint8Array(32))],
      programId
    )

    const dummyKp = Keypair.generate()
    const dummyWallet = { publicKey: dummyKp.publicKey, signTransaction: async (tx: Transaction) => { tx.sign(dummyKp); return tx }, signAllTransactions: async (txs: Transaction[]) => { txs.forEach(tx => tx.sign(dummyKp)); return txs } }
    const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" })
    const veilProgram = new Program(IDL as any, provider) as Program

    const ixData = (veilProgram as any).coder.instruction.encode("claimWinnings", {})
    const ix = new TransactionInstruction({
      programId: veilProgram.programId,
      keys: [
        { pubkey: authorityPubkey, isSigner: true, isWritable: true },
        { pubkey: auctionPubkey, isSigner: false, isWritable: true },
        { pubkey: winnerEscrowPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: ixData,
    })

    const blockhash = await connection.getLatestBlockhash()
    const tx = new Transaction({
      feePayer: authorityPubkey,
      recentBlockhash: blockhash.blockhash,
    }).add(ix)

    return NextResponse.json({
      txBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
    })
  } catch (error: any) {
    console.error("Claim winnings error:", error)
    const { status, message } = classifyArciumError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
