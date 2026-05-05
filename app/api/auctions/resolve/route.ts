import { NextRequest, NextResponse } from "next/server"
import { buildDetermineWinnerTx } from "@/lib/arcium-server"
import { classifyArciumError } from "@/lib/arcium-errors"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authority, auctionPda, auctionType } = body

    if (!authority || !auctionPda || !auctionType) {
      return NextResponse.json(
        { error: "Missing required fields: authority, auctionPda, auctionType" },
        { status: 400 }
      )
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
    const result = await buildDetermineWinnerTx(authority, auctionPda, auctionType as "first-price" | "vickrey", rpcUrl)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Determine winner API error:", error)
    const classified = classifyArciumError(error)
    return NextResponse.json(
      { error: classified.message, retryable: classified.retryable },
      { status: classified.status }
    )
  }
}
