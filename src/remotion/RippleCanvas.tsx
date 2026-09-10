import React from 'react'
import { PIXEL_SIZE } from './pixel/constants'

interface RippleCanvasProps {
  width: number
  height: number
  bgUrl: string
  bgPosition: { x: number; y: number }
  ripples: Array<{
    elapsed: number
    cx: number
    cy: number
    strength: number
  }>
  damping?: number
  refractiveIndex?: number
  opacity?: number
  pixelated?: boolean
  className?: string
  style?: React.CSSProperties
}

export const RippleCanvas: React.FC<RippleCanvasProps> = ({
  width,
  height,
  bgUrl,
  bgPosition,
  ripples,
  damping = 0.97,
  refractiveIndex = 8,
  opacity = 0.35,
  pixelated = false,
  className,
  style,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const bufferRef = React.useRef<Float32Array | null>(null)
  const prevBufferRef = React.useRef<Float32Array | null>(null)
  const bgRef = React.useRef<HTMLImageElement | null>(null)
  const bgDataRef = React.useRef<ImageData | null>(null)

  const resW = 256
  const resH = Math.round(256 * (height / width))

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
    const size = resW * resH
    if (!bufferRef.current) {
      bufferRef.current = new Float32Array(size)
      prevBufferRef.current = new Float32Array(size)
    }

    const canvas = canvasRef.current
    const bgData = bgDataRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!bgData) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
      return
    }

    const buf = bufferRef.current
    const prev = prevBufferRef.current!

    // Add new ripple drops
    for (const r of ripples) {
      if (r.elapsed >= 0 && r.elapsed < 3) {
        const cx = Math.round(r.cx * resW)
        const cy = Math.round(r.cy * resH)
        const radius = Math.max(1, Math.round(Math.min(resW, resH) * 0.012))
        const dropStrength = r.strength * 512
        for (let y = cy - radius; y <= cy + radius; y++) {
          for (let x = cx - radius; x <= cx + radius; x++) {
            if (x < 0 || x >= resW || y < 0 || y >= resH) continue
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if (dist < radius) {
              const falloff = Math.cos((dist / radius) * Math.PI * 0.5)
              buf[y * resW + x]! += dropStrength * falloff
            }
          }
        }
      }
    }

    // Propagate waves
    for (let y = 1; y < resH - 1; y++) {
      for (let x = 1; x < resW - 1; x++) {
        const idx = y * resW + x
        const val = (
          (buf[idx - 1]! + buf[idx + 1]! + buf[idx - resW]! + buf[idx + resW]!) / 2
          - prev[idx]!
        ) * damping
        prev[idx] = val
      }
    }
    const tmp = bufferRef.current
    bufferRef.current = prevBufferRef.current!
    prevBufferRef.current = tmp

    // Render displaced background
    const pixels = bgData.data
    const output = ctx.createImageData(width, height)
    const out = output.data

    const scaleX = resW / width
    const scaleY = resH / height
    const alpha = Math.round(opacity * 255)

    const step = pixelated ? PIXEL_SIZE : 1

    for (let py = 0; py < height; py += step) {
      for (let px = 0; px < width; px += step) {
        const rx = Math.floor(px * scaleX)
        const ry = Math.floor(py * scaleY)

        let sx = px
        let sy = py
        let brightness = 1

        if (rx >= 1 && rx < resW - 1 && ry >= 1 && ry < resH - 1) {
          const ri = ry * resW + rx
          const dx = (buf[ri - 1]! - buf[ri + 1]!) * refractiveIndex
          const dy = (buf[ri - resW]! - buf[ri + resW]!) * refractiveIndex
          sx = Math.round(px + dx)
          sy = Math.round(py + dy)
          brightness = 1 + buf[ri]! * 0.0003
        }

        sx = Math.max(0, Math.min(width - 1, sx))
        sy = Math.max(0, Math.min(height - 1, sy))

        const srcIdx = (sy * width + sx) * 4
        const bgR = Math.min(255, Math.max(0, pixels[srcIdx]! * brightness))
        const bgG = Math.min(255, Math.max(0, pixels[srcIdx + 1]! * brightness))
        const bgB = Math.min(255, Math.max(0, pixels[srcIdx + 2]! * brightness))
        const outR = Math.round(bgR * opacity)
        const outG = Math.round(bgG * opacity)
        const outB = Math.round(bgB * opacity)
        const outA = Math.round(alpha)

        // Fill pixel block
        const endX = Math.min(px + step, width)
        const endY = Math.min(py + step, height)
        for (let by = py; by < endY; by++) {
          for (let bx = px; bx < endX; bx++) {
            const dstIdx = (by * width + bx) * 4
            out[dstIdx] = outR
            out[dstIdx + 1] = outG
            out[dstIdx + 2] = outB
            out[dstIdx + 3] = outA
          }
        }
      }
    }

    ctx.putImageData(output, 0, 0)
  })

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={style}
    />
  )
}
