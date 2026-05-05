import { NextRequest, NextResponse } from "next/server"
import { buildPlaceBidTx } from "@/lib/arcium-server"
import { classifyArciumError } from "@/lib/arcium-errors"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bidder, auctionPda, bidAmountLamports } = body

    if (!bidder || !auctionPda || bidAmountLamports == null) {
      return NextResponse.json(
        { error: "Missing required fields: bidder, auctionPda, bidAmountLamports" },
        { status: 400 }
      )
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
    const result = await buildPlaceBidTx(bidder, auctionPda, Number(bidAmountLamports), rpcUrl)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Place bid API error:", error)
    const classified = classifyArciumError(error)
    return NextResponse.json(
      { error: classified.message, retryable: classified.retryable },
      { status: classified.status }
    )
  }
}
