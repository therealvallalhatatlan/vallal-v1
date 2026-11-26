import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Kalendárium 2027 · Interaktív demo",
  description: "A Vállalhatatlan Kalendárium 2027 interaktív digitális naptár prototípusa.",
  robots: { index: false, follow: false },
}

export default function KalendariumDemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#111512] text-[#e8eae6] antialiased">
      {children}
    </div>
  )
}
