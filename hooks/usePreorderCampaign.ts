"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_PREORDER_CAMPAIGN_SLUG,
  PreorderCampaignSummary,
} from "@/lib/shop/preorder";

export function usePreorderCampaign(slug: string = DEFAULT_PREORDER_CAMPAIGN_SLUG) {
  const [campaign, setCampaign] = useState<PreorderCampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/shop/preorder-campaign/${slug}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load preorder campaign");
        }

        const nextCampaign = (await response.json()) as PreorderCampaignSummary;

        if (!cancelled) {
          setCampaign(nextCampaign);
          setError(null);
        }
      } catch (nextError: unknown) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Failed to load preorder campaign");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCampaign();
    const intervalId = window.setInterval(fetchCampaign, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [slug]);

  return {
    campaign,
    loading,
    error,
  };
}