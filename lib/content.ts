import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type Story = {
  id: string
  title: string
  text: string
}

const STORIES_DIR = path.join(process.cwd(), 'content', 'stories')

export async function getAllStories(): Promise<Story[]> {
  // ensure directory exists
  const dirEntries = await fs.promises.readdir(STORIES_DIR).catch(() => [])
  const txtFiles = dirEntries.filter((f) => path.extname(f).toLowerCase() === '.txt')

  const stories: Story[] = []

  for (const filename of txtFiles) {
    const id = filename.replace(/\.txt$/i, '')
    const filePath = path.join(STORIES_DIR, filename)
    const raw = await fs.promises.readFile(filePath, 'utf8')
    const parsed = matter(raw)
    const title =
      typeof parsed.data?.title === 'string' && parsed.data.title.trim().length > 0
        ? parsed.data.title.trim()
        : id
    const text = parsed.content.replace(/\s+$/u, '') // trim trailing whitespace only
    stories.push({ id, title, text })
  }

  return stories
}
