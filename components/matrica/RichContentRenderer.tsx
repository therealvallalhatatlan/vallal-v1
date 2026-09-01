'use client'

import type { RichContentBlock, RichContentDocument } from '@/lib/matrica'

interface Props {
  document: RichContentDocument | null | undefined
}

function safeHref(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
    if (value.startsWith('/')) return url.href
  } catch {
    // Invalid URL.
  }
  return null
}

function inlineText(value: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const pattern = /(\*\*([^*]+)\*\*|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) nodes.push(value.slice(lastIndex, match.index))

    if (match[2]) {
      nodes.push(<strong key={`b-${match.index}`}>{match[2]}</strong>)
    } else if (match[3]) {
      nodes.push(<em key={`i-${match.index}`}>{match[3]}</em>)
    } else if (match[4] && match[5]) {
      const href = safeHref(match[5])
      nodes.push(href ? <a key={`a-${match.index}`} href={href} target="_blank" rel="noreferrer">{match[4]}</a> : match[4])
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex))
  return nodes
}

function renderBlock(block: RichContentBlock, index: number): React.ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = block.level === 1 ? 'h1' : block.level === 2 ? 'h2' : 'h3'
      return <Tag key={index} className={`rich-heading rich-heading-${block.level}`}>{inlineText(block.text)}</Tag>
    }
    case 'paragraph':
      return <p key={index} className="rich-paragraph">{inlineText(block.text)}</p>
    case 'quote':
      return <blockquote key={index} className="rich-quote">{inlineText(block.text)}</blockquote>
    case 'bulletList':
      return <ul key={index} className="rich-list">{block.items.filter(Boolean).map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</ul>
    case 'orderedList':
      return <ol key={index} className="rich-list">{block.items.filter(Boolean).map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</ol>
    case 'divider':
      return <hr key={index} className="rich-divider" />
    case 'image':
      return (
        <figure key={index} className="rich-image">
          <img src={block.url} alt={block.alt ?? ''} />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      )
    case 'video':
      return (
        <div key={index} className="rich-video">
          <iframe
            title={`${block.provider} video ${index + 1}`}
            src={block.provider === 'youtube'
              ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(block.videoId)}`
              : `https://player.vimeo.com/video/${encodeURIComponent(block.videoId)}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )
  }
}

export default function RichContentRenderer({ document }: Props) {
  if (!document?.blocks?.length) {
    return (
      <div style={{ padding: 40, color: '#71717a', textAlign: 'center', fontSize: 13 }}>
        Ez a Rich Content még üres.
      </div>
    )
  }

  return (
    <article className="rich-content">
      {document.blocks.map(renderBlock)}
      <style jsx>{`
        .rich-content {
          width: min(900px, 100%);
          margin: 0 auto;
          padding: clamp(28px, 5vw, 64px) clamp(20px, 5vw, 72px) 80px;
          color: #f4f4f5;
          font-family: var(--font-serif, Georgia, serif);
          box-sizing: border-box;
        }
        .rich-content :global(a) {
          color: #bef264;
          text-decoration: underline;
          text-decoration-color: rgba(190,242,100,0.45);
          text-underline-offset: 3px;
        }
        .rich-heading {
          margin: 0 0 18px;
          font-family: var(--font-sans-reader, Inter, sans-serif);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 0.98;
        }
        .rich-heading-1 { font-size: clamp(38px, 7vw, 76px); }
        .rich-heading-2 { font-size: clamp(30px, 5vw, 52px); }
        .rich-heading-3 { font-size: clamp(24px, 4vw, 36px); }
        .rich-paragraph {
          margin: 0 0 24px;
          font-size: clamp(17px, 2vw, 21px);
          line-height: 1.75;
          white-space: pre-wrap;
        }
        .rich-quote {
          margin: 32px 0;
          padding: 4px 0 4px 22px;
          border-left: 2px solid rgba(163,230,53,0.55);
          color: #d4d4d8;
          font-size: clamp(18px, 2.1vw, 24px);
          line-height: 1.65;
          font-style: italic;
        }
        .rich-list {
          margin: 0 0 26px;
          padding-left: 28px;
          font-size: clamp(17px, 2vw, 21px);
          line-height: 1.7;
        }
        .rich-divider {
          margin: 38px 0;
          border: 0;
          border-top: 1px solid rgba(255,255,255,0.10);
        }
        .rich-image {
          margin: 34px 0;
        }
        .rich-image img {
          display: block;
          width: 100%;
          max-height: 720px;
          object-fit: contain;
          background: #030303;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .rich-image figcaption {
          margin-top: 8px;
          color: #71717a;
          font: 11px/1.4 var(--font-mono-tech, monospace);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .rich-video {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          margin: 34px 0;
          background: #030303;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .rich-video iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
    </article>
  )
}
