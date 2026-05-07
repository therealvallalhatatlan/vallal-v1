import {
  PreorderCampaignStatus,
  SHARED_TSHIRT_PREORDER_CAMPAIGN_SLUG,
} from "@/lib/shop/products";

export interface PreorderCampaignSummary {
  slug: string;
  name: string;
  goal: number;
  currentCount: number;
  remaining: number;
  percent: number;
  status: PreorderCampaignStatus;
}

export const DEFAULT_PREORDER_CAMPAIGN_SLUG = SHARED_TSHIRT_PREORDER_CAMPAIGN_SLUG;

export function derivePreorderCampaignStatus(currentCount: number, goal: number): PreorderCampaignStatus {
  return currentCount >= goal ? "printing_started" : "collecting";
}

export function toPreorderCampaignSummary(input: {
  slug: string;
  name: string;
  goal: number;
  currentCount: number;
  status?: string | null;
}): PreorderCampaignSummary {
  const safeGoal = Math.max(1, Math.floor(input.goal));
  const safeCurrentCount = Math.max(0, Math.floor(input.currentCount));
  const status = input.status === "printing_started"
    ? "printing_started"
    : derivePreorderCampaignStatus(safeCurrentCount, safeGoal);

  return {
    slug: input.slug,
    name: input.name,
    goal: safeGoal,
    currentCount: safeCurrentCount,
    remaining: Math.max(0, safeGoal - safeCurrentCount),
    percent: Math.min(100, Math.max(0, Math.round((safeCurrentCount / safeGoal) * 100))),
    status,
  };
}

export function getPreorderCampaignCopy(summary: PreorderCampaignSummary): {
  eyebrow: string;
  headline: string;
  detail: string;
} {
  if (summary.status === "printing_started") {
    return {
      eyebrow: "Printing started",
      headline: `${summary.currentCount} / ${summary.goal} preorders reached`,
      detail: "Underground manufacturing ritual in progress.",
    };
  }

  return {
    eyebrow: "Preorder only",
    headline: `${summary.currentCount} / ${summary.goal} preorders reached`,
    detail: "Production starts at 20.",
  };
}