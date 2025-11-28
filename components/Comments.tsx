// components/Comments.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DOMPurify from "dompurify";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}&limit=100`);
        const json = await res.json();
        if (mounted && json.ok) setComments(json.comments || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    // realtime sub: új INSERT esetén frissítjük
    const sub = supabase
      .channel("public:comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `story_slug=eq.${slug}` },
        (payload) => {
          // payload.new tartalmazza a sor objektumot
          setComments((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      sub.unsubscribe();
    };
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("Írj valamit a kommenthez.");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_slug: slug, author: author || "Anonim", body }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Hiba történt.");
      } else {
        setBody("");
        // optimista: majd a realtime be fogja tolni, de pusholjuk ide is
        setComments((prev) => [{ id: "temp-" + Date.now(), story_slug: slug, author: author || "Anonim", body, created_at: new Date().toISOString() }, ...prev]);
      }
    } catch (e) {
      console.error(e);
      setError("Hálózati hiba.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-neutral-600 mb-2">Szólj hozzá</h3>

      <form onSubmit={submit} className="space-y-2">
        <input
          placeholder="Neved (opcionális)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full rounded-md bg-neutral-900/60 border border-neutral-800 px-3 py-2 text-sm text-neutral-200"
        />
        <textarea
          placeholder="Írd ide a gondolatod…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-md bg-neutral-900/60 border border-neutral-800 px-3 py-2 text-sm text-neutral-200"
        />
        {error && <div className="text-xs text-rose-400">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" disabled={posting} className="rounded-md bg-lime-600 px-3 py-1 text-sm font-semibold text-black">
            Küldés
          </button>
          <button type="button" onClick={() => { setAuthor(""); setBody(""); }} className="rounded-md border border-neutral-700 px-3 py-1 text-sm">
            Törlés
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="text-sm text-neutral-500">Betöltés…</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-neutral-500">Még nincs hozzászólás.</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-md border border-neutral-800 bg-neutral-950/50 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <strong className="text-neutral-200">@ {c.author}</strong>
                <time className="text-xs text-neutral-500">{new Date(c.created_at).toLocaleString()}</time>
              </div>
              <div className="mt-1 text-neutral-300" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.body) }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
