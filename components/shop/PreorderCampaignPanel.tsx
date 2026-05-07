"use client";

import { motion } from "framer-motion";

import {
  getPreorderCampaignCopy,
  PreorderCampaignSummary,
} from "@/lib/shop/preorder";

interface PreorderCampaignPanelProps {
  campaign: PreorderCampaignSummary;
  variant?: "hero" | "card" | "detail" | "drawer";
}

const variantClasses = {
  hero: {
    shell: "relative overflow-hidden rounded-[28px] border border-lime-400/20 bg-neutral-950/85 px-5 py-5 text-left shadow-[0_0_40px_rgba(163,230,53,0.08)] md:px-6",
    eyebrow: "text-[10px] uppercase tracking-[0.35em] text-lime-300/75",
    headline: "text-xl font-black tracking-tight text-white md:text-2xl",
    detail: "text-sm text-neutral-400",
    meta: "text-xs uppercase tracking-[0.24em] text-neutral-500",
    progress: "h-3 rounded-full",
  },
  card: {
    shell: "rounded-2xl border border-lime-400/10 bg-neutral-950/80 px-3 py-3",
    eyebrow: "text-[9px] uppercase tracking-[0.3em] text-lime-300/65",
    headline: "text-sm font-black text-white",
    detail: "text-xs text-neutral-500",
    meta: "text-[10px] uppercase tracking-[0.2em] text-neutral-500",
    progress: "h-2 rounded-full",
  },
  detail: {
    shell: "rounded-3xl border border-lime-400/15 bg-neutral-950/85 px-4 py-4 shadow-[0_0_30px_rgba(163,230,53,0.06)]",
    eyebrow: "text-[10px] uppercase tracking-[0.32em] text-lime-300/70",
    headline: "text-lg font-black text-white",
    detail: "text-sm text-neutral-400",
    meta: "text-[11px] uppercase tracking-[0.22em] text-neutral-500",
    progress: "h-2.5 rounded-full",
  },
  drawer: {
    shell: "rounded-2xl border border-lime-400/10 bg-neutral-950/80 px-4 py-4",
    eyebrow: "text-[9px] uppercase tracking-[0.3em] text-lime-300/65",
    headline: "text-sm font-black text-white",
    detail: "text-xs text-neutral-500",
    meta: "text-[10px] uppercase tracking-[0.2em] text-neutral-500",
    progress: "h-2 rounded-full",
  },
} as const;

export function PreorderCampaignPanel({ campaign, variant = "hero" }: PreorderCampaignPanelProps) {
  const copy = getPreorderCampaignCopy(campaign);
  const styles = variantClasses[variant];
  const isNearCompletion = campaign.status !== "printing_started" && campaign.percent >= 75;
  const barGlow = campaign.status === "printing_started"
    ? "shadow-[0_0_22px_rgba(16,185,129,0.75)]"
    : isNearCompletion
      ? "shadow-[0_0_22px_rgba(163,230,53,0.7)]"
      : "shadow-[0_0_14px_rgba(163,230,53,0.38)]";
  const barColor = campaign.status === "printing_started"
    ? "from-emerald-300 via-lime-300 to-cyan-300"
    : "from-lime-300 via-lime-400 to-cyan-300";

  return (
    <div className={styles.shell}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_30%)]" />
      <div className="relative flex flex-col gap-3">
        <div className={styles.eyebrow}>{copy.eyebrow}</div>
        <div className={styles.headline}>{copy.headline}</div>
        <div className={styles.detail}>{copy.detail}</div>

        <div className="space-y-2">
          <div className={`overflow-hidden border border-white/6 bg-black/60 ${styles.progress}`}>
            <motion.div
              className={`h-full bg-gradient-to-r ${barColor} ${barGlow}`}
              initial={{ width: 0 }}
              animate={{ width: `${campaign.percent}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={styles.meta}>{campaign.percent}% unlocked</span>
            <span className={styles.meta}>
              {campaign.currentCount} / {campaign.goal}
            </span>
          </div>
        </div>

        {campaign.status !== "printing_started" && (
          <div className={styles.meta}>{campaign.remaining} preorder still needed for the run.</div>
        )}
      </div>
    </div>
  );
}