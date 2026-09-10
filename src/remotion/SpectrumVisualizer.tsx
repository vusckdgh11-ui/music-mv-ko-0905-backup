import React from 'react'

export type VisualizerStyle = 'bars' | 'rounded' | 'symmetric' | 'wave' | 'dots'

interface SpectrumVisualizerProps {
  data: Float32Array
  width: number
  height: number
  gap?: number
  style?: VisualizerStyle
  pixelated?: boolean
}

function getLevels(data: Float32Array): number[] {
  const count = data.length || 32
  return Array.from({ length: count }, (_, i) => {
    const level = Math.max(0, Math.min(1, (data[i] || 0) / 255))
    const bandLift = 0.92 + (i / Math.max(1, count - 1)) * 0.16
    return Math.min(0.96, Math.pow(level, 1.18) * bandLift)
  })
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  data, width, height, gap = 2, style = 'bars', pixelated = false,
}) => {
  const levels = getLevels(data)
  const count = levels.length
  const slot = width / count
  const baseWidth = Math.max(pixelated ? 4 : 2, slot - gap)
  const barWidth = style === 'rounded' ? Math.max(2, baseWidth * 0.62) : baseWidth

  if (style === 'wave') {
    const points = levels.map((level, i) => {
      const x = count <= 1 ? 0 : i / (count - 1) * width
      const y = height - Math.max(2, level * height * 0.9)
      return `${x},${y}`
    }).join(' ')
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <polyline points={points} fill="none" stroke="rgba(255,255,255,.92)"
          strokeWidth={pixelated ? 4 : 3} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      {levels.map((level, i) => {
        const x = i * slot + (slot - barWidth) / 2
        const h = Math.max(pixelated ? 4 : 2, level * height * (style === 'symmetric' ? 0.45 : 0.92))
        const alpha = 0.32 + level * 0.65
        if (style === 'dots') {
          const size = Math.max(pixelated ? 5 : 3, Math.min(barWidth, 5 + level * 8))
          return <div key={i} style={{ position: 'absolute', left: i * slot + (slot - size) / 2,
            bottom: Math.max(0, level * (height - size)), width: size, height: size,
            borderRadius: pixelated ? 0 : '50%', backgroundColor: `rgba(255,255,255,${alpha})` }} />
        }
        return <div key={i} style={{ position: 'absolute', left: x,
          bottom: style === 'symmetric' ? height / 2 - h : 0, width: barWidth,
          height: style === 'symmetric' ? h * 2 : h,
          borderRadius: pixelated ? 0 : style === 'rounded' ? barWidth / 2 : Math.min(3, barWidth / 3),
          backgroundColor: `rgba(255,255,255,${alpha})` }} />
      })}
    </div>
  )
}
