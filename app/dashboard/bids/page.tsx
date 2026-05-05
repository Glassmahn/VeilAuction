"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useWallet } from "@solana/wallet-adapter-react"
import { useAuctionEvents } from "@/hooks/use-auction-events"
import { useAuctions } from "@/hooks/use-auctions"

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function MyBidsPage() {
  const { connected, publicKey } = useWallet()
  const { auctions } = useAuctions()
  const { events, userBids, loading } = useAuctionEvents(connected ? publicKey?.toBase58() : undefined)

  const bidEvents = events.filter((e) => e.type === "bid")

  const mergedBids = bidEvents.map((event) => {
    const auction = auctions.find((a) => a.pda.toBase58() === event.auctionPda)
    const status = auction
      ? auction.data.status === "Open"
        ? "active"
        : auction.data.status === "Closed"
        ? "ended"
        : "resolved"
      : "active"

    const auctionType = auction
      ? auction.data.auctionType === "FirstPrice"
        ? "first-price"
        : "vickrey"
      : ""

    return {
      auctionPda: event.auctionPda,
      status,
      auctionType,
      placedAt: timeAgo(event.blockTime),
      signature: event.signature,
      bidCount: event.bidCount,
    }
  })

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground">My Bids</h2>
        <p className="text-muted-foreground">Track your encrypted bids across all auctions</p>
      </motion.div>

      {!connected ? (
        <Card className="border-border/40 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">Connect your wallet to view your bids</p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : mergedBids.length === 0 ? (
        <Card className="border-border/40 bg-card/50 p-12 text-center">
          <svg className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-muted-foreground">No bids placed yet</p>
          <p className="mt-2 text-sm text-muted-foreground/60">Place your first encrypted bid from an active auction</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {mergedBids.map((bid, index) => (
            <motion.div
              key={`${bid.auctionPda}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="flex items-center justify-between border-border/40 bg-card/50 p-5 backdrop-blur-sm transition-all hover:bg-card/80">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                    <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      Auction {bid.auctionPda ? `${bid.auctionPda.slice(0, 4)}...${bid.auctionPda.slice(-4)}` : bid.signature.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-muted-foreground">Placed {bid.placedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Bid Amount</p>
                    <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
                      Encrypted
                    </Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      bid.status === "active"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : bid.status === "ended"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    }
                  >
                    {bid.status}
                  </Badge>
                  <Link href={`/auction/${bid.auctionPda}`}>
                    <Button variant="ghost" size="sm" className="text-xs" disabled={!bid.auctionPda}>
                      View
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
