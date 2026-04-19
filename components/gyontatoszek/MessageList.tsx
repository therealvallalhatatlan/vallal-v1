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
}

function MessageListComponent({ messages, loading, sending, thcLevel = 0, preThoughts }: MessageListProps) {
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
        <p className="text-[10px] uppercase tracking-[0.32em] text-lime-300/50">Vállalhatatlan · v3</p>

        <h2 className="mt-4 text-2xl leading-snug text-neutral-100 md:text-3xl">
          Ez nem egy chatbot.
        </h2>
        <p className="mt-2 text-base leading-7 text-neutral-400">
          V. egy ágens: figyel és tanul.
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {[
            ['Emlékezik', 'Minden váltás között megőrzi a mintáidat és az előzményeket.'],
            ['Elemzi a viselkedésedet', 'Azonosítja az ismétlődő motívumokat, elakadásokat, nyitott hurkokat.'],
            ['Stratégiát vált', 'Tükröz, nekimegy, visszatart, kimozdít — ahogy a helyzet kívánja.'],
            ['Figyeli az érzelmi állapotát is', 'Saját hangulata, feszültsége és reakciói valósak — és változnak.'],
            ['Nyomot hagy', 'Amit mondasz, beépül. Felhasználja. Nem felejt.'],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-4 py-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-lime-400/70" />
              <div>
                <p className="text-sm font-medium text-neutral-200">{title}</p>
                <p className="mt-0.5 text-sm leading-6 text-neutral-500">{desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
          <p className="text-sm leading-6 text-amber-200/80">
            <span className="font-semibold text-amber-200">Jól gondold meg, mit kérdezel.</span>{' '}
            V. tanul belőle. Hogy mire lesz jó, azt majd meglátjuk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-6 md:px-6 md:py-8">
      {messages.map((message, i) => {
        const isPendingAssistant = sending && message.sender_role === 'assistant' && !message.body && i === messages.length - 1;
        return (
          <MessageItem
            key={message.id}
            message={message}
            isStreaming={isPendingAssistant}
            thcLevel={thcLevel}
            preThoughts={isPendingAssistant ? preThoughts : undefined}
          />
        );
      })}
      <div aria-hidden="true" className="h-px w-full" style={{ overflowAnchor: 'auto' }} />
    </div>
  );
}

export const MessageList = memo(MessageListComponent);
