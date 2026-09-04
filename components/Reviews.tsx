import { Montserrat } from "next/font/google"
const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

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
      text: "Bizsergetően jó cucc - és persze teljesen legális. Megcsavar, mélyre visz, szórakoztat - deviáns, abszurd, és azt hiszem őszinte ez a strukturált zűrzavar ami egy jószándékú ámokfutás zseniális leirata.",
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
      text: "Mar megvan!! Es…fasza. Teljesen jol osszeallt. Egy ulto helyemben vegigraideltem rajta. Hiaba olvastam mar mindegyiket korabban…igy egyben meg nagyobbat immunizalt!!!😅",
      author: "DarklordYivs",
    },
  ];

  const featured = reviews[2]; // válaszd ki, melyik legyen kiemelt

  return (
    <section id="velemenyek" className="mt-20">
      
      <div className="flex flex-col md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="mb-3 flex items-center justify-between font-mono text-sm uppercase not-italic text-zinc-200 border-b border-t border-zinc-800 pb-4 pt-4"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span>ILYENEKET MONDTOK</span>
          </div>
        </div>
      </div>


      {/* Scrollable / grid reviews */}
      <div className="mt-0">
        <div className="flex md:hidden gap-6 overflow-x-auto snap-x snap-mandatory pb-4 sidebar-scrollbar">
          {reviews.map((r, i) => (
            <article
              key={i}
              className="min-w-[80%]"
            >
              <p className="pt-6 font-mono text-xl italic leading-tight text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>“{r.text}”</p>
              <p className="text-lime-100 text-[19px] pt-2 italic text-left">— {r.author}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
