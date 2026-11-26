import type { Metadata } from "next"
import KalendariumDemo from "@/components/kalendarium-demo/KalendariumDemo"

export const metadata: Metadata = {
  title: "Kalendárium 2027 · Demo",
  description: "A Vállalhatatlan Kalendárium digitális napi tervező és kulturális küldemény prototípusa.",
  robots: { index: false, follow: false },
}

export default function KalendariumDemoPage() {
  return <KalendariumDemo />
}
