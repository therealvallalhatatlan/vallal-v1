export default function FAQ() {
  const items = [
    {
      q: "Mikor kapom meg a könyvemet?",
      a: "Dead drop: 24 órán belül koordinátát kapsz. Automata / futár: 4-5 munkanap.",
    },
    {
      q: "Mennyire veszélyes a dead drop?",
      a: "Semennyire. Publikus, normális helyek. Nem kell mászni, nem kell találkoznod, kommunikálnod senkivel.",
    },
    {
      q: "Mi van, ha nem találom meg?",
      a: "Segítek: plusz fotót vagy pontosabb leírást küldök. Nem hagylak cserben.",
    },
    {
      q: "Vidékiek is rendelhetnek?",
      a: "Igen! Dead drop: Budapest és környéke. Automata/futár: bárhova.",
    },
    {
      q: "Milyen fizetési módok vannak?",
      a: "Bankkártya, online fizetés Stripe-on keresztül.",
    },
  ];

  return (
    <section id="gyik" className="px-6 py-24 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-12 text-center">GY.I.K.</h2>
      <div className="space-y-8">
        {items.map((item, i) => (
          <div key={i}>
            <h3 className="text-green-400 text-xl font-semibold mb-2">{item.q}</h3>
            <p className="text-gray-300">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
