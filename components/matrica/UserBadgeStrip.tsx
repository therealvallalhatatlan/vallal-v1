"use client"

import { useEffect, useState } from "react"
import { useSessionGuard } from "@/hooks/useSessionGuard.js"

type Badge = {
  code: string
  name: string
  description: string
}

export default function UserBadgeStrip() {
  const { session } = useSessionGuard()
  const token = (session as any)?.access_token ?? null
  const [badges, setBadges] = useState<Badge[]>([])

  useEffect(() => {
    if (!token) {
      setBadges([])
      return
    }

    let cancelled = false

    fetch("/api/user/badges", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return
        setBadges(
          Array.isArray(payload?.badges)
            ? payload.badges.filter(
                (badge: unknown): badge is Badge =>
                  typeof badge === "object" &&
                  badge !== null &&
                  typeof (badge as Badge).code === "string" &&
                  typeof (badge as Badge).name === "string" &&
                  typeof (badge as Badge).description === "string",
              )
            : [],
        )
      })
      .catch(() => {
        if (!cancelled) setBadges([])
      })

    return () => {
      cancelled = true
    }
  }, [token])

  if (!token || badges.length === 0) return null

  return (
    <div
      className="pointer-events-auto fixed left-0 right-0 top-[54px] z-[1002] border-b border-zinc-800/70 bg-[rgba(6,7,9,0.9)] backdrop-blur-sm"
      aria-label="Saját jelvények"
    >
      <div className="mx-auto flex max-w-[980px] items-center gap-5 overflow-x-auto px-4 py-2.5">
        <span
          className="shrink-0 text-[9px] uppercase tracking-[0.24em] text-zinc-600"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          JELVÉNYEK
        </span>

        {badges.map((badge) => (
          <div
            key={badge.code}
            title={badge.description}
            className="flex shrink-0 items-center gap-2 text-lime-200"
          >
            <span className="text-[9px] text-lime-300/80">◆</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {badge.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
