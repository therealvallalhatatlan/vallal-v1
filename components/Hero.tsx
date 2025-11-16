import CtaBuyBox from "@/components/CtaBuyBox"
export default function Hero() {
  return (
    <section className="px-6 py-12 max-w-xl mx-auto text-center bg-transparent">
      <h1 className="text-5xl md:text-5xl font-bold mb-12">
        <span className="crt-glitch text-green-400" data-text="Vállalhatatlan">Vállalhatatlan</span> 
      </h1>

      <p className="text-lg text-gray-300/90 mb-6">
        Vállalhatatlan, meg sem történt sztorik az ezredvégi Budapest nyüzsgő, drogok fűtötte föld alatti világából.<br /><br />
<span className="text-green-400 font-semibold">✓ </span>
Limitált példányszámú, dedikált könyv <br /> 
<span className="text-green-400 font-semibold">✓ </span>
 QR-kódos digitális élmény <br />
 <span className="text-green-400 font-semibold">✓ </span>
  Dead drop* terjesztési mód. 
        <br /> <br /> 
        A saját sorszámozott példányod <span className="text-green-400 font-semibold">24 órán belül elrejtem</span> a városban, és küldöm a koordinátákat.
        <br /><span className="text-sm text-gray-500 italic">*Posta automatába is kérheted</span>
      </p>

      <CtaBuyBox />
    </section>
  );
}
