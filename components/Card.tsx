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
        "rounded-2xl border border-lime-400/30 bg-black/40  shadow-sm backdrop-blur-sm",
        "w-full mx-auto",
        "transition-all duration-200 hover:border-green-400/50",
        className,
      )}
    >
      {children}
    </div>
  )
}
