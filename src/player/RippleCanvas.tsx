import { useRef, useEffect } from 'react'

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
  lineWidth: number
}

interface RippleCanvasProps {
  energy: number
}

export function RippleCanvas({ energy }: RippleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const timerRef = useRef(0)
  const nextRef = useRef(0)
  const energyRef = useRef(0)

  useEffect(() => {
    energyRef.current = energy
  }, [energy])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let running = true

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const parent = canvas.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas.parentElement!)

    const spawn = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = parent.clientHeight
      const e = energyRef.current
      const maxR = 100 + e * 200
      ripplesRef.current.push({
        x: w * (0.3 + Math.random() * 0.4),
        y: h * (0.3 + Math.random() * 0.4),
        radius: 0,
        maxRadius: maxR,
        alpha: 0.12 + e * 0.15,
        lineWidth: 1 + e * 1.5,
      })
      if (ripplesRef.current.length > 8) {
        ripplesRef.current = ripplesRef.current.slice(-8)
      }
      const interval = Math.max(800, 3000 - e * 2500)
      nextRef.current = setTimeout(spawn, interval)
    }

    nextRef.current = setTimeout(spawn, 500)

    const draw = () => {
      if (!running) return
      const parent = canvas.parentElement
      if (!parent) { timerRef.current = requestAnimationFrame(draw); return }
      const w = parent.clientWidth
      const h = parent.clientHeight

      ctx.clearRect(0, 0, w, h)

      ripplesRef.current = ripplesRef.current.filter((r) => {
        r.radius += 0.6 + energyRef.current * 0.8
        const progress = r.radius / r.maxRadius
        if (progress >= 1) return false

        const alpha = r.alpha * (1 - progress)
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.lineWidth = r.lineWidth * (1 - progress * 0.6)
        ctx.stroke()
        return true
      })

      timerRef.current = requestAnimationFrame(draw)
    }

    timerRef.current = requestAnimationFrame(draw)

    return () => {
      running = false
      clearTimeout(nextRef.current)
      cancelAnimationFrame(timerRef.current)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} />
}
