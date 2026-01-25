"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@supabase/supabase-js";
import DOMPurify from "dompurify";
import { useSessionGuard } from "@/hooks/useSessionGuard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserProfile {
  id: string;
  nickname: string | null;
}

interface FeedPost {
  id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  is_edited: boolean;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { session } = useSessionGuard() as {
    session: { access_token?: string; user?: { id?: string } } | null;
  };

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [saving, setSaving] = useState(false);

  const isOwnProfile = session?.user?.id === userId;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        // Fetch user's posts first
        const { data: postsData, error: postsError } = await supabase
          .from("feed_posts")
          .select("id, user_id, nickname, body, created_at, updated_at, is_edited")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (postsError) {
          console.error("Error fetching posts:", postsError);
          setError("Nem sikerült betölteni a profilt.");
          return;
        }

        setPosts((postsData || []) as FeedPost[]);

        // Try to get profile from API (users table)
        let nickname = null;
        try {
          const profileRes = await fetch(`/api/user/profile?userId=${userId}`);
          const profileJson = await profileRes.json();
          if (profileJson.ok && profileJson.profile) {
            nickname = profileJson.profile.nickname;
          }
        } catch (e) {
          console.log("Users table not available, using feed data");
        }

        // Fallback: get nickname from latest post if API fails
        if (!nickname && postsData && postsData.length > 0) {
          nickname = postsData[0].nickname;
        }

        setProfile({
          id: userId,
          nickname: nickname,
        });
        setEditNickname(nickname || "");

      } catch (err) {
        console.error(err);
        setError("Hiba történt a betöltés során.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const handleSaveNickname = async () => {
    if (!session?.access_token) {
      setError("Be kell jelentkezned a mentéshez.");
      return;
    }

    const trimmed = editNickname.trim();
    if (trimmed.length < 1 || trimmed.length > 50) {
      setError("A nickname 1-50 karakter között kell lennie.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ nickname: trimmed }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error || "Hiba történt a mentés során.");
      } else {
        setProfile(json.profile);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
      setError("Hálózati hiba.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="text-center py-12 text-neutral-400">Betöltés...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <p className="text-neutral-400 mb-4">{error || "Profil nem található."}</p>
            <button
              onClick={() => router.push("/feed")}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              ← Vissza a feedhez
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/feed")}
            className="text-neutral-400 hover:text-purple-400 text-sm mb-4 transition-colors"
          >
            ← Vissza a feedhez
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-black border-2 border-lime-400 flex items-center justify-center text-lime-400 font-bold text-3xl">
              {((profile.nickname || "?")[0]).toUpperCase()}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    maxLength={50}
                    className="w-full rounded-md bg-neutral-950/60 border border-neutral-700 px-3 py-2 text-lg font-bold text-neutral-100"
                    placeholder="Add meg a neved"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNickname}
                      disabled={saving}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      {saving ? "Mentés..." : "Mentés"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditNickname(profile.nickname || "");
                        setError(null);
                      }}
                      disabled={saving}
                      className="px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded transition-colors"
                    >
                      Mégse
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-neutral-100">
                      {profile.nickname || "Névtelen felhasználó"}
                    </h1>
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-neutral-400 hover:text-purple-400 transition-colors"
                      >
                        Szerkesztés
                      </button>
                    )}
                  </div>
                  {isOwnProfile && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Ez a te profilod
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {posts.length}
                </div>
                <div className="text-xs text-neutral-500">Bejegyzés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {posts.length > 0 ? formatDate(posts[0].created_at) : "-"}
                </div>
                <div className="text-xs text-neutral-500">Utoljára aktív</div>
              </div>
            </div>
          </div>
        </div>

        {/* User's Posts */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-200 mb-4">
            Bejegyzések ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <p>Még nincs bejegyzés.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                    <span>{formatDate(post.created_at)}</span>
                    {post.is_edited && (
                      <span className="text-neutral-600">(szerkesztve)</span>
                    )}
                  </div>

                  <div
                    className="text-sm text-neutral-300 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(post.body, {
                        ALLOWED_TAGS: [],
                        ALLOWED_ATTR: [],
                      }),
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
