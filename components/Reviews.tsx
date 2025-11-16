export default function Reviews() {
  const reviews = [
    {
      text: "Ellógtam melóból céges kocsival, mert nem bírtam kivárni. Már a keresés maga egy kaland volt.",
      author: "bober",
    },
    {
      text: "A könyv felénél tartok és azt kell mondjam majdnem komolyabb élmény mint az Irvine Welsh vagy Bukowski könyvek. ",
      author: "Szilvi",
    },
    {
      text: "Megtaláltam a könyvecskét. Nagyon szépen köszönöm ezt a kis kalandot.💜 Ha még tervezel ilyet kérlek tudasd róla a népet, mert szükségünk van ilyen gyöngyszemekre.",
      author: "Alexandra",
    },
    {
      text: "Hétvégén el tudtam menni érte és meg is találtam, bár nem valami egyszerűen, mert a park irányából mentem és át kellett vágnom a sűrűjén, hogy kiérjek a kerítéshez. A GPS pontos volt, és mivel sötét volt, a kép is sokat segített. Azon a részen volt még egy-két ember, egy motoros meg is kérdezte, hogy én is könyvet keresek-e, és mutattam neki, hogy én meg is találtam. ",
      author: "Marci",
    },
    {
      text: "A spot zseniális volt, soha nem vettem még így át semmit és nagyon nagy élmény volt, eszméletlen az alázat és passzio amit ebbe az egész projektbe teszel!",
      author: "Kitti",
    },
    {
      text: "sose hagyd abba az írást! De tényleg soha valami olyan van benned amit már regota nem olvastam senki mástól sem. Élvezhető, emberi es magával ragadó a stílusod",
      author: "Feisty-Brick138",
    },
  ];

  return (
    <section id="velemenyek" className="px-6 mt-12 max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {reviews.map((r, i) => (
          <div key={i} className="bg-black/20 p-6 rounded-xl border border-green-400/20">
            <p className="text-gray-300 italic">“{r.text}”</p>
            <p className="text-green-400 text-sm mt-3 text-right">— {r.author}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
