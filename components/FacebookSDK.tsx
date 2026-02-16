"use client";

import Script from "next/script";

const appId = process.env.NEXT_PUBLIC_FB_APP_ID;

export default function FacebookSDK() {
  if (!appId) {
    return null;
  }

  return (
    <>
      <div id="fb-root" />
      <Script
        id="facebook-sdk"
        strategy="afterInteractive"
        src={`https://connect.facebook.net/hu_HU/sdk.js#xfbml=1&version=v19.0&appId=${appId}&autoLogAppEvents=1`}
      />
    </>
  );
}
