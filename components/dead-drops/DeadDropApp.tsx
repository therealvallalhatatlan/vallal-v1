"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/browser";
import type { DeadDropRecord } from "@/lib/deadDrops";
import { normalizeDeadDropRow } from "@/lib/deadDrops";
import { getOrCreateDeadDropAlias, regenerateDeadDropAlias } from "@/lib/deadDropIdentity";

type DeadDropAppProps = {
  initialActiveDrops: DeadDropRecord[];
  initialClaimedDrops: DeadDropRecord[];
};

type ConnectionState = "syncing" | "live" | "degraded";
type TabKey = "feed" | "submit";

function sortActive(drops: DeadDropRecord[]) {
  return [...drops].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function sortClaimed(drops: DeadDropRecord[]) {
  return [...drops].sort((left, right) => (right.claimed_at || "").localeCompare(left.claimed_at || ""));
}

function upsertDrop(list: DeadDropRecord[], nextDrop: DeadDropRecord) {
  const remaining = list.filter((item) => item.id !== nextDrop.id);
  return [...remaining, nextDrop];
}

export default function DeadDropApp({ initialActiveDrops, initialClaimedDrops }: DeadDropAppProps) {
  const [tab, setTab] = useState<TabKey>("feed");
  const [activeDrops, setActiveDrops] = useState(() => sortActive(initialActiveDrops));
  const [claimedDrops, setClaimedDrops] = useState(() => sortClaimed(initialClaimedDrops));
  const [selectedDropId, setSelectedDropId] = useState(initialActiveDrops[0]?.id ?? "");
  const [alias, setAlias] = useState("OPERATOR_73");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState("IDLE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("syncing");

  const selectedDrop = useMemo(
    () => activeDrops.find((item) => item.id === selectedDropId) || activeDrops[0] || null,
    [activeDrops, selectedDropId]
  );

  const normalizedAlias = alias.trim();
  const canSubmit = Boolean(selectedDrop) && Boolean(file) && normalizedAlias.length >= 3 && !isSubmitting;

  const submitHint = !selectedDrop
    ? "NO ACTIVE DROP AVAILABLE"
    : normalizedAlias.length < 3
      ? "ALIAS TOO SHORT"
      : !file
        ? "ATTACH PROOF IMAGE"
        : isSubmitting
          ? "UPLINK ACTIVE"
          : "READY TO TRANSMIT";

  useEffect(() => {
    setAlias(getOrCreateDeadDropAlias());
  }, []);

  useEffect(() => {
    if (!selectedDrop && activeDrops[0]) {
      setSelectedDropId(activeDrops[0].id);
    }
  }, [activeDrops, selectedDrop]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  useEffect(() => {
    const supabase = createClient() as any;
    if (typeof supabase?.channel !== "function") {
      setConnectionState("degraded");
      return;
    }

    const channel = supabase
      .channel("dead-drops-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drops" },
        (payload: { new?: Record<string, unknown> }) => {
          if (!payload.new) return;

          const nextDrop = normalizeDeadDropRow(payload.new);

          if (nextDrop.status === "claimed") {
            setActiveDrops((current) => current.filter((item) => item.id !== nextDrop.id));
            setClaimedDrops((current) => sortClaimed(upsertDrop(current, nextDrop)).slice(0, 24));
            return;
          }

          setClaimedDrops((current) => current.filter((item) => item.id !== nextDrop.id));
          setActiveDrops((current) => sortActive(upsertDrop(current, nextDrop)));
        }
      )
      .subscribe((status: string) => {
        setConnectionState(status === "SUBSCRIBED" ? "live" : "syncing");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDrop) {
      setSubmitState("NO_ACTIVE_DROP");
      return;
    }

    if (normalizedAlias.length < 3) {
      setSubmitState("ALIAS_TOO_SHORT");
      return;
    }

    if (!file) {
      setSubmitState("MISSING_FILE");
      return;
    }

    setIsSubmitting(true);
    setSubmitState("UPLINK...");

    const formData = new FormData();
    formData.set("dropId", selectedDrop.id);
    formData.set("alias", normalizedAlias);
    formData.set("note", note);
    formData.set("file", file);
    formData.set("company", "");

    try {
      const response = await fetch("/api/public/dead-drops/claim", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        drop?: DeadDropRecord;
      };

      if (!response.ok || !payload.ok || !payload.drop) {
        setSubmitState((payload.error || "CLAIM_FAILED").toUpperCase());
        return;
      }

      setActiveDrops((current) => current.filter((item) => item.id !== payload.drop?.id));
      setClaimedDrops((current) => sortClaimed(upsertDrop(current, payload.drop as DeadDropRecord)).slice(0, 24));
      setFile(null);
      setNote("");
      setTab("feed");
      setSubmitState("DROP CLAIMED");
    } catch (error) {
      console.error("[dead-drops] submit failed", error);
      setSubmitState("NETWORK_FAIL");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] text-[#d8ffe1]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-[#16312b] bg-[linear-gradient(180deg,rgba(5,8,22,0.98),rgba(3,5,16,1))] font-mono">
        <header className="border-b border-[#16312b] px-4 pb-4 pt-5">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-[#7aa388]">
            <span>Dead Drop Feed</span>
            <span className={connectionState === "live" ? "text-[#99ff66]" : connectionState === "degraded" ? "text-[#ff7b72]" : "text-[#ffd166]"}>
              {connectionState}
            </span>
          </div>
          <h1 className="text-2xl uppercase tracking-[0.2em] text-[#f3fff8]">Intel Channel</h1>
          <p className="mt-2 text-sm leading-6 text-[#91b59d]">
            Elo feed aktiv es claimelt varosi dropokkal. Mobilra optimalizalt, nyers terminal nezet.
          </p>
          <div className="mt-4 flex items-center justify-between border border-[#16312b] bg-[#09101f] px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#99ff66]">
            <span>{alias}</span>
            <button
              type="button"
              onClick={() => setAlias(regenerateDeadDropAlias())}
              className="text-[#9ad6ff] transition-colors hover:text-[#d8ffe1]"
            >
              Regen
            </button>
          </div>
        </header>

        <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-[#16312b] bg-[#070c18] text-xs uppercase tracking-[0.25em]">
          <button
            type="button"
            onClick={() => setTab("feed")}
            className={`min-h-12 border-r border-[#16312b] px-3 py-3 ${tab === "feed" ? "bg-[#112117] text-[#99ff66]" : "text-[#6f9079]"}`}
          >
            [ Intel / Feed ]
          </button>
          <button
            type="button"
            onClick={() => setTab("submit")}
            className={`min-h-12 px-3 py-3 ${tab === "submit" ? "bg-[#112117] text-[#99ff66]" : "text-[#6f9079]"}`}
          >
            [ Claim / Submit ]
          </button>
        </div>

        {tab === "feed" ? (
          <section className="flex-1 space-y-4 px-4 py-4">
            <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.2em]">
              <div className="border border-[#16312b] bg-[#09101f] px-3 py-3">
                <div className="text-[#6f9079]">Active</div>
                <div className="mt-2 text-2xl text-[#99ff66]">{activeDrops.length}</div>
              </div>
              <div className="border border-[#16312b] bg-[#09101f] px-3 py-3">
                <div className="text-[#6f9079]">Claimed</div>
                <div className="mt-2 text-2xl text-[#9ad6ff]">{claimedDrops.length}</div>
              </div>
            </div>

            <div>
              <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">Active Drops</div>
              <div className="space-y-3">
                {activeDrops.length ? activeDrops.map((drop) => (
                  <article key={drop.id} className="border border-[#16312b] bg-[#09101f] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm uppercase tracking-[0.18em] text-[#f3fff8]">{drop.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-[#91b59d]">{drop.location_hint}</p>
                      </div>
                      <span className="border border-[#1d4d2d] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#99ff66]">
                        active
                      </span>
                    </div>
                    {drop.coordinates ? (
                      <p className="mt-3 text-xs text-[#7aa388]">
                        {drop.coordinates.lat.toFixed(4)}, {drop.coordinates.lng.toFixed(4)}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDropId(drop.id);
                        setTab("submit");
                      }}
                      className="mt-4 min-h-11 w-full border border-[#1d4d2d] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[#99ff66] transition-colors hover:bg-[#112117]"
                    >
                      Claim This Drop
                    </button>
                  </article>
                )) : (
                  <div className="border border-dashed border-[#16312b] bg-[#09101f] px-3 py-5 text-sm text-[#7aa388]">
                    Nincs aktiv drop a feedben.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">Recently Claimed</div>
              <div className="space-y-3">
                {claimedDrops.length ? claimedDrops.map((drop) => (
                  <article key={drop.id} className="border border-[#16312b] bg-[#09101f] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm uppercase tracking-[0.18em] text-[#f3fff8]">{drop.title}</h2>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#9ad6ff]">
                          claimed by {drop.anonymous_finder_alias || "UNKNOWN"}
                        </p>
                        {drop.proof_note ? <p className="mt-2 text-sm leading-6 text-[#91b59d]">{drop.proof_note}</p> : null}
                      </div>
                      <span className="border border-[#214363] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#9ad6ff]">
                        claimed
                      </span>
                    </div>
                    {drop.proof_image_url ? (
                      <img
                        src={drop.proof_image_url}
                        alt={drop.title}
                        className="mt-3 h-40 w-full border border-[#16312b] object-cover"
                      />
                    ) : null}
                  </article>
                )) : (
                  <div className="border border-dashed border-[#16312b] bg-[#09101f] px-3 py-5 text-sm text-[#7aa388]">
                    Meg nincs claimelt drop a nyilvanos archivumban.
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="flex-1 px-4 py-4">
            <form onSubmit={handleSubmit} className="space-y-4 border border-[#16312b] bg-[#09101f] p-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">Selected Drop</div>
                <div className="mt-2 border border-[#16312b] bg-[#050816] px-3 py-3 text-sm text-[#d8ffe1]">
                  {selectedDrop ? (
                    <>
                      <div className="uppercase tracking-[0.18em] text-[#f3fff8]">{selectedDrop.title}</div>
                      <div className="mt-2 text-[#91b59d]">{selectedDrop.location_hint}</div>
                    </>
                  ) : (
                    <div className="text-[#7aa388]">Nincs aktiv, claimelheto drop.</div>
                  )}
                </div>
              </div>

              {activeDrops.length > 1 ? (
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">Active Drop Selector</span>
                  <select
                    value={selectedDrop?.id || ""}
                    onChange={(event) => setSelectedDropId(event.target.value)}
                    className="mt-2 min-h-11 w-full border border-[#16312b] bg-[#050816] px-3 py-2 text-sm text-[#d8ffe1] outline-none focus:border-[#99ff66]"
                  >
                    {activeDrops.map((drop) => (
                      <option key={drop.id} value={drop.id}>
                        {drop.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">Alias</span>
                <input
                  value={alias}
                  onChange={(event) => setAlias(event.target.value.toUpperCase())}
                  maxLength={40}
                  className="mt-2 min-h-11 w-full border border-[#16312b] bg-[#050816] px-3 py-2 text-sm text-[#d8ffe1] outline-none placeholder:text-[#5e7b68] focus:border-[#99ff66]"
                />
              </label>

              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">Proof Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  capture="environment"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="mt-2 block min-h-11 w-full text-sm text-[#91b59d] file:mr-3 file:border file:border-[#1d4d2d] file:bg-[#112117] file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.24em] file:text-[#99ff66]"
                />
              </label>

              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-48 w-full border border-[#16312b] object-cover" />
              ) : null}

              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">Optional Note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 500))}
                  rows={4}
                  className="mt-2 w-full border border-[#16312b] bg-[#050816] px-3 py-2 text-sm text-[#d8ffe1] outline-none placeholder:text-[#5e7b68] focus:border-[#99ff66]"
                  placeholder="Rovid nyom, allapot, helyszini komment."
                />
                <div className="mt-1 text-right text-[11px] text-[#6f9079]">{500 - note.length}</div>
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="min-h-11 w-full border border-[#1d4d2d] bg-[#112117] px-3 py-3 text-xs uppercase tracking-[0.24em] text-[#99ff66] transition-colors hover:bg-[#173120] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "UPLINK ACTIVE" : "Transmit Proof Of Find"}
              </button>

              <div className="text-[11px] uppercase tracking-[0.24em] text-[#7aa388]">
                {submitHint}
              </div>

              <div className="border border-[#16312b] bg-[#050816] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[#9ad6ff]">
                {submitState}
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}