"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { useAuctionEvents } from "@/hooks/use-auction-events"

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function HistoryPage() {
  const { events, loading } = useAuctionEvents()

  const typeIcons: Record<string, { bg: string; icon: string }> = {
    bid: { bg: "bg-accent/10 text-accent", icon: "bid" },
    resolve: { bg: "bg-amber-500/10 text-amber-600", icon: "resolve" },
    create: { bg: "bg-green-500/10 text-green-600", icon: "create" },
    close: { bg: "bg-blue-500/10 text-blue-600", icon: "close" },
  }

  const eventLabels: Record<string, string> = {
    bid: "Bid Placed",
    resolve: "Auction Resolved",
    create: "Auction Created",
    close: "Auction Closed",
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Activity History</h2>
        <p className="text-muted-foreground">Recent auction activity on chain</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <Card className="border-border/40 bg-card/50 p-12 text-center">
          <svg className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-muted-foreground">No auction activity yet</p>
          <p className="mt-2 text-sm text-muted-foreground/60">Create an auction or place a bid to see activity here</p>
        </Card>
      ) : (
        <Card className="border-border/40 bg-card/50 p-6 backdrop-blur-sm">
          <div className="space-y-6">
            {events.map((item, index) => {
              const style = typeIcons[item.type]
              return (
                <motion.div
                  key={`${item.signature}-${index}`}
                  className="flex items-center justify-between border-b border-border/30 pb-4 last:border-0 last:pb-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${style.bg}`}>
                      {item.type === "bid" && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        </svg>
                      )}
                      {item.type === "resolve" && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3 9h9l-7.5 5.5L19 22l-7-5-7 5 2.5-5.5L0 11h9z" />
                        </svg>
                      )}
                      {item.type === "create" && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
                        </svg>
                      )}
                      {item.type === "close" && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v8" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{eventLabels[item.type]}</p>
                      <p className="text-xs text-muted-foreground">
                        Auction {item.auctionPda ? `${item.auctionPda.slice(0, 4)}...${item.auctionPda.slice(-4)}` : item.signature.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground/70">{item.details}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(item.blockTime)}</span>
                </motion.div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
