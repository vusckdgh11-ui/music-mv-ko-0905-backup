import type { LyricLine, LrcMeta } from '../lrc/types'
import type { VisualizerStyle } from './SpectrumVisualizer'

export interface CompositionProps {
  bgUrl: string
  audioVideoUrl: string
  lyrics: readonly LyricLine[]
  meta: LrcMeta
  bgPosition: { x: number; y: number }
  duration: number
  startTime: number
  frequencyBars: Uint8Array[]
  playing?: boolean
  effect?: 'ripple' | 'snow' | 'rain' | 'particles' | 'stars' | 'fog' | 'embers' | 'dust' | 'fireflies' | 'bokeh' | 'zoom' | 'none'
  effectDirection?: 'natural' | 'right' | 'left'
  visualizerStyle?: VisualizerStyle
  style?: 'normal' | 'pixel'
}
