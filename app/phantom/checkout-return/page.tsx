'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PhantomCheckoutReturnPage() {
  const params = useSearchParams()
  const status = params?.get('status') || 'unknown'

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: 'phantom-credit-checkout-status',
          status,
        },
        window.location.origin,
      )
    }

    const closeTimer = window.setTimeout(() => {
      window.close()
    }, 800)

    return () => {
      window.clearTimeout(closeTimer)
    }
  }, [status])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#050505',
        color: '#a3e635',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ border: '1px solid rgba(163,230,53,0.45)', padding: 20, background: '#0a0a0a' }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.08em' }}>
          {status === 'success' ? 'Fizetes sikeres, ablak zarasa...' : 'Fizetes megszakitva, ablak zarasa...'}
        </p>
      </div>
    </main>
  )
}
