import { useRef, useCallback } from 'react'
import { useAudioSync } from './useAudioSync'
import { LyricDisplay } from './LyricDisplay'
import { BarVisualizer } from './BarVisualizer'
import type { LyricLine } from '../lrc/types'
import type { AspectRatio } from '../exporter/canvasRenderer'
import type { LrcMeta } from '../lrc/types'

interface PlayerProps {
  audioUrl: string
  imageUrl: string
  lyrics: LyricLine[]
  ratio: AspectRatio
  bgPosition: { x: number; y: number }
  onBgPositionChange: (pos: { x: number; y: number }) => void
  meta: LrcMeta
  autoPlay?: boolean
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function Player({ audioUrl, imageUrl, lyrics, ratio, bgPosition, onBgPositionChange, meta, autoPlay }: PlayerProps) {
  const { currentTime, duration, playing, activeIndex, bars } = useAudioSync(audioUrl, lyrics, autoPlay)
  const isPortrait = ratio === '9:16'
  const draggingRef = useRef(false)
  const startRef = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    draggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startRef.current = { mx: e.clientX, my: e.clientY, px: bgPosition.x, py: bgPosition.y }
  }, [bgPosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const dx = e.clientX - startRef.current.mx
    const dy = e.clientY - startRef.current.my
    onBgPositionChange({
      x: Math.max(0, Math.min(100, startRef.current.px + dx * 0.2)),
      y: Math.max(0, Math.min(100, startRef.current.py + dy * 0.2)),
    })
  }, [onBgPositionChange])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  const progress = duration > 0 ? currentTime / duration : 0
  const firstLyricTime = lyrics.length > 0 ? lyrics[0]!.time : 5
  const introFade = duration > 0 && firstLyricTime > 0
    ? Math.max(0, 1 - Math.max(0, (currentTime - firstLyricTime + 1) / 1))
    : 0

  return (
    <div className="player">
      <div
        className="player__bg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${bgPosition.x}% ${bgPosition.y}%`,
              opacity: 0.35
          }}
          draggable={false}
        />
      </div>
      <div className="player__overlay" />

      {/* CD case + disc + song name */}
      <div className="player__cd-group">
        <div className="player__cd-case">
          <img className="player__cd-case-img" src={imageUrl} alt="" draggable={false} />
        </div>
        <div className="player__cd">
          <div className="player__cd-disc" style={{ backgroundImage: `url(${imageUrl})` }} />
          <div className="player__cd-hole" />
        </div>
        {meta.title && (
          <div className="player__cd-info">
            <div className="player__cd-title">{meta.title}</div>
            {meta.album && <div className="player__cd-album">{meta.album} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><polyline points="9,6 15,12 9,18" /></svg></div>}
            {meta.artist && <div className="player__cd-artist">{meta.artist}</div>}
            <span className="player__cd-vip">HOYA</span>
          </div>
        )}
      </div>

      {introFade > 0 && introFade < 1 && (
        <div className="intro-card intro-card--fade">
          <div className="intro-card__inner">
            <img className="intro-card__thumb" src={imageUrl} alt="" />
            <div className="intro-card__info">
              <div className="intro-card__title">{meta.title}</div>
              {meta.artist && <div className="intro-card__artist">{meta.artist}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="player__content">
        <LyricDisplay lyrics={lyrics} activeIndex={activeIndex} isPortrait={isPortrait} energy={0} />
      </div>

      <div className="player__controls">
        <div className="player__visualizer">
          <BarVisualizer bars={bars} progress={progress} />
        </div>
        <div className="player__progress-row">
          <span className="player__time">{formatTime(currentTime)}</span>
          <div className="player__progress-bar">
            <div className="player__progress-fill" style={{ width: `${progress * 100}%` }}>
              <div className="player__progress-thumb" />
            </div>
          </div>
          <span className="player__time">{formatTime(duration)}</span>
        </div>
        <div className="player__btn-row">
          <div className="player__btn-skip">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <polygon points="19,20 9,12 19,4" />
              <rect x="5" y="4" width="2.5" height="16" />
            </svg>
          </div>
          <div className="player__btn-play">
            {playing ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                <polygon points="9,6 9,18 18,12" />
              </svg>
            )}
          </div>
          <div className="player__btn-skip">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <polygon points="5,4 15,12 5,20" />
              <rect x="16.5" y="4" width="2.5" height="16" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
