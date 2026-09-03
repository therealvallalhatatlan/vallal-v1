import { promises as fs } from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { NextResponse } from "next/server"
import { konyv2Novellak } from "@/data/konyv2Novellak"

export const runtime = "nodejs"

const CONTENT_ROOT = path.join(process.cwd(), "content")
const SOURCE_DIRS = ["konyv2", "stories"] as const

const EXCLUDED_KONYV2 = new Set(["galeria-oldal", "szoveg-oldal", "video-oldal", "private-link-netcafe"])

function excerpt(text: string, maxLength = 620) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (normalized.length <= maxLength) return normalized

  const candidate = normalized.slice(0, maxLength)
  const lastSpace = candidate.lastIndexOf(" ")
  return `${candidate.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}…`
}

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.txt$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export async function GET() {
  try {
    const candidates: Array<{ source: "konyv2" | "stories"; slug: string; title: string; text: string }> = []

    for (const source of SOURCE_DIRS) {
      const directory = path.join(CONTENT_ROOT, source)
      const files = await fs.readdir(directory)

      for (const filename of files) {
        if (!filename.toLowerCase().endsWith(".txt")) continue

        const slug = filename.replace(/\.txt$/i, "")
        if (source === "konyv2" && EXCLUDED_KONYV2.has(slug)) continue

        const raw = await fs.readFile(path.join(directory, filename), "utf8")
        const parsed = matter(raw)
        const text = parsed.content.replace(/\s+$/u, "").trim()
        if (!text) continue

        const registryEntry = source === "konyv2" ? konyv2Novellak.find((entry) => entry.slug === slug) : null
        const title =
          typeof parsed.data?.title === "string" && parsed.data.title.trim()
            ? parsed.data.title.trim()
            : registryEntry?.title ?? titleFromFilename(filename)

        candidates.push({ source, slug, title, text })
      }
    }

    if (!candidates.length) {
      return NextResponse.json({ error: "Nincs elérhető történet." }, { status: 404 })
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)]

    return NextResponse.json(
      {
        source: selected.source,
        slug: selected.slug,
        title: selected.title,
        text: excerpt(selected.text),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("Random story API error:", error)
    return NextResponse.json({ error: "Nem sikerült betölteni a random sztorit." }, { status: 500 })
  }
}
