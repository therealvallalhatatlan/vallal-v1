import { NextRequest, NextResponse } from "next/server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

import { HERO_CHAT_CONTEXT } from "@/lib/hero-chat/context";
import { HERO_CHAT_SYSTEM_PROMPT } from "@/lib/hero-chat/prompt";
import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type HistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

type ConversationRow = {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
};

const MAX_MESSAGE_LENGTH = 480;
const HISTORY_LIMIT = 12;
const FETCH_MESSAGES_LIMIT = 30;
const MAX_HISTORY_MESSAGE_LENGTH = 320;
const ANONYMOUS_CONVERSATION_LIMIT = 3;

const CONTEXT_MESSAGE = (() => {
  return Object.entries(HERO_CHAT_CONTEXT)
    .map(([section, entries]) => {
      const formatted = entries.map((line) => `• ${line}`).join("\n");
      return `${section}\n${formatted}`;
    })
    .join("\n\n");
})();

const buildContextMessages = () => [
  { role: "system", content: HERO_CHAT_SYSTEM_PROMPT },
  { role: "system", content: CONTEXT_MESSAGE },
];

const sanitizeHistory = (history?: unknown): HistoryEntry[] => {
  if (!Array.isArray(history)) return [];

  return history
    .flatMap((entry) => (Array.isArray ? entry : entry ? [entry] : []))
    .filter(
      (entry): entry is HistoryEntry =>
        entry !== null &&
        typeof entry === "object" &&
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        Boolean(entry.content.trim()),
    )
    .slice(-HISTORY_LIMIT)
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim().slice(0, MAX_HISTORY_MESSAGE_LENGTH),
    }));
};

const clampMessage = (message: string) =>
  message.length <= MAX_MESSAGE_LENGTH ? message : `${message.slice(0, MAX_MESSAGE_LENGTH - 3)}...`;

const parseToken = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const fetchUser = async (token: string | null) => {
  if (!token) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.error("[hero-chat] auth fetch failed", error);
    return null;
  }

  return data?.user ?? null;
};

const fetchConversationForUser = async (
  db: ReturnType<typeof supabaseAdmin>,
  userId: string,
  conversationId?: string,
) => {
  if (conversationId) {
    const { data } = await db
      .from("hero_chat_conversations")
      .select("id, user_id, anonymous_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (data?.user_id === userId) {
      return data;
    }
  }

  const { data } = await db
    .from("hero_chat_conversations")
    .select("id, user_id, anonymous_id")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data;

  const { data: inserted } = await db
    .from("hero_chat_conversations")
    .insert({ user_id: userId, anonymous_id: null })
    .select("id, user_id, anonymous_id")
    .maybeSingle();

  return inserted ?? null;
};

const fetchConversationForAnonymous = async (
  db: ReturnType<typeof supabaseAdmin>,
  anonymousId: string,
  conversationId?: string,
) => {
  if (conversationId) {
    const { data } = await db
      .from("hero_chat_conversations")
      .select("id, user_id, anonymous_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (data?.anonymous_id === anonymousId && !data.user_id) {
      return data;
    }
  }

  const { data } = await db
    .from("hero_chat_conversations")
    .select("id, user_id, anonymous_id")
    .eq("anonymous_id", anonymousId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data;

  const existingCount = await db
    .from("hero_chat_conversations")
    .select("id", { count: "exact", head: true })
    .eq("anonymous_id", anonymousId);

  if (existingCount?.count !== null && existingCount.count >= ANONYMOUS_CONVERSATION_LIMIT) {
    return null;
  }

  const { data: inserted } = await db
    .from("hero_chat_conversations")
    .insert({ anonymous_id: anonymousId, user_id: null })
    .select("id, user_id, anonymous_id")
    .maybeSingle();

  return inserted ?? null;
};

const attachAnonymousToUser = async (
  db: ReturnType<typeof supabaseAdmin>,
  anonymousId: string,
  userId: string,
) => {
  await db
    .from("hero_chat_conversations")
    .update({ user_id: userId, anonymous_id: null })
    .eq("anonymous_id", anonymousId);
};

const appendMessage = async (
  db: ReturnType<typeof supabaseAdmin>,
  conversationId: string,
  role: "user" | "assistant",
  body: string,
  model: string | null,
) => {
  await db.from("hero_chat_messages").insert({ conversation_id: conversationId, sender_role: role, body, model });
  const now = new Date().toISOString();
  await db
    .from("hero_chat_conversations")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", conversationId);
};

const loadHistory = async (db: ReturnType<typeof supabaseAdmin>, conversationId: string) => {
  const { data } = await db
    .from("hero_chat_messages")
    .select("sender_role, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (!data) return [];

  return data
    .slice()
    .reverse()
    .map((entry) => ({ role: entry.sender_role as "user" | "assistant", content: entry.body }));
};

const loadConversationMessages = async (db: ReturnType<typeof supabaseAdmin>, conversationId: string) => {
  const { data } = await db
    .from("hero_chat_messages")
    .select("sender_role, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(FETCH_MESSAGES_LIMIT);

  if (!data) return [];

  return data
    .slice()
    .reverse()
    .map((entry) => ({ role: entry.sender_role as "user" | "assistant", content: entry.body }));
};

const buildMessagesForAi = (history: HistoryEntry[]) => [...buildContextMessages(), ...history];

const respondWithError = (status: number, payload: Record<string, unknown>) =>
  NextResponse.json(payload, { status });

const buildAiResponse = async (messages: Parameters<typeof generateText>[0]["messages"]) => {
  const model = openai("gpt-5.4");
  const result = await generateText({ model, messages, maxRetries: 0 });

  const reply = result.text?.trim();
  if (!reply) {
    throw new Error("Nincs válasz az AI-től.");
  }

  return reply;
};

export async function GET(request: NextRequest) {
  const token = parseToken(request);
  const user = await fetchUser(token);
  const admin = supabaseAdmin();

  if (!user) {
    return respondWithError(401, { requiresAuth: true, reason: "unauthenticated" });
  }

  const conversation = await fetchConversationForUser(admin, user.id);
  if (!conversation) {
    return NextResponse.json({ conversationId: null, messages: [] });
  }

  const messages = await loadConversationMessages(admin, conversation.id);
  return NextResponse.json({ conversationId: conversation.id, messages });
}

export async function POST(request: NextRequest) {
  try {
    const token = parseToken(request);
    const user = await fetchUser(token);
    const admin = supabaseAdmin();

    const body = (await request.json()) as {
      message?: string;
      history?: unknown;
      conversationId?: string;
      anonymousId?: string;
    };

    const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
    if (!rawMessage) {
      return respondWithError(400, { error: "Üzenet szükséges." });
    }

    const message = clampMessage(rawMessage);
    if (message.length > MAX_MESSAGE_LENGTH) {
      return respondWithError(400, { error: `Üzenet túl hosszú (max ${MAX_MESSAGE_LENGTH} karakter).` });
    }

    let conversation: ConversationRow | null = null;
    let anonymousNeedsAuth = false;
    let anonymousId = body.anonymousId;

    if (user) {
      if (anonymousId) {
        await attachAnonymousToUser(admin, anonymousId, user.id);
      }
      conversation = await fetchConversationForUser(admin, user.id, body.conversationId);
    } else {
      anonymousId = anonymousId ?? body.conversationId ?? null;
      if (!anonymousId) {
        return respondWithError(401, { requiresAuth: true, reason: "anonymous required" });
      }

      conversation = await fetchConversationForAnonymous(admin, anonymousId, body.conversationId);
      if (!conversation) {
        return respondWithError(403, { requiresAuth: true, reason: "anonymous_limit_reached" });
      }
    }

    if (!conversation) {
      return respondWithError(404, { error: "Konverzáció nem található." });
    }

    await appendMessage(admin, conversation.id, "user", message, null);
    const history = await loadHistory(admin, conversation.id);
    const messagesForAi = buildMessagesForAi([...history].map((entry) => ({ role: entry.role, content: entry.content })));
    const reply = await buildAiResponse(messagesForAi);
    await appendMessage(admin, conversation.id, "assistant", reply, "gpt-5.4");

    return NextResponse.json({ message: reply, conversationId: conversation.id });
  } catch (error) {
    console.error("[hero-chat] failed", error);
    return respondWithError(500, { error: "Hiba történt." });
  }
}