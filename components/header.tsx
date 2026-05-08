"use client"

import { motion } from "framer-motion"
import { Logo } from "./logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { WalletButton } from "@/components/providers/solana-provider"
import { ThemeToggle } from "./theme-toggle"

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
            <a
              href="https://github.com/Glassmahn/VeilAuction"
              target="_blank"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <ThemeToggle />
            <div className="hidden sm:flex">
              <WalletButton />
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
