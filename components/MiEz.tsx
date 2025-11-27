export default function MiEz() {
  return (
    <section id="mi-ez" className="px-6 py-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <p className="text-[11px] uppercase tracking-[0.25em] text-lime-300/80 mb-3">
          Mi ez az egész?
        </p>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Ez nem csak egy könyv. Ez egy játék, amiben te vagy a főszereplő.
        </h2>
        <p className="text-sm md:text-base text-gray-400">
          Limitált példányszámú könyv, digitális mélymerülés és dead drop kincsvadászat egyben. 
          Nem polcdísznek készült, hanem hogy emlékké váljon.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {/* 100 könyv */}
        <article className="relative overflow-hidden rounded-2xl border border-lime-400/30 bg-black/70 p-6 md:p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-lime-400/70">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {/* ide mehet bármilyen glitch / scanline overlay, ha akarsz */}
          </div>
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300/80 mb-2">
              Fizikai példány
            </p>
            <h3 className="text-lime-400 font-semibold text-xl mb-2">
              100db könyv
            </h3>
            <img
              src="/features/1.png"
              alt="Limitált, sorszámozott fizikai példányok"
              className="w-full h-36 object-cover rounded-xl border border-lime-400/20 mb-4"
              loading="lazy"
            />
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              100 példány készült. Mind sorszámozott, dedikált, és nyers, mint a
              betontörmelék. Ha elfogy, nincs utánnyomás.
            </p>
          </div>
        </article>

        {/* 30 QR-világ */}
        <article className="relative overflow-hidden rounded-2xl border border-lime-400/30 bg-black/70 p-6 md:p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-lime-400/70">
          <div className="absolute inset-0 opacity-20 pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300/80 mb-2">
              Vállalhatatlan Reader
            </p>
            <h3 className="text-lime-400 font-semibold text-xl mb-2">
              30 novella - 30 digitális világ
            </h3>
            <img
              src="/features/2.png"
              alt="QR-kódokkal nyíló digitális rétegek"
              className="w-full h-36 object-cover rounded-xl border border-lime-400/20 mb-4"
              loading="lazy"
            />
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              Minden novella saját QR-kódokkal él tovább: képek, zenék, hangok,
              helyszínek, kaland + adrenalin.
            </p>
          </div>
        </article>

        {/* kaland */}
        <article className="relative overflow-hidden rounded-2xl border border-lime-400/30 bg-black/70 p-6 md:p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-lime-400/70">
          <div className="absolute inset-0 opacity-20 pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300/80 mb-2">
              Dead drop játék
            </p>
            <h3 className="text-lime-400 font-semibold text-xl mb-2">
              Kaland + adrenalin
            </h3>
            <img
              src="/features/3.png"
              alt="QR-kódokkal nyíló digitális rétegek"
              className="w-full h-36 object-cover rounded-xl border border-lime-400/20 mb-4"
              loading="lazy"
            />
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              A példányod egy dead drop része lesz. A saját könyvedet GPS
              koordináták és fotó alapján vadászod le. A történet ott kezdődik,
              ahol megtalálod.
            </p>
          </div>
        </article>

      </div>

      {/* Footnote */}
      <p className="mt-6 text-[11px] text-center text-gray-500 italic">
        Ha nem akarsz bokor alá mászni: kérheted automatába vagy postán is —
        de akkor kimaradsz a játék feléből.
      </p>
    </section>
  )
}
