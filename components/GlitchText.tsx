"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface GlitchTextProps {
  children: ReactNode
  className?: string
  intensity?: "subtle" | "medium" | "strong"
}

export function GlitchText({ children, className = "", intensity = "medium" }: GlitchTextProps) {
  const intensityConfig = {
    subtle: {
      movement: { x: [-0.5, 0.5, 0], y: [0, 0.5, -0.5, 0] },
      skew: [0, 0.2, -0.2, 0],
      opacity: [1, 0.98, 1, 0.99, 1],
      rgbShift: "0.5px",
      duration: 3,
    },
    medium: {
      movement: { x: [0, -1, 1, 0], y: [0, 1, -1, 0] },
      skew: [0, 0.5, -0.5, 0],
      opacity: [1, 0.95, 1, 0.98, 1],
      rgbShift: "1px",
      duration: 2,
    },
    strong: {
      movement: { x: [0, -2, 2, -1, 0], y: [0, 1, -2, 1, 0] },
      skew: [0, 1, -1, 0.5, 0],
      opacity: [1, 0.9, 1, 0.95, 1],
      rgbShift: "2px",
      duration: 1.5,
    },
  }

  const config = intensityConfig[intensity]

  return (
    <motion.span
      className={`inline-block ${className}`}
      animate={{
        ...config.movement,
        skew: config.skew,
        opacity: config.opacity,
      }}
      transition={{
        duration: config.duration,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        times: [0, 0.2, 0.4, 0.7, 1],
      }}
      style={{
        filter: `
          drop-shadow(${config.rgbShift} 0 0 #ff0000) 
          drop-shadow(-${config.rgbShift} 0 0 #00ffff)
          contrast(1.05)
        `,
      }}
    >
      <motion.span
        animate={{
          opacity: [1, 0.7, 1, 0.9, 1],
        }}
        transition={{
          duration: 0.1,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
          delay: Math.random() * 2,
        }}
      >
        {children}
      </motion.span>
    </motion.span>
  )
}
