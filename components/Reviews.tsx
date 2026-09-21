import { Montserrat } from "next/font/google"
const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

export default function Reviews() {
  const reviews = [
    {
      text: "Bizsergetően jó cucc - és persze teljesen legális. Megcsavar, mélyre visz, szórakoztat - deviáns, abszurd, és azt hiszem őszinte ez a strukturált zűrzavar ami egy jószándékú ámokfutás zseniális leirata.",
      author: "Cherrydarling",
    },
    {
      text: "A könyv felénél tartok és azt kell mondjam majdnem komolyabb élmény mint az Irvine Welsh vagy Bukowski könyvek.",
      author: "Szilvi",
    },
    {
      text: "Egy olyan kor lenyomata ami lehet csak nekunk fontos de kortörténet okán szerintem másnak is vicces lehet. Vagy tanulságos...",
      author: "Sior",
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
    <section id="velemenyek" className="mt-12">
      
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center justify-between font-mono text-sm uppercase not-italic text-zinc-200 border-t pt-4 pb-1 border-b border-zinc-800">
            <p
                className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                AKIK MÁR LEVADÁSZTÁK A VÁLLALHATATLANT
              </p>
          </div>
        </div>
      </div>


      {/* Scrollable / grid reviews */}
      <div className="">
        <div className="flex md:hidden gap-6 overflow-x-auto snap-x snap-mandatory pb-4 sidebar-scrollbar">
          {reviews.map((r, i) => (
            <article
              key={i}
              className="min-w-[80%]"
            >
              <p className="pt-6 font-mono text-md italic leading-normal text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>“{r.text}”</p>
              <p className="text-lime-100 text-[19px] pt-2 italic text-left">— {r.author}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
