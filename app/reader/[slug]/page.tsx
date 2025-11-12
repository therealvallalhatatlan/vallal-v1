// File: app/reader/[slug]/page.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { findBySlug, nextPrev } from "../_data/stories";
import { ThemeToggle } from "../ui/ThemeToggle";
import { StoryPicker } from "../ui/StoryPicker";

// --- Minimal markdown to HTML (paragraphs, *italic*, **bold**, line breaks) ---
function mdToHtml(md: string) {
  // Normalize literal "\n" to real newlines if author used them
  const normalized = md.replace(/\\n/g, "\n");
  // Basic escape to avoid accidental HTML; content is author-controlled
  const escaped = normalized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withStrong = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withEm = withStrong.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Paragraphs: two or more newlines → new paragraph
  const paragraphs = withEm.trim().split(/\n\n+/);
  const html = paragraphs
    .map((p) => `<p class="mb-4 leading-relaxed">${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
  return html;
}

export default function StoryPage({ params }: { params: { slug: string } }) {
  const story = useMemo(() => findBySlug(params.slug), [params.slug]);
  const [font, setFont] = useState<number>(() => {
    if (typeof window === "undefined") return 18;
    const saved = Number(localStorage.getItem("reader:font"));
    return Number.isFinite(saved) && saved > 0 ? saved : 18;
  });
  const articleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!story) return;
    // persist: last slug
    localStorage.setItem("reader:last:slug", story.slug);
    // restore per‑story scroll
    const key = `reader:scroll:${story.slug}`;
    const y = Number(localStorage.getItem(key) || 0);
    // Use 'auto' to satisfy TS; 'instant' is non‑standard
    setTimeout(() => window.scrollTo({ top: y, behavior: "auto" }), 0);
    const onScroll = () => localStorage.setItem(key, String(window.scrollY));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [story?.slug]);

  if (!story) {
    return (
      <main className="mx-auto max-w-screen-sm px-4 py-6">
        <p className="opacity-80">Nem található ez a fejezet.</p>
        <Link className="underline" href="/reader">
          Vissza
        </Link>
      </main>
    );
  }

  const { prev, next, idx, total } = nextPrev(story.slug);

  return (
    <main className="mx-auto max-w-screen-sm px-4 pb-24">
      <header className="sticky top-0 z-20 -mx-4 mb-4 border-b bg-[var(--bg)/0.8] backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)/0.6]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/reader" className="text-sm opacity-80 hover:opacity-100">
              Olvasó
            </Link>
            <span className="text-xs opacity-60">
              {idx + 1} / {total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border px-2 py-1 text-xs"
              onClick={() => {
                const v = Math.max(14, font - 1);
                setFont(v);
                localStorage.setItem("reader:font", String(v));
              }}
              aria-label="Betűméret csökkentése"
            >
              A−
            </button>
            <button
              className="rounded-xl border px-2 py-1 text-xs"
              onClick={() => {
                const v = Math.min(24, font + 1);
                setFont(v);
                localStorage.setItem("reader:font", String(v));
              }}
              aria-label="Betűméret növelése"
            >
              A+
            </button>
            <ThemeToggle />
            <StoryPicker currentSlug={story.slug} />
          </div>
        </div>
      </header>

      <article ref={articleRef} className="pt-2" style={{ fontSize: font }}>
        <h1 className="mb-4 text-2xl font-semibold leading-snug">{story.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: mdToHtml(story.content) }} />
      </article>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-[var(--bg)/0.9] backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)/0.6]">
        <div className="mx-auto flex max-w-screen-sm items-stretch justify-between gap-2 px-4 py-3">
          <Link
            href={prev ? `/reader/${prev.slug}` : "/reader"}
            className="flex-1 rounded-2xl border px-4 py-3 text-center text-sm disabled:opacity-40"
            aria-disabled={!prev}
          >
            {prev ? `← ${prev.title}` : "← Tartalom"}
          </Link>
          <Link
            href={next ? `/reader/${next.slug}` : "/reader"}
            className="flex-1 rounded-2xl border px-4 py-3 text-center text-sm"
          >
            {next ? `${next.title} →` : "Vissza a kezdőhöz"}
          </Link>
        </div>
      </nav>
    </main>
  );
}
