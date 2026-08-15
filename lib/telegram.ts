import "server-only";

export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: {
    url: string;
  };
};

export type TelegramReplyMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

export function formatTerminalTelegramMessage(input: {
  statuses: string[];
  lines: string[];
  cleanupPrompt?: string;
}) {
  const body = [
    ...input.statuses.map((status) => `[${status}]`),
    ...input.lines,
    input.cleanupPrompt ?? "[SELF_CLEANUP_PROMPT] Rotate command context after checkout confirmation.",
  ].join("\n");

  return `\`\`\`text\n${body}\n\`\`\``;
}

type TelegramApiError = {
  ok: false;
  error_code?: number;
  description?: string;
};

type TelegramApiSuccess<T> = {
  ok: true;
  result: T;
};

async function telegramApiCall<T>(token: string, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as TelegramApiError | TelegramApiSuccess<T> | null;

  if (!response.ok || !body?.ok) {
    const errorCode = body && "error_code" in body ? body.error_code : response.status;
    const description = body && "description" in body ? body.description : "telegram_api_error";
    throw new Error(`${method} failed (${errorCode ?? "unknown"}): ${description ?? "unknown_error"}`);
  }

  return body.result;
}

export async function sendTelegramMessage(input: {
  token: string;
  chatId: string | number;
  text: string;
  replyMarkup?: TelegramReplyMarkup;
}) {
  return telegramApiCall<Record<string, unknown>>(input.token, "sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    reply_markup: input.replyMarkup,
  });
}

export async function answerTelegramCallbackQuery(input: {
  token: string;
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}) {
  return telegramApiCall<boolean>(input.token, "answerCallbackQuery", {
    callback_query_id: input.callbackQueryId,
    text: input.text,
    show_alert: input.showAlert,
  });
}
