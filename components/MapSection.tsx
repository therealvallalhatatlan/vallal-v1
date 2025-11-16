export default function MapSection() {
  return (
    <section className="px-6 py-24 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-center">
        Műveleti térkép
      </h2>

      <p className="text-gray-400 text-center max-w-xl mx-auto mb-10">
        A dropok mindig új helyszínekre kerülnek.  
        Parkok, aluljárók, rejtett zugok, neonfényes terek.  
        Amikor rendelsz, egy teljesen új pont jelenik meg a térképen — <b>csak neked</b>.
      </p>

      <div className="w-full h-72 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center">
        <span className="text-gray-600">[ Térkép / radar vizuál helye ]</span>
      </div>

      <p className="text-gray-500 text-center text-sm mt-4">
        A térkép illusztráció. A valódi koordinátát csak te kapod meg.
      </p>
    </section>
  );
}
