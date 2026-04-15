import type { RetrievedMemoryFragment } from './types';

const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface SearchRelevantChunksInput {
  query: string;
  themes?: string[];
  tone?: string;
  intensity?: number;
  limit?: number;
}

interface RagCandidateRow {
  id: number | string;
  text: string;
  embedding: unknown;
  themes: string[];
  tone: string;
  intensity: number;
  score: number;
  is_signature: boolean;
  source_file: string;
  chunk_index: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseEmbeddingVector(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  }

  if (typeof value === 'string') {
    const normalized = value.trim();

    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item));
      }
    } catch {}

    return normalized
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }

  return [];
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function normalizeToneFilter(tone?: string) {
  switch (tone) {
    case 'vulnerable':
      return 'melancholic';
    case 'tense':
      return 'paranoid';
    case 'guarded':
      return 'detached';
    case 'playful':
      return 'manic';
    case 'neutral':
      return 'cynical';
    default:
      return tone;
  }
}

function buildPreview(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}…` : compact;
}

function matchesFilters(row: RagCandidateRow, input: SearchRelevantChunksInput) {
  if (input.themes && input.themes.length > 0) {
    const matchesTheme = input.themes.some((theme) => row.themes.includes(theme));
    if (!matchesTheme) {
      return false;
    }
  }

  const tone = normalizeToneFilter(input.tone);
  if (tone && row.tone !== tone) {
    return false;
  }

  if (typeof input.intensity === 'number' && row.intensity + 0.15 < input.intensity * 0.6) {
    return false;
  }

  return true;
}

export function rankRetrievedChunks(input: {
  queryEmbedding: number[];
  rows: RagCandidateRow[];
  filters?: Omit<SearchRelevantChunksInput, 'query' | 'limit'>;
  limit?: number;
}): RetrievedMemoryFragment[] {
  const limit = Math.max(1, Math.min(5, input.limit ?? 3));
  const filters = input.filters ?? {};

  return input.rows
    .filter((row) => matchesFilters(row, filters))
    .map((row) => {
      const similarity = cosineSimilarity(input.queryEmbedding, parseEmbeddingVector(row.embedding));
      const retrievalScore = clamp(similarity * 0.67 + row.score * 0.19 + row.intensity * 0.08 + (row.is_signature ? 0.06 : 0), 0, 1);

      return {
        id: row.id,
        text: row.text,
        preview: buildPreview(row.text),
        themes: Array.isArray(row.themes) ? row.themes : [],
        tone: row.tone,
        intensity: row.intensity,
        score: Number(retrievalScore.toFixed(3)),
        similarity: Number(similarity.toFixed(3)),
        source_file: row.source_file,
        chunk_index: row.chunk_index,
        is_signature: Boolean(row.is_signature),
      };
    })
    .filter((row) => row.similarity > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

async function embedQuery(query: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    return [];
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: query,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RAG embedding failed with ${response.status}: ${body}`);
  }

  const data = await response.json();
  return parseEmbeddingVector(data?.data?.[0]?.embedding ?? []);
}

export async function searchRelevantChunks(input: SearchRelevantChunksInput): Promise<RetrievedMemoryFragment[]> {
  try {
    const queryEmbedding = await embedQuery(input.query);
    if (queryEmbedding.length === 0) {
      return [];
    }

    const { listLiteraryRagChunkCandidates } = await import('../repository');
    const rows = await listLiteraryRagChunkCandidates({
      limit: Math.max((input.limit ?? 3) * 12, 24),
      tone: normalizeToneFilter(input.tone),
    });

    return rankRetrievedChunks({
      queryEmbedding,
      rows,
      filters: {
        themes: input.themes,
        tone: input.tone,
        intensity: input.intensity,
      },
      limit: input.limit ?? 3,
    });
  } catch (error) {
    console.warn('RAG retrieval skipped:', error instanceof Error ? error.message : String(error));
    return [];
  }
}
