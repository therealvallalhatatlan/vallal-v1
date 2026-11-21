import type React from "react"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import StatusBanner from "@/components/StatusBanner"
import { ThemeProvider } from "@/components/theme-provider"

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${GeistSans.variable} ${GeistMono.variable}`}>
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
