export const NORMAL_TITLE_FONT_FAMILY = `-apple-system, BlinkMacSystemFont, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`

let measurementCanvas: HTMLCanvasElement | null = null

function fallbackWidth(value: string, fontSize: number) {
  const units = [...value].reduce((total, char) => {
    if (/\s/.test(char)) return total + 0.45
    if (/^[\x00-\x7F]$/.test(char)) return total + 0.62
    return total + 1
  }, 0)
  return units * fontSize
}

export function measureTitleWidth(value: string, fontSize: number, fontFamily = NORMAL_TITLE_FONT_FAMILY, fontWeight = 700) {
  if (typeof document === 'undefined') return fallbackWidth(value, fontSize)
  measurementCanvas ??= document.createElement('canvas')
  const context = measurementCanvas.getContext('2d')
  if (!context) return fallbackWidth(value, fontSize)
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return context.measureText(value).width
}

export function fitTitleFontSize(title: string, baseFontSize: number, maxWidth: number, fontFamily = NORMAL_TITLE_FONT_FAMILY) {
  const value = title.trim()
  if (!value) return baseFontSize
  const safeWidth = maxWidth * 0.975
  const measuredWidth = measureTitleWidth(value, baseFontSize, fontFamily)
  if (measuredWidth <= safeWidth) return baseFontSize
  const fitted = Math.floor(baseFontSize * safeWidth / measuredWidth)
  return Math.max(Math.round(baseFontSize * 0.65), Math.min(baseFontSize, fitted))
}

export function splitTitleLines(title: string, fontSize: number, maxWidth: number, maxLines = 2, fontFamily = NORMAL_TITLE_FONT_FAMILY) {
  const value = title.trim()
  if (!value) return []
  const safeWidth = maxWidth * 0.975
  if (measureTitleWidth(value, fontSize, fontFamily) <= safeWidth) return [value]

  const chars = [...value]
  const candidates = chars
    .map((char, index) => ({ index: index + 1, isSpace: /\s/.test(char) }))
    .filter(({ index }) => index > 0 && index < chars.length)
  const fits = candidates.filter(({ index }) => measureTitleWidth(chars.slice(0, index).join('').trim(), fontSize, fontFamily) <= safeWidth)
  const wordBreaks = fits.filter(({ isSpace }) => isSpace)
  const pool = wordBreaks.length > 0 ? wordBreaks : fits
  const best = pool[pool.length - 1]
  if (!best || maxLines < 2) return [value]
  return [chars.slice(0, best.index).join('').trim(), chars.slice(best.index).join('').trim()]
}

export function truncateTextToWidth(value: string, fontSize: number, maxWidth: number, fontFamily = NORMAL_TITLE_FONT_FAMILY, fontWeight = 400) {
  const text = value.trim()
  if (!text) return ''
  const safeWidth = maxWidth * 0.97
  if (measureTitleWidth(text, fontSize, fontFamily, fontWeight) <= safeWidth) return text

  const ellipsis = '…'
  const chars = [...text]
  let low = 0
  let high = chars.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const candidate = `${chars.slice(0, middle).join('').trimEnd()}${ellipsis}`
    if (measureTitleWidth(candidate, fontSize, fontFamily, fontWeight) <= safeWidth) low = middle
    else high = middle - 1
  }
  return `${chars.slice(0, low).join('').trimEnd()}${ellipsis}`
}
