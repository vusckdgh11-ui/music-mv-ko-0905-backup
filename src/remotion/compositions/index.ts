import { Normal9x16 } from './Normal9x16'
import { Normal16x9 } from './Normal16x9'
import { Pixel9x16 } from './Pixel9x16'
import { Pixel16x9 } from './Pixel16x9'
import type { CompositionProps } from '../types'

type Style = 'normal' | 'pixel'
type Ratio = '16:9' | '9:16'

const registry: Record<Ratio, Record<Style, React.FC<CompositionProps>>> = {
  '9:16': { normal: Normal9x16, pixel: Pixel9x16 },
  '16:9': { normal: Normal16x9, pixel: Pixel16x9 },
}

export function getComposition(ratio: Ratio, style: Style = 'normal'): React.FC<CompositionProps> {
  return registry[ratio]?.[style] ?? Normal9x16
}
