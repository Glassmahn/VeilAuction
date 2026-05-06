import { NextRequest, NextResponse } from "next/server"
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js"
import { Program } from "@coral-xyz/anchor"
import { Connection } from "@solana/web3.js"
import { classifyArciumError } from "@/lib/arcium-errors"

const VEIL_PROGRAM_ID = process.env.NEXT_PUBLIC_VEIL_AUCTION_PROGRAM_ID || "DKhS1u3qVR5WytmuVT1mc6cZnj5QiybXnRWBr7x2yaae"

const IDL = {
  version: "0.1.0",
  name: "veil_auction",
  address: VEIL_PROGRAM_ID,
  instructions: [
    {
      name: "reclaimBid",
      accounts: [
        { name: "bidder", isMut: true, isSigner: true },
        { name: "auction", isMut: true, isSigner: false },
        { name: "escrow", isMut: true, isSigner: false },
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
    const { bidder, auctionPda } = await req.json()
    if (!bidder || !auctionPda) {
      return NextResponse.json({ error: "Missing bidder or auctionPda" }, { status: 400 })
    }

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com", "confirmed")
    const programId = new PublicKey(VEIL_PROGRAM_ID)
    const bidderPubkey = new PublicKey(bidder)
    const auctionPubkey = new PublicKey(auctionPda)

    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bid_escrow"), auctionPubkey.toBuffer(), bidderPubkey.toBuffer()],
      programId
    )

    const veilProgram = new Program(IDL as any, undefined as any) as Program

    const ix = await veilProgram.methods
      .reclaimBid()
      .accountsPartial({
        bidder: bidderPubkey,
        auction: auctionPubkey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction()

    const blockhash = await connection.getLatestBlockhash()
    const tx = new Transaction({
      feePayer: bidderPubkey,
      recentBlockhash: blockhash.blockhash,
    }).add(ix)

    return NextResponse.json({
      txBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
    })
  } catch (error: any) {
    console.error("Reclaim bid error:", error)
    const { status, message } = classifyArciumError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
