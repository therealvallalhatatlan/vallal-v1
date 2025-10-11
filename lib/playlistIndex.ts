import 'server-only'
import fs from 'fs/promises'
import path from 'path'


export type Track = { title: string; file: string }
export type PlaylistData = { excerpt?: string; tracks: Track[]; visuals?: string[] }


const PUBLIC_DIR = path.join(process.cwd(), 'public')
const PLAYLISTS_DIR = path.join(PUBLIC_DIR, 'playlists')


export async function listSlugs(): Promise<string[]> {
try {
const files = await fs.readdir(PLAYLISTS_DIR)
return files
.filter((f) => f.endsWith('.json'))
.map((f) => decodeURIComponent(f.replace(/\.json$/i, '')))
.sort((a, b) => a.localeCompare(b, 'hu'))
} catch {
return []
}
}


export async function loadPlaylist(slug: string): Promise<PlaylistData | null> {
try {
const filePath = path.join(PLAYLISTS_DIR, `${slug}.json`)
const raw = await fs.readFile(filePath, 'utf8')
const data = JSON.parse(raw) as PlaylistData
if (!Array.isArray(data.tracks)) return null
return data
} catch {
return null
}
}