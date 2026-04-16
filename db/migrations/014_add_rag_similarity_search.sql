-- Requires the pgvector extension (already enabled via migration 012)
-- Creates an RPC function for fast native similarity search on literary_rag_chunks

create or replace function match_literary_rag_chunks(
  query_embedding vector(1536),
  match_count     int     default 3,
  filter_tone     text    default null
)
returns table (
  id           bigint,
  source_file  text,
  chunk_index  int,
  text         text,
  themes       text[],
  tone         text,
  intensity    float,
  score        float,
  is_signature boolean,
  similarity   float
)
language sql stable
as $$
  select
    id,
    source_file,
    chunk_index,
    text,
    themes,
    tone,
    intensity,
    score,
    is_signature,
    1 - (embedding <=> query_embedding) as similarity
  from public.literary_rag_chunks
  where (filter_tone is null or tone = filter_tone)
  order by embedding <=> query_embedding
  limit match_count;
$$;
