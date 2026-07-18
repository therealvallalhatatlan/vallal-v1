'use client'

import { motion } from 'framer-motion'

interface EmailUnlockGateProps {
  value: string
  onChange: (nextValue: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  isUnlocking: boolean
  saveMessage?: string | null
  promptText?: string
  helperText?: string
}

export function EmailUnlockGate({
  value,
  onChange,
  onSubmit,
  isUnlocking,
  saveMessage,
  promptText = '[ ADD MEG AZ EMAILCIMED A TITKOSITAS FELOLDASAHOZ. ]',
  helperText,
}: EmailUnlockGateProps) {
  return (
    <section className="relative mt-12 overflow-hidden border border-neutral-400/40 bg-black/85 p-5 sm:p-7">
      {isUnlocking && (
        <motion.div
          initial={{ opacity: 0.15 }}
          animate={{ opacity: [0.1, 0.3, 0.14, 0.36, 0.2] }}
          transition={{ repeat: Infinity, duration: 0.35 }}
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.13)_0px,rgba(255,255,255,0.13)_1px,transparent_1px,transparent_3px)]"
        />
      )}

      <p className="font-mono text-xs uppercase tracking-[0.25em] text-green-500/90">...FOLYTATODIK</p>
      <p className="mt-2 font-mono text-sm tracking-[0.08em] text-green-300">{promptText}</p>

      {helperText && (
        <p className="mt-2 font-mono text-[11px] leading-5 text-green-500/80">{helperText}</p>
      )}

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          required
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="network.id@domain"
          className="w-full border border-green-500/60 bg-black px-3 py-2 font-mono text-sm text-green-300 placeholder:text-green-600/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        />
        <button
          type="submit"
          disabled={isUnlocking}
          className="border border-green-400 px-4 py-2 font-mono text-xs tracking-[0.22em] text-green-200 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUnlocking ? 'FELOLDAS...' : 'FELOLDAS'}
        </button>
      </form>

      {saveMessage && (
        <p className="mt-3 font-mono text-[11px] leading-5 text-amber-300/90">{saveMessage}</p>
      )}
    </section>
  )
}
