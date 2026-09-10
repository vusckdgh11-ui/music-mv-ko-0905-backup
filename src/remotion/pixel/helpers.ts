import type { CSSProperties } from 'react'
import { PIXEL_FONT_FAMILY } from './constants'

export function pixelText(fontSize: number, fontWeight: number = 400, color: string = '#fff'): CSSProperties {
  return { fontFamily: PIXEL_FONT_FAMILY, fontSize, fontWeight, color }
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

export function quantizeAlpha(alpha: number, steps: number = 5): number {
  const step = 1 / steps
  return Math.round(alpha / step) * step
}
