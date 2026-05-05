"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuctions } from "@/hooks/use-auctions"
import { AuctionStatus, AuctionType } from "@/lib/veil-types"

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-500/10 text-green-600 border-green-500/20",
  closed: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  resolved: "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

const TYPE_COLORS: Record<string, string> = {
  firstPrice: "bg-accent/10 text-accent",
  vickrey: "bg-purple-500/10 text-purple-500",
}

const STATUS_LABELS: Record<string, string> = {
  [AuctionStatus.Open]: "open",
  [AuctionStatus.Closed]: "closed",
  [AuctionStatus.Resolved]: "resolved",
}

const TYPE_LABELS: Record<string, string> = {
  [AuctionType.FirstPrice]: "firstPrice",
  [AuctionType.Vickrey]: "vickrey",
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export default function AuctionsPage() {
  const { auctions, loading, error, refetch } = useAuctions()

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">All Auctions</h2>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">All Auctions</h2>
        <Card className="border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  if (auctions.length === 0) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-foreground">All Auctions</h2>
          <p className="text-muted-foreground">Browse and participate in sealed-bid auctions</p>
        </motion.div>
        <Card className="border-border/40 bg-card/50 p-12 text-center">
          <svg className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-muted-foreground">No auctions found on chain yet</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Create the first one from the dashboard</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground">All Auctions</h2>
        <p className="text-muted-foreground">Browse and participate in sealed-bid auctions</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {auctions.map((auction, index) => {
          const statusLabel = STATUS_LABELS[auction.data.status] ?? "unknown"
          const typeLabel = TYPE_LABELS[auction.data.auctionType] ?? "firstPrice"
          return (
            <motion.div
              key={auction.pda.toBase58()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="group h-full overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-accent/30 hover:bg-card/80">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-secondary to-muted/50">
                  <svg viewBox="0 0 80 80" className="h-20 w-20 transition-transform group-hover:scale-110">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#d4a574" strokeWidth="1.5" opacity="0.8" />
                    <text x="40" y="45" textAnchor="middle" fill="#d4a574" fontSize="12" fontWeight="600">
                      VA
                    </text>
                  </svg>
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="truncate font-medium text-foreground" title={auction.pda.toBase58()}>
                      Auction {truncateAddress(auction.pda.toBase58())}
                    </h3>
                    <Badge variant="outline" className={`shrink-0 text-[10px] uppercase ${STATUS_COLORS[statusLabel]}`}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Seller: {truncateAddress(auction.data.authority.toBase58())}
                  </p>
                  <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {auction.timeLeft}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      </svg>
                      {auction.data.bidCount} bids
                    </div>
                    <Badge variant="secondary" className={`text-[10px] capitalize ${TYPE_COLORS[typeLabel]}`}>
                      {typeLabel === "firstPrice" ? "1st price" : "Vickrey"}
                    </Badge>
                  </div>
                  <Link href={`/auction/${auction.pda.toBase58()}`}>
                    <Button
                      className="w-full bg-foreground text-background hover:bg-foreground/90"
                      size="sm"
                      disabled={auction.data.status !== AuctionStatus.Open}
                    >
                      {auction.data.status === AuctionStatus.Open ? "View & Bid" : auction.data.status === AuctionStatus.Closed ? "View" : "Results"}
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
