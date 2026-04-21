'use client'

import type { ToastItem } from './useToast'

const KIND_STYLE: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'rgba(134,239,172,0.12)', border: 'rgba(134,239,172,0.3)', color: '#86efac', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#fca5a5', icon: '✕' },
  info:    { bg: 'rgba(56,189,248,0.12)',   border: 'rgba(56,189,248,0.3)',  color: '#7dd3fc', icon: 'ℹ' },
}

interface Props {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
          width: 'min(360px, calc(100vw - 32px))',
        }}
      >
        {toasts.map(toast => {
          const st = KIND_STYLE[toast.kind] ?? KIND_STYLE.info
          return (
            <div
              key={toast.id}
              onClick={() => onDismiss(toast.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: st.bg,
                border: `1px solid ${st.border}`,
                borderRadius: 10,
                color: st.color,
                fontSize: 14,
                fontWeight: 500,
                backdropFilter: 'blur(8px)',
                pointerEvents: 'auto',
                cursor: 'pointer',
                animation: 'toastIn 0.2s ease',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <span style={{ fontWeight: 700, flexShrink: 0, fontSize: 15 }}>{st.icon}</span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}
