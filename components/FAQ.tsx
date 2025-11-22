"use client"
import { useState } from "react"

export default function FAQ() {
  const items = [
    {
      q: "Mikor kapom meg a könyvemet?",
      a: "Dead drop: 24 órán belül koordinátát kapsz. Automata / futár: 4–5 munkanap.",
    },
    {
      q: "Mennyire veszélyes a dead drop?",
      a: "Semennyire. Publikus, normális helyek. Nem kell mászni, nem kell találkoznod senkivel.",
    },
    {
      q: "Mi van, ha nem találom meg?",
      a: "Segítek: plusz fotót vagy részletesebb leírást küldök. Nem hagylak cserben.",
    },
    {
      q: "Vidékiek is rendelhetnek?",
      a: "Igen! Dead drop: Budapest és környéke. Automata/futár: bárhova.",
    },
    {
      q: "Milyen fizetési módok vannak?",
      a: "Bankkártya, online fizetés Stripe-on keresztül.",
    },
  ]

  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="gyik" className="px-6 py-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-14">
        <p className="text-[11px] uppercase tracking-[0.25em] text-lime-300/80 mb-2">
          Frequently asked kérdések
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">GY.I.K.</h2>
        <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto">
          Minden kérdés, amit eddig feltettek – tömören, nyersen, kertelés nélkül.
        </p>
      </div>

      {/* FAQ list */}
      <div className="space-y-4">
        {items.map((item, i) => {
          const isOpen = open === i

          return (
            <div
              key={i}
              className="rounded-2xl border border-lime-400/20 bg-black/60 p-4 md:p-5 transition-colors hover:border-lime-400/50"
            >
              {/* Question */}
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex justify-between items-center text-left"
              >
                <h3 className="text-lime-400 font-semibold text-lg md:text-xl">
                  {item.q}
                </h3>
                <span
                  className={`text-lime-300 transform transition-transform duration-200 ${
                    isOpen ? "rotate-90" : ""
                  }`}
                >
                  ▶
                </span>
              </button>

              {/* Answer */}
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                  isOpen ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                  {item.a}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="mt-10 text-center text-[11px] text-gray-500 italic">
        Ha maradt kérdésed, írj nyugodtan – gyorsabban válaszolok, mint gondolnád.
      </p>
    </section>
  )
}
