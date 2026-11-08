import type { Metadata } from "next"
import KalendariumSubmissionFlow from "@/components/kalendarium/KalendariumSubmissionFlow"

export const metadata: Metadata = {
  title: "Kalendárium 2027 · Beküldés",
  description: "Beküldő űrlap a Vállalhatatlan Kalendárium 2027 kiadványhoz.",
  robots: { index: true, follow: true },
}

export default function KalendariumBekuldesPage() {
  return (
    <main className="min-h-screen bg-[#080909] px-4 py-8 text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <KalendariumSubmissionFlow />
      </div>
    </main>
  )
}
