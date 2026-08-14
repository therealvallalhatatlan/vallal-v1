"use server";

import { cookies } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isEditor } from "@/lib/auth/isEditor";
import { getSiteUrl } from "@/lib/stripe";

export type RecentOrder = {
  id: string;
  created_at: string;
  stripe_session_id: string;
  product_id: string;
  anonymized_user_hash: string | null;
  delivery_type: "dead_drop" | "anonymous_locker";
  amount: number;
  currency: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  customer_email: string | null;
  customer_name: string | null;
};

export type GenerateStripePaymentLinkResult =
  | { ok: true; url: string; sessionId: string; productId: string; priceHuf: number }
  | { ok: false; error: string };

export type MerchInventoryItem = {
  product_id: string;
  display_name: string;
  price_huf: number;
  active: boolean;
  sort_order: number;
};

export type FetchRecentOrdersResult =
  | { ok: true; orders: RecentOrder[] }
  | { ok: false; error: string };

export type FetchMerchInventoryResult =
  | { ok: true; items: MerchInventoryItem[] }
  | { ok: false; error: string };

let cachedStripe: Stripe | null | undefined;

function getStripeClient(): Stripe | null {
  if (cachedStripe !== undefined) return cachedStripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    cachedStripe = null;
    return null;
  }

  cachedStripe = new Stripe(secretKey, { apiVersion: "2025-07-30.basil" });
  return cachedStripe;
}

async function requireEditorEmail(): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;

  if (!token) return { ok: false, error: "unauthenticated" };

  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data?.user?.email) return { ok: false, error: "unauthenticated" };

  if (!isEditor(data.user.email)) return { ok: false, error: "forbidden" };

  return { ok: true, email: data.user.email };
}

export async function generateStripePaymentLink(
  productId: string,
  customPrice?: number,
): Promise<GenerateStripePaymentLinkResult> {
  const editor = await requireEditorEmail();
  if (!editor.ok) {
    return { ok: false, error: editor.error };
  }

  const normalizedProductId = (productId || "").trim();
  if (!normalizedProductId) {
    return { ok: false, error: "product_id_required" };
  }

  if (customPrice !== undefined && (!Number.isFinite(customPrice) || customPrice <= 0)) {
    return { ok: false, error: "invalid_custom_price" };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, error: "stripe_not_configured" };
  }

  const { data: catalogItem, error: catalogError } = await supabaseAdmin()
    .from("telegram_merch_catalog")
    .select("product_id, display_name, price_huf, active, sort_order")
    .eq("product_id", normalizedProductId)
    .eq("active", true)
    .maybeSingle<MerchInventoryItem>();

  if (catalogError) {
    console.error("[dashboard.generateStripePaymentLink.catalog]", catalogError);
    return { ok: false, error: "catalog_query_failed" };
  }

  if (!catalogItem) {
    return { ok: false, error: "product_not_found_or_inactive" };
  }

  // Project convention: HUF checkout values are handled in fillér for display consistency.
  const priceHuf = customPrice !== undefined ? Math.round(customPrice) : Math.round(catalogItem.price_huf);
  const unitAmount = priceHuf * 100;
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
  const packageLabel = `DATA_PACKAGE_${String(catalogItem.sort_order > 0 ? catalogItem.sort_order : 1).padStart(2, "0")}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: packageLabel,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${getSiteUrl()}/dashboard?merch=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getSiteUrl()}/dashboard?merch=cancelled`,
      expires_at: expiresAt,
      shipping_address_collection: {
        allowed_countries: ["HU"],
      },
      metadata: {
        type: "merch",
        product_alias: packageLabel,
        package_label: packageLabel,
        product_id: normalizedProductId,
        delivery_type: "anonymous_locker",
        created_by_editor: editor.email,
        custom_price_huf: String(priceHuf),
        source: "dashboard_simulator",
      },
    });

    if (!session.url) {
      return { ok: false, error: "missing_checkout_url" };
    }

    return {
      ok: true,
      url: session.url,
      sessionId: session.id,
      productId: normalizedProductId,
      priceHuf,
    };
  } catch (error) {
    console.error("[dashboard.generateStripePaymentLink]", error);
    return { ok: false, error: "stripe_checkout_creation_failed" };
  }
}

export async function fetchMerchInventory(): Promise<FetchMerchInventoryResult> {
  const editor = await requireEditorEmail();
  if (!editor.ok) {
    return { ok: false, error: editor.error };
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("telegram_merch_catalog")
      .select("product_id, display_name, price_huf, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[dashboard.fetchMerchInventory]", error);
      return { ok: false, error: "inventory_query_failed" };
    }

    return { ok: true, items: (data || []) as MerchInventoryItem[] };
  } catch (error) {
    console.error("[dashboard.fetchMerchInventory]", error);
    return { ok: false, error: "inventory_query_failed" };
  }
}

export async function fetchRecentOrders(): Promise<FetchRecentOrdersResult> {
  const editor = await requireEditorEmail();
  if (!editor.ok) {
    return { ok: false, error: editor.error };
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select("id, created_at, stripe_session_id, product_id, anonymized_user_hash, delivery_type, amount, currency, status, customer_email, customer_name")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[dashboard.fetchRecentOrders]", error);
      return { ok: false, error: "orders_query_failed" };
    }

    return { ok: true, orders: (data || []) as RecentOrder[] };
  } catch (error) {
    console.error("[dashboard.fetchRecentOrders]", error);
    return { ok: false, error: "orders_query_failed" };
  }
}
