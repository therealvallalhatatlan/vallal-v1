import { Crown, UserRound } from "lucide-react"

type FounderAvatarProps = {
  url?: string | null
  fallback?: string | null
  isFounder?: boolean
  className?: string
  imageClassName?: string
  alt?: string
}

export default function FounderAvatar({
  url,
  fallback,
  isFounder = false,
  className = "h-10 w-10",
  imageClassName = "",
  alt = "",
}: FounderAvatarProps) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-zinc-400">
        {url ? (
          <img
            src={url}
            alt={alt}
            className={`h-full w-full object-cover ${imageClassName}`}
            referrerPolicy="no-referrer"
          />
        ) : fallback ? (
          <span className="text-xs font-bold text-lime-200">{fallback}</span>
        ) : (
          <UserRound className="h-1/2 w-1/2" strokeWidth={1.5} aria-hidden="true" />
        )}
      </div>

      {isFounder ? (
        <span
          title="ALAPÍTÓ"
          aria-label="Alapító"
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-lime-200/55 bg-[#050505] text-lime-200 shadow-[0_0_12px_rgba(163,230,53,0.22)]"
        >
          <Crown className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
        </span>
      ) : null}
    </div>
  )
}
