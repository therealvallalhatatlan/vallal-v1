import CtaBuyBox from "@/components/CtaBuyBox";
export default function Deliverables() {
  return (
    <section className="px-6 py-24 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-12 text-center">
        Mit kapsz pontosan?
      </h2>

      <div className="grid md:grid-cols-2 gap-12">
        
        {/* FIZIKAI CSOMAG */}
        <div>
          <h3 className="text-xl text-green-400 font-semibold mb-4">Fizikai csomag</h3>
          <ul className="space-y-3 text-gray-300">
            <li>• Limitált Vállalhatatlan könyv</li>
            <li>• Egyedi sorszámozás (1–100)</li>
            <li>• Dedikált példány</li>
            <li>• Glitchelt vizuális elemek</li>
            <li>• Dead drop esetén időjárásálló csomagolás</li>
          </ul>
        </div>

        {/* DIGITÁLIS CSOMAG */}
        <div>
          <h3 className="text-xl text-green-400 font-semibold mb-4">Digitális csomag</h3>
          <ul className="space-y-3 text-gray-300">
            <li>• Extra sztorioldalak</li>
            <li>• Letölthető soundtrack</li>
            <li>• Képek, helyszínfotók, háttéranyagok</li>
            <li>• Folyamatos frissítések</li>
            <li>• Teljes digitális ökoszisztéma</li>
          </ul>
        </div>

      </div>

      <p className="text-center text-xl mt-12">
        <b>Ár: 15 000 Ft</b><br />
        <span className="text-gray-400 text-base">Klubtagoknak: 10 000 Ft</span>
      </p>

      <CtaBuyBox />
    </section>
  );
}
