"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { motion } from "framer-motion"
import { WalletButton } from "@/components/providers/solana-provider"
import { ThemeToggle } from "@/components/theme-toggle"

export function DashboardHeader() {
  const { connected, publicKey } = useWallet()
  const shortAddr = publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : null
  return (
    <motion.header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-xl"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          Mainnet Alpha
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <svg 
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search auctions..."
            className="h-9 w-64 rounded-lg border border-border/50 bg-input pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        
        {/* Notifications placeholder */}
        <button onClick={() => {}} className="relative rounded-lg p-2 text-muted-foreground/40 cursor-not-allowed">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        
        <ThemeToggle />
        
        {/* Wallet */}
        <WalletButton />
      </div>
    </motion.header>
  )
}
