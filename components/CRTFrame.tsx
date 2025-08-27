"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface CRTFrameProps {
  children: ReactNode
  className?: string
  intensity?: "subtle" | "medium" | "strong"
}

export function CRTFrame({ children, className = "", intensity = "subtle" }: CRTFrameProps) {
  const intensityConfig = {
    subtle: {
      scanlineOpacity: 0.03,
      flickerOpacity: [0.98, 1, 0.99, 1],
      rgbShift: "0.5px",
      noiseOpacity: 0.02,
    },
    medium: {
      scanlineOpacity: 0.06,
      flickerOpacity: [0.95, 1, 0.97, 1],
      rgbShift: "1px",
      noiseOpacity: 0.04,
    },
    strong: {
      scanlineOpacity: 0.1,
      flickerOpacity: [0.9, 1, 0.93, 1],
      rgbShift: "2px",
      noiseOpacity: 0.08,
    },
  }

  const config = intensityConfig[intensity]

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      animate={{
        opacity: config.flickerOpacity,
      }}
      transition={{
        duration: 0.1,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        times: [0, 0.3, 0.7, 1],
      }}
      style={{
        filter: `
          drop-shadow(${config.rgbShift} 0 0 rgba(255, 0, 0, 0.3))
          drop-shadow(-${config.rgbShift} 0 0 rgba(0, 255, 255, 0.3))
          contrast(1.02)
          brightness(0.98)
        `,
      }}
    >
      {children}

      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 0, ${config.scanlineOpacity}) 2px,
              rgba(0, 255, 0, ${config.scanlineOpacity}) 3px
            )
          `,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(0, 255, 0, ${config.scanlineOpacity * 0.5}) 3px,
              rgba(0, 255, 0, ${config.scanlineOpacity * 0.5}) 4px
            )
          `,
        }}
      />

      <motion.div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        animate={{
          opacity: [config.noiseOpacity, config.noiseOpacity * 1.5, config.noiseOpacity],
        }}
        transition={{
          duration: 0.05,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(0, 255, 0, 0.05) 0%, transparent 50%)
          `,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse at center,
              transparent 60%,
              rgba(0, 0, 0, 0.1) 100%
            )
          `,
        }}
      />
    </motion.div>
  )
}
