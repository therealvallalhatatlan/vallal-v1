import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface TimelineStep {
  status: string
  label: string
  active: boolean
  completed: boolean
}

interface TimelineProps {
  steps: TimelineStep[]
  className?: string
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn("flex items-center justify-between", className)} role="progressbar" aria-label="Order timeline">
      {steps.map((step, index) => (
        <div key={step.status} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors", {
                "bg-primary border-primary text-primary-foreground": step.completed,
                "bg-primary/20 border-primary text-primary": step.active && !step.completed,
                "bg-muted border-muted-foreground/30 text-muted-foreground": !step.active && !step.completed,
              })}
              aria-current={step.active ? "step" : undefined}
            >
              {step.completed ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <span className="text-xs font-medium">{index + 1}</span>
              )}
            </div>
            <span
              className={cn("mt-2 text-xs font-medium text-center", {
                "text-primary": step.active || step.completed,
                "text-muted-foreground": !step.active && !step.completed,
              })}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn("flex-1 h-0.5 mx-4 transition-colors", {
                "bg-primary": steps[index + 1].completed,
                "bg-muted": !steps[index + 1].completed,
              })}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  )
}
