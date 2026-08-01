'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { CSSProperties } from 'react'

export type HalozatWalkthroughStep = {
  title: string
  body: string
  badge: string
  spotlightStyle: CSSProperties
}

interface Props {
  open: boolean
  stepIndex: number
  steps: HalozatWalkthroughStep[]
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

export default function HalozatWalkthrough({ open, stepIndex, steps, onPrev, onNext, onClose }: Props) {
  const currentStep = steps[stepIndex] ?? steps[0]
  const isFirstStep = stepIndex <= 0
  const isLastStep = stepIndex >= steps.length - 1

  return (
    <AnimatePresence mode="wait">
      {open && currentStep ? (
        <motion.div
          key="halozat-walkthrough"
          role="dialog"
          aria-modal="true"
          aria-label="Hálózat bemutató"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4300,
            background: 'rgba(3,5,8,0.7)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            type="button"
            aria-label="Bemutató bezárása"
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              border: 0,
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
          />

          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              ...currentStep.spotlightStyle,
              borderRadius: 22,
              border: '1px solid rgba(190,242,100,0.52)',
              background: 'rgba(163,230,53,0.08)',
              boxShadow: '0 0 0 1px rgba(190,242,100,0.12), 0 0 28px rgba(163,230,53,0.18), inset 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          />

          <motion.div
            key={`walkthrough-card-${stepIndex}`}
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              marginInline: 'auto',
              top: 'calc(var(--matrica-header-offset, 90px) + 14px)',
              width: 'min(420px, calc(100vw - 24px))',
              maxHeight: 'min(440px, calc(100vh - var(--matrica-header-offset, 90px) - 170px - env(safe-area-inset-bottom, 0px)))',
              overflowY: 'auto',
              overflowX: 'hidden',
              borderRadius: 20,
              border: '1px solid rgba(190,242,100,0.26)',
              background: 'linear-gradient(180deg, rgba(13,17,22,0.98), rgba(7,10,14,0.99))',
              boxShadow: '0 24px 60px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.05)',
              color: '#f4f4f5',
            }}
          >
            <div style={{ padding: '16px 16px 14px', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#bef264' }}>
                    {currentStep.badge}
                  </div>
                  <h2 style={{ margin: '6px 0 0', fontSize: 18, lineHeight: 1.18 }}>
                    {currentStep.title}
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Bezárás"
                  onClick={onClose}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#e4e4e7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#d4d4d8' }}>
                {currentStep.body}
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={isFirstStep}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: isFirstStep ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                    color: isFirstStep ? '#71717a' : '#e4e4e7',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: isFirstStep ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ChevronLeft size={16} />
                    Előző
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  style={{
                    flex: 1.2,
                    minHeight: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(190,242,100,0.5)',
                    background: 'rgba(163,230,53,0.15)',
                    color: '#ecfccb',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {isLastStep ? 'Bezár' : 'Következő'}
                    <ChevronRight size={16} />
                  </span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <motion.div
                    initial={false}
                    animate={{ width: `${((stepIndex + 1) / Math.max(steps.length, 1)) * 100}%` }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, rgba(163,230,53,0.92), rgba(200,169,126,0.92))' }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                  {stepIndex + 1}/{steps.length}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}