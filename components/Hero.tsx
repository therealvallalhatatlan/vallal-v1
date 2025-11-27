export default function Hero() {
  return (
    <section className="px-6 py-16 max-w-6xl mx-auto bg-transparent">
      <div className="items-center">
        {/* Left column – messaging */}
        <div className="text-left">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-300/80 mb-4">
            Magyarország első dead drop könyve
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span
              className="crt-glitch text-lime-400"
              data-text="Vállalhatatlan"
            >
              Vállalhatatlan, 
              <span className="text-neutral-200"> meg sem történt történetek: </span>
               A Könyv
            </span>
          </h1>


          {/* Bullet list */}
          <ul className="space-y-2 text-md md:text-base text-gray-200 mb-6">
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

      </div>

      

      <section className="mt-16 w-full">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {([
              {
                code: "#048",
                text: "A 048-as példány Kőbányán van, egy börtön melletti erdő szélén.",
              },
              {
                code: "#049",
                text: "A 049-es példány egy vadkacsás tó körül bújkál, dél-pesten.",
              },
              {
                code: "#050",
                text: "A 050-es példány budán, az Info Park közelében várja a gazdáját.",
              },
            ]).map(({ code, text }) => (
              <div
                key={code}
                className="rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm"
              >
                <h3 className="text-3xl font-semibold text-lime-400">{code}</h3>
                <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{text}</p>
                <a
                  href="/checkout"
                  className="mt-6 inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
                >
                  Megveszem ezt
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  )
}

const heroCtas = [
  {
    title: "Megveszem a könyvet",
    description:
      "Limitált, sorszámozott példány. Dead drop és digitális extra tartalmak.",
    href: "/checkout",
    button: "Megveszem",
  },
  {
    title: "Letöltöm az alkalmazást",
    description:
      "Digitális Reader: novellák, zenék és vizuálok mobilra optimalizálva.",
    href: "/reader",
    button: "Letöltöm",
  },
]
