"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

interface StatsCardsProps {
  auctionCount?: number
  openCount?: number
  totalBids?: number
}

export function StatsCards({ auctionCount, openCount, totalBids }: StatsCardsProps) {
  const stats = [
    {
      label: "Active Auctions",
      value: openCount != null ? String(openCount) : "24",
      change: "+12%",
      changeType: "positive" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    {
      label: "Total Auctions",
      value: auctionCount != null ? String(auctionCount) : "156",
      change: "+8%",
      changeType: "positive" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      label: "Total Bids",
      value: totalBids != null ? String(totalBids) : "1,847",
      change: "+23%",
      changeType: "positive" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
        </svg>
      )
    },
    {
      label: "Unique Bidders",
      value: "—",
      change: "",
      changeType: "positive" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <Card className="border-border/40 bg-card/50 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-lg bg-secondary p-2 text-muted-foreground">
                {stat.icon}
              </span>
              {stat.change && (
                <span className={`text-xs font-medium ${
                  stat.changeType === "positive" ? "text-green-600" : "text-red-500"
                }`}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
