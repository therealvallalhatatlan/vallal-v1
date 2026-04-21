'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/browser'

export default function ScoreBadge() {
  const [score, setScore] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) return

      try {
        const res = await fetch('/api/matrica/score', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled) setScore(json.score ?? 0)
      } catch {
        // silently ignore
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (score === null) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 20,
        background: 'rgba(15,15,20,0.85)',
        border: '1px solid rgba(232,121,249,0.3)',
        borderRadius: 20,
        padding: '5px 12px',
        color: '#e879f9',
        fontSize: 13,
        fontWeight: 700,
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 15 }}>★</span>
      {score} pont
    </div>
  )
}
