"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotificationComposer() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setError(true);
      setStatus("A cím és az üzenet kötelező.");
      return;
    }

    const confirmed = window.confirm(
      "Ez az üzenet minden jelenlegi usernek el lesz küldve. Biztosan küldöd?",
    );

    if (!confirmed) return;

    setSending(true);
    setError(false);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          message: trimmedMessage,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            recipientCount?: number;
            error?: string;
            retryAfterSeconds?: number;
          }
        | null;

      if (!response.ok || !data?.ok) {
        if (response.status === 429 && data?.retryAfterSeconds) {
          throw new Error(
            "Túl sok küldés. Próbáld újra " +
              data.retryAfterSeconds +
              " másodperc múlva.",
          );
        }

        throw new Error("Az üzenetet nem sikerült elküldeni.");
      }

      const recipientCount =
        typeof data.recipientCount === "number" ? data.recipientCount : 0;

      setTitle("");
      setMessage("");
      setStatus(
        "Elküldve. " + recipientCount + " user kapott új rendszerüzenetet.",
      );

      router.refresh();
    } catch (sendError) {
      console.error("[notification-composer] send failed", sendError);
      setError(true);
      setStatus(
        sendError instanceof Error
          ? sendError.message
          : "Az üzenetet nem sikerült elküldeni.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-lime-400/20 bg-lime-400/[0.025] p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-300/70">
            Új broadcast
          </p>
          <h2 className="mt-1 text-xl font-light text-neutral-100">
            Küldés mindenkinek
          </h2>
        </div>

        <span className="rounded-full border border-lime-400/20 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-lime-300/60">
          SYSTEM
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-neutral-600">
            Cím
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            disabled={sending}
            placeholder="pl. Új rendszerüzenet"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-neutral-100 outline-none placeholder:text-neutral-800 focus:border-lime-400/30 disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-neutral-600">
            Üzenet
          </span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={5000}
            rows={7}
            disabled={sending}
            placeholder="Írd ide a rendszerüzenetet..."
            className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 text-neutral-100 outline-none placeholder:text-neutral-800 focus:border-lime-400/30 disabled:opacity-50"
          />
          <div className="mt-2 text-right text-[10px] text-neutral-800">
            {message.length}/5000
          </div>
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={
            error
              ? "text-xs text-red-400"
              : "text-xs text-neutral-600"
          }
        >
          {status ??
            "Az elküldött üzenet minden meglévő usernek olvasatlanul jelenik meg."}
        </p>

        <button
          type="submit"
          disabled={sending || !title.trim() || !message.trim()}
          className="rounded-lg border border-lime-400/40 bg-lime-400/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime-200 transition hover:border-lime-300 hover:bg-lime-400/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
        >
          {sending ? "Küldés…" : "Küldés mindenkinek →"}
        </button>
      </div>
    </form>
  );
}
