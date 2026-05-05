"use client"

import { motion } from "framer-motion"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      className={`flex items-center gap-2.5 ${className}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Abstract V shape with auction gavel hint */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        {/* Outer ring with gradient */}
        <defs>
          <linearGradient id="veilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a574" />
            <stop offset="50%" stopColor="#c9956c" />
            <stop offset="100%" stopColor="#b8845c" />
          </linearGradient>
          <linearGradient id="innerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8c9a8" />
            <stop offset="100%" stopColor="#d4a574" />
          </linearGradient>
        </defs>
        
        {/* Hexagonal outer shape suggesting confidentiality/security */}
        <path
          d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
          stroke="url(#veilGradient)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        
        {/* Inner V mark - representing both Veil and Victory */}
        <path
          d="M11 12L18 24L25 12"
          stroke="url(#innerGlow)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Subtle gavel accent at top */}
        <path
          d="M15 8H21"
          stroke="url(#veilGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        
        {/* Center dot - representing the sealed bid */}
        <circle
          cx="18"
          cy="17"
          r="2"
          fill="url(#innerGlow)"
          opacity="0.9"
        />
      </svg>
      
      <span className="text-lg font-semibold tracking-tight text-foreground">
        VEIL<span className="font-light text-accent">AUCTION</span>
      </span>
    </motion.div>
  )
}
