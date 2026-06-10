const SITE_NAME = 'IT.Forum'
// Vite injects this at build; falls back to relative for local dev.
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, '')
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`

export interface PageMeta {
  title: string
  description: string
  image?: string
}

function setTag(attr: 'property' | 'name', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

export function setPageMeta({ title, description, image }: PageMeta) {
  const img = image || DEFAULT_OG_IMAGE
  document.title = `${title} — ${SITE_NAME}`
  setTag('name', 'description', description)
  setTag('property', 'og:title', title)
  setTag('property', 'og:description', description)
  setTag('property', 'og:url', window.location.href)
  setTag('property', 'og:image', img)
  setTag('name', 'twitter:title', title)
  setTag('name', 'twitter:description', description)
  setTag('name', 'twitter:image', img)
}
