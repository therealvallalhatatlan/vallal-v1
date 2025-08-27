import Link from "next/link"
import path from "path"
import fs from "fs/promises"
import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { formatSequence } from "@/lib/format"

type Props = {
  searchParams?: { session_id?: string }
}

async function readCounters() {
  const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json")
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8")
    const json = JSON.parse(raw)
    const goal = Number.isFinite(Number(json.goal)) ? Math.max(1, Number(json.goal)) : 100
    const preorders = Number.isFinite(Number(json.preorders)) ? Math.max(0, Number(json.preorders)) : 0
    return { goal, preorders }
  } catch (err) {
    return { goal: 100, preorders: 0 }
  }
}

export default async function SuccessPage({ searchParams }: Props) {
  const { goal, preorders } = await readCounters()
  const capped = Math.min(preorders, goal)
  const lastAssigned = capped // last assigned number (webhook increments preorders)
  const soldOut = capped >= goal

  // If webhook hasn't run yet, preorders may be 0 even though session completed.
  // We keep the UI simple: show pending state when preorders === 0.
  const pending = preorders === 0

  return (
    <Container className="py-16">
      <Card>
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-bold text-green-400">Payment successful</h1>

          <p className="text-green-300/80">
            Köszönjük a támogatást — a fizetés sikeresen megtörtént.
          </p>

          <div className="mt-6">
            <div className="mx-auto w-48 h-48 rounded-full bg-green-900/20 flex items-center justify-center">
              <div className="text-4xl font-extrabold text-green-400">
                {pending ? "—" : soldOut ? "Sold out" : formatSequence(lastAssigned)}
              </div>
            </div>
            <p className="mt-3 text-sm text-green-300/80">
              {pending
                ? "A sorszám hozzárendelése folyamatban van. Kérlek, frissítsd az oldalt pár másodperc múlva."
                : soldOut
                ? "A kampány elérte a célt — minden példány elkelt."
                : "Ez a te sorszámod."}
            </p>
          </div>

          <div className="mt-6 text-lg">
            <div className="text-green-300/80">Current status</div>
            <div className="text-2xl font-semibold text-green-400">
              {capped} / {goal} sold
            </div>
          </div>

          <div className="pt-6">
            <Button asChild variant="outline" size="lg" className="px-8 py-3">
              <Link href="/">Vissza a kezdőlapra</Link>
            </Button>
          </div>

          <p className="text-xs text-green-300/60 mt-4">
            If your number still shows pending after a minute, check your email or contact support.
          </p>
        </div>
      </Card>
    </Container>
  )
}
