import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { Audio } from '@remotion/media'
import { findCurrentLyricIndex } from '../../lrc/sync'
import type { CompositionProps } from '../types'
import { playIconUrl, pauseIconUrl } from '../iconUrl'
import { PixelBackgroundCanvas } from '../pixel/PixelBackgroundCanvas'
import { PixelImg } from '../pixel/PixelImg'
import { PIXEL_SIZE } from '../pixel/constants'
import { pixelText, snapToGrid } from '../pixel/helpers'
import { RippleCanvas } from '../RippleCanvas'
import { SnowCanvas } from '../SnowCanvas'
import { AmbientCanvas, isAmbientEffect } from '../AmbientCanvas'
import { SpectrumVisualizer } from '../SpectrumVisualizer'

const LAYOUT = { fontSizeActive: 42, fontSizeInactive: 28, lineHeight: 80 } as const

export const Pixel16x9: React.FC<CompositionProps> = ({
  bgUrl,
  audioVideoUrl,
  lyrics,
  meta,
  bgPosition,
  duration,
  startTime,
  frequencyBars,
  playing = false,
  effect = 'ripple',
  effectDirection = 'natural',
  visualizerStyle = 'bars',
}) => {
  const frame = useCurrentFrame()
  const { fps, width, height, durationInFrames } = useVideoConfig()
  const currentTime = startTime + frame / fps

  const lastPlayingRef = React.useRef(playing)
  const toggleFrameRef = React.useRef(-999)
  if (playing !== lastPlayingRef.current) {
    toggleFrameRef.current = frame
    lastPlayingRef.current = playing
  }
  const toggleAge = frame - toggleFrameRef.current
  const toggleDuration = 8
  const playOpacity = playing
    ? interpolate(toggleAge, [0, toggleDuration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(toggleAge, [0, toggleDuration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const pauseOpacity = 1 - playOpacity

  const activeIndex = findCurrentLyricIndex(lyrics, currentTime)

  const leftW = Math.round(width * 0.50)
  const pad = Math.round(width * 0.10)

  const titleFontSize = Math.round(width * 0.032)
  const albumFontSize = Math.round(width * 0.022)
  const songInfoH = Math.round(height * 0.12)

  const cdAreaH = Math.round(height * 0.40)
  const cdCaseSize = Math.min(cdAreaH, leftW - pad * 2)
  const cdLeft = pad
  const cdTop = songInfoH + Math.round(height * 0.08) + Math.round((cdAreaH - cdCaseSize) / 2)

  const slideDuration = 1
  const slideFrames = Math.round(slideDuration * fps)
  const spinFrame = Math.max(0, frame - slideFrames)
  const cdAngle = (spinFrame / fps / 8) * 360

  const cdBorder = Math.round(width * 0.002)
  const imageSize = cdCaseSize - (2 * cdBorder)
  const cdDiameter = Math.round(cdCaseSize * 0.78)
  const holeSize = Math.round(cdDiameter * 0.2)

  const slideX = snapToGrid(
    interpolate(frame, [0, slideFrames], [0, cdDiameter * 0.55], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    PIXEL_SIZE
  )

  const fbTop = songInfoH + cdAreaH + Math.round(height * 0.14)
  const fbMainH = Math.round(height * 0.06)
  const fbGap = 2
  const fbCount = frequencyBars.length > 0 ? frequencyBars[0]!.length : 32
  const fbPad = pad

  const smoothData = new Float32Array(fbCount)
  if (frequencyBars.length > 0) {
    const radius = 2
    for (let offset = -radius; offset <= radius; offset++) {
      const fi = Math.max(0, Math.min(frame + offset, frequencyBars.length - 1))
      const data = frequencyBars[fi]
      if (data) {
        for (let b = 0; b < fbCount; b++) {
          smoothData[b]! += data[b]!
        }
      }
    }
    const total = 2 * radius + 1
    for (let b = 0; b < fbCount; b++) {
      smoothData[b]! /= total
    }
  }

  const controlsTop = fbTop + fbMainH + Math.round(height * 0.04)
  const progress = duration > 0 ? currentTime / duration : 0
  const timeFontSize = Math.round(width * 0.012)
  const barH = Math.max(PIXEL_SIZE, snapToGrid(Math.round(height * 0.005), PIXEL_SIZE))
  const thumbSize = PIXEL_SIZE * 2

  function fmt(s: number): string {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progressRowH = barH + thumbSize
  const btnRowTop = progressRowH + Math.round(height * 0.04)

  const lyricsLeft = Math.round(width * 0.46)
  const lyricsWidth = width - leftW
  const lyricsTop = Math.round(height * 0.08)
  const lyricsH = height - lyricsTop - Math.round(height * 0.08)
  const centerY = lyricsH / 2
  const centerIdx = activeIndex >= 0 ? activeIndex : 0

  const VISIBLE = 7
  const start = Math.max(0, centerIdx - VISIBLE)
  const end = Math.min(lyrics.length, centerIdx + VISIBLE + 1)

  return (
    <div data-name="root" style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
      {audioVideoUrl && (
        <Audio
          data-name="audio"
          src={audioVideoUrl}
          trimBefore={Math.round(startTime * fps)}
          volume={1}
        />
      )}

      {/* Dynamic background effect */}
      {effect === 'snow' ? (
        <SnowCanvas
          width={width}
          height={height}
          frame={frame}
          fps={fps}
          bgUrl={bgUrl}
          bgPosition={bgPosition}
          direction={effectDirection}
          pixelated
          style={{ position: 'absolute', top: 0, left: 0, width, height }}
        />
      ) : isAmbientEffect(effect) ? (
        <AmbientCanvas
          width={width}
          height={height}
          frame={frame}
          fps={fps}
          bgUrl={bgUrl}
          bgPosition={bgPosition}
          effect={effect}
          direction={effectDirection}
          pixelated
          style={{ position: 'absolute', top: 0, left: 0, width, height }}
        />
      ) : effect === 'ripple' ? (() => {
        const rippleDrops: Array<{ startFrame: number; elapsed: number; cx: number; cy: number; strength: number }> = []
        let f = Math.round(fps * 1)
        let idx = 0
        while (f < durationInFrames - fps * 8) {
          const s = idx * 137.5 + 42
          let cx: number, cy: number
          if (idx === 0) {
            const edge = Math.floor((s * 1.1) % 4)
            if (edge === 0) { cx = 0.05; cy = 0.2 + ((s * 3.7) % 1) * 0.6 }
            else if (edge === 1) { cx = 0.95; cy = 0.2 + ((s * 3.7) % 1) * 0.6 }
            else if (edge === 2) { cx = 0.2 + ((s * 7.3) % 1) * 0.6; cy = 0.05 }
            else { cx = 0.2 + ((s * 7.3) % 1) * 0.6; cy = 0.95 }
          } else {
            cx = 0.15 + ((s * 7.3) % 1) * 0.7
            cy = 0.15 + ((s * 3.7) % 1) * 0.7
          }
          const strength = 0.4 + ((s * 1.3) % 1) * 0.4
          rippleDrops.push({ startFrame: f, elapsed: 0, cx, cy, strength })
          f += Math.round(fps * (5 + (s * 0.7) % 3))
          idx++
        }
        const activeRipples = rippleDrops
          .map((r) => ({ ...r, elapsed: (frame - r.startFrame) / fps }))
          .filter((r) => r.elapsed >= -0.1 && r.elapsed < 2.5)
          .map((r) => ({ elapsed: r.elapsed, cx: r.cx, cy: r.cy, strength: r.strength }))

        return (
          <RippleCanvas
            width={width}
            height={height}
            bgUrl={bgUrl}
            bgPosition={bgPosition}
            ripples={activeRipples}
            damping={0.97}
            refractiveIndex={12}
            opacity={0.55}
            pixelated
            style={{ position: 'absolute', top: 0, left: 0, width, height }}
          />
        )
      })() : (
        <PixelBackgroundCanvas
          width={width}
          height={height}
          frame={frame}
          bgUrl={bgUrl}
          bgPosition={bgPosition}
          opacity={0.55}
          style={{ position: 'absolute', top: 0, left: 0, width, height }}
        />
      )}

      {/* Song info */}
      {meta.title && (
        <div data-name="song-info" style={{
          position: 'absolute',
          left: pad,
          top: Math.round(height * 0.04),
          width: leftW - pad * 2,
          zIndex: 3,
        }}>
          <div data-name="song-title" style={{
            ...pixelText(titleFontSize, 700),
            lineHeight: 1.6,
            overflow: 'hidden',
          }}>
            {meta.title}
          </div>
          {meta.album && (
            <div data-name="song-album-row" style={{ display: 'flex', alignItems: 'center', marginTop: 6, width: '100%' }}>
              <span data-name="song-album" style={{
                ...pixelText(albumFontSize, 400, 'rgba(255,255,255,0.5)'),
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {meta.album}
              </span>
              <svg data-name="album-chevron" width={Math.round(albumFontSize * 1.1)} height={Math.round(albumFontSize * 1.1)} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" style={{ flexShrink: 0, marginLeft: 0 }}><polyline points="9,6 15,12 9,18" /></svg>
              {/*<div data-name="vip-badge" style={{*/}
              {/*  ...pixelText(Math.round(albumFontSize * 0.8), 600, 'rgba(255,255,255,0.6)'),*/}
              {/*  flexShrink: 0,*/}
              {/*  padding: `${Math.round(albumFontSize * 0.15)}px ${Math.round(albumFontSize * 0.6)}px`,*/}
              {/*  border: `${Math.round(width * 0.001)}px solid rgba(255,255,255,0.4)`,*/}
              {/*  marginLeft: 10,*/}
              {/*}}>*/}
              {/*  VIP*/}
              {/*</div>*/}
            </div>
          )}
        </div>
      )}

      {/* CD disc border */}
      <div data-name="cd-disc-border" style={{
        position: 'absolute',
        left: cdLeft + (cdCaseSize - cdDiameter) / 2 + slideX - Math.round(width * 0.004),
        top: cdTop + (cdCaseSize - cdDiameter) / 2 - Math.round(width * 0.004),
        width: cdDiameter + Math.round(width * 0.008),
        height: cdDiameter + Math.round(width * 0.008),
        borderRadius: (cdDiameter + Math.round(width * 0.008)) / 2,
        backgroundColor: 'rgba(255,255,255,0.65)',
        transform: `rotate(${cdAngle}deg)`,
        zIndex: 1,
      }} />

      {/* CD disc */}
      <div data-name="cd-disc" style={{
        position: 'absolute',
        left: cdLeft + (cdCaseSize - cdDiameter) / 2 + slideX,
        top: cdTop + (cdCaseSize - cdDiameter) / 2,
        width: cdDiameter,
        height: cdDiameter,
        borderRadius: cdDiameter / 2,
        overflow: 'hidden',
        transform: `rotate(${cdAngle}deg)`,
        zIndex: 1,
      }}>
        <PixelImg
          data-name="cd-disc-img"
          src={bgUrl}
          width={cdDiameter}
          height={cdDiameter}
        />
        <div data-name="cd-hole" style={{
          position: 'absolute',
          left: (cdDiameter - holeSize) / 2,
          top: (cdDiameter - holeSize) / 2,
          width: holeSize,
          height: holeSize,
          borderRadius: holeSize / 2,
          backgroundColor: '#111',
          border: `${Math.round(width * 0.001)}px solid rgba(255,255,255,0.2)`,
        }} />
      </div>

      {/* CD case (square) */}
      <div data-name="cd-case" style={{
        position: 'absolute',
        left: cdLeft,
        top: cdTop,
        width: cdCaseSize,
        height: cdCaseSize,
        overflow: 'hidden',
        border: `${cdBorder}px solid rgba(255,255,255,0.5)`,
        zIndex: 2,
      }}>
        <PixelImg
          data-name="cd-case-img"
          src={bgUrl}
          width={imageSize}
          height={imageSize}
        />
      </div>

      {/* Frequency visualizer */}
      <div data-name="frequency-visualizer" style={{
        position: 'absolute',
        top: fbTop,
        left: fbPad,
        width: leftW - fbPad * 2,
        height: fbMainH,
      }}>
        <SpectrumVisualizer data={smoothData} width={leftW - fbPad * 2} height={fbMainH}
          gap={fbGap} style={visualizerStyle} pixelated />
      </div>

      {/* Controls */}
      <div data-name="controls" style={{
        position: 'absolute',
        top: controlsTop,
        left: -pad * 0.5,
        width: leftW + pad,
        height: btnRowTop + Math.round(width * 0.05),
      }}>
        <div data-name="progress-row" style={{
          position: 'absolute',
          top: 0,
          left: pad,
          right: pad,
          height: progressRowH,
        }}>
          <div data-name="time-current" style={{
            ...pixelText(timeFontSize, 400, 'rgba(255,255,255,0.6)'),
            position: 'absolute',
            left: 0,
            top: 0,
            width: Math.round(width * 0.08),
            height: progressRowH,
            lineHeight: `${progressRowH}px`,
            textAlign: 'right',
            paddingRight: 6,
          }}>
            {fmt(currentTime)}
          </div>

          <div data-name="progress-bar" style={{
            position: 'absolute',
            left: Math.round(width * 0.09),
            right: Math.round(width * 0.09),
            top: progressRowH / 2 - barH / 2,
            height: barH,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}>
            <div data-name="progress-fill" style={{
              width: `${Math.min(progress * 100, 100)}%`,
              height: barH,
              backgroundColor: '#fff',
            }} />
            <div data-name="progress-thumb" style={{
              position: 'absolute',
              top: barH / 2 - thumbSize / 2,
              left: `${Math.min(progress * 100, 100)}%`,
              width: thumbSize,
              height: thumbSize,
              backgroundColor: '#fff',
              marginLeft: -thumbSize / 2,
            }} />
          </div>

          <div data-name="time-total" style={{
            ...pixelText(timeFontSize, 400, 'rgba(255,255,255,0.6)'),
            position: 'absolute',
            right: 0,
            top: 0,
            width: Math.round(width * 0.08),
            height: progressRowH,
            lineHeight: `${progressRowH}px`,
            textAlign: 'left',
            paddingLeft: 6,
          }}>
            {fmt(startTime + duration)}
          </div>
        </div>

        <div data-name="btn-row" style={{
          position: 'absolute',
          top: btnRowTop,
          left: 0,
          right: 0,
          height: Math.round(width * 0.05),
          textAlign: 'center',
        }}>
          <div data-name="btn-prev" style={{
            position: 'absolute',
            top: '50%',
            left: '30%',
            width: Math.round(width * 0.035),
            height: Math.round(width * 0.035),
            transform: 'translate(-50%, -50%)',
            opacity: 0.7,
          }}>
            <svg width="100%" height="100%" viewBox="0 0 24 24">
              <path d="M18 5L10 12L18 19" stroke="#fff" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
              <line x1="7" y1="5" x2="7" y2="19" stroke="#fff" strokeWidth="3" />
            </svg>
          </div>

          <div data-name="btn-play" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: Math.round(width * 0.055),
            height: Math.round(width * 0.055),
            border: `${Math.round(width * 0.002)}px solid rgba(255,255,255,0.9)`,
            transform: 'translate(-50%, -50%)',
          }}>
            <img
              data-name="btn-play-icon"
              src={playIconUrl()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: Math.round(width * 0.03),
                height: Math.round(width * 0.03),
                transform: 'translate(-50%, -50%)',
                opacity: playOpacity,
                imageRendering: 'pixelated' as const,
              }}
            />
            <img
              data-name="btn-pause-icon"
              src={pauseIconUrl()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: Math.round(width * 0.03),
                height: Math.round(width * 0.03),
                transform: 'translate(-50%, -50%)',
                opacity: pauseOpacity,
                imageRendering: 'pixelated' as const,
              }}
            />
          </div>

          <div data-name="btn-next" style={{
            position: 'absolute',
            top: '50%',
            right: '30%',
            width: Math.round(width * 0.035),
            height: Math.round(width * 0.035),
            transform: 'translate(50%, -50%)',
            opacity: 0.7,
          }}>
            <svg width="100%" height="100%" viewBox="0 0 24 24">
              <path d="M6 5L14 12L6 19" stroke="#fff" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
              <line x1="17" y1="5" x2="17" y2="19" stroke="#fff" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Lyrics */}
      {lyrics.length > 0 && (
        <div data-name="lyrics-container" style={{
          position: 'absolute',
          top: lyricsTop,
          left: lyricsLeft,
          width: lyricsWidth,
          height: lyricsH,
          overflow: 'hidden',
        }}>
          {lyrics.slice(start, end).map((line, i) => {
            const gi = start + i
            const offset = gi - centerIdx
            const isActive = gi === activeIndex
            const dist = Math.abs(offset)
            const top = snapToGrid(centerY + offset * LAYOUT.lineHeight - LAYOUT.lineHeight / 2, PIXEL_SIZE)

            const enterFrames = isActive
              ? (currentTime - line.time) * fps
              : -1

            const enterDuration = 6
            const exitFrames = gi === activeIndex - 1
              ? (currentTime - (lyrics[activeIndex]?.time ?? currentTime)) * fps
              : enterDuration
            const sizeProgress = isActive
              ? interpolate(enterFrames, [0, enterDuration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              : gi === activeIndex - 1
                ? interpolate(exitFrames, [0, enterDuration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                : 0
            const animatedFontSize = interpolate(sizeProgress, [0, 1], [LAYOUT.fontSizeInactive, LAYOUT.fontSizeActive])
            const fontSize = Math.min(animatedFontSize, (lyricsWidth - 80) / Math.max([...line.text].length, 1) * 0.9)
            const opacity = isActive
              ? interpolate(enterFrames, [0, enterDuration], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })
              : dist <= 2 ? 0.4 : 0.15

            const slideY = isActive
              ? snapToGrid(
                  interpolate(enterFrames, [0, enterDuration], [PIXEL_SIZE * 2, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                  PIXEL_SIZE
                )
              : 0

            return (
              <div
                key={`${gi}-${line.time}`}
                data-name={`lyric-line-${gi}`}
                style={{
                  position: 'absolute',
                  top: top + slideY,
                  left: 0,
                  width: lyricsWidth,
                  height: LAYOUT.lineHeight,
                  textAlign: 'center',
                  ...pixelText(fontSize, isActive ? 700 : 400),
                  opacity,
                  lineHeight: `${LAYOUT.lineHeight}px`,
                  whiteSpace: 'nowrap',
                }}
              >
                {line.text}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
