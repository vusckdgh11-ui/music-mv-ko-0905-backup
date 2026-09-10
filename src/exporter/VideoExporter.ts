import React from 'react'
import { canRenderMediaOnWeb, renderMediaOnWeb } from '@remotion/web-renderer'
import { computeFrequencyBars } from '../utils/frequency'
import i18n from '../i18n'
import type { LyricLine, LrcMeta } from '../lrc/types'
import type { ExportConfig } from '../App'
import { LyricVideo } from '../remotion/LyricVideo'
import type { VisualizerStyle } from '../remotion/SpectrumVisualizer'

const FPS = 30

export interface ExportOptions {
  bgUrl: string
  audioVideoUrl: string
  audioFile: File
  lyrics: LyricLine[]
  ratio?: '16:9' | '9:16'
  bgPosition?: { x: number; y: number }
  meta?: LrcMeta
  exportConfig?: ExportConfig
  style?: 'normal' | 'pixel'
  effect?: 'ripple' | 'snow' | 'rain' | 'particles' | 'stars' | 'fog' | 'embers' | 'dust' | 'fireflies' | 'bokeh' | 'zoom' | 'none'
  effectDirection?: 'natural' | 'right' | 'left'
  visualizerStyle?: VisualizerStyle
  frequencyBars?: Uint8Array[]
  onProgress?: (ratio: number, message: string) => void
}

function crfToBitrate(crf: number): number {
  if (crf <= 18) return 10_000_000
  if (crf <= 20) return 8_000_000
  if (crf <= 23) return 5_000_000
  if (crf <= 26) return 3_000_000
  if (crf <= 28) return 2_000_000
  return 1_000_000
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      resolve(audio.duration)
      URL.revokeObjectURL(url)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load audio'))
    }
  })
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

export async function exportVideo({
  bgUrl,
  audioVideoUrl,
  audioFile,
  lyrics,
  ratio = '16:9',
  bgPosition = { x: 50, y: 50 },
  meta = { title: '', artist: '', album: '' },
  exportConfig,
  style = 'normal',
  effect = 'ripple',
  effectDirection = 'natural',
  visualizerStyle = 'bars',
  frequencyBars: preparedFrequencyBars,
  onProgress,
}: ExportOptions): Promise<string> {
  const defaultCfg: ExportConfig = { startTime: 0, endTime: 0, crf: 23, audioBitrate: '192k', scale: 0.75 }
  const cfg = exportConfig ?? defaultCfg

  onProgress?.(0, i18n.t('loadingFiles'))
  await preloadImage(bgUrl)

  const [fullDuration, frequencyBars] = await Promise.all([
    getAudioDuration(audioFile),
    preparedFrequencyBars !== undefined
      ? Promise.resolve(preparedFrequencyBars)
      : audioFile.arrayBuffer().then((buffer) => computeFrequencyBars(buffer, FPS)),
  ])

  const startTime = cfg.startTime || 0
  const endTime = cfg.endTime || fullDuration
  const duration = endTime - startTime
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(i18n.t('invalidRange'))
  }
  const totalFrames = Math.ceil(duration * FPS)
  const renderFrequencyBars = frequencyBars.slice(
    Math.floor(startTime * FPS),
    Math.ceil(endTime * FPS),
  )

  const isPortrait = ratio === '9:16'
  const compWidth = isPortrait ? 1080 : 1920
  const compHeight = isPortrait ? 1920 : 1080

  const outputWidth = Math.round(compWidth * cfg.scale)
  const outputHeight = Math.round(compHeight * cfg.scale)
  const support = await canRenderMediaOnWeb({
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: outputWidth,
    height: outputHeight,
    videoBitrate: Math.round(crfToBitrate(cfg.crf) * cfg.scale),
    audioBitrate: parseInt(cfg.audioBitrate) * 1000,
  })
  if (!support.canRender) {
    const issue = support.issues.find((item) => item.severity === 'error')
    throw new Error(issue?.message || i18n.t('browserUnsupported'))
  }

  onProgress?.(0.05, i18n.t('renderingVideo'))

  const { getBlob } = await renderMediaOnWeb({
    composition: {
      id: 'LyricVideo',
      component: LyricVideo as unknown as React.FC<Record<string, unknown>>,
      durationInFrames: totalFrames,
      fps: FPS,
      width: compWidth,
      height: compHeight,
    },
    inputProps: {
      bgUrl,
      audioVideoUrl,
      lyrics,
      meta,
      ratio,
      bgPosition,
      duration,
      startTime,
      frequencyBars: renderFrequencyBars,
      effect,
      effectDirection,
      visualizerStyle,
      playing: true,
      style,
    },
    videoCodec: 'h264',
    container: 'mp4',
    videoBitrate: Math.round(crfToBitrate(cfg.crf) * cfg.scale),
    audioCodec: 'aac',
    audioBitrate: parseInt(cfg.audioBitrate) * 1000,
    scale: cfg.scale,
    onProgress: ({ progress }) => {
      onProgress?.(progress, i18n.t('renderingProgress', { percent: Math.round(progress * 100) }))
    },
  })

  onProgress?.(0.95, i18n.t('finalizing'))
  const videoBlob = await getBlob()

  onProgress?.(1, i18n.t('exportComplete'))
  return URL.createObjectURL(videoBlob)
}
