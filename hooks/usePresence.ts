import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/browser'

export function usePresence() {
  const [activeCount, setActiveCount] = useState(0)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    let mounted = true
    let heartbeatInterval: NodeJS.Timeout
    let pollInterval: NodeJS.Timeout

    const setupPresence = async () => {
      const {
        data: { session },
      } = await supabaseRef.current.auth.getSession()

      if (!session?.access_token || !mounted) {
        return
      }

      // Send heartbeat every 3 minutes
      heartbeatInterval = setInterval(async () => {
        if (!mounted) return
        try {
          await fetch('/api/presence', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          })
        } catch (error) {
          // Silent fail - reduces console spam
        }
      }, 180000)

      // Poll active count every 3 minutes
      pollInterval = setInterval(async () => {
        if (!mounted) return
        try {
          const response = await fetch('/api/presence', {
            signal: AbortSignal.timeout(5000),
          })
          const data = await response.json()
          if (mounted) {
            setActiveCount(data.count || 0)
          }
        } catch (error) {
          // Silent fail - reduces console spam
        }
      }, 180000)

      // Send initial heartbeat immediately
      try {
        await fetch('/api/presence', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        })
      } catch (error) {
        // Silent fail
      }

      // Poll active count immediately
      try {
        const response = await fetch('/api/presence', {
          signal: AbortSignal.timeout(5000),
        })
        const data = await response.json()
        if (mounted) {
          setActiveCount(data.count || 0)
        }
      } catch (error) {
        // Silent fail
      }
    }

    setupPresence()

    return () => {
      mounted = false
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [])

  return { activeCount }
}
