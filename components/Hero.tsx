import CtaBuyBox from "@/components/CtaBuyBox"

export default function Hero() {
  return (
    <section className="px-6 py-16 max-w-6xl mx-auto bg-transparent">
      <div className="grid md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)] gap-10 items-center">
        {/* Left column – messaging */}
        <div className="text-left">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-300/80 mb-4">
            Limited run / dead drop könyv
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span
              className="crt-glitch text-lime-400"
              data-text="Vállalhatatlan"
            >
              Vállalhatatlan
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-300/90 mb-6 max-w-xl">
            Vállalhatatlan, meg sem történt sztorik az ezredvégi Budapest nyüzsgő, drogok fűtötte, föld alatti alvilágából.
          </p>

          {/* Social proof chip */}
          <div className="inline-flex items-center gap-3 bg-black/60 border border-lime-400/30 rounded-xl px-4 py-3 text-sm mb-6">
            <div className="text-2xl leading-none">★</div>
            <div>
              <div className="font-semibold text-white">4.9 / 5</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-lime-300/80">
                olvasói értékelés{" "}
                <span className="text-gray-500 ml-1">
                  / spontán review-kból
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 italic">
                „Majdnem komolyabb élmény, mint az Irvine Welsh vagy Bukowski
                könyvek.”
              </p>
            </div>
          </div>

          {/* Bullet list */}
          <ul className="space-y-2 text-sm md:text-base text-gray-200 mb-6">
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              Limitált példányszámú, sorszámozott, dedikált könyv
            </li>
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              QR-kódos digitális élmény, zenék, extra sztorik
            </li>
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              Dead drop* átvétel – te vadászod le a saját példányod
            </li>
          </ul>

          <p className="text-sm text-gray-300 mb-2">
            A saját sorszámozott könyvedet{" "}
            <span className="text-lime-400 font-semibold">
              24 órán belül elrejtem
            </span>{" "}
            a városban, és elküldöm a GPS-koordinátákat, fotóval együtt.
          </p>
          <p className="text-xs text-gray-500 italic">
            *Ha nem akarsz bokorba mászni: kérheted posta automatába is.
          </p>
        </div>

        {/* Right column – CTA box */}
        <div className="max-w-md mx-auto w-full">
          <CtaBuyBox />
        </div>
      </div>
    </section>
  )
}
