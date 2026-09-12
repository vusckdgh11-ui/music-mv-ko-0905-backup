import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion'
import { Audio } from '@remotion/media'
import { findCurrentLyricIndex } from '../../lrc/sync'
import type { CompositionProps } from '../types'
import { playIconUrl, pauseIconUrl } from '../iconUrl'
import { RippleCanvas } from '../RippleCanvas'
import { SnowCanvas } from '../SnowCanvas'
import { AmbientCanvas, isAmbientEffect } from '../AmbientCanvas'
import { SpectrumVisualizer } from '../SpectrumVisualizer'
import { fitTitleFontSize } from '../../utils/titleFont'

const LAYOUT = { fontSizeActive: 58, fontSizeInactive: 40, lineHeight: 100 } as const

export const Normal9x16: React.FC<CompositionProps> = ({
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

  const titleFontSize = fitTitleFontSize(meta.title, Math.round(width * 0.055), Math.round(width * 0.41))
  const albumFontSize = Math.round(width * 0.0405)
  const artistFontSize = Math.round(width * 0.0439)
  const vipFontSize = Math.round(width * 0.0338)

  const controlsH = Math.round(height * 0.18)
  const cdCaseSize = Math.round(width * 0.28)
  const cdDiameter = Math.round(cdCaseSize * 0.78)
  const cdLeft = Math.round(width * 0.04)
  const cdTop = Math.round(height * 0.1)
  const holeSize = Math.round(cdDiameter * 0.2)
  const slideDuration = 1
  const slideFrames = Math.round(slideDuration * fps)
  const slideX = interpolate(frame, [0, slideFrames], [0, cdDiameter * 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const spinFrame = Math.max(0, frame - slideFrames)
  const cdAngle = (spinFrame / fps / 8) * 360

  const lyricsTop = Math.round(height * 0.3)
  const lyricsH = height - lyricsTop - controlsH
  const centerY = lyricsH / 2
  const centerIdx = activeIndex >= 0 ? activeIndex : 0

  const VISIBLE = 7
  const start = Math.max(0, centerIdx - VISIBLE)
  const end = Math.min(lyrics.length, centerIdx + VISIBLE + 1)

  const progress = duration > 0 ? currentTime / duration : 0
  const pad = Math.round(width * 0.04)
  const timeFontSize = Math.round(width * 0.0372)
  const barH = Math.max(4, Math.round(height * 0.003))
  const thumbR = Math.round(width * 0.006)

  const fbPad = pad
  const fbMainH = Math.round(height * 0.045)
  const fbReflectH = Math.round(fbMainH * 0.35)
  const fbHeight = fbMainH + fbReflectH
  const fbGap = 2
  const fbCount = frequencyBars.length > 0 ? frequencyBars[0]!.length : 32

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

  function fmt(s: number): string {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const fbTop = Math.round(controlsH * 0.08)
  const progressTop = fbTop + fbHeight + Math.round(controlsH * 0.08)
  const btnTop = progressTop + barH + thumbR * 2 + Math.round(controlsH * 0.1)

  const cdBorder = Math.round(width * 0.003)
  const imageSize = cdCaseSize - (2 * cdBorder)

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
      {effect === 'none' ? (
        <img
          data-name="static-bg"
          src={bgUrl}
          style={{
            position: 'absolute', top: 0, left: 0, width, height,
            objectFit: 'cover', objectPosition: `${bgPosition.x}% ${bgPosition.y}%`,
            opacity: 0.55, filter: 'blur(6px)',
          }}
        />
      ) : effect === 'snow' ? (
        <SnowCanvas
          width={width}
          height={height}
          frame={frame}
          fps={fps}
          bgUrl={bgUrl}
          bgPosition={bgPosition}
          direction={effectDirection}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
          }}
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
          style={{ position: 'absolute', top: 0, left: 0, width, height }}
        />
      ) : (() => {
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
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width,
              height,
            }}
          />
        )
      })()}

      <div data-name="cd-disc-border" style={{
        position: 'absolute',
        left: cdLeft + (cdCaseSize - cdDiameter) / 2 + slideX - Math.round(width * 0.005),
        top: cdTop + (cdCaseSize - cdDiameter) / 2 - Math.round(width * 0.005),
        width: cdDiameter + Math.round(width * 0.01),
        height: cdDiameter + Math.round(width * 0.01),
        borderRadius: (cdDiameter + Math.round(width * 0.01)) / 2,
        backgroundColor: 'rgba(255,255,255,0.65)',
        transform: `rotate(${cdAngle}deg)`,
        zIndex: 1,
      }} />

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
        <img data-name="cd-disc-img" src={bgUrl} style={{
          width: cdDiameter,
          height: cdDiameter,
        }} />
        <div data-name="cd-hole" style={{
          position: 'absolute',
          left: (cdDiameter - holeSize) / 2,
          top: (cdDiameter - holeSize) / 2,
          width: holeSize,
          height: holeSize,
          borderRadius: holeSize / 2,
          backgroundColor: '#111',
          border: `${Math.round(width * 0.002)}px solid rgba(255,255,255,0.1)`,
          boxShadow: '0 0 4px rgba(0,0,0,0.5)',
        }} />
      </div>

      <div data-name="cd-case" style={{
        position: 'absolute',
        left: cdLeft,
        top: cdTop,
        width: cdCaseSize,
        height: cdCaseSize,
        overflow: 'hidden',
        borderRadius: Math.round(cdCaseSize * 0.032),
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)',
        border: `${cdBorder}px solid rgba(255,255,255,0.35)`,
        zIndex: 2,
      }}>
        <img data-name="cd-case-img" src={bgUrl} style={{ width: imageSize, height: imageSize, borderRadius: Math.round(cdCaseSize * 0.032) }} />
      </div>

      {meta.title && (
        <div data-name="song-info" style={{
          position: 'absolute',
          left: cdLeft + cdCaseSize + Math.round(width * 0.03) + slideX,
          top: cdTop,
          width: width - (cdLeft + cdCaseSize + Math.round(width * 0.03) + slideX) - Math.round(width * 0.04),
          height: cdDiameter,
          zIndex: 3,
        }}>
          <div data-name="song-title" style={{
            position: 'absolute',
            top: cdDiameter * 0.15,
            left: 0,
            fontSize: titleFontSize,
            fontWeight: 700,
            color: '#fff',
            overflow: 'hidden',
            lineHeight: `${Math.round(titleFontSize * 1.3)}px`,
            width: '100%',
          }}>
            {meta.title}
          </div>
          {meta.album && (
            <div data-name="song-album" style={{
              position: 'absolute',
              top: cdDiameter * 0.15 + Math.round(titleFontSize * 1.3) + 2,
              left: 0,
              fontSize: albumFontSize,
              color: 'rgba(255,255,255,0.45)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {meta.album}
              <svg data-name="album-chevron" width={Math.round(width * 0.04)} height={Math.round(width * 0.04)} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginLeft: 4 }}><polyline points="9,6 15,12 9,18" /></svg>
            </div>
          )}
          <div data-name="vip-badge" style={{
            position: 'absolute',
            top: cdDiameter * 0.15 + Math.round(titleFontSize * 1.3) + 2 + albumFontSize + 4 + artistFontSize + 6,
            left: 0,
            padding: `${Math.round(vipFontSize * 0.1)}px ${Math.round(vipFontSize * 0.6)}px`,
            fontSize: vipFontSize,
            fontWeight: 600,
            letterSpacing: 0.3,
            color: 'rgba(255,255,255,0.5)',
            border: `${Math.round(width * 0.001)}px solid rgba(255,255,255,0.35)`,
            borderRadius: Math.round(width * 0.01),
          }}>
            HOYA
          </div>
        </div>
      )}

      {lyrics.length > 0 && (
        <div data-name="lyrics-container" style={{ position: 'absolute', top: lyricsTop, left: 0, width, height: lyricsH, overflow: 'hidden' }}>
          {lyrics.slice(start, end).map((line, i) => {
            const gi = start + i
            const offset = gi - centerIdx
            const isActive = gi === activeIndex
            const dist = Math.abs(offset)
            const top = centerY + offset * LAYOUT.lineHeight - LAYOUT.lineHeight / 2

            const enterFrames = isActive
              ? (currentTime - line.time) * fps
              : -1

            const enterDuration = 10
            const exitFrames = gi === activeIndex - 1
              ? (currentTime - (lyrics[activeIndex]?.time ?? currentTime)) * fps
              : enterDuration
            const sizeProgress = isActive
              ? interpolate(enterFrames, [0, enterDuration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              : gi === activeIndex - 1
                ? interpolate(exitFrames, [0, enterDuration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                : 0
            const animatedFontSize = interpolate(sizeProgress, [0, 1], [LAYOUT.fontSizeInactive, 50])
            const fontSize = Math.min(animatedFontSize, (width - 80) / Math.max([...line.text].length, 1) * 0.9)
            const opacity = isActive
              ? interpolate(enterFrames, [0, enterDuration], [0.2, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                })
              : dist <= 2 ? 0.35 : 0.15

            const scale = isActive
              ? interpolate(enterFrames, [0, enterDuration], [1, 1.06], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                })
              : gi === activeIndex - 1
                ? interpolate(exitFrames, [0, enterDuration], [1.06, 1], {
                    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
                  })
                : 1

            const slideY = isActive
              ? interpolate(enterFrames, [0, enterDuration], [12, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                })
              : 0

            return (
              <div
                key={`${gi}-${line.time}`}
                data-name={`lyric-line-${gi}`}
                style={{
                  position: 'absolute',
                  top: top + slideY,
                  left: 0,
                  width,
                  height: LAYOUT.lineHeight,
                  textAlign: 'center',
                  fontSize,
                  fontWeight: isActive ? 700 : 400,
                  color: '#fff',
                  opacity,
                  transform: `scale(${scale})`,
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

      <div data-name="controls" style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width,
        height: controlsH,
      }}>
        <div data-name="frequency-visualizer" style={{
          position: 'absolute',
          top: fbTop,
          left: fbPad,
          right: fbPad,
          height: fbHeight,
        }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: fbReflectH, height: fbMainH }}>
            <SpectrumVisualizer data={smoothData} width={width - fbPad * 2} height={fbMainH}
              gap={fbGap} style={visualizerStyle} />
          </div>
        </div>

        <div data-name="progress-row" style={{
          position: 'absolute',
          top: progressTop,
          left: pad,
          right: pad,
          height: barH + thumbR * 2,
        }}>
          <div data-name="time-current" style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: Math.round(width * 0.08),
            height: barH + thumbR * 2,
            color: 'rgba(255,255,255,0.6)',
            fontSize: timeFontSize,
            lineHeight: `${barH + thumbR * 2}px`,
            textAlign: 'right',
            paddingRight: 6,
          }}>
            {fmt(currentTime)}
          </div>

          <div data-name="progress-bar" style={{
            position: 'absolute',
            left: Math.round(width * 0.09),
            right: Math.round(width * 0.09),
            top: (barH + thumbR * 2) / 2 - barH / 2,
            height: barH,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: barH / 2,
          }}>
            <div data-name="progress-fill" style={{
              width: `${Math.min(progress * 100, 100)}%`,
              height: barH,
              backgroundColor: '#fff',
              borderRadius: barH / 2,
            }} />
            <div data-name="progress-thumb" style={{
              position: 'absolute',
              top: barH / 2 - thumbR,
              left: `${Math.min(progress * 100, 100)}%`,
              width: thumbR * 2,
              height: thumbR * 2,
              borderRadius: thumbR,
              backgroundColor: '#fff',
              marginLeft: -thumbR,
            }} />
          </div>

          <div data-name="time-total" style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: Math.round(width * 0.08),
            height: barH + thumbR * 2,
            color: 'rgba(255,255,255,0.6)',
            fontSize: timeFontSize,
            lineHeight: `${barH + thumbR * 2}px`,
            textAlign: 'left',
            paddingLeft: 6,
          }}>
            {fmt(startTime + duration)}
          </div>
        </div>

        <div data-name="btn-row" style={{
          position: 'absolute',
          top: btnTop,
          left: 0,
          right: 0,
          height: Math.round(width * 0.08),
          textAlign: 'center',
        }}>
          <div data-name="btn-prev" style={{
            position: 'absolute',
            top: '50%',
            left: width * 0.3,
            width: Math.round(width * 0.055),
            height: Math.round(width * 0.055),
            transform: 'translate(-50%, -50%)',
            opacity: 0.7,
          }}>
            <svg width="100%" height="100%" viewBox="0 0 24 24">
              <path d="M18 5L10 12L18 19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="7" y1="5" x2="7" y2="19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <div data-name="btn-play" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: Math.round(width * 0.1),
            height: Math.round(width * 0.1),
            borderRadius: '50%',
            border: `${Math.round(width * 0.003)}px solid rgba(255,255,255,0.9)`,
            transform: 'translate(-50%, -50%)',
          }}>
            <img
              data-name="btn-play-icon"
              src={playIconUrl()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: Math.round(width * 0.06),
                height: Math.round(width * 0.06),
                transform: 'translate(-50%, -50%)',
                opacity: playOpacity,
              }}
            />
            <img
              data-name="btn-pause-icon"
              src={pauseIconUrl()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: Math.round(width * 0.06),
                height: Math.round(width * 0.06),
                transform: 'translate(-50%, -50%)',
                opacity: pauseOpacity,
              }}
            />
          </div>

          <div data-name="btn-next" style={{
            position: 'absolute',
            top: '50%',
            right: width * 0.3,
            width: Math.round(width * 0.055),
            height: Math.round(width * 0.055),
            transform: 'translate(50%, -50%)',
            opacity: 0.7,
          }}>
            <svg width="100%" height="100%" viewBox="0 0 24 24">
              <path d="M6 5L14 12L6 19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="17" y1="5" x2="17" y2="19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
