"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

type OrderSource = "orders" | "shop_orders";
type OrderMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: "customer" | "admin";
  sender_email: string | null;
  body: string;
  created_at: string;
};

type Props = {
  orderId: string;
  source: OrderSource;
  token: string | null;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function OrderMessagesPanel({ orderId, source, token }: Props) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("A rendelési üzenetekhez jelentkezz be újra.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/order-threads/${encodeURIComponent(orderId)}/messages?source=${source}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 && payload?.error === "customer_account_unavailable") {
          throw new Error("Ehhez a rendeléshez még nincs összekapcsolt vásárlói fiók. Az admin oldalról kell rendezni a fiók-hozzárendelést.");
        }
        throw new Error(payload?.error || "Az üzenetek betöltése nem sikerült.");
      }
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Az üzenetek betöltése nem sikerült.");
    } finally {
      setLoading(false);
    }
  }, [orderId, source, token]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!token || !body || sending) return;

    setSending(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/order-threads/${encodeURIComponent(orderId)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source, body }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessages: Record<string, string> = {
          customer_account_unavailable: "Ehhez a rendeléshez még nincs összekapcsolt vásárlói fiók.",
          forbidden: "Ehhez a rendeléshez nincs hozzáférésed.",
          write_disabled: "Az üzenetküldés átmenetileg szünetel.",
        };
        throw new Error(errorMessages[payload?.error] || payload?.error || "Az üzenet küldése nem sikerült.");
      }

      if (payload.message) {
        setMessages((current) => [...current, payload.message as OrderMessage]);
      } else {
        await loadMessages();
      }
      setDraft("");
      setNotice("Üzenet elküldve.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Az üzenet küldése nem sikerült.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-5 rounded border border-zinc-800 bg-black/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-lime-200" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-200">
          Rendeléssel kapcsolatos üzenetek
        </h3>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-zinc-500">
        Az üzenetváltás ehhez a rendeléshez tartozik, és csak a vásárló, illetve a Vállalhatatlan adminisztrátora látja.
      </p>

      {error ? (
        <div role="alert" className="mb-3 rounded border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      {notice ? <p role="status" className="mb-3 text-xs text-lime-200/80">{notice}</p> : null}

      <div className="mb-4 max-h-72 space-y-3 overflow-y-auto pr-1">
        {loading ? <p className="text-xs text-zinc-600">Üzenetek betöltése…</p> : null}
        {!loading && messages.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-800 p-3 text-xs leading-relaxed text-zinc-600">
            Még nincs üzenet. Itt egyeztethettek az átvétel időpontjáról, a csomagpontról vagy a kézbesítés részleteiről.
          </p>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              "rounded border p-3 " +
              (message.sender_role === "admin"
                ? "border-lime-400/20 bg-lime-400/[0.035]"
                : "border-zinc-800 bg-zinc-950/70")
            }
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                {message.sender_role === "admin" ? "Vállalhatatlan / admin" : "Vásárló"}
              </span>
              <time className="text-[10px] text-zinc-600" dateTime={message.created_at}>
                {formatTimestamp(message.created_at)}
              </time>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">
              {message.body}
            </p>
          </article>
        ))}
      </div>

      <form onSubmit={sendMessage} className="space-y-2">
        <label htmlFor={`order-message-${orderId}`} className="sr-only">
          Üzenet a rendeléshez
        </label>
        <textarea
          id={`order-message-${orderId}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
          maxLength={2000}
          rows={3}
          placeholder="Írd ide az üzeneted…"
          disabled={!token || sending}
          className="w-full resize-y rounded-sm border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-lime-200/50 disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-zinc-700">{draft.length}/2000</span>
          <button
            type="submit"
            disabled={!token || !draft.trim() || sending}
            className="inline-flex items-center gap-2 rounded-sm border border-lime-200/40 bg-lime-100/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-100 transition hover:bg-lime-100/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {sending ? "KÜLDÉS…" : "ÜZENET KÜLDÉSE"}
          </button>
        </div>
      </form>
    </section>
  );
}
