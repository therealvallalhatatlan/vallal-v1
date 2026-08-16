export type PendingOrderStatus = "created" | "pending_verification" | "approved" | "rejected";

export type PendingOrder = {
  ref: string;
  createdAt: number;
  buyerChatId: number;
  buyerTelegramUserId: number;
  buyerUsername: string | null;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalAmountHuf: number;
  status: PendingOrderStatus;
};

const REVTAG = "@cukorkabolt";
const REVOLUT_BASE_URL = "https://revolut.me/vallalhatatlan";
const pendingOrderTtlMs = 24 * 60 * 60 * 1000;

const pendingOrders = new Map<string, PendingOrder>();

export function getRevolutRevtag(): string {
  return REVTAG;
}

export function cleanupExpiredPendingOrders(now = Date.now()) {
  for (const [ref, order] of pendingOrders.entries()) {
    if (now - order.createdAt > pendingOrderTtlMs) {
      pendingOrders.delete(ref);
    }
  }
}

export function generateReferenceCode(): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const numericPart = String(Math.floor(100000 + Math.random() * 900000));
    const ref = `REF-#${numericPart}`;
    if (!pendingOrders.has(ref)) {
      return ref;
    }
  }

  const fallback = `REF-#${String(Date.now()).slice(-6)}`;
  if (!pendingOrders.has(fallback)) return fallback;

  throw new Error("reference_generation_failed");
}

export function buildRevolutPaymentUrl(amountHuf: number, ref: string): string {
  const params = new URLSearchParams({
    amount: String(amountHuf),
    currency: "HUF",
    note: ref,
  });
  return `${REVOLUT_BASE_URL}?${params.toString()}`;
}

export function putPendingOrder(order: PendingOrder): void {
  pendingOrders.set(order.ref, order);
}

export function getPendingOrder(ref: string): PendingOrder | undefined {
  return pendingOrders.get(ref);
}

export function createPendingOrder(input: {
  buyerChatId: number;
  buyerTelegramUserId: number;
  buyerUsername: string | null;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalAmountHuf: number;
}): PendingOrder {
  cleanupExpiredPendingOrders();

  const ref = generateReferenceCode();
  const pending: PendingOrder = {
    ref,
    createdAt: Date.now(),
    buyerChatId: input.buyerChatId,
    buyerTelegramUserId: input.buyerTelegramUserId,
    buyerUsername: input.buyerUsername,
    productId: input.productId,
    productCode: input.productCode,
    productName: input.productName,
    quantity: input.quantity,
    totalAmountHuf: input.totalAmountHuf,
    status: "created",
  };

  putPendingOrder(pending);
  return pending;
}
