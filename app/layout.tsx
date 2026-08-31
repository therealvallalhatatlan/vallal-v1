import type React from "react"
import type { Metadata, Viewport } from "next"
import Link from "next/link"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
// import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { Crimson_Pro, Inter, VT323, Special_Elite, Oswald, Roboto_Condensed, JetBrains_Mono } from "next/font/google";
import PWAInstallManager from "@/components/PWAInstallManager";
import AuthUrlSessionSync from "@/components/AuthUrlSessionSync";
import { ThemeProvider } from "@/components/theme-provider";
import BgVideoGate from "@/components/BgVideoGate";
import TrafficSourceHeuristics from "@/components/TrafficSourceHeuristics";
import StatusBanner from "@/components/StatusBanner";
import FacebookSDK from "@/components/FacebookSDK";
import NotificationOrchestrator from "@/components/notifications/NotificationOrchestrator";
import LayoutNavigationGuard from "@/components/LayoutNavigationGuard";
import CuriosityLayer from "@/components/CuriosityLayer";

const crimson = Crimson_Pro({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-serif" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans-reader" });
const specialElite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-heading" });
const oswald = Oswald({ subsets: ["latin"], weight: ["700"], variable: "--font-hero" });
const robotoCond = Roboto_Condensed({ subsets: ["latin"], weight: ["700"], style: ["italic"], variable: "--font-logo" });
const jetMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-mono-tech" });
const vt323 = VT323({ subsets: ["latin"], weight: "400", variable: "--font-terminal" });

export const metadata: Metadata = {
  metadataBase: new URL("https://vallalhatatlan.online"),
  title: { default: "Vállalhatatlan — Y2K | Budapest underground a 90-es évekből", template: "%s | Vállalhatatlan" },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  description: "Vállalhatatlan — Y2K: nyers, urbánus novellák a 90-es évek és az ezredforduló Budapestjéről. Rave/techno éjszakák, underground szcénák, drogkultúra, identitásválság és könyörtelen őszinteség.",
  keywords: ["Vállalhatatlan", "Y2K", "90-es évek", "kilencvenes évek", "Budapest underground", "rave kultúra", "techno", "acid", "drogok", "fű", "illegális szerek", "partikultúra", "kortárs irodalom", "novelláskötet", "sötét urbánus próza", "Budapest 1990s", "Y2K fiction", "underground culture", "rave techno", "drug culture literature", "urban fiction"],
  alternates: { languages: { "hu-HU": "/" } },
  openGraph: { type: "book", url: "/", siteName: "Vállalhatatlan", title: "Vállalhatatlan — Meg sem történt történetek", description: "Nyers, sötét humorú novellák a 90-es évek/ezredforduló Budapestjéről: techno, acid, rave, drogkultúra és töréspontok.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Vállalhatatlan — Meg sem történt történetek" }], locale: "hu_HU", alternateLocale: ["en_US"] },
  twitter: { card: "summary_large_image", title: "Vállalhatatlan — Y2K", description: "Underground Budapest a 90-es években: rave/techno, drogkultúra és kíméletlenül őszinte novellák.", images: ["/og.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  category: "books",
  authors: [{ name: "Vállalhatatlan" }],
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, themeColor: "#000000" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`
          ${crimson.variable} ${inter.variable} ${specialElite.variable} ${vt323.variable}
          ${oswald.variable} ${robotoCond.variable} ${jetMono.variable}
          antialiased overflow-x-hidden
        `} style={{ touchAction: 'pan-y' }}>
        {/* Source-code easter egg: rendered as a real HTML comment in Page Source. */}
        <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: String.raw`<!--

 __      __   _ _       _ _           _        _   _             
 \ \    / /  | | |     | | |         | |      | | | |            
  \ \  / /_ _| | | __ _| | |__   __ _| |_ __ _| |_| | __ _ _ __  
   \ \/ / _\` | | |/ _\` | | '_ \ / _\` | __/ _\` | __| |/ _\` | '_ \ 
    \  / (_| | | | (_| | | | | | (_| | || (_| | |_| | (_| | | | |
     \/ \__,_|_|_|\__,_|_|_| |_|\__,_|\__\__,_|\__|_|\__,_|_| |_|


╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                   V // INTERNAL CHANNEL // NODE_07                         ║
║                                                                              ║
║  > YOU OPENED THE SOURCE.                                                   ║
║                                                                              ║
║  THIS IS ONLY THE FIRST STEP INTO THE RABBIT HOLE.                          ║
║                                                                              ║
║  THERE ARE MORE LAYERS.                                                      ║
║  THERE ARE MORE NODES.                                                       ║
║  THERE ARE MORE POINTS.                                                      ║
║                                                                              ║
║  IF YOU WANT TO SEE HOW DEEP THIS GOES:                                     ║
║                                                                              ║
║  > OPEN THE CONSOLE                                                          ║
║  > TYPE: help()                                                             ║
║                                                                              ║
║  YOUR OBJECTIVE: FIND AS MANY POINTS AS YOU CAN.                            ║
║                                                                              ║
║  MAXIMUM SCORE = MAXIMUM ACCESS.                                            ║
║                                                                              ║
║  ----------------------------------------------------------------------------║
║                                                                              ║
║  NODE STATUS:         ONLINE                                                ║
║  TRACE STATUS:        UNKNOWN                                               ║
║  CHANNEL:             INTERNAL                                              ║
║  OBSERVER:            DETECTED                                              ║
║  SCORE:               0                                                     ║
║                                                                              ║
║  ----------------------------------------------------------------------------║
║                                                                              ║
║                    THERE IS NOTHING TO STEAL.                               ║
║                    THERE IS ONLY SOMETHING TO FIND.                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

-->` }} />

        {/* Console bootstrap: defines globals before CuriosityLayer hydration. */}
        <script dangerouslySetInnerHTML={{ __html: String.raw`(function () {
  if (typeof window === "undefined") return;
  var MAX_SCORE = 300;
  function readScore() {
    try {
      var value = Number(window.localStorage.getItem("vh_curiosity_score_v1") || "0");
      return Number.isFinite(value) ? Math.max(0, Math.min(MAX_SCORE, value)) : 0;
    } catch (e) { return 0; }
  }
  function print(title, lines) {
    console.log("%c " + title + " ", "color:#d9f99d;background:#090909;font-weight:800;font-size:14px;padding:4px 8px;border:1px solid #3f6212");
    lines.forEach(function (line) {
      console.log("%c" + line, "color:#a3a3a3;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6");
    });
  }
  window.help = function () {
    print("VÁLLALHATATLAN / INTERNAL NODE", [
      "AVAILABLE COMMANDS", "",
      "  whoami()       identify the observer   [+15]",
      "  where()        locate the node         [+15]",
      "  remember()     list your discoveries    [+10]",
      "  scan()         inspect this node       [+25]",
      "  score()        show the scoreboard      [+0]",
      "  coffee()       probably nothing         [+5]",
      "  sudo()         absolutely nothing        [+5]",
      "  open(\"unknown\")  follow the signal   [+50]", "",
      "CURIOSITY ENGINE: LOADING",
      "Hint: the rabbit hole has more than one entrance."
    ]);
    return "help loaded";
  };
  window.score = function () {
    var current = readScore();
    print("SCOREBOARD", ["CURRENT SCORE: " + current, "MAXIMUM SCORE: " + MAX_SCORE, "REMAINING: " + Math.max(0, MAX_SCORE - current), "", current >= MAX_SCORE ? "MAXIMUM ACCESS ACHIEVED." : "THERE ARE MORE POINTS TO FIND."]);
    return { score: current, max: MAX_SCORE, remaining: Math.max(0, MAX_SCORE - current) };
  };
  window.whoami = function () { print("IDENTITY UNKNOWN", ["SOURCE INSPECTION: POSSIBLE", "OBSERVER: DETECTED", "The full engine will attach shortly."]); return "observer detected"; };
  window.where = function () { print("NODE LOCATION", ["NETWORK: VALLALHATATLAN", "NODE: 07", "STATUS: STILL RUNNING"]); return "/NODE-07"; };
  window.remember = function () {
    var items = [];
    try { items = JSON.parse(window.localStorage.getItem("vh_curiosity_discoveries_v1") || "[]"); } catch (e) {}
    print("MEMORY", items.length ? items.map(function (item) { return "  " + item; }) : ["  nothing yet", "", "Keep looking."]);
    return items;
  };
  window.scan = function () { print("NODE SCAN", ["PUBLIC SURFACE: ONLINE", "HIDDEN SURFACE: YES", "NODE 07: LISTENING", "Hydration pending. Deep scan unavailable in bootstrap mode."]); return true; };
  window.coffee = function () { console.log("%ccoffee.exe was never installed", "color:#a3a3a3;font-family:monospace"); return "404: caffeine not found"; };
  window.sudo = function () { console.warn("permission denied"); console.log("root is not a role. root is a personality disorder."); return false; };
  window.openUnknown = function () { window.location.href = "/unknown"; return "/unknown"; };
  if (!window.__VH_CONSOLE_BOOTSTRAP__) {
    window.__VH_CONSOLE_BOOTSTRAP__ = true;
    console.log("%c VÁLLALHATATLAN / CONSOLE CHANNEL ", "color:#d9f99d;background:#090909;font-weight:800;font-size:14px;padding:4px 8px;border:1px solid #3f6212");
    console.log("%cConsole bootstrap active. Try help()", "color:#a3a3a3;font-family:ui-monospace,monospace;font-size:12px");
  }
})();` }} />

        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FacebookSDK />
          <BgVideoGate />
          <div className="content-above relative z-20">
            <AuthUrlSessionSync />
            <PWAInstallManager />
            <LayoutNavigationGuard />
            <CuriosityLayer />
            {children}
            <TrafficSourceHeuristics />
            <Analytics />
            <div id="glitch-root"></div>
            <NotificationOrchestrator />
            <ServiceWorkerRegister />
          </div>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "Vállalhatatlan", url: "https://vallalhatatlan.online", sameAs: ["https://www.reddit.com/r/vallalhatatlan/", "https://www.facebook.com/vallalhatatlan2000", "mailto:therealvallalhatatlan@gmail.com"] }) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Vállalhatatlan", url: "https://vallalhatatlan.online", potentialAction: { "@type": "SearchAction", target: "https://vallalhatatlan.online/search?q={query}", "query-input": "required name=query" } }) }} />
          <style>{`html,body { overscroll-behavior-x:none; overflow-x:hidden; } @media (hover:none) { html,body { touch-action:pan-y; } } h1, h2, h3, .heading-serif { font-family: var(--font-heading), serif; font-weight: 400; letter-spacing: -0.01em; } .bg-video { position:fixed; inset:0; overflow:hidden; } .bg-video__media { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:1; pointer-events:none; } .bg-video__overlay { position:absolute; inset:0; pointer-events:none; background:rgba(0,0,0,0.5); }`}</style>
        </ThemeProvider>
      </body>
    </html>
  );
}
