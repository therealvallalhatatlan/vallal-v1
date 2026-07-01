import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DeliveryMethod, getDeliveryFee } from "@/lib/shop/delivery";
import { Product, products } from "@/lib/shop/products";
import { PreorderCampaignSummary, toPreorderCampaignSummary } from "@/lib/shop/preorder";

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface ValidatedCheckoutItem {
  product: Product;
  quantity: number;
  variantId?: string;
}

export interface CreateShopOrderDraftInput {
  items: ValidatedCheckoutItem[];
  deliveryMethod: DeliveryMethod;
}

type CampaignRow = {
  slug: string;
  name: string;
  goal: number;
  current_count: number;
  status: string | null;
};

export function validateCheckoutItems(items: CheckoutItemInput[]): ValidatedCheckoutItem[] {
  return items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const quantity = Math.max(1, Math.floor(item.quantity || 1));
    const variantId = item.variantId?.trim() || undefined;

    if (product.sizes?.length) {
      if (!variantId) {
        throw new Error(`Missing size for product: ${product.id}`);
      }

      if (!product.sizes.includes(variantId as Product["sizes"][number])) {
        throw new Error(`Invalid size for product: ${product.id}`);
      }
    }

    return {
      product,
      quantity,
      variantId,
    };
  });
}

export async function createShopOrderDraft({
  items,
  deliveryMethod,
}: CreateShopOrderDraftInput): Promise<{ orderId: string; subtotalAmount: number; shippingAmount: number; totalAmount: number; }> {
  const subtotalAmount = items.reduce((sum, item) => sum + item.product.price * 100 * item.quantity, 0);
  const shippingAmount = getDeliveryFee(deliveryMethod) * 100;
  const totalAmount = subtotalAmount + shippingAmount;

  const { data: order, error: orderError } = await supabaseAdmin()
    .from("shop_orders")
    .insert({
      order_type: "merch",
      status: "pending",
      currency: "huf",
      subtotal_amount: subtotalAmount,
      metadata: {
        source: "shop",
        deliveryMethod,
        shippingAmount,
        totalAmount,
      },
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || "Failed to create shop order draft");
  }

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    product_type: item.product.type,
    product_name: item.product.name,
    variant_id: item.variantId ?? null,
    quantity: item.quantity,
    unit_amount: item.product.price * 100,
    preorder_campaign_slug: item.product.preorder?.campaignSlug ?? null,
    metadata: {
      preorderOnly: item.product.preorder?.preorderOnly ?? false,
    },
  }));

  const { error: itemsError } = await supabaseAdmin()
    .from("shop_order_items")
    .insert(orderItems);

  if (itemsError) {
    await supabaseAdmin().from("shop_orders").delete().eq("id", order.id);
    throw new Error(itemsError.message || "Failed to store shop order items");
  }

  return {
    orderId: order.id,
    subtotalAmount,
    shippingAmount,
    totalAmount,
  };
}

export async function attachStripeSessionToOrder(orderId: string, stripeSessionId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("shop_orders")
    .update({
      stripe_checkout_session_id: stripeSessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message || "Failed to attach Stripe session to order");
  }
}

export async function getPreorderCampaignSummaryBySlug(slug: string): Promise<PreorderCampaignSummary | null> {
  const { data, error } = await supabaseAdmin()
    .from("preorder_campaigns")
    .select("slug, name, goal, current_count, status")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<CampaignRow>();

  if (error) {
    throw new Error(error.message || "Failed to load preorder campaign");
  }

  if (!data) {
    return null;
  }

  return toPreorderCampaignSummary({
    slug: data.slug,
    name: data.name,
    goal: data.goal,
    currentCount: data.current_count,
    status: data.status,
  });
}