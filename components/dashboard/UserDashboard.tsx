import type { DashboardApiResponse } from '@/types/dashboard'
import type { ClaimStatus, LocationSpotType, VirtualSpotContentType } from '@/lib/matrica'
import MySpotsSection from './MySpotsSection'

const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  accepted: 'FELFEDEZVE',
  pending: 'PENDING',
  rejected: 'ELUTASÍTVA',
}

const LOCATION_LABELS: Record<LocationSpotType, string> = {
  physical: 'FIZIKAI',
  virtual: 'DIGITÁLIS',
}

const CONTENT_LABELS: Record<VirtualSpotContentType, string> = {
  video: 'VIDEÓ',
  audio: 'HANG',
  image: 'KÉP',
  text: 'SZÖVEG',
  link: 'LINK',
  rich: 'RICH CONTENT',
}

const formatShortDate = (value: string | null | undefined) => {
  if (!value) return '??'
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = new Intl.DateTimeFormat('hu-HU', { month: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase()
  return `${day} ${month}`
}

const formatJoinDate = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate(),
  ).padStart(2, '0')}.`
}

function renderContentLine(type: LocationSpotType | null, contentType: VirtualSpotContentType | null) {
  if (type === 'virtual') {
    const contentLabel = contentType ? CONTENT_LABELS[contentType] : 'TARTALOM'
    return `${LOCATION_LABELS.virtual} / ${contentLabel}`
  }
  if (type === 'physical') {
    return `${LOCATION_LABELS.physical} / HELYSZÍN`
  }
  return 'ISMERETLEN / DOLGOK'
}

type Props = {
  data: DashboardApiResponse
  token: string | null
}

export default function UserDashboard({ data, token }: Props) {
  const { user, stats, recentClaims, recentSpots } = data
  const displayName = user.nickname || user.email || 'NODE'
  const avatarLetter = (user.nickname || user.email || 'N').charAt(0).toUpperCase()

  const discoveryItems = [
    { label: 'DIGITÁLIS', value: stats.virtualClaims },
    { label: 'FIZIKAI', value: stats.physicalClaims },
  ]

  const spotSummary = [
    { label: 'Aktív', value: stats.activeCreatedSpots },
    { label: 'Fizikai', value: stats.physicalCreatedSpots },
    { label: 'Digitális', value: stats.virtualCreatedSpots },
  ]

  const timeline = recentClaims.map((claim) => (
    <article
      key={claim.id}
      className="flex flex-col gap-1 rounded border border-zinc-800 bg-zinc-950/70 p-4"
    >
      <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
        {formatShortDate(claim.created_at)}
      </span>
      <span className="text-base font-bold uppercase text-zinc-100">{claim.spot_title}</span>
      <span className="text-[11px] uppercase tracking-[0.18em] text-lime-200/80">
        {renderContentLine(claim.type, claim.content_type)}
      </span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        {CLAIM_STATUS_LABELS[claim.status]}
      </span>
    </article>
  ))

  const spotItems = recentSpots.map((spot) => (
    <li
      key={spot.id}
      className="flex items-center justify-between border-b border-zinc-900/60 py-3 last:border-none"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-50">
          {spot.title}
        </p>
        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
          {spot.type ? LOCATION_LABELS[spot.type] : 'ISMERETLEN'} · {spot.status.toUpperCase()}
        </p>
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        {formatShortDate(spot.created_at)}
      </span>
    </li>
  ))

  return (
    <section className="min-h-screen bg-[#010101] px-6 py-20 text-zinc-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-3 border border-zinc-900/80 bg-zinc-950/60 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 text-center text-3xl font-bold leading-[5rem] text-lime-200">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                avatarLetter
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-2xl font-black uppercase tracking-[0.1em] text-zinc-100">
                {displayName}
              </p>
              <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-lime-200/80">
                <span>{user.nickname ? `@${user.nickname}` : '@node'}</span>
                <span className="hidden h-1 w-10 border-t border-dotted border-zinc-800 sm:inline-block" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm uppercase tracking-[0.1em] text-zinc-500">
                <span>BELÉPÉS: {formatJoinDate(user.created_at)}</span>
                <span>{user.email ?? '—'}</span>
                <span>| {user.role.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-4 rounded border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {[{
              label: 'MEGTALÁLÁSOK',
              value: stats.totalClaims,
            },{
              label: 'DIGITÁLIS',
              value: stats.virtualClaims,
            }, {
              label: 'FIZIKAI',
              value: stats.physicalClaims,
            }].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-3 rounded border border-zinc-900 bg-black/40 px-4 py-5"
              >
                <span className="text-sm uppercase tracking-[0.4em] text-zinc-500">
                  {stat.label}
                </span>
                <span className="text-3xl font-black uppercase tracking-[0.2em] text-lime-200">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </section>


        <section className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">SAJÁT SZPOTOK</p>
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Aktív: {stats.activeCreatedSpots}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {spotSummary.map((stat) => (
              <div
                key={stat.label}
                className="rounded border border-zinc-900 bg-black/40 px-4 py-4 text-center"
              >
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
                  {stat.label}
                </p>
                <p className="text-2xl font-black uppercase tracking-[0.25em] text-zinc-200">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <ul className="space-y-3">
            {spotItems.length > 0 ? spotItems : (
              <li className="rounded border border-zinc-900 bg-zinc-950/60 p-4 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                Még nem hoztál létre szpotot.
              </li>
            )}
          </ul>
        </section>
        <MySpotsSection token={token} />

        <section className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">FIÓK</p>
          <div className="grid grid-cols-2 gap-3 text-[11px] uppercase tracking-[0.3em] text-zinc-400 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">NICKNAME</p>
              <p className="text-zinc-100">{user.nickname || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">EMAIL</p>
              <p className="text-zinc-100 truncate">{user.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">ROLE</p>
              <p className="text-zinc-100">{user.role.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">CSATLAKOZÁS</p>
              <p className="text-zinc-100">{formatJoinDate(user.created_at)}</p>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}