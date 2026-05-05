"use client"

import { motion } from "framer-motion"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { AuctionCard } from "@/components/dashboard/auction-card"
import { Button } from "@/components/ui/button"
import { useAuctions } from "@/hooks/use-auctions"
import Link from "next/link"
import { AuctionStatus } from "@/lib/veil-types"

function truncateAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function formatTimeLeft(endTime: number): string {
  const diff = endTime - Math.floor(Date.now() / 1000)
  if (diff <= 0) return "Ended"
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function DashboardPage() {
  const { auctions, loading } = useAuctions()

  const openCount = auctions.filter((a) => a.data.status === AuctionStatus.Open).length
  const closedCount = auctions.filter((a) => a.data.status === AuctionStatus.Closed).length
  const resolvedCount = auctions.filter((a) => a.data.status === AuctionStatus.Resolved).length
  const totalBids = auctions.reduce((sum, a) => sum + a.data.bidCount, 0)
  const activeAuctions = auctions.filter((a) => a.data.status === AuctionStatus.Open).slice(0, 6)

  return (
    <div className="space-y-8">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="text-muted-foreground">
            {loading
              ? "Loading your auctions..."
              : `${openCount} open auctions, ${totalBids} total bids on chain`}
          </p>
        </div>
        <Link href="/dashboard/create">
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" strokeLinecap="round" />
            </svg>
            Create Auction
          </Button>
        </Link>
      </motion.div>
      
      <StatsCards auctionCount={auctions.length} openCount={openCount} totalBids={totalBids} />
      
      <div>
        <div className="mb-6 flex items-center justify-between">
          <motion.h3
            className="text-lg font-semibold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            Active Auctions
          </motion.h3>
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Button variant="outline" size="sm" className="text-xs">
              All
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              First Price
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Vickrey
            </Button>
          </motion.div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : activeAuctions.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-card/50 p-8 text-center">
            <p className="text-muted-foreground">No active auctions yet</p>
            <Link href="/dashboard/create">
              <Button size="sm" className="mt-4 bg-foreground text-background hover:bg-foreground/90">
                Create First Auction
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeAuctions.map((auction, index) => (
              <Link key={auction.pda.toBase58()} href={`/auction/${auction.pda.toBase58()}`}>
                <AuctionCard
                  title={`Auction ${truncateAddress(auction.pda.toBase58())}`}
                  tokenSymbol="SOL"
                  tokenAmount={auction.data.minBid.toLocaleString()}
                  endTime={auction.timeLeft}
                  bidCount={auction.data.bidCount}
                  auctionType={auction.data.auctionType === "FirstPrice" ? "first-price" : "vickrey"}
                  status={auction.timeRemaining < 3600 ? "ending-soon" : "active"}
                  index={index}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="rounded-xl border border-border/40 bg-card/50 p-6 backdrop-blur-sm"
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h3>
        <div className="space-y-4">
          {auctions.slice(0, 4).map((auction, index) => (
            <div key={auction.pda.toBase58()} className="flex items-center justify-between border-b border-border/30 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  auction.data.status === AuctionStatus.Open ? "bg-green-500/10 text-green-600" :
                  auction.data.status === AuctionStatus.Closed ? "bg-muted text-muted-foreground" :
                  "bg-amber-500/10 text-amber-600"
                }`}>
                  {auction.data.status === AuctionStatus.Open ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    </svg>
                  ) : auction.data.status === AuctionStatus.Closed ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3 9h9l-7.5 5.5L19 22l-7-5-7 5 2.5-5.5L0 11h9z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {auction.data.status === AuctionStatus.Open ? "Open for bidding" :
                     auction.data.status === AuctionStatus.Closed ? "Closed, awaiting resolution" :
                     "Resolved"}
                  </p>
                  <p className="text-xs text-muted-foreground">{truncateAddress(auction.pda.toBase58())}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{auction.data.bidCount} bids</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
