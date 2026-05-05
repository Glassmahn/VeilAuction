"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-32">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-accent/10 via-accent/5 to-transparent blur-3xl" />
      </div>
      
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.p
          className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Start Today
        </motion.p>
        
        <motion.h2
          className="mb-6 text-3xl font-bold tracking-tight text-foreground md:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="text-balance">READY TO AUCTION</span>
          <br />
          <span className="text-accent">CONFIDENTIALLY?</span>
        </motion.h2>
        
        <motion.p
          className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Join the future of trustless, private auctions. Your bids stay encrypted, 
          your strategy stays secret.
        </motion.p>
        
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link href="/dashboard">
            <Button 
              size="lg"
              className="bg-foreground px-10 text-sm font-medium tracking-wider text-background hover:bg-foreground/90"
            >
              LAUNCH APP
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg"
            className="border-border/60 px-10 text-sm font-medium tracking-wider"
          >
            READ DOCS
          </Button>
        </motion.div>
        
        {/* Trust badges */}
        <motion.div
          className="mt-16 flex flex-wrap items-center justify-center gap-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="text-sm">MPC Secured</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-sm">End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="text-sm">Audited Smart Contracts</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
