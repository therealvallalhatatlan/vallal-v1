import type { Metadata } from "next"
import KalendariumPreorderPage from "@/components/kalendarium/KalendariumPreorderPage"

export const metadata: Metadata = {
  title: "Vállalhatatlan Kalendárium 2027",
  description: "Előjegyzés és előrendelés a Vállalhatatlan Kalendárium 2027 kiadványra.",
  openGraph: {
    title: "Vállalhatatlan Kalendárium 2027",
    description: "Naptár, notesz, kalendárium és közösségi arany oldalak egyetlen kiadványban.",
    type: "website",
  },
}

export default function KalendariumPage() {
  return <KalendariumPreorderPage />
}
