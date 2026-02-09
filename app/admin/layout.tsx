import type React from "react"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Crimson_Pro, Inter } from "next/font/google"
import { Special_Elite } from "next/font/google"
import StatusBanner from "@/components/StatusBanner"
import { ThemeProvider } from "@/components/theme-provider"

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-reader",
})

const specialElite = Special_Elite({ 
  subsets: ["latin"], 
  weight: "400", 
  variable: "--font-heading" 
})

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${crimson.variable} ${inter.variable} ${specialElite.variable}`}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {/* No background video for admin pages */}
        <div className="min-h-screen bg-black relative z-30">
          <StatusBanner />
          {children}
          <Analytics />
        </div>
      </ThemeProvider>
    </div>
  )
}
