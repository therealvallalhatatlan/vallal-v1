"use client"

import { useRouter } from 'next/navigation'

type PlaylistOption = {
  slug: string
  title: string
  pageNum: number
}

type Props = {
  options: PlaylistOption[]
  currentPage: number
  total: number
}

export function PlaylistSelector({ options, currentPage, total }: Props) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPage = e.target.value
    router.push(`/music/${selectedPage}`)
  }

  return (
    <nav className="mb-6">
      <div className="flex items-center gap-3">
        <label htmlFor="playlist-select" className="text-lime-300/80 text-sm">
          Válassz novellát:
        </label>
        <select
          id="playlist-select"
          value={currentPage}
          onChange={handleChange}
          className="px-3 py-2 rounded-lg border border-zinc-700 bg-black text-lime-300 hover:border-lime-400 focus:border-lime-400 focus:outline-none min-w-0 flex-1 max-w-md"
        >
          {options.map((option) => (
            <option key={option.slug} value={option.pageNum}>
              {option.title}
            </option>
          ))}
        </select>
        <span className="text-zinc-500 text-sm">
          ({currentPage} / {total})
        </span>
      </div>
    </nav>
  )
}
