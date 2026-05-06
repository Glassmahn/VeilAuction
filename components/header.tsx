"use client"

import { motion } from "framer-motion"
import { Logo } from "./logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { WalletMultiButton } from "@/components/providers/solana-provider"

const navItems = [
  { label: "HOME", href: "/" },
  { label: "AUCTIONS", href: "/dashboard" },
  { label: "HOW IT WORKS", href: "#how-it-works" },
  { label: "FEATURES", href: "#features" },
]

export function Header() {
  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/60 px-6 py-3 backdrop-blur-xl">
          <Logo />
          
          <nav className="hidden items-center gap-10 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-xs font-medium tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex">
              <WalletMultiButton />
            </div>
            <Link href="/dashboard">
              <Button 
                size="sm"
                className="bg-foreground text-xs font-medium tracking-wider text-background hover:bg-foreground/90"
              >
                LAUNCH APP
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
