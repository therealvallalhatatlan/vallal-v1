export default function MiEz() {
  return (
    <section id="mi-ez" className="px-6 py-24 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-10 text-center">
        Ez nem csak egy könyv. Ez egy játék, amiben te is szereplő leszel.
      </h2>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-black/20 border border-green-400/20 p-6 rounded-xl">
          <h3 className="text-green-400 font-semibold text-xl mb-2">100 Könyv</h3>
          <p className="text-gray-400">
            100 példány készült. Mind sorszámozott, dedikált, és nyers mint a betontörmelék.
          </p>
        </div>

        <div className="bg-black/20 border border-green-400/20 p-6 rounded-xl">
          <h3 className="text-green-400 font-semibold text-xl mb-2">29 QR-világ</h3>
          <p className="text-gray-400">
            Minden novella saját QR-kódokkal: képek, hangok, helyszínek, titkos oldalak.
          </p>
        </div>

        <div className="bg-black/20 border border-green-400/20 p-6 rounded-xl">
          <h3 className="text-green-400 font-semibold text-xl mb-2">Kaland+Adrenalin</h3>
          <p className="text-gray-400">
            A példányod egy dead drop része lesz. A történet ott kezdődik, ahol megtalálod.
          </p>
        </div>
      </div>
    </section>
  );
}
