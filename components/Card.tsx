import type React from "react"
import { cn } from "@/lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-green-300/30 bg-black/40 p-8 shadow-sm backdrop-blur-sm",
        "max-w-xl w-full mx-auto",
        "transition-all duration-200 hover:border-green-400/50",
        className,
      )}
    >
      {children}
    </div>
  )
}
