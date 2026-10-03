import type { Metadata } from "next"
import Link from "next/link"
import MainContent from "@/components/MainContent"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "Adatkezelési tájékoztató - Vállalhatatlan",
  description:
    "A Vállalhatatlan weboldal és szolgáltatásainak adatkezelési tájékoztatója.",
}

const sections = [
  {
    title: "1. Az adatkezelő",
    body: (
      <>
        <p>
          Az adatkezelő a Vállalhatatlan projekt weboldalának és kapcsolódó
          szolgáltatásainak üzemeltetője.
        </p>
        <div className="border border-lime-400/20 bg-lime-400/[0.035] p-4 text-sm">
          <p className="font-semibold text-lime-200">Kapcsolattartás</p>
          <p className="mt-2">
            E-mail:{" "}
            <a
              href="mailto:therealvallalhatatlan@gmail.com"
              className="text-lime-200 underline decoration-lime-400/30 underline-offset-4 hover:text-white"
            >
              therealvallalhatatlan@gmail.com
            </a>
          </p>
          <p className="mt-3 text-zinc-500">
            Az adatkezelő hivatalos jogi neve, székhelye és egyéb kötelező
            azonosító adatai ezen az oldalon jelenleg nincsenek feltüntetve.
            Ezeket az éles közzététel előtt ki kell egészíteni.
          </p>
        </div>
      </>
    ),
  },
  {
    title: "2. Milyen személyes adatokat kezelünk?",
    body: (
      <>
        <p>A szolgáltatások használatától függően az alábbi adatokat kezelhetjük:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>név vagy megjelenített név;</li>
          <li>e-mail-cím;</li>
          <li>Facebook-fiókból érkező profiladatok, például név és profilkép, ha Facebookos bejelentkezést használsz;</li>
          <li>fiókhoz és bejelentkezéshez kapcsolódó technikai adatok;</li>
          <li>megrendeléssel, fizetéssel és kézbesítéssel kapcsolatos adatok;</li>
          <li>az általad küldött üzenetek, kapcsolattartási adatok és egyéb önkéntesen megadott információk;</li>
          <li>a weboldal használatához szükséges technikai és analitikai adatok, például oldalmegtekintés, hivatkozó oldal, eszköztípus és munkamenethez kapcsolódó információk.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. Milyen célból kezeljük az adatokat?",
    body: (
      <>
        <p>Az adatokat különösen az alábbi célokból kezeljük:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>felhasználói fiók létrehozása, azonosítása és a bejelentkezés biztosítása;</li>
          <li>megrendelések és fizetések kezelése, valamint a teljesítés és kézbesítés támogatása;</li>
          <li>ügyfélszolgálati és kapcsolattartási megkeresések kezelése;</li>
          <li>a weboldal és a szolgáltatások működésének, biztonságának és teljesítményének fenntartása;</li>
          <li>statisztikai és analitikai célú mérés, a szolgáltatás fejlesztése.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Az adatkezelés jogalapja",
    body: (
      <>
        <p>
          Az adatkezelés jogalapja az adott helyzettől függően lehet a szerződés
          teljesítése, az adatkezelő jogos érdeke, jogi kötelezettség teljesítése,
          illetve azokban az esetekben, ahol ez szükséges, az érintett
          hozzájárulása.
        </p>
        <p className="mt-3">
          A hozzájáruláson alapuló adatkezeléshez adott hozzájárulás
          visszavonható. A visszavonás nem érinti a korábbi adatkezelés
          jogszerűségét.
        </p>
      </>
    ),
  },
  {
    title: "5. Bejelentkezés és Facebook Login",
    body: (
      <>
        <p>
          A weboldalon lehetőség lehet e-mailes és külső szolgáltatón keresztüli
          bejelentkezésre. Facebookos bejelentkezés esetén a Meta Platforms
          szolgáltatásai vesznek részt az azonosításban.
        </p>
        <p className="mt-3">
          A Facebooktól a bejelentkezéshez szükséges, a szolgáltató által
          rendelkezésre bocsátott profiladatokat kaphatunk meg, például nevet,
          e-mail-címet és profilképet. A Meta saját adatkezelési szabályzatokkal
          rendelkezik, amelyek a Meta szolgáltatásain belüli adatkezelésre is
          vonatkoznak.
        </p>
      </>
    ),
  },
  {
    title: "6. Fizetés és külső szolgáltatók",
    body: (
      <>
        <p>
          Online fizetés esetén a fizetés feldolgozását a Stripe szolgáltatása
          végzi. A bankkártyaadatokat a Stripe kezeli; azokat a Vállalhatatlan
          rendszerében nem tároljuk.
        </p>
        <p className="mt-3">
          A weboldal működéséhez és egyes szolgáltatásokhoz további
          adatfeldolgozók is kapcsolódhatnak, többek között a Supabase
          (hitelesítés és adatbázis), a Vercel (hosting és analitika), valamint
          a Resend (e-mail-küldés). A digitális tartalmak kiszolgálásához
          technikai tárhelyszolgáltatás is igénybe vehető.
        </p>
      </>
    ),
  },
  {
    title: "7. Sütik, helyi tárolás és analitika",
    body: (
      <>
        <p>
          A weboldal működése során technikailag szükséges sütiket, valamint a
          böngésző helyi tárolási lehetőségeit használhatjuk a munkamenet,
          bejelentkezés, rendelési folyamat és egyes funkciók működtetéséhez.
        </p>
        <p className="mt-3">
          A weboldal Vercel Analytics alapú statisztikai mérést is használhat.
          A technikai és analitikai adatok egy része az oldal használatának
          megértését és fejlesztését szolgálja.
        </p>
      </>
    ),
  },
  {
    title: "8. Adatmegőrzés",
    body: (
      <>
        <p>
          A személyes adatokat csak addig kezeljük, ameddig az adott cél
          teljesítéséhez szükséges, illetve ameddig azt jogszabály vagy jogos
          igényérvényesítés indokolja.
        </p>
        <p className="mt-3">
          A felhasználói fiókhoz kapcsolódó adatokat főszabály szerint a fiók
          fennállásáig, a rendelési és számviteli adatokat pedig a vonatkozó
          jogszabályi megőrzési idő alatt kezeljük.
        </p>
      </>
    ),
  },
  {
    title: "9. Adatbiztonság",
    body: (
      <p>
        Ésszerű technikai és szervezési intézkedéseket alkalmazunk az adatok
        védelmére, ideértve a hozzáférések korlátozását, a biztonságos
        kommunikációt és a szolgáltatói hozzáférések megfelelő kezelését.
        Internetes adatátvitel esetén azonban abszolút biztonság nem garantálható.
      </p>
    ),
  },
  {
    title: "10. Az érintettek jogai",
    body: (
      <>
        <p>
          Az alkalmazandó adatvédelmi jogszabályok alapján az érintett kérheti
          többek között személyes adataihoz való hozzáférést, azok helyesbítését,
          törlését, kezelésük korlátozását, valamint tiltakozhat bizonyos
          adatkezelések ellen. A jogszabályi feltételektől függően az
          adathordozhatóság joga is megilletheti.
        </p>
        <p className="mt-3">
          Adatvédelmi kérelmedet a{" "}
          <a
            href="mailto:therealvallalhatatlan@gmail.com"
            className="text-lime-200 underline decoration-lime-400/30 underline-offset-4 hover:text-white"
          >
            therealvallalhatatlan@gmail.com
          </a>{" "}
          címen küldheted el.
        </p>
      </>
    ),
  },
  {
    title: "11. Panasz és jogorvoslat",
    body: (
      <p>
        Ha úgy gondolod, hogy személyes adataid kezelése nem felel meg az
        alkalmazandó adatvédelmi szabályoknak, először közvetlenül az
        adatkezelővel veheted fel a kapcsolatot. Emellett jogosult lehetsz
        panaszt tenni az illetékes adatvédelmi felügyeleti hatóságnál, illetve
        a vonatkozó jogszabályok szerinti egyéb jogorvoslati lehetőségekkel is
        élhetsz.
      </p>
    ),
  },
  {
    title: "12. A tájékoztató módosítása",
    body: (
      <p>
        Fenntartjuk a jogot a jelen tájékoztató módosítására, különösen a
        szolgáltatások, az adatkezelési gyakorlat vagy a vonatkozó jogszabályok
        változása esetén. Az aktuális változat ezen az oldalon érhető el.
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <MainContent>
      <div className="mx-auto w-full max-w-4xl px-5 pb-16">
        <header className="border-b border-zinc-800 pb-8 pt-8">
          <p
            className="text-[10px] uppercase tracking-[0.28em] text-lime-400/70"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            VÁLLALHATATLAN // LEGAL
          </p>
          <h1 className="mt-4 text-4xl font-normal text-zinc-100 sm:text-6xl">
            Adatkezelési tájékoztató
          </h1>
          <p
            className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Ez a tájékoztató azt foglalja össze, hogyan kezeljük a
            vallalhatatlan.online oldalon és a kapcsolódó szolgáltatásokban
            kezelt személyes adatokat.
          </p>
          <p
            className="mt-4 text-[11px] uppercase tracking-[0.14em] text-zinc-700"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Utolsó frissítés: 2026. október 3.
          </p>
        </header>

        <div className="mt-8 border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7">
          <div className="space-y-8 text-sm leading-7 text-zinc-400 sm:text-base">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-3 text-2xl text-zinc-100">{section.title}</h2>
                <div className="space-y-3">{section.body}</div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-800 pt-6">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-lime-200"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            ← Vissza a főoldalra
          </Link>
        </div>
      </div>

      <Footer />
    </MainContent>
  )
}
