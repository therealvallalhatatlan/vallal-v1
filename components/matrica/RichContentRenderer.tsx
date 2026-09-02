import React from 'react'
import type { JSONContent } from '@tiptap/core'
import type { RichContentDocument } from '@/lib/matrica'

export type RichContentRendererProps = {
  content: RichContentDocument
}

export default function RichContentRenderer({ content }: RichContentRendererProps) {
  const renderNode = (node: JSONContent, key: number): React.ReactNode => {
    const children = 'content' in node && Array.isArray(node.content)
      ? node.content.map((child, idx) => renderNode(child as JSONContent, idx))
      : null

    switch (node.type) {
      case 'doc':
        return <React.Fragment key={key}>{children}</React.Fragment>
      case 'paragraph':
        return <p key={key} style={{ margin: '1em 0' }}>{children}</p>
      case 'heading': {
        const level = (node.attrs as any)?.level || 1
        const Tag = `h${level}` as keyof JSX.IntrinsicElements
        return <Tag key={key} style={{ margin: '1em 0' }}>{children}</Tag>
      }
      case 'text': {
        let element: React.ReactNode = node.text
        if (node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type === 'bold') {
              element = <strong key={key}>{element}</strong>
            } else if (mark.type === 'italic') {
              element = <em key={key}>{element}</em>
            } else if (mark.type === 'link') {
              const href = (mark.attrs as any)?.href
              element = (
                <a key={key} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {element}
                </a>
              )
            }
          })
        }
        return <React.Fragment key={key}>{element}</React.Fragment>
      }
      case 'bulletList':
        return <ul key={key} style={{ margin: '1em 0', paddingLeft: '1.5em' }}>{children}</ul>
      case 'orderedList':
        return <ol key={key} style={{ margin: '1em 0', paddingLeft: '1.5em' }}>{children}</ol>
      case 'listItem':
        return <li key={key}>{children}</li>
      case 'blockquote':
        return <blockquote key={key} style={{ margin: '1em 0', paddingLeft: '1em', borderLeft: '4px solid #ccc' }}>{children}</blockquote>
      case 'horizontalRule':
        return <hr key={key} style={{ margin: '1em 0' }} />
      case 'image': {
        const { src, alt } = node.attrs as { src: string; alt?: string }
        return <img key={key} src={src} alt={alt || ''} style={{ maxWidth: '100%', height: 'auto', margin: '1em 0' }} />
      }
      case 'youtube': {
        const src = (node.attrs as any)?.src
        if (typeof src !== 'string' || !src.includes('youtube.com/embed/')) {
          return null
        }
        return (
          <div key={key} style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', margin: '1em 0' }}>
            <iframe
              src={src}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="YouTube video"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          </div>
        )
      }
      case 'vimeo': {
        const videoId = (node.attrs as any)?.videoId
        if (typeof videoId !== 'string') {
          return null
        }
        const src = `https://player.vimeo.com/video/${videoId}`
        return (
          <div key={key} style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', margin: '1em 0' }}>
            <iframe
              src={src}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo video"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          </div>
        )
      }
      default:
        return null
    }
  }

  return <div>{content.content?.map((node, idx) => renderNode(node as JSONContent, idx))}</div>
}