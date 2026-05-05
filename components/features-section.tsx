"use client"

import { motion } from "framer-motion"

const features = [
  {
    title: "Sealed Bidding",
    description: "Bids are fully encrypted using MXE public key encryption until the auction concludes. Complete privacy guaranteed.",
    icon: (
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <defs>
          <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a574" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b8845c" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="30" fill="none" stroke="url(#sealGrad)" strokeWidth="2" />
        <circle cx="40" cy="40" r="22" fill="none" stroke="#a09080" strokeWidth="1" opacity="0.5" />
        <path d="M30 40 L38 48 L50 32" stroke="#d4a574" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  },
  {
    title: "MPC Security",
    description: "Arcium&apos;s multi-party computation ensures bid comparisons happen securely inside distributed nodes. No single point of failure.",
    icon: (
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <defs>
          <linearGradient id="mpcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a574" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b8845c" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <polygon points="40,15 65,32 65,58 40,75 15,58 15,32" fill="none" stroke="url(#mpcGrad)" strokeWidth="2" />
        <polygon points="40,25 55,35 55,55 40,65 25,55 25,35" fill="none" stroke="#a09080" strokeWidth="1" opacity="0.6" />
        <circle cx="40" cy="45" r="8" fill="#d4a574" opacity="0.6" />
      </svg>
    )
  },
  {
    title: "Vickrey Auctions",
    description: "Support for both first-price and second-price (Vickrey) mechanisms. Choose the auction type that suits your needs.",
    icon: (
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <defs>
          <linearGradient id="vickGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a574" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b8845c" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path d="M20 55 L40 25 L60 55" fill="none" stroke="url(#vickGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="27" y1="45" x2="53" y2="45" stroke="#a09080" strokeWidth="1" opacity="0.6" />
        <circle cx="40" cy="40" r="4" fill="#d4a574" opacity="0.7" />
      </svg>
    )
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mb-20 flex items-start justify-between">
          <div>
            <motion.p
              className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              02 / 05
            </motion.p>
            <motion.h2
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              DISCOVER
              <br />
              <span className="text-balance">OUR FEATURES</span>
            </motion.h2>
          </div>
          
          <motion.p
            className="hidden max-w-xs text-sm leading-relaxed text-muted-foreground md:block"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            We deliver complete confidential auction infrastructure on Solana. Privacy and security under one roof.
          </motion.p>
        </div>
        
        {/* Feature cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm transition-all duration-500 hover:border-accent/30 hover:bg-card/80"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              {/* Icon container */}
              <div className="mb-8 h-32 w-32 transition-transform duration-500 group-hover:scale-105">
                {feature.icon}
              </div>
              
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                {feature.title}
              </h3>
              
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
              
              {/* Subtle glow on hover */}
              <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-accent/5 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
