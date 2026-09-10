import React from 'react'
import { PIXEL_SIZE } from './constants'

interface PixelBackgroundCanvasProps {
  width: number
  height: number
  frame: number
  bgUrl: string
  bgPosition: { x: number; y: number }
  opacity?: number
  style?: React.CSSProperties
}

export const PixelBackgroundCanvas: React.FC<PixelBackgroundCanvasProps> = ({
  width,
  height,
  bgUrl,
  bgPosition,
  opacity = 0.55,
  style,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const bgRef = React.useRef<HTMLImageElement | null>(null)
  const offscreenRef = React.useRef<HTMLCanvasElement | null>(null)

  const smallW = Math.max(1, Math.floor(width / PIXEL_SIZE))
  const smallH = Math.max(1, Math.floor(height / PIXEL_SIZE))

  React.useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = bgUrl
    img.onload = () => {
      bgRef.current = img
      const offscreen = document.createElement('canvas')
      offscreen.width = smallW
      offscreen.height = smallH
      offscreenRef.current = offscreen
    }
  }, [bgUrl, smallW, smallH])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const img = bgRef.current
    const offscreen = offscreenRef.current
    if (!canvas || !img || !offscreen) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return

    offCtx.imageSmoothingEnabled = false

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

    offCtx.drawImage(img, sx, sy, sw, sh, 0, 0, smallW, smallH)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(offscreen, 0, 0, smallW, smallH, 0, 0, width, height)

    const darkAlpha = 1 - opacity
    ctx.fillStyle = `rgba(0,0,0,${darkAlpha})`
    ctx.fillRect(0, 0, width, height)
  })

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={style}
    />
  )
}
