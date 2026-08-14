import 'server-only'

function parseEditors(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export function isEditor(userEmail: string | undefined): boolean {
  if (!userEmail) return false
  const normalizedEmail = userEmail.trim().toLowerCase()
  if (!normalizedEmail) return false

  const editors = parseEditors(process.env.HALOZAT_EDITORS)
  return editors.includes(normalizedEmail)
}
