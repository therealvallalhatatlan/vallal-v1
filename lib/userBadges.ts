import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type BadgeCode =
  | "first_book"
  | "second_book"
  | "mecenas"
  | "founder"
  | "merch";

export type UserBadge = {
  code: BadgeCode;
  name: string;
  description: string;
  earnedAt: string | null;
};

export const BADGE_DEFINITIONS: Record<
  BadgeCode,
  Pick<UserBadge, "name" | "description">
> = {
  first_book: {
    name: "ELSŐ KÖNYV",
    description: "Az első könyv tulajdonosa.",
  },
  second_book: {
    name: "MÁSODIK KÖNYV",
    description: "A második könyv tulajdonosa.",
  },
  mecenas: {
    name: "MECÉNÁS",
    description: "Közvetlen támogatást fizetett.",
  },
  founder: {
    name: "ALAPÍTÓ",
    description: "Leg Belső Kör Alapítói Részvétel.",
  },
  merch: {
    name: "MERCH",
    description: "Vállalhatatlan merch tulajdonosa.",
  },
};

function toHufCents(raw: unknown): number {
  const value = Number(raw ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function isEarnedBookOrder(status: string) {
  return ["paid", "ready_to_dispatch", "dispatched", "fulfilled"].includes(status);
}

function isCancelled(status: string) {
  return status === "cancelled" || status === "canceled";
}

function isSecondBook(productId: string | null, text: string) {
  const haystack = [productId ?? "", text].join(" ").toLowerCase();
  return (
    haystack.includes("book-2") ||
    haystack.includes("book_2") ||
    haystack.includes("book_ii") ||
    haystack.includes("book ii") ||
    haystack.includes("könyv ii") ||
    haystack.includes("könyv 2") ||
    haystack.includes("második könyv")
  );
}

function isMerchType(type: string | null) {
  return ["pin", "men-shirt", "women-shirt", "bag", "wallet"].includes(
    String(type ?? "").toLowerCase(),
  );
}

async function computeEarnedBadgeCodes(userId: string, email: string | null) {
  const db = supabaseAdmin();

  const [ordersRes, shopOrdersRes, copiesRes] = await Promise.all([
    db
      .from("orders")
      .select("id, status, amount, product_id, metadata")
      .eq("user_id", userId)
      .limit(500),
    db
      .from("shop_orders")
      .select("id, status, subtotal_amount, metadata")
      .eq("user_id", userId)
      .limit(500),
    db
      .from("book_copies")
      .select("copy_number, status, order_email")
      .eq("status", "sold")
      .eq("order_email", email ?? "")
      .limit(100),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (shopOrdersRes.error) throw shopOrdersRes.error;
  if (copiesRes.error) throw copiesRes.error;

  const shopOrderIds = (shopOrdersRes.data ?? []).map((row) => row.id);
  const shopItemsRes =
    shopOrderIds.length > 0
      ? await db
          .from("shop_order_items")
          .select("order_id, product_id, product_type, product_name, quantity")
          .in("order_id", shopOrderIds)
          .limit(1000)
      : { data: [], error: null };

  if (shopItemsRes.error) throw shopItemsRes.error;

  const earned = new Set<BadgeCode>();

  const bookOrders = ordersRes.data ?? [];
  const shopOrders = shopOrdersRes.data ?? [];
  const copies = copiesRes.data ?? [];
  const shopItems = shopItemsRes.data ?? [];

  const paidBookOrders = bookOrders.filter(
    (order) => isEarnedBookOrder(order.status) && !isCancelled(order.status),
  );
  const paidShopOrders = shopOrders.filter(
    (order) => order.status === "paid",
  );
  const paidShopOrderIds = new Set(paidShopOrders.map((order) => order.id));
  const paidShopItems = shopItems.filter((item) =>
    paidShopOrderIds.has(item.order_id),
  );

  const firstBookFromNumberedCopy = copies.length > 0;
  const firstBookFromHistoricalOrder = paidBookOrders.some((order) => {
    const metadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};
    return (
      String(metadata.historical_product_type ?? "").toLowerCase() === "book" &&
      String(metadata.historical_edition ?? "").toLowerCase() === "book_1"
    );
  });

  if (firstBookFromNumberedCopy || firstBookFromHistoricalOrder) {
    earned.add("first_book");
  }

  for (const order of paidBookOrders) {
    const metadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};
    const productId = order.product_id ?? null;
    const text = [
      String(metadata.product_name ?? ""),
      String(metadata.package_label ?? ""),
      String(metadata.product_alias ?? ""),
      String(metadata.cart_summary ?? ""),
    ].join(" ");

    if (isSecondBook(productId, text)) {
      earned.add("second_book");
    }

    if (
      productId === "mecenas" ||
      String(metadata.type ?? "").toLowerCase() === "mecenas"
    ) {
      earned.add("mecenas");
    }
  }

  for (const item of paidShopItems) {
    if (isSecondBook(item.product_id, item.product_name)) {
      earned.add("second_book");
    }

    if (isMerchType(item.product_type)) {
      earned.add("merch");
    }
  }

  return earned;
}

export async function getUserBadges(
  userId: string,
  email: string | null,
): Promise<UserBadge[]> {
  let earnedCodes: Set<BadgeCode>;

  try {
    earnedCodes = await computeEarnedBadgeCodes(userId, email);
  } catch (error) {
    console.error("[userBadges] failed to compute badges", error);
    return [];
  }

  const orderedCodes: BadgeCode[] = [
    "first_book",
    "second_book",
    "mecenas",
    "founder",
    "merch",
  ];

  const computedEarned = new Set(
    orderedCodes.filter((code) => earnedCodes.has(code)),
  );

  const db = supabaseAdmin();

  // Historical and business-rule exceptions are granted explicitly with an audit trail.
  // The Leg Belső Kör founder rule is synchronized from public.orders by a DB trigger.
  const { data: overrideRows, error: overrideError } = await db
    .from("user_badge_overrides")
    .select("badge_id")
    .eq("user_id", userId);

  if (!overrideError && overrideRows?.length) {
    const overrideBadgeIds = overrideRows.map((row) => row.badge_id).filter(Boolean);
    if (overrideBadgeIds.length > 0) {
      const { data: overrideBadges } = await db
        .from("badges")
        .select("code")
        .in("id", overrideBadgeIds);

      for (const row of overrideBadges ?? []) {
        if (row.code) computedEarned.add(row.code as BadgeCode);
      }
    }
  }

  const earned = orderedCodes.filter((code) => computedEarned.has(code));
  if (earned.length === 0) return [];

  const { data: badgeRows, error: badgeError } = await db
    .from("badges")
    .select("id, code, name, description")
    .in("code", earned);

  if (badgeError || !badgeRows?.length) {
    return earned.map((code) => ({
      code,
      ...BADGE_DEFINITIONS[code],
      earnedAt: null,
    }));
  }

  const { data: userBadgeRows, error: userBadgeError } = await db
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", userId);

  if (userBadgeError) {
    return earned.map((code) => ({
      code,
      ...BADGE_DEFINITIONS[code],
      earnedAt: null,
    }));
  }

  const earnedAtByBadgeId = new Map(
    (userBadgeRows ?? []).map((row) => [row.badge_id, row.earned_at]),
  );

  const badgeIds = new Map(
    (badgeRows ?? []).map((row) => [row.code as BadgeCode, row.id]),
  );

  const missingRows = earned
    .filter((code) => {
      const badgeId = badgeIds.get(code);
      return badgeId && !earnedAtByBadgeId.has(badgeId);
    })
    .map((code) => ({
      user_id: userId,
      badge_id: badgeIds.get(code)!,
    }));

  if (missingRows.length > 0) {
    const { data: inserted } = await db
      .from("user_badges")
      .upsert(missingRows, {
        onConflict: "user_id,badge_id",
        ignoreDuplicates: true,
      })
      .select("badge_id, earned_at");

    for (const row of inserted ?? []) {
      earnedAtByBadgeId.set(row.badge_id, row.earned_at);
    }
  }

  return earned.map((code) => {
    const badgeId = badgeIds.get(code);
    return {
      code,
      name:
        badgeRows.find((row) => row.code === code)?.name ??
        BADGE_DEFINITIONS[code].name,
      description:
        badgeRows.find((row) => row.code === code)?.description ??
        BADGE_DEFINITIONS[code].description,
      earnedAt: badgeId ? earnedAtByBadgeId.get(badgeId) ?? null : null,
    };
  });
}
