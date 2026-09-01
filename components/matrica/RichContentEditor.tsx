'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { RichContentBlock, RichContentDocument } from '@/lib/matrica'

interface Props {
  spotId: string
  accessToken: string
  initialDocument?: RichContentDocument | null
  onSaved?: (document: RichContentDocument) => void
}

const EMPTY_DOCUMENT: RichContentDocument = {
  version: 1,
  blocks: [
    { type: 'heading', level: 1, text: 'Új Rich Content' },
    { type: 'paragraph', text: 'Írd ide a tartalmat…' },
  ],
}

const BLOCK_LABELS: Record<RichContentBlock['type'], string> = {
  heading: 'CÍMSOR',
  paragraph: 'SZÖVEG',
  quote: 'IDÉZET',
  bulletList: 'FELSOROLÁS',
  orderedList: 'SZÁMOZOTT LISTA',
  divider: 'VONAL',
  image: 'KÉP',
  video: 'VIDEÓ',
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#f4f4f5',
  padding: '9px 10px',
  fontSize: 13,
  outline: 'none',
}

const secondaryButton: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.03)',
  color: '#d4d4d8',
  padding: '8px 10px',
  borderRadius: 8,
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
}

const toolbarButton: CSSProperties = {
  ...secondaryButton,
  minWidth: 30,
  padding: '5px 8px',
}

function cloneDocument(document: RichContentDocument): RichContentDocument {
  return JSON.parse(JSON.stringify(document)) as RichContentDocument
}

function createBlock(type: RichContentBlock['type']): RichContentBlock {
  switch (type) {
    case 'heading': return { type: 'heading', level: 2, text: 'Új címsor' }
    case 'paragraph': return { type: 'paragraph', text: '' }
    case 'quote': return { type: 'quote', text: '' }
    case 'bulletList': return { type: 'bulletList', items: [''] }
    case 'orderedList': return { type: 'orderedList', items: [''] }
    case 'divider': return { type: 'divider' }
    case 'image': return { type: 'image', url: '', alt: '', caption: '' }
    case 'video': return { type: 'video', provider: 'youtube', videoId: '' }
  }
}

function updateBlock(blocks: RichContentBlock[], index: number, updater: (block: RichContentBlock) => RichContentBlock) {
  return blocks.map((block, blockIndex) => blockIndex === index ? updater(block) : block)
}

function normalizeVideoId(value: string, provider: 'youtube' | 'vimeo'): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    if (provider === 'youtube') {
      if (url.hostname === 'youtu.be') return url.pathname.replace(/^\//, '')
      const queryId = url.searchParams.get('v')
      if (queryId) return queryId
      const parts = url.pathname.split('/').filter(Boolean)
      const embedIndex = parts.indexOf('embed')
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1]
    } else {
      const match = url.pathname.match(/\/(\d+)/)
      if (match?.[1]) return match[1]
    }
  } catch {
    // Value can already be a plain provider ID.
  }

  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '')
}

export default function RichContentEditor({ spotId, accessToken, initialDocument, onSaved }: Props) {
  const [document, setDocument] = useState<RichContentDocument>(() => cloneDocument(initialDocument ?? EMPTY_DOCUMENT))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTextTarget, setSelectedTextTarget] = useState<number | null>(null)
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({})
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    setDocument(cloneDocument(initialDocument ?? EMPTY_DOCUMENT))
  }, [initialDocument])

  const hasContent = useMemo(() => document.blocks.some((block) => {
    if (block.type === 'divider') return true
    if (block.type === 'image') return Boolean(block.url.trim())
    if (block.type === 'video') return Boolean(block.videoId.trim())
    if (block.type === 'bulletList' || block.type === 'orderedList') return block.items.some((item) => item.trim())
    return Boolean(block.text.trim())
  }), [document])

  function setBlocks(nextBlocks: RichContentBlock[]) {
    setDocument((prev) => ({ ...prev, blocks: nextBlocks }))
    setMessage(null)
    setError(null)
  }

  function insertText(index: number, before: string, after = before) {
    const textarea = textareaRefs.current[index]
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const current = textarea.value
    const selected = current.slice(start, end) || 'szöveg'
    const next = `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`
    setBlocks(updateBlock(document.blocks, index, (block) => 'text' in block ? { ...block, text: next } : block))
    requestAnimationFrame(() => {
      textarea.focus()
      const nextStart = start + before.length
      textarea.setSelectionRange(nextStart, nextStart + selected.length)
    })
  }

  function addBlock(type: RichContentBlock['type']) {
    setBlocks([...document.blocks, createBlock(type)])
  }

  function removeBlock(index: number) {
    setBlocks(document.blocks.filter((_, blockIndex) => blockIndex !== index))
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= document.blocks.length) return
    const next = [...document.blocks]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    setBlocks(next)
  }

  async function uploadImage(index: number, file: File) {
    setUploading(index)
    setError(null)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('spot_id', spotId)

      const response = await fetch('/api/admin/matrica/rich-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`)

      setBlocks(updateBlock(document.blocks, index, (block) => block.type === 'image' ? { ...block, url: String(json.url ?? '') } : block))
      setMessage('Kép feltöltve.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(null)
      const input = fileRefs.current[index]
      if (input) input.value = ''
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/matrica/spots', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id: spotId, rich_content: document }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`)

      const saved = (json.spot?.rich_content ?? document) as RichContentDocument
      setDocument(cloneDocument(saved))
      setMessage('Rich Content mentve.')
      onSaved?.(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  function textEditor(index: number, value: string, placeholder: string, minHeight = 120) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => insertText(index, '**')} style={toolbarButton}>B</button>
          <button type="button" onClick={() => insertText(index, '_')} style={toolbarButton}>I</button>
          <button type="button" onClick={() => insertText(index, '[', '](https://)')} style={toolbarButton}>LINK</button>
          {selectedTextTarget === index ? <span style={{ color: '#71717a', fontSize: 10, alignSelf: 'center' }}>kijelölésre alkalmazható</span> : null}
        </div>
        <textarea
          ref={(element) => { textareaRefs.current[index] = element }}
          value={value}
          onFocus={() => setSelectedTextTarget(index)}
          onSelect={() => setSelectedTextTarget(index)}
          onChange={(event) => setBlocks(updateBlock(document.blocks, index, (block) => 'text' in block ? { ...block, text: event.target.value } : block))}
          placeholder={placeholder}
          style={{ ...inputStyle, minHeight, resize: 'vertical', lineHeight: 1.55 }}
        />
        <span style={{ color: '#52525b', fontSize: 10 }}>
          Formázás: <code>**félkövér**</code> <code>_dőlt_</code> <code>[link](https://...)</code>
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(9,9,11,0.97)', border: '1px solid rgba(200,169,126,0.2)', borderRadius: 12, padding: 10, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(Object.keys(BLOCK_LABELS) as RichContentBlock['type'][]).map((type) => (
            <button key={type} type="button" onClick={() => addBlock(type)} style={secondaryButton}>+ {BLOCK_LABELS[type]}</button>
          ))}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={save} disabled={saving || !hasContent} style={{ ...secondaryButton, borderColor: 'rgba(163,230,53,0.4)', background: 'rgba(163,230,53,0.08)', color: saving || !hasContent ? '#71717a' : '#d9f99d', cursor: saving || !hasContent ? 'not-allowed' : 'pointer' }}>
            {saving ? 'MENTÉS…' : 'MENTÉS'}
          </button>
        </div>
      </div>

      {message ? <div style={{ color: '#a3e635', fontSize: 12 }}>{message}</div> : null}
      {error ? <div style={{ color: '#fca5a5', fontSize: 12 }}>{error}</div> : null}

      {document.blocks.map((block, index) => (
        <section key={`${block.type}-${index}`} style={{ background: 'linear-gradient(180deg, rgba(6,7,9,0.98), rgba(10,11,14,0.98))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: '#c8a97e', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>{String(index + 1).padStart(2, '0')} / {BLOCK_LABELS[block.type]}</span>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} style={iconButton(index === 0)}>↑</button>
            <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === document.blocks.length - 1} style={iconButton(index === document.blocks.length - 1)}>↓</button>
            <button type="button" onClick={() => removeBlock(index)} style={iconButton(false, true)}>×</button>
          </div>

          {block.type === 'heading' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
              <select value={block.level} onChange={(event) => setBlocks(updateBlock(document.blocks, index, (current) => current.type === 'heading' ? { ...current, level: Number(event.target.value) as 1 | 2 | 3 } : current))} style={inputStyle}>
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
              </select>
              {textEditor(index, block.text, 'Címsor…', 90)}
            </div>
          ) : null}

          {block.type === 'paragraph' ? textEditor(index, block.text, 'Szöveg…', 180) : null}
          {block.type === 'quote' ? textEditor(index, block.text, 'Idézet…', 120) : null}

          {block.type === 'bulletList' || block.type === 'orderedList' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {block.items.map((item, itemIndex) => (
                <div key={itemIndex} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 22, color: '#71717a', fontSize: 12, textAlign: 'right' }}>{block.type === 'orderedList' ? `${itemIndex + 1}.` : '•'}</span>
                  <input value={item} onChange={(event) => setBlocks(updateBlock(document.blocks, index, (current) => {
                    if (current.type !== block.type) return current
                    const items = [...current.items]
                    items[itemIndex] = event.target.value
                    return { ...current, items }
                  }))} style={{ ...inputStyle, flex: 1 }} placeholder="Lista elem…" />
                  <button type="button" onClick={() => setBlocks(updateBlock(document.blocks, index, (current) => current.type === block.type ? { ...current, items: current.items.filter((_, currentIndex) => currentIndex !== itemIndex) } : current))} style={iconButton(false, true)}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => setBlocks(updateBlock(document.blocks, index, (current) => current.type === block.type ? { ...current, items: [...current.items, ''] } : current))} style={secondaryButton}>+ LISTAELEM</button>
            </div>
          ) : null}

          {block.type === 'divider' ? <div style={{ padding: '12px 0' }}><div style={{ height: 1, background: 'rgba(217,249,157,0.25)' }} /></div> : null}

          {block.type === 'image' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {block.url ? <img src={block.url} alt={block.alt || ''} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', background: '#050505', borderRadius: 8 }} /> : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => fileRefs.current[index]?.click()} disabled={uploading === index} style={secondaryButton}>{uploading === index ? 'FELTÖLTÉS…' : 'KÉP FELTÖLTÉSE'}</button>
                <input ref={(element) => { fileRefs.current[index] = element }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(index, file) }} />
                <input value={block.alt ?? ''} onChange={(event) => setBlocks(updateBlock(document.blocks, index, (current) => current.type === 'image' ? { ...current, alt: event.target.value } : current))} style={{ ...inputStyle, flex: '1 1 220px' }} placeholder="ALT szöveg" />
                <input value={block.caption ?? ''} onChange={(event) => setBlocks(updateBlock(document.blocks, index, (current) => current.type === 'image' ? { ...current, caption: event.target.value } : current))} style={{ ...inputStyle, flex: '1 1 220px' }} placeholder="Képaláírás" />
              </div>
            </div>
          ) : null}

          {block.type === 'video' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
              <select value={block.provider} onChange={(event) => setBlocks(updateBlock(document.blocks, index, (current) => current.type === 'video' ? { ...current, provider: event.target.value === 'vimeo' ? 'vimeo' : 'youtube' } : current))} style={inputStyle}>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
              <input value={block.videoId} onChange={(event) => setBlocks(updateBlock(document.blocks, index, (current) => current.type === 'video' ? { ...current, videoId: normalizeVideoId(event.target.value, current.provider) } : current))} style={inputStyle} placeholder="URL vagy video ID" />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  )
}

function iconButton(disabled: boolean, danger = false): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: `1px solid ${danger ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.10)'}`,
    background: danger ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.03)',
    color: disabled ? '#3f3f46' : danger ? '#fca5a5' : '#d4d4d8',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
  }
}
