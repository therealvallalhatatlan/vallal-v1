"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  fetchMerchInventory,
  fetchRecentOrders,
  generateStripePaymentLink,
  type MerchInventoryItem,
  type RecentOrder,
} from "../actions";

type ChatRole = "system" | "bot" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  orders?: RecentOrder[];
  inventory?: MerchInventoryItem[];
  checkout?: {
    url: string;
    productId: string;
    priceHuf: number;
  };
};

const QUICK_ACTIONS = [
  { key: "inventory", label: "View Inventory" },
  { key: "link", label: "Generate Custom Stripe Link" },
  { key: "orders", label: "Recent Orders" },
] as const;

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MerchChatSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "system",
      text: "Merch Admin Bot inicializalva. Válassz gyors műveletet, vagy írj parancsot.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [commandInput, setCommandInput] = useState("");
  const [productIdInput, setProductIdInput] = useState("merch-drop-001");
  const [customPriceInput, setCustomPriceInput] = useState("10000");
  const [pendingAction, setPendingAction] = useState<"inventory" | "link" | "orders" | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{ url: string; productId: string; priceHuf: number } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const canSubmitLink = useMemo(() => productIdInput.trim().length > 0, [productIdInput]);

  function pushMessage(next: Omit<ChatMessage, "id" | "createdAt">) {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), createdAt: new Date().toISOString(), ...next },
    ]);
  }

  async function handleViewInventory() {
    pushMessage({ role: "user", text: "View Inventory" });
    setPendingAction("inventory");
    const result = await fetchMerchInventory();

    if (!result.ok) {
      pushMessage({ role: "bot", text: `Inventory lekeres sikertelen: ${result.error}` });
      setPendingAction(null);
      return;
    }

    if (result.items.length === 0) {
      pushMessage({ role: "bot", text: "Nincs aktiv termek a Telegram merch katalogusban." });
      setPendingAction(null);
      return;
    }

    pushMessage({
      role: "bot",
      text: `Aktiv inventory betoltve (${result.items.length} tetel).`,
      inventory: result.items,
    });
    setPendingAction(null);
  }

  async function handleViewRecentOrders() {
    pushMessage({ role: "user", text: "View Recent Orders" });
    setPendingAction("orders");

    const result = await fetchRecentOrders();
    if (!result.ok) {
      pushMessage({ role: "bot", text: `Rendelések lekérése sikertelen: ${result.error}` });
      setPendingAction(null);
      return;
    }

    if (result.orders.length === 0) {
      pushMessage({ role: "bot", text: "Nincs még fizetett rendelés az orders táblában." });
      setPendingAction(null);
      return;
    }

    pushMessage({
      role: "bot",
      text: `Legutóbbi ${result.orders.length} fizetett rendelés betöltve.`,
      orders: result.orders,
    });
    setPendingAction(null);
  }

  async function handleCreateLinkFromForm(event?: FormEvent) {
    event?.preventDefault();
    if (!canSubmitLink) return;

    pushMessage({ role: "user", text: `Create Custom Stripe Link (${productIdInput.trim()})` });
    setPendingAction("link");

    const parsedPrice = Number(customPriceInput);
    const useCustomPrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined;

    const result = await generateStripePaymentLink(productIdInput.trim(), useCustomPrice);
    if (!result.ok) {
      pushMessage({ role: "bot", text: `Stripe link generálás sikertelen: ${result.error}` });
      setPendingAction(null);
      return;
    }

    const generated = {
      url: result.url,
      productId: result.productId,
      priceHuf: result.priceHuf,
    };

    setLastGenerated(generated);
    pushMessage({
      role: "bot",
      text: "Stripe checkout link elkészült.",
      checkout: generated,
    });
    setPendingAction(null);
  }

  async function copyGeneratedLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback("Link kimásolva.");
    } catch {
      setCopyFeedback("Másolás nem sikerült. Jelöld ki kézzel a linket.");
    }
  }

  async function handleCommandSubmit(event: FormEvent) {
    event.preventDefault();
    const command = commandInput.trim();
    if (!command) return;

    pushMessage({ role: "user", text: command });
    setCommandInput("");

    const normalized = command.toLowerCase();
    if (normalized.includes("inventory")) {
      await handleViewInventory();
      return;
    }
    if (normalized.includes("order")) {
      await handleViewRecentOrders();
      return;
    }
    if (normalized.includes("link") || normalized.includes("stripe")) {
      await handleCreateLinkFromForm();
      return;
    }

    pushMessage({
      role: "bot",
      text: "Ismeretlen parancs. Próbáld: inventory, orders, vagy link.",
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="min-h-[340px] rounded-xl border border-neutral-800 bg-black/60 p-3">
          <div className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
            <span>Merch Chat Workspace</span>
            <span>{pendingAction ? "Művelet fut..." : "Online"}</span>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-lg border p-3 text-sm ${
                  message.role === "user"
                    ? "border-lime-700 bg-lime-950/30 text-lime-100"
                    : message.role === "system"
                      ? "border-neutral-700 bg-neutral-900/70 text-neutral-300"
                      : "border-sky-900/60 bg-sky-950/30 text-sky-100"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] opacity-80">
                  <span>{message.role}</span>
                  <span>{timeLabel(message.createdAt)}</span>
                </div>
                <p>{message.text}</p>

                {message.checkout && (
                  <div className="mt-3 rounded-md border border-lime-700 bg-black/40 p-3 text-xs text-neutral-200">
                    <p>Termék: {message.checkout.productId}</p>
                    <p>Ár (HUF): {message.checkout.priceHuf.toLocaleString("hu-HU")}</p>
                    <a
                      href={message.checkout.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block break-all text-lime-300 underline"
                    >
                      {message.checkout.url}
                    </a>
                  </div>
                )}

                {message.orders && (
                  <div className="mt-3 space-y-2 text-xs text-neutral-200">
                    {message.orders.map((order) => (
                      <div key={order.id} className="rounded-md border border-neutral-700 bg-black/40 p-2">
                        <p className="font-medium text-lime-200">{order.product_id}</p>
                        <p>Email: {order.customer_email || "n/a"}</p>
                        <p>Összeg: {Number(order.amount).toLocaleString("hu-HU")} {order.currency.toUpperCase()}</p>
                        <p>Státusz: {order.status}</p>
                        <p>{new Date(order.created_at).toLocaleString("hu-HU")}</p>
                      </div>
                    ))}
                  </div>
                )}

                {message.inventory && (
                  <div className="mt-3 space-y-2 text-xs text-neutral-200">
                    {message.inventory.map((item) => (
                      <div key={item.product_id} className="rounded-md border border-neutral-700 bg-black/40 p-2">
                        <p className="font-medium text-lime-200">{item.display_name}</p>
                        <p>Product ID: {item.product_id}</p>
                        <p>Ar: {item.price_huf.toLocaleString("hu-HU")} HUF</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-neutral-800 bg-black/50 p-3">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-neutral-400">Quick Action Bar</p>
            <div className="grid gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => {
                    if (action.key === "inventory") {
                      void handleViewInventory();
                      return;
                    }
                    if (action.key === "link") {
                      void handleCreateLinkFromForm();
                      return;
                    }
                    void handleViewRecentOrders();
                  }}
                  disabled={pendingAction !== null || (action.key === "link" && !canSubmitLink)}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-800 bg-black/50 p-3">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-neutral-400">Stripe Link Generator</p>
            <form className="space-y-3" onSubmit={(event) => void handleCreateLinkFromForm(event)}>
              <label className="block text-xs text-neutral-300">
                Product ID
                <input
                  type="text"
                  value={productIdInput}
                  onChange={(event) => setProductIdInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-lime-400 focus:outline-none"
                  placeholder="pl: merch-drop-001"
                />
              </label>

              <label className="block text-xs text-neutral-300">
                Custom Price (HUF)
                <input
                  type="number"
                  min={1}
                  value={customPriceInput}
                  onChange={(event) => setCustomPriceInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-lime-400 focus:outline-none"
                  placeholder="10000"
                />
              </label>

              <button
                type="submit"
                disabled={pendingAction !== null || !canSubmitLink}
                className="w-full rounded-lg border border-lime-500 bg-lime-500 px-3 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400 disabled:opacity-60"
              >
                {pendingAction === "link" ? "Generálás..." : "Link generálása"}
              </button>
            </form>

            {lastGenerated && (
              <div className="mt-3 rounded-lg border border-lime-700 bg-lime-950/20 p-3 text-xs text-lime-100">
                <p className="font-medium">Legutóbbi link</p>
                <p className="mt-1">{lastGenerated.productId} • {lastGenerated.priceHuf.toLocaleString("hu-HU")} HUF</p>
                <a href={lastGenerated.url} target="_blank" rel="noreferrer" className="mt-2 block break-all underline">
                  {lastGenerated.url}
                </a>
                <button
                  type="button"
                  onClick={() => void copyGeneratedLink(lastGenerated.url)}
                  className="mt-2 rounded border border-lime-500 px-2 py-1 text-xs text-lime-200 transition hover:bg-lime-500/20"
                >
                  Copy Link
                </button>
                {copyFeedback ? <p className="mt-1 text-[11px] text-lime-300">{copyFeedback}</p> : null}
              </div>
            )}
          </section>
        </aside>
      </div>

      <form onSubmit={(event) => void handleCommandSubmit(event)} className="mt-4 flex gap-2">
        <input
          type="text"
          value={commandInput}
          onChange={(event) => setCommandInput(event.target.value)}
          placeholder="Írj parancsot: inventory, orders, link"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-lime-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pendingAction !== null || commandInput.trim().length === 0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
