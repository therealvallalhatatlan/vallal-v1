import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  max: number
  label?: string
  className?: string
  showPercentage?: boolean
}

export function Progress({ value, max, label, className, showPercentage = true }: ProgressProps) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {showPercentage && (
            <span className="text-sm text-muted-foreground">
              {value}/{max} ({percentage}%)
            </span>
          )}
        </div>
      )}
      <div
        className="w-full bg-secondary rounded-full h-2"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
