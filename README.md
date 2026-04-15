# Vállalhatatlan

Next.js platform a *Vállalhatatlan* könyv előrendeléséhez, olvasói élményéhez és a **V AI ágens** csevegőfelületéhez.

## Stack

- **Next.js 16** (App Router, React 19)
- **Supabase** — auth, PostgreSQL, pgvector (RAG)
- **Stripe** — HUF előrendelés, webhook
- **OpenAI GPT-4o** — streaming chat, text-embedding-3-small (RAG)
- **Tailwind CSS 4 + Radix UI**
- **pnpm + TypeScript + Vitest**

---

## Gyors start

\`\`\`bash
pnpm install
cp .env.local.example .env.local
pnpm dev
\`\`\`

---

## V AI ágens — architektúra (\`lib/gyontatoszek/\`)

A \`/v3\` útvonalon elérhető csevegő egy többrétegű ágensrendszer, ami minden felhasználói üzenetnél végigfut. Az útvonal \`/v\`-ről is elérhető (redirect).

\`\`\`
POST /api/gyontatoszek
  └─ service.ts → handleGyontatas()
       ├─ ensureConversation() / persistMessage()
       ├─ checkSafety()
       └─ agent/orchestrator.ts → prepareAgentTurn()
            ├─ interpretTurn()        — szándék, emoció, témák kinyerése
            ├─ analyzeInput()         — minták detektálása (vulnerability, intrusion, stb.)
            ├─ buildMemoryContext()   — kapcsolati memória betöltése + decay
            ├─ updateProfile()        — rejtett vonások (impulsive, avoidant, stb.) frissítése
            ├─ buildStrategy()        — módválasztás: mirror / confront / destabilize /
            │                           validate_then_twist / challenge_action / withhold
            ├─ selectExemplars()      — behavioral knowledge base (data/gyontatoszek/knowledge.json)
            ├─ searchRelevantChunks() — pgvector RAG (literary_rag_chunks tábla)
            ├─ selectDistortionHook() — opcionális valóságtorzítás
            ├─ detectAction()         — cselekvési kihívás kiválasztása
            └─ generateResponseStream() → GPT-4o stream
\`\`\`

### Stratégiák

| Mód | Leírás |
|-----|--------|
| \`mirror\` | Visszatükröz, saját mintára hagyja ráébredni |
| \`confront\` | Direkt szembesít ellentmondással |
| \`destabilize\` | Kimozdítja a biztos álláspontot |
| \`validate_then_twist\` | Részleges megerősítés, majd fordítás |
| \`challenge_action\` | Konkrét lépésre ösztönöz |
| \`withhold\` | Visszatart, csendben vár |

Stratégiaválasztást modulálja a kapcsolati memória (trust, irritation, repetition), a felhasználói profil rejtett vonásai, az önellentmondás/következmény jelek, és az opcionális behavior modulation csúszkák.

### RAG — irodalmi korpusz

- **Forrás:** \`data/raw/vallalhatatlan_1.txt\`, \`Vallalhatatlan_2.txt\`
- **Feldolgozás:** \`scripts/ingest-literary-text.mjs\` → \`data/processed/*.summary.json\` → Supabase \`literary_rag_chunks\` (pgvector HNSW index, 1536 dim)
- **Retrieval:** \`agent/rag.ts\` — embedding keresés + téma/hangulat/intenzitás szűrő, top 3 fragment
- **Injektálás:** tonális horgonyként a promptba (soha nem forrásként idézve)
- **Score:** \`similarity * 0.67 + score * 0.19 + intensity * 0.08 + (is_signature ? 0.06 : 0)\`

### Behavioral Knowledge Base

- **Fájl:** \`data/gyontatoszek/knowledge.json\`
- **Séma:** \`id\`, \`user\`, \`intent\`, \`emotion\`, \`expected_strategy\`, \`v_response\`
- **Kiválasztás:** \`agent/exemplars.ts\` — strategy exact match → intent/emotion proximity scoring → top 2
- **Injektálás:** \`BEHAVIORAL CALIBRATION\` prompt szekció, kondenzált register-descriptor formában (nem verbatim few-shot)
- Új példány felvétele: csak a JSON-t kell bővíteni + redeploy

### Kapcsolati memória

\`gyontato_conversations.metadata\`-ban perzisztált \`relationshipMemory\` snapshot per konverzáció:

- Trust, irritation, familiarity, repetition (0–5, decay-aware)
- Recurring topics, emotional tone, state name/intensity
- Önellentmondás és következmény-detekció (pressure-opened-up / pressure-retreat) az előzményekből

### Behavior modulation

Per-session csúszkák a \`/v3\` oldalon (alcohol / amphetamine / THC / dopamine 0–1):
- Stratégia-kiválasztást és prompt direktívákat befolyásolnak
- Torzítás-gyakoriságot és hangvételt modulálnak
- Session végén visszaállnak alapértékre

### V látlelete panel

A chat mellett (desktopra alapból nyitva, mobilon gombbal) megjelenő side panel:

**Ahogyan V lát téged**
- Aktuális emoció + intenzitás sáv
- Stratégia badge (hover-re magyarázat)
- Bizalom / súrlódás / nyitottság metrikák (0–5)
- Kapcsolati állás (wary → open → volatile)
- Domináns mintázatok, törésvonalak, rejtett húzások

**Ahogyan V érzi magát**
- V belső emoció + intenzitás
- Kapcsolati tónus, last trigger
- Bizalom / súrlódás / ismétlés V oldaláról
- Visszatartott témák

Minden mezőnél hover-tooltip magyarázza az értéket.

### Debug mód

\`POST /api/gyontatoszek?debug=true\` — \`x-agent-debug\` response headerben teljes agent state snapshot.

### Proaktív üzenetküldés

\`lib/gyontatoszek/proactive/\` — triggerek: inaktivitás, kerülés, ismétlés, emocionális spike, action follow-up. Rendszer route (\`/api/gyontatoszek/proactive\`) secret-védelemmel, dry-run vagy live módban.

---

## Adatbázis migrációk (\`db/migrations/\`)

| Fájl | Tartalom |
|------|----------|
| \`001_create_reader_presence.sql\` | Aktív olvasók heartbeat nyomkövetése |
| \`001_create_story_reads.sql\` | Olvasói analitika (IP hash) |
| \`002_private_inbox.sql\` | User–admin üzenetváltás |
| \`003_create_feed_posts.sql\` | Közösségi feed (5 perces szerkesztési ablak) |
| \`004_create_users_table.sql\` | User profilok |
| \`007_create_system_control.sql\` | Kill switch (SAFE / READ_ONLY módok) |
| \`012_create_literary_rag_chunks.sql\` | pgvector tábla az irodalmi RAG-hoz |
| \`013_create_gyontato_tables.sql\` | Gyóntatószék konverzációk + üzenetek |

---

## Környezeti változók

\`\`\`env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (V ágens + RAG embedding)
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL=

# Auth
AUTH_SECRET=
RESEND_API_KEY=
EMAIL_FROM=

# Admin
ADMIN_EMAILS=
DEMO_ADMIN_KEY=

# App
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_CAMPAIGN_GOAL=
NEXT_PUBLIC_PAYMENT_MODE=
\`\`\`

---

## Stripe fejlesztői setup

\`\`\`bash
# Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# másold a whsec_*** kulcsot .env.local-ba STRIPE_WEBHOOK_SECRET-ként

stripe trigger checkout.session.completed
\`\`\`

**Produkciós webhook:** Stripe Dashboard → Webhooks → \`https://YOUR_DOMAIN/api/stripe/webhook\` → esemény: \`checkout.session.completed\`

---

## Irodalmi korpusz ingestálása

\`\`\`bash
node scripts/ingest-literary-text.mjs
\`\`\`

Beolvassa a \`data/raw/*.txt\` fájlokat, elkészíti az OpenAI embedding vektorokat, és feltölti a \`literary_rag_chunks\` Supabase táblába.

---

## Fejlesztés

\`\`\`bash
pnpm dev       # dev szerver — http://localhost:3000
pnpm build     # production build
pnpm test      # Vitest tesztek
\`\`\`
