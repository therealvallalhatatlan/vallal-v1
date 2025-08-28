// Mock data for crowdfunding campaign
export const mockData = {
  totalGoal: 500,
  totalPreorders: 137,
  get nextSequence() {
    return this.totalPreorders + 1
  },
  get progressPercent() {
    return Math.round((this.totalPreorders / this.totalGoal) * 100)
  },
}

export const COUNTERS_MOCK = {
  totalGoal: 100,
  totalPreorders: 0,
}

export const ORDER_MOCK = {
  orderId: "demo_001",
  amount: 15000,
  currency: "HUF",
  status: "paid",
  sequenceNumber: 138,
  timeline: [
    { status: "paid", label: "Paid", active: true, completed: true },
    { status: "in_production", label: "In Production", active: false, completed: false },
    { status: "fulfilled", label: "Fulfilled", active: false, completed: false },
  ],
}

export const FAQ_MOCK = [
  {
    question: "Mikor kapom meg a könyvemet?",
    answer:
      "Amint legalább 10 előrendelés beérkezik, elindítjuk a nyomdát. Onnantól a gyártás–száradás–csomagolás 3–4 hét. Készenlétkor kapsz visszaigazolást és sorszámot, majd a kézbesítés módjáról (drop/átvétel) részletes instrukciót.",
  },
  {
    question: "Mi történik, ha a kampány nem éri el a célját?",
    answer: "Ha a kampány nem fut be (vagy leállítjuk), visszautaljuk a teljes összeget arra a fizetési módra, amivel fizettél (Stripe). A banktól függően a jóváírás jellemzően 5–10 munkanap.",
  },
  {
    question: "Milyen helyeken lesz elrejtve a csomag?",
    answer:
      "Nyilvános, bárki által elérhető helyeken, ahol nem kerülhetsz kellemetlen helyzetbe. Nem kell valamit vásárolni, nem kell személyzethez szólni, és nem kell belépni tiltott területre. Gondolj parkokra, közterekre, utcabútorok környékére, jellegzetes városi pontokra. A rejtek gyakran kapcsolódik a történetekhez – kapsz róla pozíciót, leírást és fotós nyomot. A cél, hogy jó kaland legyen, ne szívatás. Ha elakadnál, segítünk útbaigazítással.",
  },
  {
    question: "Módosíthatom vagy lemondhatom a rendelésemet?",
    answer:
      "Ez limitált előrendelés. A vásárlás pillanatában lefoglalod a sorszámodat és a gyártási kapacitást, ezért a rendelés nem módosítható és nem lemondható. (Ha elírtad az e-mailed vagy átadnád valakinek a helyedet, írj nekünk – adatot tudunk frissíteni, de a rendelést nem töröljük.)",
  },
  {
    question: "Milyen fizetési módokat fogadtok el?",
    answer: "A fizetés Stripe-on keresztül történik. Elfogadott: bankkártyák (Visa, MasterCard, AmEx), valamint a Stripe által kínált Apple Pay / Google Pay és egyes helyi opciók. A fizetés biztonságos, titkosított környezetben zajlik.",
  },
]

export const faqData = FAQ_MOCK
export const mockOrderData = ORDER_MOCK
