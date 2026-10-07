import type { Metadata } from "next"
import Fooldal3 from "@/components/Fooldal3"

export const metadata: Metadata = {
  title: "Vállalhatatlan — Aktív szpotok",
  description: "A Vállalhatatlan disztribúciós hálózatának aktív könyvszpotjai.",
}

export default function Fooldal3Page() {
  return <Fooldal3 />
}
