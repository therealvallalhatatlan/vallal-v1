import type { Metadata } from "next";

import TelegramMiniAppShell from "@/components/telegram-app/TelegramMiniAppShell";

export const metadata: Metadata = {
  title: "Vállalhatatlan Mini App",
  description: "Telegram Mini App a számozott könyvekhez és a dead drop rendeléshez.",
};

export default function TelegramAppPage() {
  return <TelegramMiniAppShell />;
}
