import type { Metadata } from "next"
import Link from "next/link"
import MainContent from "@/components/MainContent"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "Felhasználói adatok törlése - Vállalhatatlan",
  description:
    "Tájékoztató a Vállalhatatlan felhasználói fiókjához és Meta/Facebook bejelentkezéséhez kapcsolódó személyes adatok törlésének kéréséről.",
}

export default function DataDeletionPage() {
  return (
    <MainContent>
      <div className="mx-auto w-full max-w-4xl px-5 pb-16">
        <header className="border-b border-zinc-800 pb-8 pt-8">
          <p
            className="text-[10px] uppercase tracking-[0.28em] text-lime-400/70"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            VÁLLALHATATLAN // DATA DELETION
          </p>

          <h1 className="mt-4 text-4xl font-normal text-zinc-100 sm:text-6xl">
            Felhasználói adatok törlése
          </h1>

          <p
            className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Ezen az oldalon találod, hogyan kérheted a Vállalhatatlan
            fiókodhoz és a Facebook/Meta bejelentkezéshez kapcsolódó személyes
            adataid törlését.
          </p>
        </header>

        <div className="mt-8 border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7">
          <div className="space-y-8 text-sm leading-7 text-zinc-400 sm:text-base">
            <section>
              <h2 className="mb-3 text-2xl text-zinc-100">
                Törlési kérelem küldése
              </h2>

              <p>
                A törlési kérelmedet e-mailben küldheted el a
                <a
                  href="mailto:therealvallalhatatlan@gmail.com?subject=Adatt%C3%B6rl%C3%A9si%20k%C3%A9relem"
                  className="ml-1 text-lime-200 underline decoration-lime-400/30 underline-offset-4 hover:text-white"
                >
                  therealvallalhatatlan@gmail.com
                </a>
                címre.
              </p>

              <div className="mt-4 border border-lime-400/20 bg-lime-400/[0.035] p-4">
                <p className="font-semibold text-lime-200">A kérelemben add meg:</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>a Vállalhatatlan-fiókodhoz tartozó e-mail-címet;</li>
                  <li>hogy a fiókod és a hozzá kapcsolódó személyes adatok törlését kéred;</li>
                  <li>ha Facebookkal jelentkeztél be, ezt jelezd a kérelemben.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-2xl text-zinc-100">
                Mi történik ezután?
              </h2>

              <p>
                A kérelmet megvizsgáljuk, szükség esetén ellenőrizzük a
                kérelmező jogosultságát, majd a vonatkozó adatvédelmi
                szabályoknak megfelelően töröljük vagy anonimizáljuk a
                törölhető személyes adatokat.
              </p>

              <p className="mt-3">
                A Facebook/Meta szolgáltatásból kapott, a Vállalhatatlan
                rendszerében kezelt adatokra is kiterjed a törlési kérelem.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl text-zinc-100">
                Megőrzendő adatok
              </h2>

              <p>
                Bizonyos adatokat jogszabályi kötelezettség, számviteli
                előírás, jogi igény érvényesítése vagy más jogszerű ok miatt a
                törlési kérelem ellenére is meg kell őriznünk. Ilyen esetben
                csak a szükséges adatot és csak a szükséges ideig tartjuk meg.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl text-zinc-100">
                Kapcsolat
              </h2>

              <p>
                Adatvédelmi és adattörlési kérdésekben:
              </p>

              <p className="mt-3">
                <a
                  href="mailto:therealvallalhatatlan@gmail.com"
                  className="text-lime-200 underline decoration-lime-400/30 underline-offset-4 hover:text-white"
                >
                  therealvallalhatatlan@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-5 border-t border-zinc-800 pt-6">
          <Link
            href="/privacy-policy"
            className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-lime-200"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Adatkezelési tájékoztató →
          </Link>

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
