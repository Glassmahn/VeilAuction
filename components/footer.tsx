"use client"

import { motion } from "framer-motion"
import { Logo } from "./logo"
import Link from "next/link"

const footerLinks = {
  product: [
    { label: "Auctions", href: "/dashboard" },
    { label: "Create Auction", href: "/dashboard" },
    { label: "How It Works", href: "#how-it-works" },
  ],
  resources: [
    { label: "Documentation", href: "https://docs.arcium.com" },
    { label: "GitHub", href: "https://github.com/Glassmahn/VeilAuction" },
    { label: "Arcium Docs", href: "https://docs.arcium.com" },
  ],
  connect: [
    { label: "Twitter", href: "https://x.com/veilauction" },
    { label: "Discord", href: "https://discord.gg/arcium" },
    { label: "Telegram", href: "#" },
  ]
}

export function Footer() {
  return (
    <footer className="relative border-t border-border/30 bg-card/30 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Logo className="mb-4" />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              The first confidential sealed-bid auction platform built on Arcium and Solana.
            </p>
          </motion.div>
          
          {/* Product links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
          
          {/* Resources links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
              Resources
            </h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
          
          {/* Connect links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
              Connect
            </h4>
            <ul className="space-y-3">
              {footerLinks.connect.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
        
        {/* Bottom bar */}
        <motion.div
          className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 md:flex-row"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-xs text-muted-foreground">
            2026 VeilAuction. Built for Arcium Frontier Hackathon.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
