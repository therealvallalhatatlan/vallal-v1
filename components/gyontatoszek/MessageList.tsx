"use client";

import { memo } from 'react';
import type { GyontatasMessage } from '@/lib/gyontatoszek/types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: GyontatasMessage[];
  loading: boolean;
  sending: boolean;
}

function MessageListComponent({ messages, loading, sending }: MessageListProps) {
  if (loading && messages.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-12 text-sm uppercase tracking-[0.24em] text-neutral-500">
        Gondolkodom bazdmeg...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl flex-col items-start justify-center px-6 py-16 text-left">
        <p className="text-[10px] uppercase tracking-[0.32em] text-neutral-500">Start Screen</p>
        <h2 className="mt-3 max-w-2xl text-2xl leading-tight text-neutral-100 md:text-3xl">
          Vállalhatatlan Szimulátor
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-neutral-400">
          Beszélgess Vállalhatatlan kegyetlen elméjével.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-6 md:px-6 md:py-8">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isStreaming={sending && message.sender_role === 'assistant' && !message.body}
        />
      ))}
      <div aria-hidden="true" className="h-px w-full" style={{ overflowAnchor: 'auto' }} />
    </div>
  );
}

export const MessageList = memo(MessageListComponent);
