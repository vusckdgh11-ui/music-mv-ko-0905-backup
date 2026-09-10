import type { CSSProperties } from 'react'

interface BarVisualizerProps {
  bars: Uint8Array
  progress: number
  activeColor?: string
  inactiveColor?: string
}

export function BarVisualizer({
  bars,
  progress,
  activeColor = 'rgba(255, 255, 255, 0.9)',
  inactiveColor = 'rgba(255, 255, 255, 0.15)',
}: BarVisualizerProps) {
  const count = bars.length
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 2,
      width: '100%',
      height: '100%',
      padding: '0 2px',
    } as CSSProperties}>
      {Array.from({ length: count }, (_, i) => {
        const h = (bars[i]! / 255) * 100
        const pct = i / count
        const isActive = pct <= progress
        return (
          <div
            key={i}
            style={{
              flex: 1,
              maxWidth: 8,
              height: `${Math.max(h, 3)}%`,
              minHeight: 2,
              borderRadius: 2,
              backgroundColor: isActive ? activeColor : inactiveColor,
            }}
          />
        )
      })}
    </div>
  )
}
