import { track } from "@vercel/analytics/server";

type AnalyticsValue = string | number | boolean;

export async function trackServerEvent(
  name: string,
  props: Record<string, AnalyticsValue | null | undefined> = {},
): Promise<void> {
  try {
    const entries = Object.entries(props)
      .filter(([, value]) => value !== null && value !== undefined)
      .slice(0, 2)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value.slice(0, 120) : value,
      ] as const);

    await track(name, Object.fromEntries(entries));
  } catch (error) {
    console.warn("[analytics] server event failed:", error);
  }
}
