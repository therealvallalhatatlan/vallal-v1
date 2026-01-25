// components/Feed.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import DOMPurify from "dompurify";
import { useSessionGuard } from "@/hooks/useSessionGuard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FeedPost {
  id: string;
  user_id: string;
  user_email: string;
  nickname: string | null;
  body: string;
  created_at: string;
  updated_at: string | null;
  is_edited: boolean;
}

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { session } = useSessionGuard() as {
    session: { access_token?: string; user?: { id?: string } } | null;
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load initial posts
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/feed?limit=20");
        const json = await res.json();
        if (mounted && json.ok) {
          setPosts(json.posts || []);
          setHasMore((json.posts || []).length >= 20);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    // Real-time subscription for new posts
    const sub = supabase
      .channel("public:feed_posts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feed_posts",
        },
        (payload) => {
          setPosts((prev) => [payload.new as FeedPost, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feed_posts",
        },
        (payload) => {
          setPosts((prev) =>
            prev.map((post) =>
              post.id === payload.new.id ? (payload.new as FeedPost) : post
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "feed_posts",
        },
        (payload) => {
          setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      sub.unsubscribe();
    };
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading]);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const oldestPost = posts[posts.length - 1];
      const res = await fetch(
        `/api/feed?limit=20&before=${encodeURIComponent(oldestPost.created_at)}`
      );
      const json = await res.json();

      if (json.ok) {
        const newPosts = json.posts || [];
        setPosts((prev) => [...prev, ...newPosts]);
        setHasMore(newPosts.length >= 20);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Írj valamit a bejegyzéshez.");
      return;
    }

    if (body.length > 2000) {
      setError("Maximum 2000 karakter engedélyezett.");
      return;
    }

    if (!session?.access_token) {
      setError("Be kell jelentkezned a bejegyzéshez.");
      return;
    }

    setPosting(true);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ body }),
      });

      const json = await res.json();

      if (!json.ok) {
        if (json.error === "rate_limited") {
          setError("Túl sok bejegyzés! Várj egy kicsit.");
        } else {
          setError(json.error || "Hiba történt.");
        }
      } else {
        setBody("");
        setError(null);
        // Scroll to top to see new post
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Real-time subscription will add it to the list
      }
    } catch (e) {
      console.error(e);
      setError("Hálózati hiba.");
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (post: FeedPost) => {
    // Check if within 5-minute window
    const createdAt = new Date(post.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > 5) {
      setError("Már nem szerkesztheted ezt a bejegyzést (5 perc eltelt).");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setEditingPostId(post.id);
    setEditBody(post.body);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditBody("");
    setError(null);
  };

  const submitEdit = async (postId: string) => {
    setError(null);

    if (!editBody.trim()) {
      setError("A bejegyzés nem lehet üres.");
      return;
    }

    if (editBody.length > 2000) {
      setError("Maximum 2000 karakter engedélyezett.");
      return;
    }

    if (!session?.access_token) {
      setError("Be kell jelentkezned a szerkesztéshez.");
      return;
    }

    try {
      const res = await fetch("/api/feed", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: postId, body: editBody }),
      });

      const json = await res.json();

      if (!json.ok) {
        if (json.error === "edit_window_expired") {
          setError("A szerkesztési idő lejárt (5 perc).");
          setTimeout(() => setError(null), 3000);
        } else {
          setError(json.error || "Hiba történt.");
          setTimeout(() => setError(null), 3000);
        }
      } else {
        setEditingPostId(null);
        setEditBody("");
        setError(null);
        // Real-time subscription will update the list
      }
    } catch (e) {
      console.error(e);
      setError("Hálózati hiba.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "most";
    if (diffMins < 60) return `${diffMins} perce`;
    if (diffHours < 24) return `${diffHours} órája`;
    if (diffDays < 7) return `${diffDays} napja`;
    return date.toLocaleDateString("hu-HU");
  };

  const canEdit = (post: FeedPost) => {
    if (!session?.user?.id || post.user_id !== session.user.id) return false;
    const createdAt = new Date(post.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes <= 5;
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a bejegyzést?")) {
      return;
    }

    if (!session?.access_token) {
      setError("Be kell jelentkezned a törléshez.");
      return;
    }

    try {
      const res = await fetch("/api/feed", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: postId }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error || "Hiba történt a törlés során.");
        setTimeout(() => setError(null), 3000);
      } else {
        setError(null);
      }
      // Real-time subscription will remove it from the list
    } catch (e) {
      console.error(e);
      setError("Hálózati hiba.");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-100 mb-2">
          Közösségi Feed
        </h1>
        <p className="text-sm text-neutral-400">
          Oszd meg gondolataidat a közösséggel
        </p>
      </div>

      {/* New Post Form */}
      <div className="mb-8 bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <textarea
              ref={textareaRef}
              placeholder="Mit szeretnél megosztani?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full rounded-md bg-neutral-950/60 border border-neutral-700 px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-neutral-500">
                {body.length} / 2000 karakter
              </span>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            {posting ? "Közzététel..." : "Közzététel"}
          </button>
        </form>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">
          Betöltés...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <p className="mb-2">Még nincsenek bejegyzések.</p>
          <p className="text-sm">Légy te az első! 🚀</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {(post.nickname || post.user_email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <a
                      href={`/user/${post.user_id}`}
                      className="text-sm font-medium text-neutral-200 hover:text-purple-400 transition-colors"
                    >
                      {post.nickname || post.user_email}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>{formatDate(post.created_at)}</span>
                      {post.is_edited && (
                        <span className="text-neutral-600">(szerkesztve)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit/Delete buttons */}
                {session?.user?.id === post.user_id && editingPostId !== post.id && (
                  <div className="flex items-center gap-2">
                    {canEdit(post) && (
                      <button
                        onClick={() => startEdit(post)}
                        className="text-xs text-neutral-400 hover:text-purple-400 transition-colors"
                      >
                        Szerkesztés
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      Törlés
                    </button>
                  </div>
                )}
              </div>

              {/* Post Body */}
              {editingPostId === post.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-md bg-neutral-950/60 border border-neutral-700 px-3 py-2 text-sm text-neutral-200"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => submitEdit(post.id)}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      Mentés
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-medium rounded transition-colors"
                    >
                      Mégse
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-neutral-300 whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(post.body, {
                      ALLOWED_TAGS: [],
                      ALLOWED_ATTR: [],
                    }),
                  }}
                />
              )}
            </div>
          ))}

          {/* Infinite Scroll Observer Target */}
          {hasMore && (
            <div
              ref={observerTarget}
              className="py-8 text-center text-neutral-400 text-sm"
            >
              {loadingMore ? "Betöltés..." : ""}
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="py-8 text-center text-neutral-500 text-sm">
              Minden bejegyzés betöltve
            </div>
          )}
        </div>
      )}
    </div>
  );
}
