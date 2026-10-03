"use client"

import { Crown } from "lucide-react"

export type AvatarBadge = {
  code: string
  name?: string | null
}

type UserAvatarWithBadgesProps = {
  avatarUrl?: string | null
  fallback?: string
  badges?: AvatarBadge[]
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = {
  sm: { wrapper: "h-8 w-8", icon: "h-3 w-3", badge: "-right-1 -bottom-1 h-4 w-4", badgeIcon: "h-2.5 w-2.5" },
  md: { wrapper: "h-10 w-10", icon: "h-3.5 w-3.5", badge: "-right-1 -bottom-1 h-5 w-5", badgeIcon: "h-3 w-3" },
  lg: { wrapper: "h-20 w-20", icon: "h-5 w-5", badge: "right-0 bottom-0 h-7 w-7", badgeIcon: "h-4 w-4" },
} as const

export default function UserAvatarWithBadges({
  avatarUrl,
  fallback = "N",
  badges = [],
  size = "md",
  className = "",
}: UserAvatarWithBadgesProps) {
  const founder = badges.some((badge) => badge.code === "founder")
  const s = sizes[size]

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span className={`relative flex ${s.wrapper} items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover grayscale transition-all duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-bold text-lime-200">{fallback}</span>
        )}
      </span>

      {founder ? (
        <span
          className={`absolute ${s.badge} z-10 flex items-center justify-center rounded-full border border-lime-300/80 bg-zinc-950 text-lime-200 shadow-[0_0_10px_rgba(163,230,53,0.4)]`}
          title="ALAPÍTÓ"
          aria-label="Alapító"
        >
          <Crown className={s.badgeIcon} strokeWidth={1.8} aria-hidden="true" />
        </span>
      ) : null}
    </span>
  )
}
