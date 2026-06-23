"use client";

import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ensureIdentity, getNyulDbClient, markFeatureComplete } from "../_lib/supabase";
import type { NyulFeedEntry, NyulFeatureKey, NyulIdentitySession } from "../_lib/types";
import styles from "./nyulvasarnap.module.css";

const ALL_FEATURES: NyulFeatureKey[] = ["rabbit-network", "person-finder", "fourth-volume", "meet-someone"];

type DashboardProps = {
  session: NyulIdentitySession;
  onResetIdentity: () => void;
};

type TickerMessage = {
  id: string;
  publicId: string;
  message: string;
  created_at: string;
};

export default function Dashboard({ session, onResetIdentity }: DashboardProps) {
  const [ticker, setTicker] = useState<TickerMessage[]>([]);
  const [feed, setFeed] = useState<NyulFeedEntry[]>([]);
  const [rabbitMessage, setRabbitMessage] = useState("");
  const [rabbitStatus, setRabbitStatus] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Array<{ public_id: string; display_name: string; identity_token: string }>>([]);
  const [selectedUserToken, setSelectedUserToken] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; body: string; sender_identity_token: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePartner, setActivePartner] = useState<{ public_id: string; display_name: string; identity_token: string } | null>(null);
  const [personStatus, setPersonStatus] = useState("");
  const [completion, setCompletion] = useState<Record<NyulFeatureKey, boolean>>({
    "rabbit-network": false,
    "person-finder": false,
    "fourth-volume": false,
    "meet-someone": false,
  });
  const [matchResult, setMatchResult] = useState<{ location_text: string; icebreaker_text: string } | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const completedCount = useMemo(() => ALL_FEATURES.filter((key) => completion[key]).length, [completion]);
  const unlocked = completedCount === ALL_FEATURES.length;
  const selectedOnlineUser = useMemo(
    () => onlineUsers.find((user) => user.identity_token === selectedUserToken) ?? null,
    [onlineUsers, selectedUserToken]
  );

  async function refreshTickerFromDb() {
    const db = getNyulDbClient();
    if (!db) return;

    const result = await db
      .from("nyul_rabbit_posts")
      .select("id, message, created_at, public_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!result.error && result.data) {
      setTicker(
        result.data.map((entry: { id: string; message: string; created_at: string; public_id: string | null }) => ({
          id: entry.id,
          publicId: entry.public_id ?? "ANON",
          message: entry.message,
          created_at: entry.created_at,
        }))
      );
    }
  }

  async function refreshOnlineUsers() {
    const db = getNyulDbClient();
    if (!db) return;

    const result = await db
      .from("nyul_identities")
      .select("public_id, display_name, identity_token")
      .eq("is_active", true)
      .neq("identity_token", session.identityToken)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (!result.error && result.data) {
      const users = result.data as Array<{ public_id: string; display_name: string; identity_token: string }>;
      setOnlineUsers(users);

      setSelectedUserToken((previous) =>
        previous && !users.some((user) => user.identity_token === previous) ? "" : previous
      );
    }
  }

  useEffect(() => {
    const db = getNyulDbClient();
    if (!db) return;

    void refreshTickerFromDb();
    void refreshOnlineUsers();

    void db
      .from("nyul_feed_entries")
      .select("id, body, source_type, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(40)
      .then((result: { data: NyulFeedEntry[] | null }) => {
        const feedData = result.data;
        if (feedData) {
          setFeed(feedData);
          setCompletion((prev) => ({ ...prev, "fourth-volume": feedData.length > 0 || prev["fourth-volume"] }));
        }
      });

    const tickerChannel = db
      .channel("nyul-rabbit-ticker-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nyul_rabbit_posts" },
        (payload: { new: { id: string; message: string; created_at: string; public_id: string | null; status?: string } }) => {
          if (payload.new.status && payload.new.status !== "approved") return;

          setTicker((prev) => [
            {
              id: payload.new.id,
              publicId: payload.new.public_id ?? "ANON",
              message: payload.new.message,
              created_at: payload.new.created_at,
            },
            ...prev,
          ].slice(0, 20));
        }
      )
      .subscribe();

    const tickerPollingId = window.setInterval(() => {
      void refreshTickerFromDb();
    }, 3000);

    const onlineUsersPollingId = window.setInterval(() => {
      void refreshOnlineUsers();
    }, 5000);

    return () => {
      db.removeChannel(tickerChannel);
      window.clearInterval(tickerPollingId);
      window.clearInterval(onlineUsersPollingId);
    };
  }, [session.identityToken]);

  async function submitRabbitNetwork() {
    const message = rabbitMessage.trim();
    if (!message) return;

    const db = getNyulDbClient();
    if (!db) {
      setRabbitStatus("A Supabase kliens nem erheto el ebben a bongeszoben.");
      return;
    }

    setRabbitStatus("Kuldes folyamatban...");

    try {
      await ensureIdentity(session);
    } catch (error) {
      setRabbitStatus(error instanceof Error ? `Identity hiba: ${error.message}` : "Identity hiba tortent.");
      return;
    }

    const rabbitInsert = await db
      .from("nyul_rabbit_posts")
      .insert({
        identity_token: session.identityToken,
        public_id: session.publicId,
        message,
      })
      .select("id, message, created_at, public_id")
      .single();

    if (rabbitInsert.error) {
      setRabbitStatus(`Mentési hiba: ${rabbitInsert.error.message}`);
      return;
    }

    if (rabbitInsert.data) {
      setTicker((prev) => [
        {
          id: rabbitInsert.data.id,
          publicId: rabbitInsert.data.public_id ?? "ANON",
          message: rabbitInsert.data.message,
          created_at: rabbitInsert.data.created_at,
        },
        ...prev,
      ].slice(0, 20));
    }

    try {
      await markFeatureComplete(session, "rabbit-network");
    } catch (error) {
      setRabbitStatus(
        `A bejegyzes elment, de a progress nem: ${error instanceof Error ? error.message : "ismeretlen hiba"}`
      );
      return;
    }

    setCompletion((prev) => ({ ...prev, "rabbit-network": true }));
    setRabbitMessage("");
    setRabbitStatus("Uzenet elmentve a halozatba.");
  }

  async function connectSelectedUser() {
    if (!selectedOnlineUser) {
      setPersonStatus("Valassz egy online usert a listabol.");
      return;
    }

    await startChatWithTarget(selectedOnlineUser);
  }

  async function startChatWithTarget(target: { public_id: string; display_name: string; identity_token: string }) {
    const db = getNyulDbClient();
    if (!db) return;

    const threadResult = await db.rpc("nyul_start_chat", {
      p_identity_token: session.identityToken,
      p_target_public_id: target.public_id,
    });

    const threadId = threadResult.data as string | null;
    if (!threadId) {
      setPersonStatus("Chat inditas sikertelen.");
      return;
    }

    setActiveThreadId(threadId);
    setActivePartner(target);
    setPersonStatus(`Kapcsolodva: ${target.public_id}`);

    const history = await db
      .from("nyul_chat_messages")
      .select("id, body, sender_identity_token")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(80);

    setChatMessages(history.data ?? []);

    await markFeatureComplete(session, "person-finder");
    setCompletion((prev) => ({ ...prev, "person-finder": true }));

    const channel = db
      .channel(`nyul-chat-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nyul_chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload: { new: { id: string; body: string; sender_identity_token: string } }) => {
          setChatMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    setTimeout(() => {
      db.removeChannel(channel);
    }, 1000 * 60 * 30);
  }

  async function sendChatMessage() {
    if (!activeThreadId) return;
    const message = chatInput.trim();
    if (!message) return;

    const db = getNyulDbClient();
    if (!db) return;

    await db.from("nyul_chat_messages").insert({
      thread_id: activeThreadId,
      sender_identity_token: session.identityToken,
      body: message,
    });

    setChatInput("");
  }

  async function blockUser(target: { identity_token: string; public_id: string }) {
    const db = getNyulDbClient();
    if (!db) return;

    await db.from("nyul_user_blocks").insert({
      identity_token: session.identityToken,
      blocked_identity_token: target.identity_token,
    });

    setPersonStatus(`${target.public_id} blokkolva.`);
  }

  async function reportUser(target: { identity_token: string; public_id: string }) {
    const db = getNyulDbClient();
    if (!db) return;

    await db.from("nyul_user_reports").insert({
      identity_token: session.identityToken,
      target_identity_token: target.identity_token,
      reason: "manual-report",
    });

    setPersonStatus(`${target.public_id} report kuldve.`);
  }

  async function requestMatch() {
    const db = getNyulDbClient();
    if (!db) return;

    const result = await db.rpc("nyul_join_pool", { p_identity_token: session.identityToken });
    const row = Array.isArray(result.data) ? result.data[0] : null;

    if (row?.location_text && row?.icebreaker_text) {
      setMatchResult({ location_text: row.location_text, icebreaker_text: row.icebreaker_text });
    }

    await markFeatureComplete(session, "meet-someone");

    setCompletion((prev) => ({ ...prev, "meet-someone": true }));
  }

  return (
    <div className={styles.shell}>
      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.vhsOverlay} aria-hidden="true">
        <span>PLAY</span>
        <span>SP VHS</span>
        <span>{new Date().toLocaleTimeString("hu-HU")}</span>
      </div>

      <header className={styles.identityHeader}>
        <div className={styles.identityStrip}>
          <span>ID: {session.publicId}</span>
          {session.displayName && session.displayName !== session.publicId ? <span>{session.displayName}</span> : null}
          <button type="button" className={styles.linkButton} onClick={() => setIsResetDialogOpen(true)}>
            identity reset
          </button>
        </div>
        <div className={styles.tickerWrap}>
          <div className={styles.tickerList}>
            {(ticker.length > 0
              ? ticker
              : [{ id: "boot", publicId: "SYSTEM", message: "Nincs meg user uzenet a halozatban.", created_at: "" }]
            ).map((item) => (
              <div key={item.id} className={styles.tickerRow}>
                <span className={styles.tickerMeta}>{item.publicId}</span>
                <span className={styles.tickerMessage}>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className={styles.mainPanel}>
        <Accordion type="single" collapsible defaultValue="rabbit-network" className={styles.accordionRoot}>
          <AccordionItem value="rabbit-network" className={styles.accordionItem}>
            <AccordionTrigger className={styles.accordionTrigger}>1. / Üzenetküldés</AccordionTrigger>
            <AccordionContent className={styles.accordionContent}>
              <label className={styles.label}>Írj valamit a többieknek</label>
              <textarea
                className={styles.textarea}
                value={rabbitMessage}
                onChange={(event) => setRabbitMessage(event.target.value)}
                maxLength={500}
                placeholder="irj ide..."
              />
              <button type="button" className={styles.actionButton} onClick={submitRabbitNetwork}>
                [ KULDES A HALOZATBA ]
              </button>
              {rabbitStatus ? <p className={styles.helpText}>{rabbitStatus}</p> : null}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="person-finder" className={styles.accordionItem}>
            <AccordionTrigger className={styles.accordionTrigger}>2. / Nyúl kereső</AccordionTrigger>
            <AccordionContent className={styles.accordionContent}>
              <div className={styles.finderTopRow}>
                <select
                  className={styles.input}
                  value={selectedUserToken}
                  onChange={(event) => setSelectedUserToken(event.target.value)}
                >
                  <option value="">Valassz online usert...</option>
                  {onlineUsers.map((user) => (
                    <option key={user.identity_token} value={user.identity_token}>
                      {user.public_id} {user.display_name ? `(${user.display_name})` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" className={styles.actionButton} onClick={connectSelectedUser}>
                  [ CHAT INDITAS ]
                </button>
              </div>

              <div className={styles.finderInfoRow}>
                <p className={styles.helpText}>Online userek: {onlineUsers.length}</p>
                <p className={styles.helpText}>{selectedOnlineUser ? `Kivalasztva: ${selectedOnlineUser.public_id}` : "Valassz egy usert a legordulobol."}</p>
              </div>

              {selectedOnlineUser ? (
                <div className={styles.finderSelectedCard}>
                  <div className={styles.finderUserMain}>
                    <span className={styles.finderUserId}>{selectedOnlineUser.public_id}</span>
                    <span className={styles.finderUserName}>{selectedOnlineUser.display_name || "Anon user"}</span>
                  </div>
                  <div className={styles.finderActionGrid}>
                    <button type="button" className={styles.secondaryButton} onClick={() => blockUser(selectedOnlineUser)}>
                      [ BLOCK ]
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={() => reportUser(selectedOnlineUser)}>
                      [ REPORT ]
                    </button>
                  </div>
                </div>
              ) : null}

              {personStatus ? <p className={styles.helpText}>{personStatus}</p> : null}
              {activeThreadId ? (
                <div className={styles.chatBox}>
                  <p className={styles.helpText}>
                    Aktiv chat: {activePartner?.public_id} ({activeThreadId.slice(0, 8)})
                  </p>
                  <div className={styles.chatMessages}>
                    {chatMessages.map((message) => (
                      <p key={message.id} className={styles.chatMessageLine}>
                        [{message.sender_identity_token === session.identityToken ? "EN" : "MASIK"}] {message.body}
                      </p>
                    ))}
                  </div>
                  <div className={styles.row}>
                    <input
                      className={styles.input}
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Uzenet..."
                    />
                    <button type="button" className={styles.actionButton} onClick={sendChatMessage}>
                      [ KULD ]
                    </button>
                  </div>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fourth-volume" className={styles.accordionItem}>
            <AccordionTrigger className={styles.accordionTrigger}>Feature 3 / The 4th Volume</AccordionTrigger>
            <AccordionContent className={styles.accordionContent}>
              <div className={styles.volumeFeed}>
                {feed.map((entry) => (
                  <article key={entry.id} className={styles.feedItem}>
                    <span className={styles.feedType}>{entry.source_type}</span>
                    <p>{entry.body}</p>
                  </article>
                ))}
                {feed.length === 0 ? <p className={styles.helpText}>A feed meg ures.</p> : null}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="meet-someone" className={styles.accordionItem}>
            <AccordionTrigger className={styles.accordionTrigger}>Feature 4 / Meet Someone</AccordionTrigger>
            <AccordionContent className={styles.accordionContent}>
              <button type="button" className={styles.actionButton} onClick={requestMatch}>
                [ BESZELGETNEK ]
              </button>
              {matchResult ? (
                <div className={styles.matchBox}>
                  <p>Talalkozasi pont: {matchResult.location_text}</p>
                  <p>Icebreaker: {matchResult.icebreaker_text}</p>
                </div>
              ) : (
                <p className={styles.helpText}>Varakozas a parositasra...</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {unlocked ? (
          <section className={styles.rewardBox}>
            <h2>SABOTEUR BADGE UNLOCKED</h2>
            <p>Hex code: 0x5A-B0-7E</p>
          </section>
        ) : (
          <p className={styles.progressText}>Progress: {completedCount}/4 feature kesz</p>
        )}
      </main>

      {isResetDialogOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="identity-reset-title">
          <div className={styles.modalDialog}>
            <h2 id="identity-reset-title" className={styles.modalTitle}>
              Identity Reset megerosites
            </h2>
            <div className={styles.modalBody}>
              <p>
                Ha tovabblepsz, a jelenlegi lokalis session torlodik, es uj PUBLIC ID-t kell valasztanod.
              </p>
              <p>
                A mar elkuldott uzeneteid es bejegyzeseid nem torlodnek, azok a korabbi azonosito alatt lathatok maradnak.
              </p>
              <p>
                Aktiv beszelgetesek es parositasok nem lesznek atvive az uj identity-re.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelButton} onClick={() => setIsResetDialogOpen(false)}>
                Megse
              </button>
              <button
                type="button"
                className={styles.modalDangerButton}
                onClick={() => {
                  setIsResetDialogOpen(false);
                  onResetIdentity();
                }}
              >
                Igen, uj identity
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
