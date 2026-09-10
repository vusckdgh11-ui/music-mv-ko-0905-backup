import type { LyricLine, LrcMeta } from './types'

const TIMESTAMP_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

function parseTimestamp(match: RegExpExecArray): number {
  const minutes = parseInt(match[1]!, 10)
  const seconds = parseInt(match[2]!, 10)
  const fraction = match[3] || ''
  let ms = fraction ? parseInt(fraction, 10) : 0
  if (fraction.length === 1) ms *= 100
  if (fraction.length === 2) ms *= 10
  return minutes * 60 + seconds + ms / 1000
}

function isDisplayableLyric(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (/^\[.+\]$/.test(trimmed)) return false
  if (/^\(.*\)$/.test(trimmed)) return false
  return true
}

function parseMeta(raw: string): LrcMeta {
  let title = ''
  let artist = ''
  let album = ''
  for (const line of raw.split('\n')) {
    const m = line.match(/^\[(ti|ar|al):(.+)\]$/i)
    if (!m) continue
    const val = m[2]!.trim()
    if (m[1]!.toLowerCase() === 'ti') title = val
    if (m[1]!.toLowerCase() === 'ar') artist = val
    if (m[1]!.toLowerCase() === 'al') album = val
  }
  return { title, artist, album }
}

export function parseLRC(raw: string): { lyrics: LyricLine[]; meta: LrcMeta } {
  const lines = raw.split('\n')
  const result: LyricLine[] = []

  for (const rawLine of lines) {
    const line = rawLine.replace(/^\uFEFF/, '').trim()
    const matches = [...line.matchAll(TIMESTAMP_RE)]
    if (matches.length === 0) continue

    const rest = line.replace(TIMESTAMP_RE, '')
    if (!isDisplayableLyric(rest)) continue
    for (const match of matches) {
      result.push({ time: parseTimestamp(match), text: rest.trim() })
    }
  }

  result.sort((a, b) => a.time - b.time)
  return { lyrics: result, meta: parseMeta(raw) }
}

export function parseFallbackName(filename: string): LrcMeta {
  const name = filename.replace(/\.[^.]+$/, '').trim()
  const sep = name.indexOf(' - ')
  if (sep > 0) {
    return { title: name.slice(0, sep).trim(), artist: name.slice(sep + 3).trim(), album: '' }
  }
  return { title: name, artist: '', album: '' }
}
