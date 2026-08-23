import type { FC } from 'react'

type MapBottomNavProps = {
  userRole: 'user' | 'editor' | 'admin'
  onOpenSpotAdmin: () => void
  onOpenActiveSpots: () => void
  onOpenChat: () => void
}

const MapBottomNav: FC<MapBottomNavProps> = ({
  userRole,
  onOpenSpotAdmin,
  onOpenActiveSpots,
  onOpenChat,
}) => {
  return (
    <nav
      aria-label="Hálózat gyors műveletek"
      className="matrica-action-rail fixed bottom-0 left-0 right-0 z-[60] border-t border-zinc-700 bg-zinc-950 px-3 py-6 pt-3"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
      }}
    >
      <div className="grid min-h-[94px] grid-cols-3 items-center divide-x divide-zinc-700 rounded-md border border-zinc-700 bg-zinc-950 text-center">
        {userRole !== 'user' ? (
          <button
            type="button"
            onClick={onOpenSpotAdmin}
            className="flex min-h-[84px] flex-col items-center justify-center px-2 py-4 transition-colors hover:bg-zinc-800/60"
            aria-label="Új szpot"
            title="Új szpot"
          >
            <span
              className="text-sm font-bold uppercase text-zinc-400"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              ÚJ SZPOT
            </span>
            <span
              className="mt-1 text-xs text-lime-100 opacity-70"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              Új Hely Hozzáadása
            </span>
          </button>
        ) : (
          <div className="flex min-h-[84px] flex-col items-center justify-center px-2 py-4 text-zinc-600 opacity-60">
            <span
              className="text-sm font-bold uppercase"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              ÚJ SZPOT
            </span>
            <span
              className="mt-1 text-xs"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              Csak admin / editor
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenActiveSpots}
          className="flex min-h-[84px] flex-col items-center justify-center bg-zinc-800/90 px-0 py-3 transition-colors hover:bg-zinc-800"
          aria-label="Összes szpot"
          title="Összes szpot"
        >
          <span
            className="text-sm font-bold uppercase text-zinc-100"
            style={{ fontFamily: 'var(--font-mono-tech)' }}
          >
            ÖSSZES SZPOT
          </span>
          <span
            className="mt-1 text-xs text-lime-100 opacity-70"
            style={{ fontFamily: 'var(--font-mono-tech)' }}
          >
            Aktív Helyek
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenChat}
          className="flex min-h-[84px] flex-col items-center justify-center px-2 transition-colors hover:bg-zinc-800/60"
          aria-label="Csevegés"
          title="Csevegés"
        >
          <span
            className="text-sm font-bold uppercase text-zinc-400"
            style={{ fontFamily: 'var(--font-mono-tech)' }}
          >
            CSEVEGÉS
          </span>
          <span
            className="mt-1 text-xs text-lime-100 opacity-70"
            style={{ fontFamily: 'var(--font-mono-tech)' }}
          >
            Kik Vannak Online
          </span>
        </button>
      </div>
    </nav>
  )
}

export default MapBottomNav