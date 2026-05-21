export default function Sd0205Page() {
  const quote = `"Annabella?? Komolyan?
Te vagy az egyetlen, aki elég idióta volt beülni mellé a Morrisba és ezt még le is írod.
Írjál Író úr.Élvezd. Szórd a nosztalgiát.
Mókázz a speckó agyaddal. De ha legközelebb valakit megnevezel, tudd: nem mindenki nézi ilyen jókedvűen magát a neten."`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e1114] px-4 py-8 text-zinc-200 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(120,255,170,0.09),transparent_30%),radial-gradient(circle_at_92%_92%,rgba(255,92,92,0.08),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4)),repeating-linear-gradient(to_bottom,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_4px)]" />
      <div className="noise pointer-events-none absolute inset-0 opacity-35" />

      <section className="relative mx-auto w-full max-w-3xl border border-[#4c534d] bg-[#10140f]/90 shadow-[0_0_0_1px_rgba(140,255,180,0.1),0_0_70px_rgba(0,0,0,0.65)] backdrop-blur-sm">
        <header className="border-b border-[#4c534d] p-5 font-mono sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#93a08f]">
                titkos klub // belso anyag
              </p>
              <h1 className="stamp mt-3 text-xl font-semibold uppercase tracking-[0.08em] text-[#d6ded4] sm:text-2xl">
                SD0205 // SZEMELYES KLUBDOSSZIÉ
              </h1>
            </div>
            <p className="stamp-box whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-[#ff8d8d]">
              csak krisztiannak
            </p>
          </div>
        </header>

        <article className="border-b border-[#4c534d] p-5 sm:p-7">
          <h2 className="mb-4 border-b border-[#4c534d] pb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#95a292]">
            belso kivonat // szemelyes uzenet
          </h2>

          <div className="space-y-5 text-[15px] leading-7 text-[#d6ddd6] sm:text-base sm:leading-8">
            <p>
              Szevassz Krisztián!<br/>
              Nem tudom tudtad-e, de a könyvben mindenkinek az eredeti nevét használom. Bea, Vöri, Fefe,
              Kukac, Agresszív Laci, Cici és a többiek - ezek valós nevek, és valós
              személyek.
            </p>

            <p>
              Én vagyok egyedül inkognitóban. Nagy geciség, de egyrészt nem
              gondoltam ezt végig, másrészt így igazán szabadon írhatok, és te
              igazán szabadon képzelheted el ezt az egészet a saját fejedben.
              Mindkettőnknek a legnagyobb szabadság ez.
            </p>

            <p>
              Egyszer elég nagy szarba keveredtem emiatt. Stáziról írtam, a
              könyvemben is szerepel a sztori. Fasz tudja hogy keveredett a
              Redditre, de a lényeg, hogy betalált, és fenyegetőzni kezdett. Még él
              a poszt, keress rá: "Furcsa vásárlók 1. rész: Stázi"
            </p>

            <blockquote className="border-l-2 border-[#9fb8a5] bg-[#0e120f]/90 px-4 py-3 text-[14px] leading-6 text-[#b6c1b7] whitespace-pre-line sm:px-5 sm:py-4 sm:text-[15px] sm:leading-7">
              {quote}
            </blockquote>

            <p className="border-t border-[#4c534d] pt-5 text-[#dde5dd]">
              Köszi Krisztián, hogy itt vagy, és aktiváltad a túlélő módot. Része
              vagy a történetnek.
            </p>
          </div>
        </article>

        <div className="grid grid-cols-1 font-mono sm:grid-cols-2">
          <DataRow label="Titkos URL" value="sd0205" />
          <DataRow label="Címzett" value="Krisztián" />
          <DataRow label="Időbélyegző" value="2026.05.21. 16:41" />
          <DataRow label="Klubazonosító" value="MORRIS-77/13-B" />
          <DataRow label="Hozzáférési szint" value="BELSŐ // URL birtokos" />
          <DataRow label="Kurátori csatorna" value="Digitális Felügyelet / 4-es osztály" />
          <DataRow label="Hitelesítő lenyomat" value="SHA-256 // 8f73:2ad0:cc15" />
          <DataRow label="Vedelmi allapot" value="SÁRGA // passzív monitor" />
          <DataRow label="Anyag allapota" value="Zárolt, de olvasható" />
          <DataRow
            label="Forrás / Reddit #1"
            value="https://www.reddit.com/r/vallalhatatlan/comments/1jz4qk0/furcsa_v%C3%A1s%C3%A1rl%C3%B3k_1_r%C3%A9sz_st%C3%A1zi/"
            href="https://www.reddit.com/r/vallalhatatlan/comments/1jz4qk0/furcsa_v%C3%A1s%C3%A1rl%C3%B3k_1_r%C3%A9sz_st%C3%A1zi/"
          />
          <DataRow
            label="Forrás / Reddit #2"
            value="https://www.reddit.com/r/vallalhatatlan/comments/1jzvn8c/furcsa_v%C3%A1s%C3%A1rl%C3%B3k_2_r%C3%A9sz_st%C3%A1zit%C3%B3l_elk%C3%B6sz%C3%B6n%C3%BCnk/"
            href="https://www.reddit.com/r/vallalhatatlan/comments/1jzvn8c/furcsa_v%C3%A1s%C3%A1rl%C3%B3k_2_r%C3%A9sz_st%C3%A1zit%C3%B3l_elk%C3%B6sz%C3%B6n%C3%BCnk/"
          />
        </div>
      </section>

      <style>{`
        .noise {
          background-image: radial-gradient(rgba(255, 255, 255, 0.07) 0.5px, transparent 0.5px);
          background-size: 3px 3px;
          mix-blend-mode: screen;
          animation: noiseShift 10s linear infinite;
        }

        .stamp {
          text-shadow: 0 0 10px rgba(170, 218, 180, 0.2);
        }

        .stamp-box {
          border: 1px solid rgba(255, 141, 141, 0.65);
          padding: 0.4rem 0.6rem;
          transform: rotate(-4deg);
          box-shadow: inset 0 0 0 1px rgba(255, 141, 141, 0.2), 0 0 8px rgba(255, 141, 141, 0.2);
        }

        @keyframes noiseShift {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(2px, 1px);
          }
        }
      `}</style>
    </main>
  );
}

function DataRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="border-b border-[#4c534d] p-4 font-mono sm:p-5 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[#4c534d]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8b9689]">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block break-all text-sm text-[#b9d6c0] underline decoration-[#6f8f78] underline-offset-2 hover:text-[#d2e6d7] sm:text-[15px]"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 break-words text-sm text-[#d2d9d2] sm:text-[15px]">{value}</p>
      )}
    </div>
  );
}