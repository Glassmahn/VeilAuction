"use client"

import { useState, useEffect, useCallback } from "react"
import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { AuctionAccount, AuctionType, AuctionStatus, VEIL_PROGRAM_ID, AUCTION_ACCOUNT_SIZE } from "@/lib/veil-types"

export interface AuctionWithPda {
  pda: PublicKey
  data: AuctionAccount
  timeRemaining: number
  timeLeft: string
}

export function useAuctions() {
  const { connection } = useConnection()
  const [auctions, setAuctions] = useState<AuctionWithPda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const allAccounts = await connection.getProgramAccounts(
        new PublicKey(VEIL_PROGRAM_ID),
        {
          commitment: "confirmed",
          filters: [
            { dataSize: AUCTION_ACCOUNT_SIZE },
          ],
        }
      )

      const results: AuctionWithPda[] = []
      const now = Math.floor(Date.now() / 1000)

      for (const { pubkey, account } of allAccounts) {
        try {
          const data = account.data
          if (data.length < 77) continue

          const authority = new PublicKey(data.slice(9, 41))
          const auctionTypeIdx = data[41]
          const statusIdx = data[42]
          const minBid = Number(data.readBigUInt64LE(43))
          const endTime = Number(data.readBigInt64LE(51))
          const bidCount = data.readUInt16LE(59)
          const stateNonceLo = data.readBigUInt64LE(61)
          const stateNonceHi = data.readBigUInt64LE(69)
          const stateNonce = stateNonceLo + (stateNonceHi << BigInt(64))

          const diff = endTime - now
          let timeLeft = "Ended"
          if (diff > 0) {
            const hours = Math.floor(diff / 3600)
            const minutes = Math.floor((diff % 3600) / 60)
            if (hours > 24) timeLeft = `${Math.floor(hours / 24)}d ${hours % 24}h`
            else if (hours > 0) timeLeft = `${hours}h ${minutes}m`
            else timeLeft = `${minutes}m`
          }

          results.push({
            pda: pubkey,
            data: {
              authority,
              auctionType: auctionTypeIdx === 0 ? AuctionType.FirstPrice : AuctionType.Vickrey,
              status: statusIdx === 0 ? AuctionStatus.Open : statusIdx === 1 ? AuctionStatus.Closed : AuctionStatus.Resolved,
              minBid,
              endTime,
              bidCount,
              stateNonce: String(stateNonce),
              encryptedState: [],
            },
            timeRemaining: diff,
            timeLeft,
          })
        } catch (e) {
          console.warn("Failed to parse auction account", pubkey.toBase58(), e)
        }
      }

      setAuctions(results)
    } catch (err: any) {
      console.error("Failed to fetch auctions:", err)
      setError(err.message || "Failed to fetch auctions")
    } finally {
      setLoading(false)
    }
  }, [connection])

  useEffect(() => {
    fetchAuctions()
    const interval = setInterval(fetchAuctions, 30000)
    return () => clearInterval(interval)
  }, [fetchAuctions])

  return { auctions, loading, error, refetch: fetchAuctions }
}
