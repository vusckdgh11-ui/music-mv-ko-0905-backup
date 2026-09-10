import { useRef, useLayoutEffect, type CSSProperties } from 'react'
import type { LyricLine } from '../lrc/types'

interface LyricDisplayProps {
  lyrics: readonly LyricLine[]
  activeIndex: number
  isPortrait: boolean
  energy: number
}

export function LyricDisplay({ lyrics, activeIndex, isPortrait, energy }: LyricDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevActiveRef = useRef(activeIndex)
  const lineHeight = isPortrait ? 50 : 56
  const justChanged = prevActiveRef.current !== activeIndex
  const prevActiveRef1 = useRef(false)

  useLayoutEffect(() => {
    prevActiveRef1.current = false
    if (justChanged) {
      prevActiveRef1.current = true
      const timer = setTimeout(() => { prevActiveRef1.current = false }, 400)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  useLayoutEffect(() => {
    prevActiveRef.current = activeIndex
  }, [activeIndex])

  useLayoutEffect(() => {
    if (!listRef.current || !containerRef.current || lyrics.length === 0) return
    const idx = Math.max(0, activeIndex)
    const targetY = idx * lineHeight
    const containerH = containerRef.current.clientHeight
    listRef.current.style.transform = `translateY(${-targetY + containerH / 2 - lineHeight / 2}px)`
  }, [activeIndex, lineHeight, lyrics.length])

  const VISIBLE_RANGE = isPortrait ? 9 : 7
  const start = Math.max(0, activeIndex - VISIBLE_RANGE)
  const end = Math.min(lyrics.length, activeIndex + VISIBLE_RANGE + 1)
  const visible = lyrics.slice(start, end)

  return (
    <div className="lyric-container" ref={containerRef}>
      <div className="lyric-mask lyric-mask--top" />
      <div className="lyric-list" ref={listRef}>
        {visible.map((line, i) => {
          const globalIndex = start + i
          const isActive = globalIndex === activeIndex
          const isNear = Math.abs(globalIndex - activeIndex) <= 2
          const isEntering = isActive && prevActiveRef1.current
          return (
            <div
              key={`${globalIndex}-${line.time}`}
              className={`lyric-line ${isActive ? 'lyric-line--active' : ''} ${isPortrait ? 'lyric-line--portrait' : ''} ${isEntering ? 'lyric-line--entering' : ''}`}
              style={{
                '--opacity': isNear ? (isActive ? 1 : 0.6) : 0.3,
                '--glow': energy * 20,
                '--glow-spread': energy * 40,
              } as CSSProperties}
            >
              {line.text}
            </div>
          )
        })}
      </div>
      <div className="lyric-mask lyric-mask--bottom" />
    </div>
  )
}
