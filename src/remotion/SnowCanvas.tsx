import React from 'react'
import { PIXEL_SIZE } from './pixel/constants'

interface SnowCanvasProps {
  width: number
  height: number
  frame: number
  fps: number
  bgUrl: string
  bgPosition: { x: number; y: number }
  pixelated?: boolean
  direction?: 'natural' | 'right' | 'left'
  style?: React.CSSProperties
}

interface Snowflake {
  x: number
  y: number
  size: number
  speed: number
  drift: number
  alpha: number
  wobbleAmp: number
  wobbleSpeed: number
  wobbleOffset: number
  rotation: number
  rotSpeed: number
  depth: number
  twinkleSpeed: number
  twinkleOffset: number
  branches: number
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function createSnowflakes(count: number, width: number, height: number): Snowflake[] {
  return Array.from({ length: count }, (_, i) => {
    const depth = seededRandom(i * 13.7 + 91)
    const baseSize = 3 + seededRandom(i * 19.7 + 89) * 5
    return {
      x: seededRandom(i * 73.1 + 17) * width,
      y: -20 - seededRandom(i * 41.3 + 53) * height * 3,
      size: baseSize * (0.4 + depth * 0.6),
      speed: (0.3 + seededRandom(i * 31.3 + 67) * 0.8) * (0.5 + depth * 0.5),
      drift: (seededRandom(i * 57.9 + 23) - 0.5) * 0.3 * (0.3 + depth * 0.7),
      alpha: (0.55 + seededRandom(i * 83.2 + 41) * 0.45) * (0.4 + depth * 0.6),
      wobbleAmp: 0.2 + seededRandom(i * 47.6 + 71) * 0.5,
      wobbleSpeed: 0.4 + seededRandom(i * 29.4 + 33) * 1.0,
      wobbleOffset: seededRandom(i * 61.8 + 59) * Math.PI * 2,
      rotation: seededRandom(i * 37.2 + 77) * Math.PI * 2,
      rotSpeed: (seededRandom(i * 53.1 + 43) - 0.5) * 0.02,
      depth,
      twinkleSpeed: 1 + seededRandom(i * 67.4 + 31) * 2,
      twinkleOffset: seededRandom(i * 79.5 + 11) * Math.PI * 2,
      branches: seededRandom(i * 91.2 + 59) > 0.6 ? 6 : (seededRandom(i * 91.2 + 59) > 0.3 ? 4 : 0),
    }
  })
}

function drawSnowflakeShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  branches: number,
) {
  if (branches === 0) {
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)

  const armLen = size * 1.5
  const subLen = armLen * 0.4

  for (let b = 0; b < branches; b++) {
    const angle = (b / branches) * Math.PI * 2

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * armLen, Math.sin(angle) * armLen)
    ctx.stroke()

    const mx = Math.cos(angle) * armLen * 0.6
    const my = Math.sin(angle) * armLen * 0.6
    const subAngle1 = angle + Math.PI / 5
    const subAngle2 = angle - Math.PI / 5
    ctx.beginPath()
    ctx.moveTo(mx, my)
    ctx.lineTo(mx + Math.cos(subAngle1) * subLen, my + Math.sin(subAngle1) * subLen)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(mx, my)
    ctx.lineTo(mx + Math.cos(subAngle2) * subLen, my + Math.sin(subAngle2) * subLen)
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(0, 0, Math.max(0.5, size * 0.2), 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function snapPixel(v: number): number {
  return Math.round(v / PIXEL_SIZE) * PIXEL_SIZE
}

export const SnowCanvas: React.FC<SnowCanvasProps> = ({
  width,
  height,
  frame,
  fps,
  bgUrl,
  bgPosition,
  pixelated = false,
  direction = 'natural',
  style,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const bgRef = React.useRef<HTMLImageElement | null>(null)
  const bgDataRef = React.useRef<ImageData | null>(null)
  const snowflakesRef = React.useRef<Snowflake[] | null>(null)

  const snowCount = Math.round(width * height / 6000)

  React.useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = bgUrl
    img.onload = () => {
      bgRef.current = img
      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const offCtx = offscreen.getContext('2d')!

      if (pixelated) {
        const smallW = Math.max(1, Math.floor(width / PIXEL_SIZE))
        const smallH = Math.max(1, Math.floor(height / PIXEL_SIZE))
        const tmp = document.createElement('canvas')
        tmp.width = smallW
        tmp.height = smallH
        const tmpCtx = tmp.getContext('2d')!
        tmpCtx.imageSmoothingEnabled = false

        const imgRatio = img.naturalWidth / img.naturalHeight
        const canvasRatio = smallW / smallH
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
        if (imgRatio > canvasRatio) {
          sw = img.naturalHeight * canvasRatio
          sx = (img.naturalWidth - sw) * (bgPosition.x / 100)
        } else {
          sh = img.naturalWidth / canvasRatio
          sy = (img.naturalHeight - sh) * (bgPosition.y / 100)
        }
        tmpCtx.drawImage(img, sx, sy, sw, sh, 0, 0, smallW, smallH)

        offCtx.imageSmoothingEnabled = false
        offCtx.drawImage(tmp, 0, 0, smallW, smallH, 0, 0, width, height)
      } else {
        offCtx.filter = 'blur(6px)'
        offCtx.drawImage(img, 0, 0, width, height)
      }
      bgDataRef.current = offCtx.getImageData(0, 0, width, height)
    }
  }, [bgUrl, bgPosition, width, height, pixelated])

  React.useEffect(() => {
    if (!snowflakesRef.current) {
      snowflakesRef.current = createSnowflakes(snowCount, width, height)
    }

    const canvas = canvasRef.current
    const bgData = bgDataRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (bgData) {
      ctx.putImageData(bgData, 0, 0)
    } else {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
    }

    const flakes = snowflakesRef.current
    const dt = 1 / fps
    const time = frame * dt

    const directionalWind = direction === 'right' ? 1.2 : direction === 'left' ? -1.2 : 0
    const wind = directionalWind + Math.sin(time * 0.2) * 0.3 + Math.sin(time * 0.7) * 0.15

    flakes.sort((a, b) => a.depth - b.depth)

    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i]!

      f.y += f.speed * fps * dt
      f.x += (f.drift + wind * f.depth) * fps * dt
        + Math.sin(time * f.wobbleSpeed + f.wobbleOffset) * f.wobbleAmp * dt
      f.rotation += f.rotSpeed * fps * dt

      if (f.y > height + 20) {
        f.y = -20 - seededRandom(frame * 0.1 + i * 7.3) * height * 0.4
        f.x = seededRandom(frame * 0.13 + i * 11.7) * width
      }
      if (f.x > width + 20) f.x = -20
      if (f.x < -20) f.x = width + 20

      const twinkle = 0.7 + Math.sin(time * f.twinkleSpeed + f.twinkleOffset) * 0.3
      const finalAlpha = f.alpha * twinkle

      if (pixelated) {
        // Pixel-style: draw as square blocks snapped to grid
        const px = snapPixel(f.x)
        const py = snapPixel(f.y)
        const ps = Math.max(PIXEL_SIZE, snapPixel(f.size))

        ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`
        ctx.fillRect(px, py, ps, ps)

        if (f.depth > 0.7 && f.size > 2) {
          const glowSize = ps * 2
          ctx.fillStyle = `rgba(200, 220, 255, ${finalAlpha * 0.06})`
          ctx.fillRect(px - PIXEL_SIZE, py - PIXEL_SIZE, glowSize, glowSize)
        }
      } else {
        if (f.size < 1.5 || f.depth < 0.3) {
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`
          ctx.fill()
        } else {
          ctx.strokeStyle = `rgba(255, 255, 255, ${finalAlpha})`
          ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`
          ctx.lineWidth = Math.max(0.3, f.size * 0.15)
          drawSnowflakeShape(ctx, f.x, f.y, f.size, f.rotation, f.branches)
        }

        if (f.depth > 0.7 && f.size > 2) {
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.size * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200, 220, 255, ${finalAlpha * 0.06})`
          ctx.fill()
        }
      }
    }
  }, [direction, frame])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={style}
    />
  )
}
