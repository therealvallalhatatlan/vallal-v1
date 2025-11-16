export default function Shipping() {
  return (
    <section className="px-6 py-24 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Nem akarsz mászkálni? Semmi para.
      </h2>

      <p className="text-gray-300 text-center mb-6">
        Kérheted a könyvet <b>automatába vagy futárral is</b>.  
        Ugyanaz a limitált, sorszámozott példány — csak kényelmesebben.
      </p>

      <p className="text-center text-gray-400 mb-10">
        <b>+1600 Ft szállítási díj</b><br />
        (a futárszolgálatnak megy, nem nekem)
      </p>

      <div className="text-center">
        <a
          href="#vasarlas"
          className="border border-gray-600 hover:border-gray-300 py-3 px-6 rounded-lg"
        >
          Kérem automatába / futárral
        </a>
      </div>
    </section>
  );
}
