export default function Reviews() {
  const reviews = [
    {
      text: "Ellógtam melóból céges kocsival, mert nem bírtam kivárni. Már a keresés maga egy kaland volt.",
      author: "bober",
    },
    {
      text: "A könyv felénél tartok és azt kell mondjam majdnem komolyabb élmény mint az Irvine Welsh vagy Bukowski könyvek.",
      author: "Szilvi",
    },
    {
      text: "Bizsergetően jó cucc - és persze teljesen legális. Megcsavar, mélyre visz, szórakoztat - deviáns, abszurd, és azt hiszem őszinte ez a strukturált zűrzavar ami egy jószándékú ámokfutás zseniális leirata. Sokkal több mint néhány random régi underground story, ez terápiás töltés - élmény.",
      author: "Cherrydarling",
    },
    {
      text: "Megtaláltam a könyvecskét. Nagyon szépen köszönöm ezt a kis kalandot. Ha még tervezel ilyet kérlek tudasd róla a népet, mert szükségünk van ilyen gyöngyszemekre.",
      author: "Alexandra",
    },
    {
      text: "Hétvégén el tudtam menni érte és meg is találtam, bár nem valami egyszerűen… A GPS pontos volt, és mivel sötét volt, a kép is sokat segített.",
      author: "Marci",
    },
    {
      text: "A spot zseniális volt, soha nem vettem még így át semmit és nagyon nagy élmény volt, eszméletlen az alázat és passzió amit ebbe az egész projektbe teszel!",
      author: "Kitti",
    },
    {
      text: "Sose hagyd abba az írást! Valami olyan van benned amit régóta nem olvastam senki mástól. Élvezhető, emberi és magával ragadó a stílusod.",
      author: "Feisty-Brick138",
    },
    {
      text: "Mar megvan!! Es…fasza. Teljesen jol osszeallt. Egy ulto helyemben vegigraideltem rajta. Hiaba olvastam mar mindegyiket korabban…igy egyben meg nagyobbat immunizalt!!!😅 Vagy ahogy egy perfekcionista haverom mondja mindig, ha valami grammra pontos bazmeg, kiadta",
      author: "DarklordYivs",
    },
  ];

  const featured = reviews[2]; // válaszd ki, melyik legyen kiemelt

  return (
    <section id="velemenyek" className="mt-16 px-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-400/70 mb-3">
            Social proof
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white">
            Akik már levadászták a <span className="text-lime-400">Vállalhatatlant</span>
          </h2>
          <p className="text-sm md:text-base text-gray-400 mt-2 max-w-xl">
            Valódi üzenetek az olvasóktól, DM-ekből és e-mailekből. <br/>
            Nem kértem tőlük semmit – csak írtak.
          </p>
        </div>

        <div className="inline-flex items-center gap-3 bg-black/50 border border-lime-400/30 rounded-xl px-4 py-3 text-sm">
          <div className="text-2xl leading-none">★</div>
          <div>
            <div className="font-semibold text-white">
              4.9 / 5
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-lime-300/80">
              olvasói értékelés <span className="text-gray-500 ml-1">/ spontán review-k</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured review */}
      <div className="mt-10 grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8">
        <div className="relative overflow-hidden rounded-2xl border border-lime-400/30 bg-gradient-to-br from-black/80 via-black/70 to-lime-900/30 p-6 md:p-8">
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen">
            {/* ide mehet a CRT / glitch overlayed background, ha van saját komponensed */}
          </div>
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-lime-300/80 mb-2">
              Kiemelt vélemény
            </p>
            <p className="text-lg md:text-xl text-gray-100 italic leading-relaxed">
              “{featured.text}”
            </p>
            <p className="text-lime-400 text-sm mt-4 text-right">— {featured.author}</p>
          </div>
        </div>

        {/* Carousel / list label */}
        <div className="flex flex-col justify-between gap-4">
          <p className="text-sm text-gray-400">
            Lapozz bele a többi üzenetbe is – mobilon húzd oldalra, desktopon csak
            nézd, ahogy a kártyák villognak.
          </p>
          <div className="h-px bg-gradient-to-r from-lime-400/60 via-lime-400/0 to-transparent" />
          <p className="text-xs text-gray-500">
            Spoiler: a legtöbben már a keresést is nagyobb kalandnak írták le, mint
            egy átlagos napjukat.
          </p>
        </div>
      </div>

      {/* Scrollable / grid reviews */}
      <div className="mt-10">
        <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6">
          {reviews.map((r, i) => (
            <article
              key={i}
              className="min-w-[80%] bg-black/70 border border-lime-400/20 rounded-2xl p-5 snap-center
                         shadow-[0_0_30px_rgba(132,204,22,0.25)]/0 hover:shadow-[0_0_30px_rgba(132,204,22,0.4)]
                         transition-transform transition-shadow duration-200 hover:-translate-y-1"
            >
              <p className="text-sm text-gray-200 leading-relaxed italic">“{r.text}”</p>
              <p className="text-lime-400 text-xs mt-3 text-right">— {r.author}</p>
            </article>
          ))}
        </div>

        <div className="hidden md:grid grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <article
              key={i}
              className="bg-black/70 border border-lime-400/20 rounded-2xl p-5
                         hover:border-lime-400/60 hover:-translate-y-1
                         transition-transform transition-colors duration-200"
            >
              <p className="text-sm text-gray-200 leading-relaxed italic line-clamp-5">
                “{r.text}”
              </p>
              <p className="text-lime-400 text-xs mt-3 text-right">— {r.author}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
