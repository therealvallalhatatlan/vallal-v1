import { NextResponse } from "next/server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

import { HERO_CHAT_CONTEXT } from "@/lib/hero-chat/context";
import { HERO_CHAT_SYSTEM_PROMPT } from "@/lib/hero-chat/prompt";

type HistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGE_LENGTH = 480;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_MESSAGE_LENGTH = 320;

const buildContextMessage = () => {
  return Object.entries(HERO_CHAT_CONTEXT)
    .map(([section, entries]) => {
      const formatted = entries.map((line) => `• ${line}`).join("\n");
      return `${section}\n${formatted}`;
    })
    .join("\n\n");
};

const CONTEXT_MESSAGE = buildContextMessage();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      history?: unknown;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Üzenet szükséges." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Üzenet túl hosszú (max ${MAX_MESSAGE_LENGTH} karakter).` },
        { status: 400 },
      );
    }

    const sanitizedHistory = Array.isArray(body.history)
      ? (body.history as Array<Record<string, unknown>>)
          .filter(
            (entry): entry is HistoryEntry =>
              entry !== null &&
              typeof entry === "object" &&
              (entry.role === "user" || entry.role === "assistant") &&
              typeof entry.content === "string" &&
              Boolean(entry.content.trim()),
          )
          .slice(-MAX_HISTORY_ITEMS)
          .map((entry) => ({
            role: entry.role,
            content: entry.content.trim().slice(0, MAX_HISTORY_MESSAGE_LENGTH),
          }))
      : [];

    const conversationMessages = [
      { role: "system", content: HERO_CHAT_SYSTEM_PROMPT },
      { role: "system", content: CONTEXT_MESSAGE },
      ...sanitizedHistory,
      { role: "user", content: message },
    ];

    const model = openai("gpt-5.4");
    const result = await generateText({
      model,
      messages: conversationMessages,
      maxRetries: 0,
    });

    const reply = result.text?.trim();
    if (!reply) {
      return NextResponse.json({ error: "Nincs válasz az AI-től." }, { status: 502 });
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("[hero-chat] failed", error);
    return NextResponse.json({ error: "Hiba történt." }, { status: 500 });
  }
}