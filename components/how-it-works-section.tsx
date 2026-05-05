"use client"

import { motion } from "framer-motion"

const steps = [
  {
    number: "01",
    title: "Create Auction",
    description: "Set up your auction with SPL tokens or NFTs. Define end time, auction type, and minimum bid."
  },
  {
    number: "02",
    title: "Place Encrypted Bids",
    description: "Bidders submit encrypted bids that remain hidden from all parties until auction close."
  },
  {
    number: "03",
    title: "MPC Determines Winner",
    description: "Arcium's MPC network securely compares bids and determines the winner without revealing other bids."
  },
  {
    number: "04",
    title: "Claim Winnings",
    description: "Winner pays the determined price (first-price or second-price) and claims the auctioned item."
  }
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-32">
      {/* Background decoration */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <motion.div
          className="h-[600px] w-[600px] rounded-full bg-gradient-to-br from-accent/5 to-transparent blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mb-20">
          <motion.p
            className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            03 / 05
          </motion.p>
          <motion.h2
            className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            HOW IT
            <br />
            <span className="text-balance text-accent">WORKS</span>
          </motion.h2>
        </div>
        
        {/* Steps */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="relative"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-border to-transparent lg:block" />
              )}
              
              <div className="relative rounded-xl border border-border/30 bg-card/30 p-6 backdrop-blur-sm">
                <span className="mb-4 block text-4xl font-bold text-accent/40">
                  {step.number}
                </span>
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
