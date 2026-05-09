"use client"

import { useState, useEffect, useCallback } from "react"
import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { VEIL_PROGRAM_ID } from "@/lib/veil-types"

export interface AuctionEvent {
  type: "create" | "bid" | "close" | "resolve"
  auctionPda: string
  signature: string
  blockTime: number
  details: string
  authority?: string
  bidCount?: number
}

export function useAuctionEvents(userAddress?: string) {
  const { connection } = useConnection()
  const [events, setEvents] = useState<AuctionEvent[]>([])
  const [userBids, setUserBids] = useState<{ auctionPda: string; signature: string; blockTime: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const programPubkey = new PublicKey(VEIL_PROGRAM_ID)

      const signatures = await connection.getSignaturesForAddress(
        programPubkey,
        { limit: 50 },
        "confirmed"
      )

      const allEvents: AuctionEvent[] = []

      for (const sig of signatures) {
        try {
          if (sig.blockTime === null) continue

          const parsedTx = await connection.getParsedTransaction(sig.signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          })

          if (!parsedTx) continue
          const logs = parsedTx.meta?.logMessages || []

          let eventType: "create" | "bid" | "close" | "resolve" | null = null
          let auctionPda = ""

          for (const log of logs) {
            if (log.includes("Instruction: CreateAuction")) {
              eventType = "create"
              break
            }
            if (log.includes("Instruction: PlaceBid")) {
              eventType = "bid"
              break
            }
            if (log.includes("Instruction: CloseAuction")) {
              eventType = "close"
              break
            }
            if (log.includes("Instruction: DetermineWinnerFirstPrice") || log.includes("Instruction: DetermineWinnerVickrey")) {
              eventType = "resolve"
              break
            }
          }

          if (eventType && sig.blockTime !== null) {
            const details = eventType === "create" ? "Auction created on chain"
              : eventType === "bid" ? "Encrypted bid submitted"
              : eventType === "close" ? "Auction closed for bidding"
              : "Auction resolved, winner determined"

            allEvents.push({
              type: eventType,
              auctionPda,
              signature: sig.signature,
              blockTime: sig.blockTime as number,
              details,
            })
          }
        } catch {
          continue
        }
      }

      allEvents.sort((a, b) => b.blockTime - a.blockTime)
      setEvents(allEvents)

      if (userAddress) {
        const userSigs = await connection.getSignaturesForAddress(
          new PublicKey(userAddress),
          { limit: 100 },
          "confirmed"
        )

        const bids = userSigs
          .filter((sig) => {
            const memo = sig.memo?.toLowerCase() || ""
            return memo.includes("place") || memo.includes("bid") || memo.includes("veil")
          })
          .filter((sig) => sig.blockTime !== null)
          .map((sig) => ({
            auctionPda: "",
            signature: sig.signature,
            blockTime: sig.blockTime!,
          }))

        setUserBids(bids)
      }
    } catch (err: any) {
      console.error("Failed to fetch auction events:", err)
      setError(err.message || "Failed to fetch events")
    } finally {
      setLoading(false)
    }
  }, [connection, userAddress])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  return { events, userBids, loading, error, refetch: fetchEvents }
}
