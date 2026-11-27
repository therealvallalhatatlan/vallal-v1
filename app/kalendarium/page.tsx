import type { Metadata } from "next"
import KalendariumPreorderPage from "@/components/kalendarium/KalendariumPreorderPage"

export const metadata: Metadata = {
  title: "Vállalhatatlan Kalendárium 2027",
  description: "Előrendelés a Vállalhatatlan Kalendárium 2027 online webappjához.",
  openGraph: {
    title: "Vállalhatatlan Kalendárium 2027",
    description: "Közösségi webapp, alkotások és szolgáltatói adatbázis egyetlen online térben.",
    type: "website",
  },
}

export default function KalendariumPage() {
  return <KalendariumPreorderPage />
}
