// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setPageMeta } from './meta'

function content(selector: string) {
  return document.head.querySelector(selector)?.getAttribute('content')
}

describe('setPageMeta', () => {
  beforeEach(() => {
    document.title = ''
    document.head.innerHTML = ''
  })

  it('sets document.title with the site suffix', () => {
    setPageMeta({ title: 'Hello thread', description: 'desc' })
    expect(document.title).toBe('Hello thread — IT.Forum')
  })

  it('creates og + twitter tags when missing', () => {
    setPageMeta({ title: 'T', description: 'D', image: 'https://x/og.png' })
    expect(content('meta[property="og:title"]')).toBe('T')
    expect(content('meta[property="og:description"]')).toBe('D')
    expect(content('meta[property="og:image"]')).toBe('https://x/og.png')
    expect(content('meta[name="twitter:title"]')).toBe('T')
    expect(content('meta[name="twitter:image"]')).toBe('https://x/og.png')
  })

  it('updates existing tags in place rather than duplicating', () => {
    setPageMeta({ title: 'First', description: 'D1' })
    setPageMeta({ title: 'Second', description: 'D2' })
    expect(document.head.querySelectorAll('meta[property="og:title"]').length).toBe(1)
    expect(content('meta[property="og:title"]')).toBe('Second')
  })
})
