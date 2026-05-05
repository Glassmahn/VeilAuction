"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface AuctionCardProps {
  title: string
  tokenSymbol: string
  tokenAmount: string
  endTime: string
  bidCount: number
  auctionType: "first-price" | "vickrey"
  status: "active" | "ending-soon" | "ended"
  imageUrl?: string
  index?: number
}

export function AuctionCard({
  title,
  tokenSymbol,
  tokenAmount,
  endTime,
  bidCount,
  auctionType,
  status,
  index = 0
}: AuctionCardProps) {
  const statusColors = {
    active: "bg-green-500/10 text-green-600",
    "ending-soon": "bg-amber-500/10 text-amber-600",
    ended: "bg-muted text-muted-foreground"
  }
  
  const statusLabels = {
    active: "Active",
    "ending-soon": "Ending Soon",
    ended: "Ended"
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="group overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-card/80 hover:shadow-lg">
        {/* Token visual */}
        <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-muted/50">
          <div className="relative">
            {/* Abstract token representation */}
            <svg viewBox="0 0 100 100" className="h-24 w-24 transition-transform duration-500 group-hover:scale-110">
              <defs>
                <linearGradient id={`tokenGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4a574" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#b8845c" stopOpacity="0.4" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#tokenGrad-${index})`} strokeWidth="1.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#a09080" strokeWidth="0.5" opacity="0.5" />
              <text 
                x="50" 
                y="55" 
                textAnchor="middle" 
                fill="#d4a574" 
                fontSize="14" 
                fontWeight="600"
                filter="url(#glow)"
              >
                {tokenSymbol}
              </text>
            </svg>
          </div>
          
          {/* Status badge */}
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
          
          {/* Encrypted indicator */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-foreground/80 px-2.5 py-1">
            <svg className="h-3 w-3 text-background" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z"/>
            </svg>
            <span className="text-[10px] font-medium text-background">Encrypted</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {tokenAmount} {tokenSymbol}
              </p>
            </div>
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium capitalize text-accent">
              {auctionType.replace("-", " ")}
            </span>
          </div>
          
          <div className="mb-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{endTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{bidCount} bids</span>
            </div>
          </div>
          
          <Button 
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            size="sm"
            disabled={status === "ended"}
          >
            {status === "ended" ? "View Results" : "Place Bid"}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
