import type { LyricLine, LrcMeta } from '../lrc/types'
import { findCurrentLyricIndex } from '../lrc/sync'

export const ASPECT_RATIOS = {
  '16:9': { width: 1920, height: 1080, fontSizeActive: 56, fontSizeInactive: 40, lineHeight: 90 },
  '9:16': { width: 1080, height: 1920, fontSizeActive: 48, fontSizeInactive: 34, lineHeight: 76 },
} as const

export type AspectRatio = keyof typeof ASPECT_RATIOS

const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", sans-serif'

interface RenderState {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  bgImage: HTMLImageElement
  lyrics: readonly LyricLine[]
  config: (typeof ASPECT_RATIOS)[AspectRatio]
  bgPosition: { x: number; y: number }
}

export function createRenderState(
  bgImage: HTMLImageElement,
  lyrics: readonly LyricLine[],
  ratio: AspectRatio = '16:9',
  bgPosition: { x: number; y: number } = { x: 50, y: 50 },
): RenderState {
  const config = ASPECT_RATIOS[ratio]
  const canvas = document.createElement('canvas')
  canvas.width = config.width
  canvas.height = config.height
  const ctx = canvas.getContext('2d')!
  return { canvas, ctx, bgImage, lyrics, config, bgPosition }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  bgPosition: { x: number; y: number },
) {
  const { width: cw, height: ch } = ctx.canvas
  const { naturalWidth: iw, naturalHeight: ih } = bgImage

  const scale = Math.max(cw / iw, ch / ih)
  const sw = iw * scale
  const sh = ih * scale

  const offsetX = sw - cw
  const offsetY = sh - ch
  const sx = -(bgPosition.x / 100) * offsetX
  const sy = -(bgPosition.y / 100) * offsetY

  ctx.drawImage(bgImage, sx, sy, sw, sh)

  const grad = ctx.createLinearGradient(0, 0, 0, ch)
  grad.addColorStop(0, 'rgba(0,0,0,0.5)')
  grad.addColorStop(0.4, 'rgba(0,0,0,0.15)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.15)')
  grad.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, cw, ch)
}

function drawLyrics(
  ctx: CanvasRenderingContext2D,
  lyrics: readonly LyricLine[],
  currentTime: number,
  config: (typeof ASPECT_RATIOS)[AspectRatio],
) {
  const { width, height } = ctx.canvas
  const activeIndex = findCurrentLyricIndex(lyrics, currentTime)
  if (lyrics.length === 0) return

  const controlsHeight = 60 * (height / 1080)
  const availableH = height - controlsHeight
  const centerY = availableH / 2
  const { fontSizeActive, fontSizeInactive, lineHeight } = config

  const startIdx = Math.max(0, activeIndex < 0 ? 0 : activeIndex - 7)
  const endIdx = Math.min(lyrics.length, activeIndex < 0 ? 9 : activeIndex + 8)
  const centerIdx = activeIndex < 0 ? 0 : activeIndex

  for (let i = startIdx; i < endIdx; i++) {
    const line = lyrics[i]!
    const offset = i - centerIdx
    const y = centerY + offset * lineHeight

    if (y < -lineHeight || y > height + lineHeight) continue

    const isActive = i === activeIndex
    const dist = Math.abs(offset)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (isActive) {
      ctx.font = `700 ${fontSizeActive}px ${FONT_FAMILY}`
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2
    } else {
      const alpha = dist <= 2 ? 0.6 : 0.3
      ctx.font = `400 ${fontSizeInactive}px ${FONT_FAMILY}`
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
      ctx.shadowBlur = 6
    }

    ctx.fillText(line.text, width / 2, y)
    ctx.restore()
  }
}

export function renderFrame(state: RenderState, currentTimeSeconds: number) {
  const { ctx, bgImage, lyrics, config, bgPosition } = state
  drawBackground(ctx, bgImage, bgPosition)
  drawLyrics(ctx, lyrics, currentTimeSeconds, config)
}

export function renderIntroFrame(state: RenderState, meta: LrcMeta, opacity: number, currentTimeSeconds?: number) {
  const { ctx, bgImage, bgPosition, lyrics, config } = state
  drawBackground(ctx, bgImage, bgPosition)

  drawLyrics(ctx, lyrics, currentTimeSeconds ?? 0, config)

  if (opacity <= 0) return

  const { width, height } = ctx.canvas
  const introY = height * 0.4
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 16

  ctx.font = `700 ${Math.round(width * 0.045)}px ${FONT_FAMILY}`
  ctx.fillText(meta.title, width / 2, introY - (meta.artist ? 30 : 0))

  if (meta.artist) {
    ctx.font = `400 ${Math.round(width * 0.028)}px ${FONT_FAMILY}`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.fillText(meta.artist, width / 2, introY + 30)
  }

  ctx.restore()
}
