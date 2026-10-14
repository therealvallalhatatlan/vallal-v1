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

const supabase = createClient();
const CLAIM_KEY = "vallal:book-registry:claim-token";
const TRANSFER_KEY = "vallal:book-registry:transfer-token";

async function responseMessage(response: Response) {
  const body = await response.json().catch(() => null);
  const errors: Record<string, string> = {
    authentication_required: "A folytatáshoz jelentkezz be.",
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

export default function BookRegistryPage() {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [claimToken, setClaimToken] = useState("");
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
    const claim = url.searchParams.get("claim");
    const transfer = new URLSearchParams(url.hash.replace(/^#/, "")).get("transfer");
    try {
      setClaimToken(claim || window.sessionStorage.getItem(CLAIM_KEY) || "");
      setTransferToken(transfer || window.sessionStorage.getItem(TRANSFER_KEY) || "");
      if (claim) window.sessionStorage.setItem(CLAIM_KEY, claim);
      if (transfer) window.sessionStorage.setItem(TRANSFER_KEY, transfer);
    } catch {}
    if (claim || transfer) {
      url.searchParams.delete("claim");
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

  async function toggleMap(copy: Copy) {
    if (!accessToken) { login(); return; }
    const draft = drafts[copy.publicId] || { lat: copy.locationLat, lng: copy.locationLng };
    const visible = !copy.mapVisible;
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
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">A közös QR-kód önmagában nem igazolja a tulajdonjogot. A regisztrációhoz személyes, egyszer használható jogosultsági kód kell.</p>
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
            <section className="mb-8 border border-zinc-800 p-5 sm:p-6">
              <h2 className="text-lg font-bold">Könyv regisztrálása</h2>
              <p className="mt-2 text-sm text-zinc-500">Írd be a személyre szóló jogosultsági kódot vagy nyisd meg a neked küldött regisztrációs linket.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={claimToken} onChange={(e) => setClaimToken(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Egyszer használható kód" className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-3 font-mono text-sm outline-none focus:border-lime-200/70" />
                <button disabled={!claimToken.trim() || busy !== ""} onClick={() => void claim()} className="rounded-md bg-lime-200 px-5 py-3 text-sm font-bold text-black disabled:opacity-40">{busy === "claim" ? "Regisztrálás…" : "Könyv regisztrálása"}</button>
              </div>
            </section>

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
                      <button disabled={busy !== "" || (!copy.mapVisible && (draft.lat === null || draft.lng === null))} onClick={() => void toggleMap(copy)} className="mt-3 rounded-md bg-lime-200 px-4 py-2 text-xs font-bold text-black disabled:opacity-40">{busy === "location:" + copy.publicId ? "Mentés…" : copy.mapVisible ? "Elrejtem a térképről" : "Megosztom a hozzávetőleges helyet"}</button>
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

        <p className="mt-10 border-t border-zinc-900 pt-5 text-xs leading-relaxed text-zinc-600">A sorszám kiadásonként egyedi és nem változtatható. Tulajdonosváltáskor a régi térképpont automatikusan törlődik. A QR-kód beolvasása nem ad automatikusan regisztrációs jogosultságot.</p>
      </div>
    </main>
  );
}
