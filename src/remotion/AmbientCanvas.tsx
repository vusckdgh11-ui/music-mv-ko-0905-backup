import React from 'react'

export type AmbientEffect = 'rain' | 'particles' | 'stars' | 'fog' | 'embers' | 'dust' | 'fireflies' | 'bokeh' | 'zoom'

export function isAmbientEffect(effect: string): effect is AmbientEffect {
  return ['rain', 'particles', 'stars', 'fog', 'embers', 'dust', 'fireflies', 'bokeh', 'zoom'].includes(effect)
}

interface AmbientCanvasProps {
  width: number
  height: number
  frame: number
  fps: number
  bgUrl: string
  bgPosition: { x: number; y: number }
  effect: AmbientEffect
  direction?: 'natural' | 'right' | 'left'
  pixelated?: boolean
  style?: React.CSSProperties
}

function seeded(seed: number): number {
  const value = Math.sin(seed * 91.345 + 17.123) * 47453.5453
  return value - Math.floor(value)
}

export const AmbientCanvas: React.FC<AmbientCanvasProps> = ({
  width, height, frame, fps, bgUrl, bgPosition, effect, direction = 'natural', pixelated = false, style,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const time = frame / fps
  const zoom = effect === 'zoom' ? 1.02 + (Math.sin(time * 0.12 - Math.PI / 2) + 1) * 0.035 : 1
  const horizontal = direction === 'right' ? 1 : direction === 'left' ? -1 : 0

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)

    if (effect === 'rain') {
      ctx.lineWidth = Math.max(1, width / 900)
      for (let i = 0; i < 95; i++) {
        const speed = 650 + seeded(i + 3) * 700
        const baseX = seeded(i * 4.7) * width
        const x = ((baseX + time * speed * (horizontal || 0.18)) % (width + 100) + width + 100) % (width + 100) - 50
        const y = (seeded(i * 8.1) * height + time * speed) % (height + 140) - 70
        const length = 22 + seeded(i * 2.3) * 55
        ctx.strokeStyle = `rgba(190,220,255,${0.16 + seeded(i * 6.2) * 0.28})`
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - length * 0.18, y + length)
        ctx.stroke()
      }
    }

    if (effect === 'particles' || effect === 'embers' || effect === 'dust' || effect === 'fireflies') {
      const count = effect === 'embers' ? 68 : 58
      for (let i = 0; i < count; i++) {
        const speed = 18 + seeded(i * 5.4) * 48
        const drift = Math.sin(time * (0.25 + seeded(i) * 0.5) + i) * width * 0.018
        const travel = time * speed * (horizontal || 0)
        const x = ((seeded(i * 9.2) * width + drift + travel) % (width + 40) + width + 40) % (width + 40) - 20
        const verticalTravel = horizontal === 0 ? time * speed : time * speed * 0.12
        const y = height - ((seeded(i * 2.1) * height + verticalTravel) % (height + 40))
        const radiusBase = effect === 'dust' ? 0.8 : effect === 'embers' ? 1.5 : 2.2
        const radiusRange = effect === 'dust' ? 2 : effect === 'embers' ? 3 : 5
        const radius = radiusBase + seeded(i * 7.7) * radiusRange
        const pulse = effect === 'fireflies' ? 0.35 + Math.abs(Math.sin(time * 1.2 + i)) * 0.65 : 1
        const alpha = (0.2 + seeded(i * 3.8) * 0.52) * pulse
        ctx.fillStyle = effect === 'embers' ? `rgba(255,${100 + Math.round(seeded(i) * 90)},45,${alpha})`
          : effect === 'fireflies' ? `rgba(220,255,105,${alpha})`
          : effect === 'dust' ? `rgba(235,225,205,${alpha * 0.6})`
          : `rgba(230,242,255,${alpha})`
        ctx.shadowColor = effect === 'embers' ? 'rgba(255,95,20,.8)'
          : effect === 'fireflies' ? 'rgba(205,255,80,.8)' : 'rgba(190,225,255,.65)'
        ctx.shadowBlur = radius * 3
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    if (effect === 'stars') {
      for (let i = 0; i < 85; i++) {
        const x = ((seeded(i * 3.3) * width + time * 7 * horizontal) % width + width) % width
        const y = seeded(i * 7.9) * height
        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * (0.5 + seeded(i) * 1.4) + i))
        const radius = 1 + seeded(i * 4.4) * 3
        ctx.fillStyle = `rgba(225,238,255,${twinkle * 0.75})`
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (effect === 'fog') {
      for (let i = 0; i < 5; i++) {
        const flow = horizontal === 0 ? 1 : horizontal
        const x = (((seeded(i * 4.2) * width + time * (12 + i * 4) * flow) % (width * 1.8)) + width * 1.8) % (width * 1.8) - width * 0.4
        const y = height * (0.25 + seeded(i * 8.8) * 0.55)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, width * 0.42)
        gradient.addColorStop(0, `rgba(225,235,242,${0.09 + i * 0.012})`)
        gradient.addColorStop(1, 'rgba(225,235,242,0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      }
    }

    if (effect === 'bokeh') {
      for (let i = 0; i < 24; i++) {
        const speed = 5 + seeded(i * 2.7) * 14
        const flow = horizontal === 0 ? 0.3 : horizontal
        const x = ((seeded(i * 5.1) * width + time * speed * flow) % (width + 180) + width + 180) % (width + 180) - 90
        const y = seeded(i * 8.3) * height + Math.sin(time * 0.25 + i) * height * 0.025
        const radius = 12 + seeded(i * 4.9) * 46
        ctx.fillStyle = `rgba(220,235,255,${0.025 + seeded(i) * 0.07})`
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [direction, effect, frame, fps, height, horizontal, width])

  return (
    <div style={{ ...style, overflow: 'hidden', backgroundColor: '#000' }}>
      <img src={bgUrl} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        objectPosition: `${bgPosition.x}% ${bgPosition.y}%`, opacity: 0.55,
        filter: pixelated ? 'contrast(1.08) saturate(.9)' : 'blur(6px)',
        imageRendering: pixelated ? 'pixelated' : 'auto', transform: `scale(${zoom})`,
      }} />
      <canvas ref={canvasRef} width={width} height={height}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  )
}
