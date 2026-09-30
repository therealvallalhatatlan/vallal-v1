"use client";

import { createClient } from "@/lib/browser";

export async function getCheckoutHeaders(): Promise<Headers> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  } catch {
    // Attribution still works for guests through the server-side UTM cookies.
  }

  return headers;
}
