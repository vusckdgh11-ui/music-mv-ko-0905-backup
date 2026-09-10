import type { CSSProperties } from 'react'

interface WaveformViewProps {
  peaks: Uint8Array
  progress: number
  barColor?: string
  inactiveColor?: string
  height?: number | string
}

export function WaveformView({
  peaks,
  progress,
  barColor = '#fe2c55',
  inactiveColor = 'rgba(255, 255, 255, 0.25)',
  height = '100%',
}: WaveformViewProps) {
  const barCount = peaks.length
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', height } as CSSProperties}>
      {Array.from({ length: barCount }, (_, i) => {
        const pct = i / barCount
        const h = (peaks[i]! / 255) * 100
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              minHeight: 1,
              borderRadius: 1,
              backgroundColor: pct <= progress ? barColor : inactiveColor,
              transition: 'background-color 0.1s',
            }}
          />
        )
      })}
    </div>
  )
}
