export default function MethodSelect() {
  return (
    <section id="vasarlas" className="px-6 py-24 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-12 text-center">
        Válaszd ki a módszert
      </h2>

      <div className="grid md:grid-cols-2 gap-10">

        {/* DEAD DROP */}
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-700">
          <h3 className="text-2xl font-semibold mb-4">Dead drop – a kaland útja</h3>
          <ul className="text-gray-300 space-y-3 mb-8">
            <li>• 24 órán belül koordinátát kapsz</li>
            <li>• Publikus, diszkrét hely</li>
            <li>• Nincs találkozó senkivel</li>
            <li>• Mini városi küldetés vibe</li>
            <li>• Szállítási díj: <b>0 Ft</b></li>
          </ul>

          <a
            href="/checkout?method=drop"
            className="block text-center bg-green-500 hover:bg-green-600 text-black py-3 rounded-lg font-semibold"
          >
            Kérem dead droppal
          </a>
        </div>

        {/* POSTA / AUTOMATA */}
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-700">
          <h3 className="text-2xl font-semibold mb-4">Posta / automata – a kényelem útja</h3>
          <ul className="text-gray-300 space-y-3 mb-8">
            <li>• Foxpost / Packeta automata vagy futár</li>
            <li>• 1–2 nap alatt nálad</li>
            <li>• Ugyanaz a sorszámozott példány</li>
            <li>• Teljes digitális hozzáférés</li>
            <li>• Szállítás: <b>+1600 Ft</b></li>
          </ul>

          <a
            href="/checkout?method=shipping"
            className="block text-center border border-gray-600 hover:border-gray-300 py-3 rounded-lg"
          >
            Kérem automatába / futárral
          </a>
        </div>

      </div>
    </section>
  );
}
