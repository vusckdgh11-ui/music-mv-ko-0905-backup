import { useRef, useEffect } from 'react'
import type { MutableRefObject } from 'react'

interface WaveformProps {
  waveform: Uint8Array
  progress: number
  analyserRef: MutableRefObject<AnalyserNode | null>
  onClick: (e: React.MouseEvent<HTMLCanvasElement>) => void
}

export function Waveform({ waveform, progress, analyserRef, onClick }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!canvasRef.current || waveform.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const barCount = waveform.length
    const gap = 1
    const barWidth = Math.max(1, (w - gap * (barCount - 1)) / barCount)
    const freqData = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 0)

    function draw() {
      ctx.clearRect(0, 0, w, h)

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap)
        const barH = (waveform[i]! / 255) * h * 0.85
        const y = (h - barH) / 2
        const pct = i / barCount

        if (pct <= progress) {
          ctx.fillStyle = '#fe2c55'
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
        }

        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, barWidth / 2)
        ctx.fill()
      }

      if (analyserRef.current && freqData.length > 0) {
        analyserRef.current.getByteFrequencyData(freqData)
        const binCount = freqData.length
        const activeBars = Math.min(barCount, binCount)
        for (let i = 0; i < activeBars; i++) {
          const x = i * (barWidth + gap)
          const baseH = (waveform[i]! / 255) * h * 0.85
          const freqH = (freqData[i]! / 255) * h * 0.4
          const totalH = Math.max(baseH, freqH)
          const y = (h - totalH) / 2
          const pct = i / barCount

          if (pct <= progress) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
          }

          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, totalH, barWidth / 2)
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => cancelAnimationFrame(rafRef.current)
  }, [waveform, analyserRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="waveform"
      onClick={onClick}
    />
  )
}
