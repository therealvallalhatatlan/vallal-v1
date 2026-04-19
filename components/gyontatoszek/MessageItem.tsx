"use client";

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GyontatasMessage } from '@/lib/gyontatoszek/types';

interface MessageItemProps {
  message: GyontatasMessage;
  isStreaming?: boolean;
  thcLevel?: number;
  preThoughts?: string[];
  shadowText?: string;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Erratic ADHD half-thoughts shown while V is "typing"
const ADHD_THOUGHTS = [
  '...ezt a fost',
  '...várj',
  '...szóval izé',
  '...jaja de',
  '...faszomatmár',
  '...félbeszakít bazdmeg',
  '...hm hm',
   '...plöm plöm',
   '...miafasz',
    '...jaa értem',
  '...valami',
  '...fogd meg ezt',
  '...egysec',
  '...szart se',
  '...ott volt',
  '...jó jó',
   '...mér ott nézed',
];

function ErraticThinkingDots({ thoughts }: { thoughts?: string[] }) {
  const pool = thoughts && thoughts.length > 0 ? thoughts : ADHD_THOUGHTS;
  const [index, setIndex] = useState(() => Math.floor(Math.random() * pool.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setVisible(false);
      timeout = setTimeout(() => {
        setIndex((prev) => (prev + Math.floor(Math.random() * 4) + 1) % pool.length);
        setVisible(true);
        timeout = setTimeout(cycle, 700 + Math.random() * 700);
      }, 180);
    };
    timeout = setTimeout(cycle, 600 + Math.random() * 500);
    return () => clearTimeout(timeout);
  }, [pool.length]);

  return (
    <span
      className="font-mono text-[15px] text-lime-300/55 transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {pool[index]}
    </span>
  );
}

// Parse V's message body for ~~strikethrough~~ and [[tangential notes]]
function parseVBody(body: string): React.ReactNode {
  const regex = /~~([\s\S]+?)~~|\[\[([\s\S]+?)\]\]/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{body.slice(lastIndex, match.index)}</span>);
    }

    if (match[1] !== undefined) {
      // ~~strikethrough~~ — something V reconsidered mid-sentence
      nodes.push(
        <span
          key={key++}
          className="line-through decoration-red-400/50 text-neutral-500/60"
          aria-label={`[áthúzva: ${match[1]}]`}
        >
          {match[1]}
        </span>,
      );
    } else if (match[2] !== undefined) {
      // [[tangential note]] — an aside V couldn't hold back
      nodes.push(
        <span key={key++} className="text-[0.86em] italic text-neutral-500/65">
          {' '}[[{match[2]}]]
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    nodes.push(<span key={key++}>{body.slice(lastIndex)}</span>);
  }

  return nodes.length > 0 ? <>{nodes}</> : <>{body}</>;
}

function MessageItemComponent({ message, isStreaming = false, thcLevel = 0, preThoughts, shadowText }: MessageItemProps) {
  const isUser = message.sender_role === 'user';
  const isOptimistic = (message.metadata as Record<string, unknown> | null | undefined)?.optimistic === true;
  const doScramble = !isUser && thcLevel > 0.7 && isOptimistic;
  const isShadowPhase = !message.body && isStreaming && !isUser && !!shadowText;

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 10,
        ...(doScramble ? { filter: 'blur(5px)', letterSpacing: '0.18em' } : {}),
      }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: 'normal' }}
      transition={{ duration: doScramble ? 0.72 : 0.18, ease: 'easeOut' }}
      className={isUser ? 'ml-auto w-full max-w-[78%] md:max-w-[70%]' : 'w-full max-w-[92%] md:max-w-[82%]'}
    >
      <div
        className={
          isUser
            ? 'rounded-[22px] bg-white/[0.04] px-4 py-3 text-neutral-200 ring-1 ring-white/6'
            : 'rounded-[24px] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent px-4 py-4 text-neutral-50'
        }
      >
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
          <span className={isUser ? 'text-neutral-500' : 'text-lime-300/70'}>{isUser ? 'Te' : 'V'}</span>
          <span>{formatTimestamp(message.created_at)}</span>
        </div>

        {!isUser && shadowText && message.body ? (
          <details open={isStreaming} className="group mb-3">
            <summary className="cursor-pointer list-none text-[10px] text-neutral-600 transition hover:text-neutral-500 group-open:text-lime-300/40">
              V fej&eacute;ben &middot;&#9658;
            </summary>
            <p className="mt-1.5 border-l border-neutral-700/60 pl-2.5 text-sm italic leading-7 text-neutral-500/70">
              {shadowText}
            </p>
          </details>
        ) : null}

        <div
          className={
            isUser
              ? 'whitespace-pre-wrap text-[17px] leading-8 text-neutral-200/90 md:text-[19px] md:leading-9'
              : 'whitespace-pre-wrap text-[17px] leading-8 text-neutral-100 md:text-[19px] md:leading-9'
          }
        >
          {!message.body && isStreaming && !isUser ? (
            isShadowPhase ? (
              <span className="text-[15px] italic leading-8 text-neutral-500/60 transition-opacity duration-200">
                {shadowText}
              </span>
            ) : (
              <ErraticThinkingDots thoughts={preThoughts} />
            )
          ) : isUser ? (
            message.body
          ) : (
            parseVBody(message.body)
          )}
        </div>
      </div>
    </motion.article>
  );
}

export const MessageItem = memo(MessageItemComponent);

