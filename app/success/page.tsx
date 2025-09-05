// app/success/page.tsx
import Link from "next/link"
import path from "path"
import fs from "fs/promises"
import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { formatSequence } from "@/lib/format"

// --- ugyanaz a számláló-logika, mint a főoldalon ---
async function readCountersSupabase() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "")
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const resp = await fetch(`${url}/rest/v1/counters?id=eq.main`, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    })
    if (!resp.ok) return null
    const json = await resp.json()
    if (json && json[0]) {
      const row = json[0]
      return {
        goal: Number(row.goal ?? 100),
        total_sold: Number(row.total_sold ?? row.preorders ?? 0),
        last_sequence_number: Number(row.last_sequence_number ?? 0),
      }
    }
    return null
  } catch {
    return null
  }
}
async function readCountersFile() {
  const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json")
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8")
    const json = JSON.parse(raw)
    return {
      goal: Number.isFinite(Number(json.goal)) ? Math.max(1, Number(json.goal)) : 100,
      total_sold: Number.isFinite(Number(json.total_sold ?? json.preorders))
        ? Math.max(0, Number(json.total_sold ?? json.preorders))
        : 0,
      last_sequence_number: Number.isFinite(Number(json.last_sequence_number ?? 0))
        ? Math.max(0, Number(json.last_sequence_number ?? 0))
        : 0,
    }
  } catch {
    return { goal: 100, total_sold: 0, last_sequence_number: 0 }
  }
}
async function readCounters() {
  const sup = await readCountersSupabase()
  if (sup) return sup
  return readCountersFile()
}

export default async function SuccessPage() {
  const { goal, total_sold, last_sequence_number } = await readCounters()

  // ugyanaz a számítás, mint az indexen
  const preorders = Math.min(total_sold ?? 0, goal)
  const remaining = Math.max(0, goal - preorders)
  const yourNumber = remaining > 0 ? Math.min(goal, (last_sequence_number ?? preorders) + 1) : null
  const percent = Math.min(100, Math.max(0, Math.round((preorders / goal) * 100)))
  const soldOut = remaining === 0
  const pending = yourNumber == null && !soldOut // ha elfogyott, nem várunk sorszámra

  return (
    <Container className="py-16">
      <Card className="overflow-hidden">
        <div className="mx-auto max-w-[640px] space-y-8 px-6 py-8 text-center">
          {/* headline */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-green-400">Sikeres fizetés</h1>
            <p className="text-sm text-green-300/80">Köszönöm a támogatást — a rendelésed rögzítve lett.</p>
          </div>

          {/* sorszám kapszula */}
          <div className="relative mx-auto h-44 w-44">
            <span
              className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/40"
              style={{ animation: "s_pulse 2.2s ease-out infinite" }}
            />
            <span
              className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/25"
              style={{ animation: "s_pulse 2.2s .4s ease-out infinite" }}
            />
            <div className="absolute inset-0 rounded-full bg-green-900/10 ring-1 ring-green-400/30 shadow-[inset_0_0_40px_rgba(0,255,170,0.15)]" />
            <div className="absolute inset-3 rounded-full bg-black/40 ring-1 ring-green-400/20" />

            <div className="relative flex h-full w-full items-center justify-center">
              <div className="text-4xl font-extrabold text-green-400 drop-shadow">
                {soldOut ? "ELFOGYOTT" : yourNumber ? `${formatSequence(yourNumber)}` : "…"}
              </div>
            </div>
          </div>

          {/* magyarázat */}
          <p className="text-sm text-green-300/80">
            {soldOut
              ? "A kampány elérte a célját — minden példány elkelt."
              : yourNumber
              ? "Ez a te sorszámod. A drop indulásakor e-mailben kapod a koordinátát és az instrukciót."
              : "A sorszám hozzárendelése folyamatban van. Frissítsd az oldalt pár másodperc múlva."}
          </p>

          {/* eladott darab / cél + progress */}
          <div className="mx-auto w-full max-w-[520px] space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-green-300/80">Eladva</span>
              <span className="font-semibold text-green-400">
                {preorders} / {goal} <span className="text-green-300/70">({percent}%)</span>
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-green-900/30">
              <div
                className="h-3 rounded-full bg-green-400 transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* CTA-k */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button asChild variant="outline" size="lg" className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black">
              <Link href="/">Vissza a kezdőlapra</Link>
            </Button>
            <Button asChild variant="ghost" className="text-green-300 hover:text-green-200">
              <Link href="/#gyik">GY.I.K. / kérdésem van</Link>
            </Button>
          </div>

          <p className="text-[11px] text-green-300/60">
            Ha csak egy „…” látszik a sorszám helyén, nézd meg az e-mailed, vagy írj:{" "}
            <a className="underline hover:text-green-300" href="mailto:hello@vallalhatatlan.online">hello@vallalhatatlan.online</a>
          </p>
        </div>

        {/* sima <style> (nem styled-jsx), hogy RSC-barát maradjon */}
        <style>{`
          @keyframes s_pulse {
            0%   { transform: translate(-50%, -50%) scale(0.6); opacity: .9; }
            70%  { transform: translate(-50%, -50%) scale(1.15); opacity: 0; }
            100% { transform: translate(-50%, -50%) scale(1.15); opacity: 0; }
          }
        `}</style>
      </Card>
    </Container>
  )
}
