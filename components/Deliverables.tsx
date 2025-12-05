import CtaBuyBox from "@/components/CtaBuyBox";

export default function Deliverables() {
  return (
    <section className="px-6 py-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-14">
        <p className="text-[11px] uppercase tracking-[0.25em] text-lime-300/80 mb-2">
          Mit kapsz pontosan?
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Egy könyv, két világ – fizikai + digitális csomagban.
        </h2>
        <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
          A dobozban nem csak papír van. A példányod egy QR-kódokkal összekötött
          digitális ökoszisztéma kulcsa is.
        </p>
      </div>

      {/* Packages */}
      <div className="grid md:grid-cols-2 gap-8 md:gap-10">
        {/* Fizikai csomag */}
        <article className="relative overflow-hidden rounded-2xl border border-lime-400/30 bg-black/70 p-6 md:p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-lime-400/70">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {/* ide mehet glitch/scanline overlay ha akarsz */}
          </div>
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300/80 mb-2">
              Fizikai csomag
            </p>
            <h3 className="text-lime-400 font-semibold text-xl mb-4">
              A kézzel fogható Vállalhatatlan
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm md:text-base">
              <li>• Limitált Vállalhatatlan könyv</li>
              <li>• Egyedi sorszámozás (1–100)</li>
              <li>• Dedikált példány</li>
              <li>• Glitchelt vizuális elemek</li>
              <li>• Dead drop esetén időjárásálló csomagolás</li>
            </ul>
          </div>
        </article>

        {/* Digitális csomag */}
        <article className="relative overflow-hidden rounded-2xl border border-lime-400/30 bg-black/70 p-6 md:p-7 transition-transform duration-200 hover:-translate-y-1 hover:border-lime-400/70">
          <div className="absolute inset-0 opacity-20 pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime-300/80 mb-2">
              Digitális csomag
            </p>
            <h3 className="text-lime-400 font-semibold text-xl mb-4">
              QR-kódos underground ökoszisztéma
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm md:text-base">
              <li>• Extra sztorioldalak</li>
              <li>• Letölthető soundtrack</li>
              <li>• Képek, helyszínfotók, háttéranyagok</li>
              <li>• Folyamatos frissítések</li>
              <li>• Teljes digitális ökoszisztéma</li>
            </ul>
          </div>
        </article>
      </div>

      {/* Price + CTA */}
      <div className="mt-12 flex flex-col items-center gap-6">
        <div className="text-center inline-flex flex-col items-center justify-center px-6 py-4 rounded-2xl border border-lime-400/40 bg-black/70">
          <p className="text-xs uppercase tracking-[0.2em] text-lime-300/80 mb-1">
            A Fullos Élmény Ára
          </p>
          <p className="text-2xl font-semibold">
            15 000 Ft
          </p>
          <p className="text-gray-400 text-sm mt-1">
            <a href="https://www.patreon.com/vallalhatatlan" className="text-lime-300 hover:text-lime-200 underline">
              Patreon Klubtagoknak
            </a>, és/vagy a {" "}
            <a href="/reader" className="text-lime-300 hover:text-lime-200 underline">
              Digitális Reader
            </a> megvásárlóinak 
            <br/>
            <span className="text-lime-300 font-medium">10 000 Ft</span>
          </p>
        </div>


      </div>
    </section>
  );
}
