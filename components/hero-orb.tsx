"use client"

import { motion } from "framer-motion"

export function HeroOrb() {
  return (
    <div className="relative h-[500px] w-[500px] md:h-[600px] md:w-[600px]">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 400 400" className="h-full w-full">
          <defs>
            <linearGradient id="ringGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3d3d3d" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#5a5a5a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3d3d3d" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke="url(#ringGradient1)"
            strokeWidth="1"
            strokeDasharray="20 10 5 10"
          />
        </svg>
      </motion.div>

      {/* Second rotating ring - opposite direction */}
      <motion.div
        className="absolute inset-6"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 400 400" className="h-full w-full">
          <circle
            cx="200"
            cy="200"
            r="175"
            fill="none"
            stroke="#4a4a4a"
            strokeWidth="0.5"
            strokeDasharray="30 20"
            opacity="0.5"
          />
        </svg>
      </motion.div>

      {/* Inner pulsing orb container */}
      <motion.div
        className="absolute inset-16"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Main orb background */}
        <div className="relative h-full w-full rounded-full">
          {/* Crystalline structure effect */}
          <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="orbGlow" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#f5e6d3" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#e8d4c0" stopOpacity="0.6" />
                <stop offset="70%" stopColor="#c9b8a8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a09080" stopOpacity="0.1" />
              </radialGradient>
              <radialGradient id="innerGlow" cx="40%" cy="35%" r="40%">
                <stop offset="0%" stopColor="#ffb366" stopOpacity="0.8" />
                <stop offset="30%" stopColor="#e69550" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#cc7733" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#995522" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Base sphere */}
            <circle cx="150" cy="150" r="120" fill="url(#orbGlow)" />
            
            {/* Inner amber core */}
            <circle cx="140" cy="140" r="45" fill="url(#innerGlow)" filter="url(#glow)" />
            
            {/* Crystalline facets */}
            <g opacity="0.4" stroke="#5a5a5a" strokeWidth="0.5" fill="none">
              <polygon points="150,30 210,90 180,180 120,180 90,90" />
              <polygon points="150,30 90,90 60,150 90,210 150,270 210,210 240,150 210,90" />
              <polygon points="60,150 90,90 90,210" />
              <polygon points="240,150 210,90 210,210" />
            </g>
            
            {/* Light reflections */}
            <ellipse cx="120" cy="100" rx="30" ry="15" fill="#ffffff" opacity="0.2" />
            <ellipse cx="180" cy="190" rx="20" ry="10" fill="#ffffff" opacity="0.1" />
          </svg>
          
          {/* Floating particles */}
          <motion.div
            className="absolute left-1/4 top-1/4 h-2 w-2 rounded-full bg-amber-400/60"
            animate={{ 
              y: [-10, 10, -10],
              x: [-5, 5, -5],
              opacity: [0.6, 0.9, 0.6]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-1/3 top-1/3 h-1.5 w-1.5 rounded-full bg-amber-300/70"
            animate={{ 
              y: [10, -10, 10],
              x: [5, -5, 5],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/2 h-1 w-1 rounded-full bg-orange-400/80"
            animate={{ 
              y: [-8, 8, -8],
              scale: [1, 1.3, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>
      </motion.div>

      {/* Outer glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-radial from-amber-500/10 via-transparent to-transparent blur-3xl" />
    </div>
  )
}
