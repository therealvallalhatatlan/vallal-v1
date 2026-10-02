import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Leg Belső Kör",
  description: "Belső csatorna a Vállalhatatlan országos indulásához.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function LegbelsoKorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
