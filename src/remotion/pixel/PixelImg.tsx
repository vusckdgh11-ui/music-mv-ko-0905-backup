import React from 'react'
import { PIXEL_SIZE } from './constants'

interface PixelImgProps {
  src: string
  width: number
  height: number
  style?: React.CSSProperties
  crossOrigin?: string
}

export const PixelImg: React.FC<PixelImgProps> = ({ src, width, height, style, crossOrigin }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const imgRef = React.useRef<HTMLImageElement | null>(null)
  const renderedSrcRef = React.useRef<string>('')
  const smallW = Math.max(1, Math.floor(width / PIXEL_SIZE))
  const smallH = Math.max(1, Math.floor(height / PIXEL_SIZE))

  React.useEffect(() => {
    if (renderedSrcRef.current === src) return
    renderedSrcRef.current = src

    const img = new Image()
    if (crossOrigin) img.crossOrigin = crossOrigin as never
    img.src = src
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const offscreen = document.createElement('canvas')
      offscreen.width = smallW
      offscreen.height = smallH
      const offCtx = offscreen.getContext('2d')!
      offCtx.imageSmoothingEnabled = true
      offCtx.drawImage(img, 0, 0, smallW, smallH)

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(offscreen, 0, 0, smallW, smallH, 0, 0, width, height)
    }
  }, [src, smallW, smallH, width, height, crossOrigin])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, ...style }}
    />
  )
}
