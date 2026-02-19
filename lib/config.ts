export function getPaymentMode(): "link" | "api" {
  const m = process.env.NEXT_PUBLIC_PAYMENT_MODE?.toLowerCase();
  return m === "api" ? "api" : "link";
}
export function getPaymentLinkUrl(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL || null;
}
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export type SocialLinks = {
  facebook: string | null;
  youtube: string | null;
  substack: string | null;
};

export function getSocialLinks(): SocialLinks {
  return {
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || null,
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL || null,
    substack: process.env.NEXT_PUBLIC_SOCIAL_SUBSTACK_URL || null,
  };
}
