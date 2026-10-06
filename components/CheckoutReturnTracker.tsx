"use client";

import { useEffect } from "react";
import { trackEvent, getAttributionSource } from "@/lib/siteAnalytics";

type Props = {
  product: string;
  status: "success" | "cancelled";
};

export default function CheckoutReturnTracker({ product, status }: Props) {
  useEffect(() => {
    trackEvent("checkout_return", {
      product,
      status,
    });
    if (status === "cancelled") {
      // Source is captured separately so Vercel's two-property limit
      // does not force us to drop the checkout status.
      trackEvent("checkout_cancelled_source", {
        product,
        source: getAttributionSource(),
      });
    }
  }, [product, status]);

  return null;
}
