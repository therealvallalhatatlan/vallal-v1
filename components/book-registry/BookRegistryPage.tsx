"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/browser";
import { buildAuthHref, persistAuthReturnTarget } from "@/lib/authRedirect";
import BookRegistryLocationPicker from "@/components/book-registry/BookRegistryLocationPicker";

type Copy = {
  id: string; publicId: string; editionCode: string; editionTitle: string;
  serialLabel: string; serialNumber: number; printedCopyNumber: string | null;
  status: string; mapVisible: boolean; locationLat: number | null;
  locationLng: number | null; registeredAt: string | null;
};
type Draft = { lat: number | null; lng: number | null };
type EditionCode = "book_1" | "book_2";
type Suggestion = { editionCode: EditionCode; editionTitle: string; serialPrefix: string; serialNumber: number; serialLabel: string };

const supabase = createClient();
const CLAIM_KEY = "vallal:book-registry:claim-token";
const TRANSFER_KEY = "vallal:book-registry:transfer-token";

async function responseMessage(response: Response) {
  const body = await response.json().catch(() => null);
  const errors: Record<string, string> = {
    authentication_required: "A folytatáshoz jelentkezz be.",
    invalid_edition: "Válassz érvényes kötetet.",
    edition_unavailable: "Ez a kötet jelenleg nem regisztrálható.",
    suggested_identifier_unavailable: "Most nem sikerült lekérni a következő azonosítót.",
    registration_failed: "Nem sikerült regisztrálni a könyvpéldányt. Próbáld újra.",
    valid_claim_token_required: "A kód formátuma nem megfelelő.",
    claim_token_invalid_or_used: "Ez a kód érvénytelen, lejárt vagy már felhasználták.",
    claim_failed: "A regisztráció most nem sikerült.",
    copy_not_found_or_not_owner: "Ezt a példányt nem tudod kezelni ezzel a fiókkal.",
    transfer_expired: "Az átadási link lejárt.",
    transfer_invalid_or_used: "Az átadási link érvénytelen vagy már felhasználták.",
    transfer_accept_failed: "A tulajdonosváltás nem sikerült.",
    location_update_failed: "A térképpozíció mentése nem sikerült.",
  };
  return errors[typeof body?.error === "string" ? body.error : ""] || "A művelet nem sikerült. Próbáld újra.";
}

export default function BookRegistryPage({ defaultEdition = "book_1" }: { defaultEdition?: EditionCode }) {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [claimToken, setClaimToken] = useState("");
  const [selectedEdition, setSelectedEdition] = useState<EditionCode>(defaultEdition);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [refreshSuggestion, setRefreshSuggestion] = useState(0);
  const [transferToken, setTransferToken] = useState("");
  const [transferLink, setTransferLink] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const accessToken = session?.access_token as string | undefined;

  const loadCopies = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/book-registry/mine", {
        headers: { Authorization: "Bearer " + token }, cache: "no-store",
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = await response.json();
      const rows: Copy[] = Array.isArray(body.copies) ? body.copies : [];
      setCopies(rows);
      setDrafts((prev) => {
        const next = { ...prev };
        rows.forEach((copy) => {
          if (!(copy.publicId in next)) next[copy.publicId] = { lat: copy.locationLat, lng: copy.locationLng };
        });
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nem sikerült betölteni a példányokat.");
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const claim = fragment.get("claim") || url.searchParams.get("claim");
    const transfer = fragment.get("transfer") || url.searchParams.get("transfer");
    try {
      setClaimToken(claim || window.sessionStorage.getItem(CLAIM_KEY) || "");
      setTransferToken(transfer || window.sessionStorage.getItem(TRANSFER_KEY) || "");
      if (claim) window.sessionStorage.setItem(CLAIM_KEY, claim);
      if (transfer) window.sessionStorage.setItem(TRANSFER_KEY, transfer);
    } catch {}
    if (claim || transfer) {
      url.searchParams.delete("claim");
      url.searchParams.delete("transfer");
      url.hash = "";
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setSessionLoading(false);
      if (data.session?.access_token) void loadCopies(data.session.access_token);
    }).catch(() => { if (alive) setSessionLoading(false); });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.access_token) void loadCopies(next.access_token);
      else setCopies([]);
    });
    return () => { alive = false; authListener.subscription.unsubscribe(); };
  }, [loadCopies]);

  useEffect(() => {
    if (!accessToken) {
      setSuggestion(null);
      return;
    }

    let alive = true;
    setSuggestionLoading(true);
    fetch("/api/book-registry/register?edition=" + encodeURIComponent(selectedEdition), {
      headers: { Authorization: "Bearer " + accessToken },
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          const errors: Record<string, string> = {
            edition_unavailable: "Ez a kötet jelenleg nem regisztrálható.",
            suggested_identifier_unavailable: "Most nem sikerült lekérni a következő azonosítót.",
          };
          throw new Error(errors[typeof body?.error === "string" ? body.error : ""] || "Nem sikerült lekérni az azonosítót.");
        }
        if (alive) setSuggestion(body.suggestion as Suggestion);
      })
      .catch((e) => {
        if (!alive) return;
        setSuggestion(null);
        setError(e instanceof Error ? e.message : "Nem sikerült lekérni az azonosítót.");
      })
      .finally(() => { if (alive) setSuggestionLoading(false); });

    return () => { alive = false; };
  }, [accessToken, selectedEdition, refreshSuggestion]);

  function login() {
    try {
      if (claimToken) window.sessionStorage.setItem(CLAIM_KEY, claimToken);
      if (transferToken) window.sessionStorage.setItem(TRANSFER_KEY, transferToken);
    } catch {}
    persistAuthReturnTarget("/konyv-1-qr");
    window.location.assign(buildAuthHref("/konyv-1-qr"));
  }

  async function claim() {
    setError(""); setMessage("");
    if (!accessToken) { login(); return; }
    if (!claimToken.trim()) { setError("Add meg az egyszer használható regisztrációs kódot."); return; }
    setBusy("claim");
    try {
      const response = await fetch("/api/book-registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ token: claimToken.trim() }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = await response.json();
      setMessage("Sikeres regisztráció: " + body.copy.serial_prefix + "-" + String(body.copy.serial_number).padStart(3, "0") + ".");
      setClaimToken("");
      try { window.sessionStorage.removeItem(CLAIM_KEY); } catch {}
      await loadCopies(accessToken);
    } catch (e) { setError(e instanceof Error ? e.message : "A regisztráció nem sikerült."); }
    finally { setBusy(""); }
  }

  async function registerNewCopy() {
    setError("");
    setMessage("");
    if (!accessToken) { login(); return; }
    if (!suggestion) {
      setError("Várd meg, amíg megjelenik a következő szabad azonosító.");
      return;
    }

    setBusy("register");
    try {
      const response = await fetch("/api/book-registry/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ editionCode: selectedEdition }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = await response.json();
      const copy = body.copy;
      const label = typeof copy?.serial_label === "string"
        ? copy.serial_label
        : String(copy?.serial_prefix || "") + "-" + String(copy?.serial_number || "").padStart(3, "0");
      setMessage("Sikeres regisztráció: " + label + ". Ez a könyv nyilvántartási azonosítója, nem a kötetbe nyomtatott sorszám.");
      await loadCopies(accessToken);
      setRefreshSuggestion((value) => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "A regisztráció nem sikerült.");
    } finally {
      setBusy("");
    }
  }

  async function acceptTransfer() {
    setError(""); setMessage("");
    if (!accessToken) { login(); return; }
    setBusy("accept");
    try {
      const response = await fetch("/api/book-registry/transfer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ token: transferToken }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = await response.json();
      setMessage("Átvetted a példányt: " + body.copy.serial_prefix + "-" + String(body.copy.serial_number).padStart(3, "0") + ". A térképes megosztás kikapcsolt állapotban maradt.");
      setTransferToken("");
      try { window.sessionStorage.removeItem(TRANSFER_KEY); } catch {}
      await loadCopies(accessToken);
    } catch (e) { setError(e instanceof Error ? e.message : "Az átvétel nem sikerült."); }
    finally { setBusy(""); }
  }

  async function toggleMap(copy: Copy, visible: boolean) {
    if (!accessToken) { login(); return; }
    const draft = drafts[copy.publicId] || { lat: copy.locationLat, lng: copy.locationLng };
    if (visible && (draft.lat === null || draft.lng === null)) {
      setError("A megosztáshoz válassz egy hozzávetőleges helyet a térképen.");
      return;
    }
    setError(""); setMessage(""); setBusy("location:" + copy.publicId);
    try {
      const response = await fetch("/api/book-registry/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ publicId: copy.publicId, mapVisible: visible, lat: visible ? draft.lat : null, lng: visible ? draft.lng : null }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessage(visible ? "A hozzávetőleges hely megjelent a Hálózat térképén." : "A példány lekerült a térképről, a mentett hely törölve lett.");
      await loadCopies(accessToken);
    } catch (e) { setError(e instanceof Error ? e.message : "Nem sikerült menteni a térképbeállítást."); }
    finally { setBusy(""); }
  }

  async function transfer(copy: Copy) {
    if (!accessToken) { login(); return; }
    setError(""); setMessage(""); setTransferLink(""); setBusy("transfer:" + copy.publicId);
    try {
      const response = await fetch("/api/book-registry/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ publicId: copy.publicId }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = await response.json();
      setTransferLink(body.transferUrl);
      setMessage("Az egyszer használatos átadási link elkészült. Csak a leendő tulajdonosnak küldd el.");
    } catch (e) { setError(e instanceof Error ? e.message : "Nem sikerült átadási linket készíteni."); }
    finally { setBusy(""); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(transferLink); setMessage("A link a vágólapra került."); }
    catch { setError("A link másolása nem sikerült. Jelöld ki és másold ki kézzel."); }
  }

  return (
    <main className="min-h-[100svh] bg-black text-zinc-100">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-lime-200/70">Vállalhatatlan / nyilvántartás</p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">A könyved nyoma.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">Regisztráld a példányodat, őrizd meg az azonosítóját, és te döntöd el, megjelenhet-e a hozzávetőleges helye a Hálózat térképén.</p>
          </div>
          <Link href="/halozat" className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-lime-200/50">Hálózat ↗</Link>
        </header>

        {message ? <div role="status" className="mb-5 border border-lime-200/25 bg-lime-200/5 p-4 text-sm text-lime-100">{message}</div> : null}
        {error ? <div role="alert" className="mb-5 border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</div> : null}

        {sessionLoading ? <div className="border border-zinc-800 p-5 text-sm text-zinc-400">Munkamenet ellenőrzése…</div> : null}
        {!sessionLoading && !accessToken ? (
          <section className="mb-7 border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-xl font-bold">A regisztráció a fiókodhoz kapcsolódik</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">A regisztráció a fiókodhoz kapcsolódik. Belépés után a rendszer automatikusan felajánlja a következő szabad nyilvántartási azonosítót. Külön kódra csak akkor van szükség, ha egy előre kijelölt sorszámú példányhoz személyes regisztrációs linket kaptál.</p>
            <button onClick={login} className="mt-5 rounded-md bg-lime-200 px-5 py-3 text-sm font-bold text-black">Belépek / regisztrálok</button>
          </section>
        ) : null}

        {transferToken ? (
          <section className="mb-6 border border-fuchsia-200/30 bg-fuchsia-200/5 p-5">
            <h2 className="text-lg font-bold text-fuchsia-100">Könyv átvétele</h2>
            <p className="mt-2 text-sm text-zinc-400">Az elfogadás után a korábbi tulajdonos elveszíti a kezelés jogát, a térképes megosztás pedig kikapcsol.</p>
            <button disabled={!accessToken || busy !== ""} onClick={() => void acceptTransfer()} className="mt-4 rounded-md bg-fuchsia-200 px-4 py-3 text-sm font-bold text-black disabled:opacity-40">{busy === "accept" ? "Átvétel…" : "Átveszem a könyvet"}</button>
          </section>
        ) : null}

        {accessToken ? (
          <>
            {claimToken && !transferToken ? (
              <section className="mb-8 border border-lime-200/30 bg-lime-200/[0.03] p-5 sm:p-6">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime-200/70">Személyes regisztrációs link</p>
                <h2 className="mt-2 text-lg font-bold">A neked félretett példány regisztrálása</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">Ezt a linket egy előre kijelölt könyvpéldányhoz kaptad. A regisztráció a fiókodhoz kapcsolja a példányt, és a kód csak egyszer használható.</p>
                <button disabled={busy !== ""} onClick={() => void claim()} className="mt-4 rounded-md bg-lime-200 px-5 py-3 text-sm font-bold text-black disabled:opacity-40">{busy === "claim" ? "Regisztrálás…" : "A példány regisztrálása"}</button>
              </section>
            ) : null}

            {!claimToken && !transferToken ? (
              <section className="mb-8 border border-zinc-800 p-5 sm:p-6">
                <h2 className="text-lg font-bold">Regisztráld a könyved</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">Nem kell jogosultsági kódot keresned. Válaszd ki a kötetet, a rendszer pedig megmutatja a következő szabad nyilvántartási azonosítót.</p>

                <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="Kötet kiválasztása">
                  <button type="button" aria-pressed={selectedEdition === "book_1"} onClick={() => setSelectedEdition("book_1")} className={"rounded-md border p-3 text-left transition " + (selectedEdition === "book_1" ? "border-lime-200 bg-lime-200/10 text-lime-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>
                    <span className="block text-xs uppercase tracking-wider opacity-70">I. kötet</span>
                    <span className="mt-1 block text-sm font-bold">Vállalhatatlan I.</span>
                  </button>
                  <button type="button" aria-pressed={selectedEdition === "book_2"} onClick={() => setSelectedEdition("book_2")} className={"rounded-md border p-3 text-left transition " + (selectedEdition === "book_2" ? "border-lime-200 bg-lime-200/10 text-lime-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>
                    <span className="block text-xs uppercase tracking-wider opacity-70">II. kötet</span>
                    <span className="mt-1 block text-sm font-bold">Vállalhatatlan II.</span>
                  </button>
                </div>

                <div className="mt-4 border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Következő szabad azonosító</p>
                  {suggestionLoading ? (
                    <p className="mt-2 text-sm text-zinc-400">Azonosító lekérése…</p>
                  ) : suggestion ? (
                    <>
                      <p className="mt-1 font-mono text-3xl font-black text-lime-100">{suggestion.serialLabel}</p>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">Ez a nyilvántartásban használt azonosító, nem a könyvbe nyomtatott sorszám. A végleges sorszámot a regisztráció pillanatában rögzítjük.</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-400">Az azonosító most nem érhető el. Próbáld meg frissíteni az oldalt.</p>
                  )}
                </div>

                <p className="mt-4 text-xs leading-relaxed text-zinc-500">Csak olyan kötetet regisztrálj, amely ténylegesen a birtokodban van. A régi kiadások előre fenntartott sorszámait a rendszer nem osztja ki újra.</p>
                <button disabled={!suggestion || suggestionLoading || busy !== ""} onClick={() => void registerNewCopy()} className="mt-4 w-full rounded-md bg-lime-200 px-5 py-3 text-sm font-bold text-black disabled:opacity-40">{busy === "register" ? "Regisztrálás…" : "Ezzel az azonosítóval regisztrálom a könyvet"}</button>

                <details className="mt-5 border-t border-zinc-800 pt-4">
                  <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200">Személyes regisztrációs linket kaptam</summary>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">Ha a könyv vásárlásakor vagy korábbi példányhoz külön linket küldtünk, nyisd meg azt a linket. A link tartalmazza a regisztrációhoz szükséges jogosultságot, így nem kell külön kódot bemásolnod.</p>
                </details>
              </section>
            ) : null}

            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">A példányaim <span className="font-mono text-lime-200">({copies.length})</span></h2>
              <button disabled={busy !== ""} onClick={() => void loadCopies(accessToken)} className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50">Lista frissítése ↻</button>
            </div>
            {copies.length === 0 ? <div className="mb-8 border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">Még nincs regisztrált példány ehhez a fiókhoz.</div> : null}

            <div className="grid gap-5">
              {copies.map((copy) => {
                const draft = drafts[copy.publicId] || { lat: copy.locationLat, lng: copy.locationLng };
                return (
                  <article key={copy.publicId} className="border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{copy.editionTitle}</p>
                        <h3 className="mt-1 font-mono text-3xl font-black text-lime-100">{copy.serialLabel}</h3>
                        {copy.printedCopyNumber ? <p className="mt-1 text-xs text-zinc-500">Nyomtatott jelölés: {copy.printedCopyNumber}</p> : null}
                        <p className="mt-2 text-xs text-zinc-500">{copy.mapVisible ? "A hozzávetőleges hely látható a térképen." : "A hely nem látható a térképen."}</p>
                      </div>
                      <button disabled={busy !== ""} onClick={() => void transfer(copy)} className="rounded-md border border-fuchsia-200/40 px-3 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-200/10 disabled:opacity-40">{busy === "transfer:" + copy.publicId ? "Link készítése…" : "Tulajdonosváltás"}</button>
                    </div>
                    <div className="mt-5 border-t border-zinc-800 pt-5">
                      <h4 className="text-sm font-bold">Térképes megjelenítés</h4>
                      <p className="mb-3 mt-1 text-xs leading-relaxed text-zinc-500">A megosztás önkéntes. Csak hozzávetőleges helyet tárolunk, pontos koordinátát nem.</p>
                      <BookRegistryLocationPicker initialLat={draft.lat} initialLng={draft.lng} onChange={(lat, lng) => setDrafts((prev) => ({ ...prev, [copy.publicId]: { lat, lng } }))} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button disabled={busy !== "" || draft.lat === null || draft.lng === null} onClick={() => void toggleMap(copy, true)} className="rounded-md bg-lime-200 px-4 py-2 text-xs font-bold text-black disabled:opacity-40">{busy === "location:" + copy.publicId ? "Mentés…" : copy.mapVisible ? "Térképpont mentése" : "Megosztom a hozzávetőleges helyet"}</button>
                        {copy.mapVisible ? <button disabled={busy !== ""} onClick={() => void toggleMap(copy, false)} className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-40">Elrejtem a térképről</button> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {transferLink ? (
          <section className="mt-7 border border-fuchsia-200/30 bg-fuchsia-200/5 p-5">
            <h2 className="font-bold text-fuchsia-100">Egyszer használatos átadási link</h2>
            <p className="mt-2 break-all font-mono text-xs leading-relaxed text-zinc-300">{transferLink}</p>
            <p className="mt-2 text-xs text-zinc-500">A link hét nap múlva lejár vagy egyszeri használat után érvényét veszti.</p>
            <button onClick={() => void copyLink()} className="mt-3 rounded-md border border-fuchsia-100/40 px-4 py-2 text-xs font-bold text-fuchsia-100">Link másolása</button>
          </section>
        ) : null}

        <p className="mt-10 border-t border-zinc-900 pt-5 text-xs leading-relaxed text-zinc-600">A nyilvántartási azonosító kiadásonként egyedi és nem változtatható. Nem azonos a könyvbe esetleg nyomtatott példányszámmal. Tulajdonosváltáskor a régi térképpont automatikusan törlődik. A térképes megjelenítés alapértelmezetten ki van kapcsolva.</p>
      </div>
    </main>
  );
}
