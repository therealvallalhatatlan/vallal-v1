create extension if not exists vector;

create table if not exists literary_rag_chunks (
  id bigint generated always as identity primary key,
  source_file text not null,
  chunk_index integer not null,
  content_hash text not null unique,
  text text not null,
  embedding vector(1536) not null,
  themes text[] not null default '{}',
  tone text not null check (tone in ('paranoid', 'cynical', 'detached', 'manic', 'melancholic')),
  intensity real not null check (intensity >= 0 and intensity <= 1),
  score real not null default 0 check (score >= 0 and score <= 1),
  tags text[] not null default '{}',
  is_signature boolean not null default false,
  characters text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists literary_rag_chunks_embedding_idx
  on literary_rag_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists literary_rag_chunks_themes_idx
  on literary_rag_chunks using gin (themes);

create index if not exists literary_rag_chunks_tags_idx
  on literary_rag_chunks using gin (tags);

create index if not exists literary_rag_chunks_tone_idx
  on literary_rag_chunks (tone);

create index if not exists literary_rag_chunks_signature_idx
  on literary_rag_chunks (is_signature, intensity desc);

create index if not exists literary_rag_chunks_score_idx
  on literary_rag_chunks (score desc);
