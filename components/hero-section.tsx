"use client"

import { motion } from "framer-motion"
import { HeroOrb } from "./hero-orb"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-32">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/30" />
      
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid min-h-[calc(100vh-8rem)] items-center gap-8 lg:grid-cols-2">
          {/* Left content */}
          <div className="relative z-10">
            <motion.p
              className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Built on Arcium × Solana
            </motion.p>
            
            <motion.h1
              className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <span className="text-balance">CONFIDENTIAL</span>
              <br />
              <span className="text-balance text-accent">SEALED-BID AUCTIONS.</span>
            </motion.h1>
            
            <motion.p
              className="mb-8 max-w-md text-base leading-relaxed text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              The first production-ready sealed-bid auction platform where bids remain 
              fully encrypted until auction close. Supporting first-price and Vickrey mechanisms.
            </motion.p>
            
            <motion.div
              className="flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <Link href="/dashboard">
                <Button 
                  size="lg"
                  className="bg-foreground px-8 text-sm font-medium tracking-wider text-background hover:bg-foreground/90"
                >
                  EXPLORE AUCTIONS
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-border/60 px-8 text-sm font-medium tracking-wider"
                >
                  CREATE AUCTION
                </Button>
              </Link>
            </motion.div>
            
            {/* Stats */}
            <motion.div
              className="mt-16 flex gap-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <div>
                <p className="text-3xl font-bold text-foreground">100%</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Encrypted</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">MPC</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Secured</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">SPL</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">& NFTs</p>
              </div>
            </motion.div>
          </div>
          
          {/* Right content - Orb */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <HeroOrb />
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="h-10 w-6 rounded-full border-2 border-muted-foreground/30 p-1">
          <motion.div 
            className="h-2 w-full rounded-full bg-muted-foreground/50"
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}
