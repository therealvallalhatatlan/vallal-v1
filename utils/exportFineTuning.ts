import type { GyontatasMessage } from '@/lib/gyontatoszek/types';

const SYSTEM_PROMPT =
  'V egy ágens: figyel, tanul, és képes döntéseket hozni. Magyar nyelven kommunikál. Emlékezik a korábbi üzenetekre, elemzi a viselkedési mintákat, és stratégiát vált ahogy a helyzet kívánja.';

interface FineTuneRecord {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  metadata?: {
    created_at?: string;
    model?: string | null;
    behavior?: unknown;
  };
}

export function buildJsonlString(messages: GyontatasMessage[]): string {
  const lines: string[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    const userMsg = messages[i];
    const assistantMsg = messages[i + 1];

    if (userMsg.sender_role !== 'user' || assistantMsg.sender_role !== 'assistant') {
      continue;
    }

    if (!userMsg.body.trim() || !assistantMsg.body.trim()) {
      continue;
    }

    const behavior = (assistantMsg.metadata as Record<string, unknown> | null | undefined)?.behavior;

    const record: FineTuneRecord = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg.body },
        { role: 'assistant', content: assistantMsg.body },
      ],
      metadata: {
        created_at: assistantMsg.created_at,
        model: assistantMsg.model,
        ...(behavior !== undefined ? { behavior } : {}),
      },
    };

    lines.push(JSON.stringify(record));
  }

  return lines.join('\n');
}

export async function sendMessagesAsJsonl(
  messages: GyontatasMessage[],
  accessToken: string,
  pairCount: number,
): Promise<void> {
  const jsonl = buildJsonlString(messages);
  if (!jsonl) return;

  const res = await fetch('/api/gyontatoszek/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ jsonl, pairCount }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((data.error as string | undefined) ?? 'Küldés sikertelen');
  }
}
