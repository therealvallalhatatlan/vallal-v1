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
        "rounded-2xl border border-gray-800 bg-gray-900/50 p-8 shadow-sm backdrop-blur-sm",
        "max-w-xl w-full mx-auto",
        "transition-all duration-200 hover:border-green-400/50",
        className,
      )}
    >
      {children}
    </div>
  )
}
