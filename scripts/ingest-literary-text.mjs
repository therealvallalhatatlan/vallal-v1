#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MIN_CHARS = Number(process.env.RAG_MIN_CHARS || 300);
const MAX_CHARS = Number(process.env.RAG_MAX_CHARS || 1200);
const CONCURRENCY = Math.max(1, Math.min(3, Number(process.env.RAG_CONCURRENCY || 2)));
const TABLE_NAME = process.env.RAG_TABLE_NAME || 'literary_rag_chunks';
const ANNOTATION_MODEL = process.env.OPENAI_ANNOTATION_MODEL || 'gpt-4o-mini';
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAW_DIR = path.resolve(process.cwd(), 'data/raw');
const PROCESSED_DIR = path.resolve(process.cwd(), 'data/processed');
const INPUT_TARGET = process.argv[2] || RAW_DIR;

const VALID_TONES = new Set(['paranoid', 'cynical', 'detached', 'manic', 'melancholic']);
const DEFAULT_ANNOTATION = Object.freeze({
  themes: [],
  tone: 'detached',
  intensity: 0.35,
  tags: [],
  is_signature: false,
  characters: [],
});

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function loadText(filePath) {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  return raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

async function resolveInputFiles(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const stats = await fs.stat(absolutePath).catch(() => null);

  if (!stats) {
    throw new Error(`Input path not found: ${absolutePath}`);
  }

  if (stats.isFile()) {
    return [absolutePath];
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(txt|md)$/i.test(entry.name))
    .map((entry) => path.join(absolutePath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function getProcessedChunkPayload(row) {
  return {
    text: row.text,
    themes: Array.isArray(row.themes) ? row.themes : [],
    tone: VALID_TONES.has(row.tone) ? row.tone : DEFAULT_ANNOTATION.tone,
    intensity: Number.isFinite(Number(row.intensity)) ? Number(row.intensity) : DEFAULT_ANNOTATION.intensity,
    tags: Array.isArray(row.tags) ? row.tags : [],
    is_signature: Boolean(row.is_signature),
    embedding: Array.isArray(row.embedding) ? row.embedding : [],
    source: row.source_file,
    chunk_index: row.chunk_index,
    score: Number.isFinite(Number(row.score)) ? Number(row.score) : 0,
  };
}

async function saveProcessedChunk(sourceFile, row) {
  const outputDir = path.join(PROCESSED_DIR, path.parse(sourceFile).name);
  await ensureDir(outputDir);

  const fileName = `chunk_${String(row.chunk_index + 1).padStart(4, '0')}.json`;
  const outputPath = path.join(outputDir, fileName);
  const payload = getProcessedChunkPayload(row);

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
}

async function saveAllChunks(sourceFile, rows, allRows = rows) {
  await ensureDir(PROCESSED_DIR);

  const outputDir = path.join(PROCESSED_DIR, path.parse(sourceFile).name);
  await ensureDir(outputDir);

  const payload = rows
    .slice()
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map((row) => getProcessedChunkPayload(row));

  const globalPayload = allRows
    .slice()
    .sort((a, b) => a.source_file.localeCompare(b.source_file) || a.chunk_index - b.chunk_index)
    .map((row) => getProcessedChunkPayload(row));

  await fs.writeFile(path.join(outputDir, 'all_chunks.json'), JSON.stringify(payload, null, 2), 'utf8');
  await fs.writeFile(path.join(PROCESSED_DIR, 'all_chunks.json'), JSON.stringify(globalPayload, null, 2), 'utf8');
  await fs.writeFile(path.join(PROCESSED_DIR, `${path.parse(sourceFile).name}.summary.json`), JSON.stringify({
    source_file: sourceFile,
    chunk_count: rows.length,
    created_at: new Date().toISOString(),
    items: payload.map((row) => ({
      chunk_index: row.chunk_index,
      tone: row.tone,
      intensity: row.intensity,
      score: row.score,
      themes: row.themes,
      tags: row.tags,
      is_signature: row.is_signature,
      preview: row.text.slice(0, 220),
    })),
  }, null, 2), 'utf8');
}

function splitIntoParagraphs(text) {
  const blocks = text
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const paragraphs = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    const looksLikeDialogueBlock = lines.every((line) => isDialogueParagraph(line));
    const paragraph = looksLikeDialogueBlock ? lines.join('\n') : lines.join(' ');

    if (paragraph.length > MAX_CHARS * 1.35) {
      paragraphs.push(...splitOversizedParagraph(paragraph, MAX_CHARS));
      continue;
    }

    paragraphs.push(paragraph);
  }

  return paragraphs;
}

function splitOversizedParagraph(paragraph, maxChars) {
  const sentences = paragraph.match(/[^.!?]+(?:[.!?]+["'”’)]*)?|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || [paragraph];
  const pieces = [];
  let current = '';

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      pieces.push(current);
    }

    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }

    for (let i = 0; i < sentence.length; i += maxChars) {
      pieces.push(sentence.slice(i, i + maxChars).trim());
    }
    current = '';
  }

  if (current) {
    pieces.push(current);
  }

  return pieces.filter(Boolean);
}

function classifyParagraph(paragraph) {
  const trimmed = paragraph.trim();

  if (/^(chapter|fejezet)\b/i.test(trimmed)) {
    return 'section';
  }

  if (/^[IVXLCDM]+[.)]?$/i.test(trimmed) || /^[A-ZÁÉÍÓÖŐÚÜŰ0-9\s-]{4,}$/.test(trimmed)) {
    return 'section';
  }

  if (isDialogueParagraph(trimmed)) {
    return 'dialogue';
  }

  return 'narrative';
}

function isDialogueParagraph(paragraph) {
  const trimmed = paragraph.trim();
  return /^(?:[-–—]\s+|["“„]|[A-ZÁÉÍÓÖŐÚÜŰ][^.!?\n]{0,24}:\s)/u.test(trimmed);
}

function buildChunks(paragraphs, options = {}) {
  const minChars = options.minChars ?? MIN_CHARS;
  const maxChars = options.maxChars ?? MAX_CHARS;
  const chunks = [];
  let currentParts = [];

  const flush = () => {
    if (!currentParts.length) {
      return;
    }

    const text = currentParts.join('\n\n').trim();
    if (text) {
      chunks.push(text);
    }
    currentParts = [];
  };

  for (const paragraph of paragraphs) {
    const currentText = currentParts.join('\n\n');
    const candidate = currentText ? `${currentText}\n\n${paragraph}` : paragraph;
    const prevParagraph = currentParts[currentParts.length - 1] || '';
    const nextType = classifyParagraph(paragraph);
    const prevType = prevParagraph ? classifyParagraph(prevParagraph) : nextType;
    const strongBoundary = nextType === 'section';
    const typeShift = prevParagraph && prevType !== nextType;
    const enoughContextToBreak = currentText.length >= minChars;

    if (currentParts.length > 0 && (candidate.length > maxChars || strongBoundary || (typeShift && enoughContextToBreak))) {
      flush();
    }

    currentParts.push(paragraph);
  }

  flush();

  const merged = [];
  for (const chunk of chunks) {
    if (!merged.length) {
      merged.push(chunk);
      continue;
    }

    const previous = merged[merged.length - 1];
    if (chunk.length < minChars && `${previous}\n\n${chunk}`.length <= maxChars * 1.15) {
      merged[merged.length - 1] = `${previous}\n\n${chunk}`;
    } else {
      merged.push(chunk);
    }
  }

  return merged;
}

function dedupeStrings(values) {
  return [...new Set((values || []).filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAnnotation(input) {
  const safeInput = input && typeof input === 'object' ? input : DEFAULT_ANNOTATION;
  const tone = VALID_TONES.has(safeInput?.tone) ? safeInput.tone : DEFAULT_ANNOTATION.tone;
  const numericIntensity = Number.isFinite(Number(safeInput?.intensity))
    ? Number(safeInput.intensity)
    : DEFAULT_ANNOTATION.intensity;

  return {
    themes: dedupeStrings(safeInput?.themes).slice(0, 8),
    tone,
    intensity: clamp(Number(numericIntensity.toFixed(3)), 0, 1),
    tags: dedupeStrings(safeInput?.tags).slice(0, 12),
    is_signature: Boolean(safeInput?.is_signature),
    characters: dedupeStrings(safeInput?.characters).slice(0, 12),
  };
}

function buildFallbackAnnotation(text) {
  const normalized = text.toLowerCase();
  const inferredThemes = [];

  if (/(apa|anya|csalad|mother|father|family)/.test(normalized)) inferredThemes.push('family');
  if (/(halal|temetes|blood|death|sir|koporso)/.test(normalized)) inferredThemes.push('death');
  if (/(isten|bun|ima|faith|god|gyonas)/.test(normalized)) inferredThemes.push('faith');
  if (/(test|desire|szex|erint|touch|body)/.test(normalized)) inferredThemes.push('desire');
  if (/(emlek|mult|childhood|gyerek|regi)/.test(normalized)) inferredThemes.push('memory');

  return normalizeAnnotation({
    ...DEFAULT_ANNOTATION,
    themes: inferredThemes,
    tags: inferredThemes,
  });
}

function computeScore(annotation) {
  const themeBoost = Math.min(annotation.themes.length * 0.08, 0.32);
  const tagBoost = Math.min(annotation.tags.length * 0.03, 0.18);
  const signatureBoost = annotation.is_signature ? 0.12 : 0;
  return clamp(Number((annotation.intensity * 0.6 + themeBoost + tagBoost + signatureBoost).toFixed(3)), 0, 1);
}

async function callOpenAI(endpoint, payload, label) {
  let lastError;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        const error = new Error(`${label} failed with ${response.status}: ${text}`);

        if (response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500) {
          lastError = error;
          await wait(getRetryDelay(attempt));
          continue;
        }

        throw error;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === 4) {
        throw error;
      }
      await wait(getRetryDelay(attempt));
    }
  }

  throw lastError || new Error(`${label} failed`);
}

function getRetryDelay(attempt) {
  const jitter = Math.floor(Math.random() * 250);
  return attempt * 1200 + jitter;
}

async function annotateChunk(text) {
  const payload = {
    model: ANNOTATION_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You annotate literary excerpts for semantic retrieval. Preserve tone, subtext, and psychological charge. Return strict JSON with keys: themes, tone, intensity, tags, is_signature, characters. Themes and tags should be short strings. Tone must be one of paranoid, cynical, detached, manic, melancholic. Intensity must be a number between 0 and 1.',
      },
      {
        role: 'user',
        content: `Annotate this excerpt for RAG:\n\n${text}`,
      },
    ],
  };

  const data = await callOpenAI('chat/completions', payload, 'Annotation request');
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Annotation response was empty');
  }

  try {
    return normalizeAnnotation(JSON.parse(content));
  } catch {
    return buildFallbackAnnotation(text);
  }
}

async function embed(text) {
  const payload = {
    model: EMBEDDING_MODEL,
    input: text,
  };

  const data = await callOpenAI('embeddings', payload, 'Embedding request');
  const embedding = data?.data?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error('Embedding response was empty');
  }

  return embedding;
}

async function insertChunk(row) {
  const { error } = await supabase.from(TABLE_NAME).upsert(row, {
    onConflict: 'content_hash',
  });

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
}

async function processChunk(chunk, index, sourceFile) {
  let annotation = buildFallbackAnnotation(chunk);

  try {
    annotation = await annotateChunk(chunk);
  } catch (error) {
    console.warn(`[${sourceFile} ${index + 1}] Annotation fallback used: ${error instanceof Error ? error.message : String(error)}`);
  }

  let embedding = [];

  try {
    embedding = await embed(chunk);
  } catch (error) {
    console.error(`[${sourceFile} ${index + 1}] Embedding failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  const row = {
    source_file: sourceFile,
    chunk_index: index,
    content_hash: createHash('sha256').update(chunk).digest('hex'),
    text: chunk,
    embedding,
    themes: annotation.themes,
    tone: annotation.tone,
    intensity: annotation.intensity,
    score: computeScore(annotation),
    tags: annotation.tags,
    is_signature: annotation.is_signature,
    characters: annotation.characters,
  };

  await saveProcessedChunk(sourceFile, row);
  await insertChunk(row);
  return row;
}

async function runWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      try {
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      } catch (error) {
        results[currentIndex] = { error };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runner());
  await Promise.all(workers);
  return results;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

async function ingestSingleFile(filePath, globalRows) {
  const sourceFile = path.basename(filePath);
  console.log(`Loading text from ${filePath}`);

  const text = await loadText(filePath);
  const paragraphs = splitIntoParagraphs(text);
  const chunks = buildChunks(paragraphs, {
    minChars: MIN_CHARS,
    maxChars: MAX_CHARS,
  });

  console.log(`Prepared ${paragraphs.length} paragraphs into ${chunks.length} semantic chunks for ${sourceFile}.`);
  console.log(`Using concurrency=${CONCURRENCY}, annotation model=${ANNOTATION_MODEL}, embedding model=${EMBEDDING_MODEL}`);

  let successCount = 0;
  let failureCount = 0;
  const storedRows = [];
  const batches = chunkArray(chunks, CONCURRENCY);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} for ${sourceFile}`);

    await runWithConcurrency(
      batch,
      async (chunk, innerIndex) => {
        const globalIndex = batchIndex * CONCURRENCY + innerIndex;
        const label = `[${sourceFile} ${globalIndex + 1}/${chunks.length}]`;
        console.log(`${label} Annotating and storing chunk (${chunk.length} chars)`);

        try {
          const row = await processChunk(chunk, globalIndex, sourceFile);
          if (!row) {
            failureCount += 1;
            return null;
          }

          storedRows.push(row);
          globalRows.push(row);
          successCount += 1;
          console.log(`${label} Stored successfully • tone=${row.tone} • intensity=${row.intensity} • score=${row.score}`);
          return row;
        } catch (error) {
          failureCount += 1;
          console.error(`${label} Failed: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      },
      CONCURRENCY,
    );
  }

  await saveAllChunks(sourceFile, storedRows, globalRows);

  console.log('---');
  console.log(`Finished ${sourceFile}. Success: ${successCount}, Failed: ${failureCount}, Total: ${chunks.length}`);

  return { successCount, failureCount, total: chunks.length };
}

async function main() {
  const files = await resolveInputFiles(INPUT_TARGET);

  if (files.length === 0) {
    console.error(`No .txt or .md files found in ${INPUT_TARGET}`);
    process.exit(1);
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  let totalChunks = 0;
  const globalRows = [];

  for (const filePath of files) {
    const result = await ingestSingleFile(filePath, globalRows);
    totalSuccess += result.successCount;
    totalFailure += result.failureCount;
    totalChunks += result.total;
  }

  console.log('===');
  console.log(`All files complete. Success: ${totalSuccess}, Failed: ${totalFailure}, Total: ${totalChunks}`);

  if (totalFailure > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Fatal pipeline error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
