"use client";

import { memo } from 'react';
import type { GyontatasMessage } from '@/lib/gyontatoszek/types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: GyontatasMessage[];
  loading: boolean;
  sending: boolean;
  thcLevel?: number;
  preThoughts?: string[];
  shadowText?: string;
  onShare?: (body: string, shadow?: string) => void;
}

function MessageListComponent({ messages, loading, sending, thcLevel = 0, preThoughts, shadowText, onShare }: MessageListProps) {
  if (loading && messages.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-12 text-sm uppercase tracking-[0.24em] text-neutral-500">
        Gondolkodom bazdmeg...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-16">
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.32em] text-lime-300/70">Vállalhatatlan · v3</p>

          <h2 className="mt-4 text-2xl leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] md:text-3xl">
            Ez nem egy chatbot.
          </h2>
          <p className="mt-2 text-base leading-7 text-neutral-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
            V. egy ágens: figyel, tanul. Képes döntéseket hozni. A gondolatait is láthatod. Tanítsuk be együtt, okos kérdésekkel és őszinte emberi gondolatokkal.{' '}
            <a
              href="https://github.com/therealvallalhatatlan/vallal-v1/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-300/90 underline underline-offset-2 hover:text-lime-200"
            >
              Github
            </a>
          </p>

          <div className="mt-8 rounded-xl border border-amber-400/20 bg-black/40 px-4 py-3 backdrop-blur-sm">
            <p className="text-sm leading-6 text-amber-200/90">
              *Fogalmam sincs mire lesz jó. Majd meglátjuk.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-6 md:px-6 md:py-8">
      {messages.map((message, i) => {
        const isCurrentAssistant = sending && message.sender_role === 'assistant' && i === messages.length - 1;
        const isPendingAssistant = isCurrentAssistant && !message.body;
        const msgBehavior = message.sender_role === 'assistant'
          ? (message.metadata as Record<string, unknown> | null | undefined)?.behavior as Record<string, unknown> | undefined
          : undefined;
        const msgShadowText = isCurrentAssistant
          ? shadowText
          : (typeof msgBehavior?.shadowText === 'string' ? msgBehavior.shadowText : undefined);
        return (
          <MessageItem
            key={message.id}
            message={message}
            isStreaming={isCurrentAssistant}
            thcLevel={thcLevel}
            preThoughts={isPendingAssistant ? preThoughts : undefined}
            shadowText={msgShadowText}
            onShare={onShare}
          />
        );
      })}
      <div aria-hidden="true" className="h-px w-full" style={{ overflowAnchor: 'auto' }} />
    </div>
  );
}

export const MessageList = memo(MessageListComponent);
