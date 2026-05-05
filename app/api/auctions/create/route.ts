import { NextRequest, NextResponse } from "next/server"
import { buildCreateAuctionTx } from "@/lib/arcium-server"
import { classifyArciumError } from "@/lib/arcium-errors"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authority, auctionType, minBid, durationHours } = body

    if (!authority || !auctionType || minBid == null || durationHours == null) {
      return NextResponse.json(
        { error: "Missing required fields: authority, auctionType, minBid, durationHours" },
        { status: 400 }
      )
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
    const result = await buildCreateAuctionTx(authority, auctionType as "first-price" | "vickrey", Number(minBid), Number(durationHours), rpcUrl)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Create auction API error:", error)
    const classified = classifyArciumError(error)
    return NextResponse.json(
      { error: classified.message, retryable: classified.retryable },
      { status: classified.status }
    )
  }
}
