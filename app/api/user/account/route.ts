import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, getUserRoleByEmail, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserCircle, type UserCircle } from "@/lib/userCircle";
import { getUserBadges } from "@/lib/userBadges";

export const dynamic = "force-dynamic";

type UnifiedOrder = {
  id: string;
  source: "book" | "shop";
  created_at: string;
  status: string;
  amountHuf: number;
  currency: string;
  label: string;
  productId: string | null;
  deliveryType: string | null;
  fulfilled_at: string | null;
  dispatched_at: string | null;
  user_received_at: string | null;
  priority: boolean;
  items: Array<{
    name: string;
    code: string | null;
    quantity: number;
    lineTotalHuf: number;
    variant: string | null;
  }>;
};

function toHuf(raw: unknown, unit: "forint" | "fillér" = "forint"): number {
  const value = Number(raw ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "fillér" ? Math.round(value / 100) : Math.round(value);
}

function productLabel(productId: string | null, metadata: Record<string, unknown> | null): string {
  const explicit =
    (metadata?.package_label as string | undefined) ??
    (metadata?.product_name as string | undefined) ??
    (metadata?.product_alias as string | undefined);
  if (explicit) return explicit;

  if (!productId) {
    return metadata?.historical_product_type === "book"
      ? "Vállalhatatlan könyv"
      : "Rendelés";
  }
  if (metadata?.historical_product_type === "book") return "Vállalhatatlan könyv";
  if (productId.includes("numbered") || productId === "numbered_copy") {
    const copyNumber = metadata?.copy_number;
    return copyNumber ? `Számozott példány #${copyNumber}` : "Számozott példány";
  }
  if (productId.toLowerCase().includes("book")) return "Vállalhatatlan könyv";
  if (productId.toLowerCase().includes("digital")) return "Digitális olvasó app";
  return productId;
}

function isBookTwoOrder(label: string, productId: string | null, metadata: Record<string, unknown> | null) {
  const haystack = [
    label,
    productId ?? "",
    String(metadata?.cart_summary ?? ""),
    String(metadata?.product_name ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes("könyv ii") || haystack.includes("könyv 2") || haystack.includes("book ii") || haystack.includes("book 2");
}

function isPriorityOrder(status: string, label: string, productId: string | null, metadata: Record<string, unknown> | null) {
  return (
    status !== "fulfilled" &&
    status !== "cancelled" &&
    isBookTwoOrder(label, productId, metadata)
  );
}

async function reconcileLegacyProfileForAuthUser(
  db: ReturnType<typeof supabaseAdmin>,
  userId: string,
  email: string | null,
) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return;

  const { data: legacyProfile, error: legacyProfileError } = await db
    .from("users")
    .select("id, email, nickname")
    .eq("email", normalizedEmail)
    .neq("id", userId)
    .maybeSingle();

  if (legacyProfileError || !legacyProfile) return;

  const { error: reconcileError } = await db.rpc("reconcile_legacy_user", {
    p_legacy_user_id: legacyProfile.id,
    p_canonical_user_id: userId,
    p_note: "Automatic reconciliation on authenticated account access",
  });

  if (reconcileError) {
    console.warn("[user/account] legacy reconciliation skipped", reconcileError.message);
  }
}

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers);
  if (!token) return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });

  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const db = supabaseAdmin();

  await reconcileLegacyProfileForAuthUser(db, user.id, user.email);

  const [authUserRes, profileRes, bookOrdersRes, shopOrdersRes, claimsRes, spotsRes, copiesRes] =
    await Promise.all([
      db.auth.admin.getUserById(user.id),
      db.from("users").select("id, email, nickname, created_at, updated_at").eq("id", user.id).maybeSingle(),
      db
        .from("orders")
        .select(
          "id, created_at, status, amount, currency, product_id, delivery_type, customer_email, fulfilled_at, dispatch_sent_at, user_received_at, metadata"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("shop_orders")
        .select(
          "id, created_at, status, subtotal_amount, currency, customer_email, paid_at, user_received_at, metadata"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("claims")
        .select("id, status, created_at, sticker_spots(title, type, content_type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("sticker_spots")
        .select("id, title, type, status, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("book_copies")
        .select("copy_number, status, order_email, stripe_checkout_session_id, price_override, updated_at")
        .eq("order_email", user.email ?? "")
        .eq("status", "sold")
        .order("copy_number", { ascending: true }),
    ]);

  const queryErrors = [authUserRes.error, profileRes.error, bookOrdersRes.error, shopOrdersRes.error, claimsRes.error, spotsRes.error, copiesRes.error].filter(Boolean);
  if (queryErrors.length > 0) {
    console.error("[user/account] query errors", queryErrors.map((error) => error?.message));
    return NextResponse.json({ ok: false, error: "account_query_failed" }, { status: 500 });
  }

  const authUser = authUserRes.data.user;
  const email = authUser?.email ?? profileRes.data?.email ?? user.email;
  const nickname = profileRes.data?.nickname ?? null;
  const badges = await getUserBadges(user.id, email);

  const bookOrders = (bookOrdersRes.data ?? []).map((order) => {
    const metadata = (order.metadata && typeof order.metadata === "object" ? order.metadata : null) as Record<string, unknown> | null;
    const label = productLabel(order.product_id ?? null, metadata);
    const amountHuf = toHuf(order.amount, "fillér");
    return {
      id: order.id,
      source: "book" as const,
      created_at: order.created_at,
      status: order.status,
      amountHuf,
      currency: String(order.currency ?? "huf").toLowerCase(),
      label,
      productId: order.product_id ?? null,
      deliveryType: order.delivery_type ?? null,
      fulfilled_at: order.fulfilled_at ?? null,
      dispatched_at: order.dispatch_sent_at ?? null,
      user_received_at: order.user_received_at ?? null,
      priority: isPriorityOrder(order.status, label, order.product_id ?? null, metadata),
      items: [{
        name: label,
        code: typeof metadata?.product_code === "string" ? metadata.product_code : null,
        quantity: 1,
        lineTotalHuf: amountHuf,
        variant: null,
      }],
    } satisfies UnifiedOrder;
  });

  const shopOrderIds = (shopOrdersRes.data ?? []).map((order) => order.id);
  let shopItems: Array<{
    order_id: string;
    product_name: string;
    product_id: string;
    quantity: number;
    unit_amount: number;
    variant_id: string | null;
  }> = [];

  if (shopOrderIds.length > 0) {
    const { data, error } = await db
      .from("shop_order_items")
      .select("order_id, product_name, product_id, quantity, unit_amount, variant_id")
      .in("order_id", shopOrderIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[user/account] shop items error", error);
      return NextResponse.json({ ok: false, error: "account_query_failed" }, { status: 500 });
    }

    shopItems = (data ?? []) as typeof shopItems;
  }

  const shopItemsByOrder = new Map<string, typeof shopItems>();
  for (const item of shopItems) {
    const existing = shopItemsByOrder.get(item.order_id) ?? [];
    existing.push(item);
    shopItemsByOrder.set(item.order_id, existing);
  }

  const shopOrders = (shopOrdersRes.data ?? []).map((order) => {
    const metadata = (order.metadata && typeof order.metadata === "object" ? order.metadata : null) as Record<string, unknown> | null;
    const items = shopItemsByOrder.get(order.id) ?? [];
    const amountHuf = toHuf(order.subtotal_amount, "fillér");
    const first = items[0];
    const label = items.length === 1 && first
      ? first.product_name
      : items.length > 1
        ? `${first?.product_name ?? "Merch"} + ${Math.max(0, items.length - 1)} további tétel`
        : "Merch rendelés";

    return {
      id: order.id,
      source: "shop" as const,
      created_at: order.created_at,
      status: order.status,
      amountHuf,
      currency: String(order.currency ?? "huf").toLowerCase(),
      label,
      productId: first?.product_id ?? null,
      deliveryType: typeof metadata?.deliveryMethod === "string" ? metadata.deliveryMethod : null,
      fulfilled_at: null,
      dispatched_at: null,
      user_received_at: order.user_received_at ?? null,
      priority: false,
      items: items.map((item) => ({
        name: item.product_name,
        code: null,
        quantity: Number(item.quantity ?? 0),
        lineTotalHuf: toHuf(item.unit_amount, "fillér") * Number(item.quantity ?? 0),
        variant: item.variant_id,
      })),
    } satisfies UnifiedOrder;
  });

  const orders = [...bookOrders, ...shopOrders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalSpendHuf = orders
    .filter((order) =>
      ["paid", "ready_to_dispatch", "dispatched", "fulfilled"].includes(order.status) &&
      !["cancelled", "canceled"].includes(order.status),
    )
    .reduce((sum, order) => sum + order.amountHuf, 0);

  const circle: UserCircle = getUserCircle(totalSpendHuf);

  const claims = claimsRes.data ?? [];
  const spots = spotsRes.data ?? [];

  const activityDates = [
    ...(bookOrdersRes.data ?? []).map((item) => item.created_at),
    ...(shopOrdersRes.data ?? []).map((item) => item.created_at),
    ...claims.map((item) => item.created_at),
    ...spots.map((item) => item.created_at),
  ].filter((value): value is string => Boolean(value));

  const lastActivityAt =
    activityDates.length > 0
      ? activityDates.reduce((latest, value) =>
          new Date(value).getTime() > new Date(latest).getTime() ? value : latest
        )
      : null;

  return NextResponse.json({
    ok: true,
    account: {
      generated_at: new Date().toISOString(),
      user: {
        id: authUser?.id ?? user.id,
        email,
        nickname,
        role: getUserRoleByEmail(email),
        avatar_url: authUser?.user_metadata?.avatar_url ?? authUser?.user_metadata?.picture ?? null,
        created_at: authUser?.created_at ?? profileRes.data?.created_at ?? null,
        updated_at: profileRes.data?.updated_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        last_activity_at: lastActivityAt,
      },
      circle,
      badges,
      spend: {
        totalHuf: totalSpendHuf,
        orderCount: orders.length,
      },
      orders,
      purchases: {
        numberedCopies: (copiesRes.data ?? []).map((copy) => ({
          copyNumber: Number(copy.copy_number),
          status: copy.status,
          priceHuf: toHuf(copy.price_override),
        })),
        itemCount: orders.reduce(
          (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0
        ),
      },
      network: {
        claims: {
          total: claims.length,
          accepted: claims.filter((claim) => claim.status === "accepted").length,
          pending: claims.filter((claim) => claim.status === "pending").length,
          rejected: claims.filter((claim) => claim.status === "rejected").length,
          physical: claims.filter((claim) => (claim.sticker_spots as { type?: string } | null)?.type === "physical").length,
          digital: claims.filter((claim) => (claim.sticker_spots as { type?: string } | null)?.type === "virtual").length,
        },
        spots: {
          total: spots.length,
          active: spots.filter((spot) => spot.status === "active").length,
          physical: spots.filter((spot) => spot.type === "physical").length,
          digital: spots.filter((spot) => spot.type === "virtual").length,
        },
      },
    },
  });
}
