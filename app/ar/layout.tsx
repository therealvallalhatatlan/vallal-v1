import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "WebAR Experience",
  description: "Marker-based augmented reality experience",
}

export default function ARLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
