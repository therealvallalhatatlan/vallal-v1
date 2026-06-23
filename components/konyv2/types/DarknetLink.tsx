'use client'

import { useEffect, useState } from 'react'
import type { Konyv2PageProps } from '@/components/konyv2/props'

/* ─── VT323 font — same strategy as TerminalOs ───────────────────── */
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=VT323&display=swap'

/* ─── inline styles (no Tailwind class name collisions) ──────────── */
const css = `
  @import url('${FONT_URL}');

  .dnl-root {
    min-height: 100dvh;
    width: 100%;
    background: #070709;
    color: #d4d4c8;
    font-family: 'VT323', 'Courier New', monospace;
    font-size: 1.05rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 0 60px;
    position: relative;
    overflow-x: hidden;
  }

  /* scanlines */
  .dnl-root::before {
    content: '';
    pointer-events: none;
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(0,0,0,0.18) 3px,
      rgba(0,0,0,0.18) 4px
    );
    z-index: 50;
  }

  .dnl-inner {
    width: 100%;
    max-width: 480px;
    padding: 0 18px;
    box-sizing: border-box;
  }

  /* ── header ── */
  .dnl-header {
    padding-top: 52px;
    padding-bottom: 8px;
    border-bottom: 1px solid #2a2a2a;
    margin-bottom: 28px;
  }

  .dnl-breadcrumb {
    font-size: 0.75rem;
    color: #555;
    letter-spacing: 0.04em;
    margin-bottom: 14px;
    text-transform: uppercase;
  }

  .dnl-title {
    font-size: 2.2rem;
    line-height: 1.1;
    color: #e8e8e0;
    letter-spacing: 0.03em;
    margin: 0;
    word-break: break-word;
  }

  .dnl-sep {
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, #2a2a2a, #555, #2a2a2a);
    margin: 22px 0;
  }

  /* ── content ── */
  .dnl-content {
    color: #b0b09a;
    font-size: 1rem;
    line-height: 1.75;
    white-space: pre-wrap;
    margin-bottom: 28px;
  }

  /* ── youtube embed ── */
  .dnl-video-label {
    font-size: 0.72rem;
    color: #444;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .dnl-video-wrap {
    position: relative;
    width: 100%;
    padding-top: 56.25%; /* 16:9 */
    background: #000;
    border: 1px solid #222;
    overflow: hidden;
    margin-bottom: 32px;
  }

  .dnl-video-wrap iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }

  /* ── link block ── */
  .dnl-link-label {
    font-size: 0.72rem;
    color: #444;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .dnl-link-block {
    border: 1px solid #252525;
    padding: 14px 16px;
    background: #0d0d0f;
  }

  .dnl-link-block a {
    color: #a8bfdf;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: #3a4f6a;
    font-size: 1.05rem;
    word-break: break-all;
    transition: color 0.15s, text-decoration-color 0.15s;
  }

  .dnl-link-block a:hover {
    color: #ccd9ef;
    text-decoration-color: #6a8fb8;
  }

  .dnl-link-arrow {
    color: #555;
    margin-right: 6px;
    font-size: 1rem;
    user-select: none;
  }

  /* ── footer ── */
  .dnl-footer {
    margin-top: 48px;
    font-size: 0.7rem;
    color: #2e2e2e;
    text-align: center;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`

export default function DarknetLink({ title, content, props }: Konyv2PageProps) {
  const videoId  = props?.videoId  as string | undefined
  const linkUrl  = props?.linkUrl  as string | undefined
  const linkText = props?.linkText as string | undefined

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  /* Sanitise the YouTube video ID — allow only alphanumeric + dash + underscore */
  const safeVideoId = videoId?.replace(/[^A-Za-z0-9_-]/g, '') ?? null

  /* Sanitise the link URL — allow only http(s) scheme */
  const safeLinkUrl =
    linkUrl && /^https?:\/\//i.test(linkUrl) ? linkUrl : null

  return (
    <>
      <style>{css}</style>
      <div className="dnl-root">
        <div className="dnl-inner">

          {/* ── header ── */}
          <header className="dnl-header">
            <p className="dnl-breadcrumb">vallalhatatlan / konyv-2</p>
            <h1 className="dnl-title">{title}</h1>
          </header>

          {/* ── optional text content ── */}
          {content && <p className="dnl-content">{content}</p>}

          <div className="dnl-sep" />

          {/* ── youtube embed ── */}
          {safeVideoId && mounted && (
            <section>
              <p className="dnl-video-label">// videó</p>
              <div className="dnl-video-wrap">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${safeVideoId}?rel=0&modestbranding=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                />
              </div>
            </section>
          )}

          {/* ── link ── */}
          {safeLinkUrl && (
            <section>
              <p className="dnl-link-label">// link</p>
              <div className="dnl-link-block">
                <span className="dnl-link-arrow">→</span>
                <a
                  href={safeLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkText ?? safeLinkUrl}
                </a>
              </div>
            </section>
          )}

          <div className="dnl-sep" />

          <footer className="dnl-footer">vállalhatatlan — 2026</footer>
        </div>
      </div>
    </>
  )
}
