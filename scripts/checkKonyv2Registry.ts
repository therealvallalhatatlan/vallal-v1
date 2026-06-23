/**
 * scripts/checkKonyv2Registry.ts
 *
 * Validates that every slug in novellak.txt has a matching entry in data/konyv2Novellak.ts.
 * Run with: pnpm check:registry
 *
 * Exit 0 → all good.
 * Exit 1 → at least one slug in novellak.txt is missing from the registry.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { konyv2Novellak } from '../data/konyv2Novellak'

const txtPath = join(process.cwd(), 'novellak.txt')

let raw: string
try {
  raw = readFileSync(txtPath, 'utf8')
} catch {
  console.error(`❌ novellak.txt not found at ${txtPath}`)
  process.exit(1)
}

const slugsFromFile = raw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))

if (slugsFromFile.length === 0) {
  console.warn('⚠️  novellak.txt is empty — nothing to check.')
  process.exit(0)
}

const registeredSlugs = new Set(konyv2Novellak.map((e) => e.slug))
const missing = slugsFromFile.filter((slug) => !registeredSlugs.has(slug))

if (missing.length > 0) {
  console.error('❌ The following slugs in novellak.txt have no entry in data/konyv2Novellak.ts:')
  missing.forEach((s) => console.error(`   - ${s}`))
  console.error('\nAdd each missing slug to konyv2Novellak.ts with a valid uiType before deploying.')
  process.exit(1)
}

console.log(`✅ All ${slugsFromFile.length} slug(s) in novellak.txt are registered.`)
