const ICON_SIZE = 64
const cache = new Map<string, string>()

function makePng(name: string, draw: (ctx: CanvasRenderingContext2D) => void): string {
  const cached = cache.get(name)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = ICON_SIZE
  canvas.height = ICON_SIZE
  const ctx = canvas.getContext('2d')!
  draw(ctx)
  const url = canvas.toDataURL('image/png')
  cache.set(name, url)
  return url
}

export function playIconUrl(): string {
  return makePng('play', (ctx) => {
    const s = ICON_SIZE
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(s * 0.3, s * 0.1)
    ctx.lineTo(s * 0.9, s * 0.5)
    ctx.lineTo(s * 0.3, s * 0.9)
    ctx.closePath()
    ctx.fill()
  })
}

export function pauseIconUrl(): string {
  return makePng('pause', (ctx) => {
    const s = ICON_SIZE
    ctx.fillStyle = '#fff'
    const barW = s * 0.2
    const barH = s * 0.6
    const r = 3
    const gap = s * 0.15
    roundRect(ctx, (s - barW * 2 - gap) / 2, (s - barH) / 2, barW, barH, r)
    ctx.fill()
    roundRect(ctx, (s - barW * 2 - gap) / 2 + barW + gap, (s - barH) / 2, barW, barH, r)
    ctx.fill()
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
