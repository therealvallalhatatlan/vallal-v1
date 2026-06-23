"use client";

import { useEffect, useState } from "react";
import { getNyulDbClient } from "../_lib/supabase";
import type { NyulRabbitPost } from "../_lib/types";
import styles from "./nyulvasarnap.module.css";

export default function ProjectorScreen() {
  const [posts, setPosts] = useState<NyulRabbitPost[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const db = getNyulDbClient();
    if (!db) return;

    void db
      .from("nyul_rabbit_posts")
      .select("id, message, created_at, public_id")
      .order("created_at", { ascending: false })
      .limit(50)
      .then((result: { data: NyulRabbitPost[] | null }) => {
        setPosts(result.data ?? []);
      });

    const channel = db
      .channel("nyul-rabbit-projector")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nyul_rabbit_posts" },
        (payload: { new: NyulRabbitPost }) => {
          setPosts((prev) => [payload.new, ...prev].slice(0, 60));
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, []);

  const formatTimeStamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <main className={styles.projectorRoot}>
      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.vhsOverlay} aria-hidden="true">
        <span className={styles.recordBadge}>
          <span className={styles.recordDot} />
          RECORD
        </span>
        <span>PUBLIC STREAM</span>
        <span className={styles.liveTime}>{currentTime.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      </div>

      <h1 className={styles.projectorTitle}>Vállalhatatlan Intergalaktikus Nyúlvasárnap</h1>
      <section className={styles.projectorFeed}>
        {posts.map((post) => (
          <article className={styles.projectorItem} key={post.id}>
            <div className={styles.projectorCardHeader}>
              <span className={styles.projectorMeta}>{post.public_id ?? "ANON"}</span>
              <time className={styles.projectorTimestamp}>{formatTimeStamp(post.created_at)}</time>
            </div>
            <p className={styles.projectorMessage}>{post.message}</p>
          </article>
        ))}
        {posts.length === 0 ? <p className={styles.projectorEmpty}>Nincs bejovo uzenet.</p> : null}
      </section>
    </main>
  );
}
