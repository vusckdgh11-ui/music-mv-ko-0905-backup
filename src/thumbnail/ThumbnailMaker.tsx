import { useCallback, useEffect, useRef, useState } from 'react'
import type { LyricLine, LrcMeta } from '../lrc/types'

interface ThumbnailMakerProps {
  imageUrl: string
  lyrics: readonly LyricLine[]
  meta: LrcMeta
}

type GeminiSuggestion = {
  hook: string
  category: string
}

const WIDTH = 1280
const HEIGHT = 720
const GOLD = '#efbd67'

export function ThumbnailMaker({ imageUrl, lyrics, meta }: ThumbnailMakerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(true)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hoya-gemini-key') || '')
  const [title, setTitle] = useState(cleanThumbnailTitle(meta.title) || '곡 제목')
  const [hook, setHook] = useState('오늘도 버텨낸 당신에게')
  const [category, setCategory] = useState('자영업자 위로곡')
  const [analyzing, setAnalyzing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!meta.title) return
    setTitle(cleanThumbnailTitle(meta.title))
    setHook('오늘도 버텨낸 당신에게')
    setCategory('감성 위로곡')
    setMessage('새 음원 기준으로 썸네일 문구를 초기화했어요.')
  }, [meta.title])

  useEffect(() => {
    if (apiKey) localStorage.setItem('hoya-gemini-key', apiKey)
    else localStorage.removeItem('hoya-gemini-key')
  }, [apiKey])

  const draw = useCallback((): Promise<void> => {
    const canvas = canvasRef.current
    if (!canvas) return Promise.resolve()
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve()

    const paint = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT)
      ctx.fillStyle = '#17130f'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      if (img) {
        const scale = Math.max(WIDTH / img.naturalWidth, HEIGHT / img.naturalHeight)
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        ctx.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h)
      }

      const gradient = ctx.createLinearGradient(0, 0, 810, 0)
      gradient.addColorStop(0, 'rgba(6,7,9,0.94)')
      gradient.addColorStop(0.62, 'rgba(6,7,9,0.72)')
      gradient.addColorStop(1, 'rgba(6,7,9,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 860, HEIGHT)

      drawVinylLogo(ctx)
      ctx.fillStyle = '#f8f1e5'
      ctx.font = '600 28px "Malgun Gothic", sans-serif'
      ctx.fillText('HOYA Sound', 122, 70)

      ctx.fillStyle = '#f2e8d7'
      ctx.font = '600 31px "Malgun Gothic", sans-serif'
      ctx.fillText(trimText(ctx, hook, 610), 98, 222)

      ctx.fillStyle = '#fff'
      ctx.font = '700 91px "Malgun Gothic", sans-serif'
      const titleLines = drawWrappedText(ctx, title || '곡 제목', 98, 316, 680, 108, 2)
      const categoryY = titleLines === 1 ? 408 : 516

      ctx.fillStyle = GOLD
      ctx.fillRect(58, 184, 5, titleLines === 1 ? 282 : 390)

      ctx.font = '600 26px "Malgun Gothic", sans-serif'
      const label = trimText(ctx, category, 360)
      const labelWidth = ctx.measureText(label).width + 54
      roundRect(ctx, 98, categoryY, labelWidth, 58, 29)
      ctx.fillStyle = 'rgba(10,10,12,0.7)'
      ctx.fill()
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = GOLD
      ctx.fillText(label, 125, categoryY + 38)

      drawWave(ctx, titleLines === 1 ? 576 : 654)
    }

    if (!imageUrl) {
      paint()
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => { paint(img); resolve() }
      img.onerror = () => { paint(); resolve() }
      img.src = imageUrl
    })
  }, [imageUrl, title, hook, category])

  useEffect(() => {
    if (open) draw()
  }, [open, draw])

  const analyzeLyrics = useCallback(async () => {
    if (!apiKey.trim()) {
      setMessage('Gemini 무료 API 키를 입력해 주세요.')
      return
    }
    if (lyrics.length === 0) {
      setMessage('먼저 가사 파일을 불러와 주세요.')
      return
    }
    setAnalyzing(true)
    setMessage('')
    try {
      const lyricText = lyrics.map((line) => line.text).join('\n').slice(0, 14000)
      const variation = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const prompt = `다음 노래 가사를 분석해 유튜브 썸네일용 두 문구를 새로 만들어라. 곡 제목은 절대 만들거나 변경하지 마라.\n\n규칙:\n- hook: 가사의 핵심 감정을 담은 자연스러운 한국어 한 문장, 공백 포함 10~18자, 곡 제목과 중복 금지\n- category: 대상·상황·주제를 요약한 4~10자의 한국어 분류, 반드시 마지막은 \"곡\"으로 끝낼 것\n- 현재 문구(${hook} / ${category})와 반드시 다른 표현을 사용할 것\n- 같은 가사라도 새로운 각도와 어휘로 추천할 것\n- 과장, 해시태그, 따옴표, 이모지 금지\n- {\"hook\":\"\",\"category\":\"\"} 형식의 JSON만 출력\n\n추천 변형값: ${variation}\n고정 곡 제목: ${meta.title || title}\n가사:\n${lyricText}`
      const data = await requestGemini(apiKey.trim(), prompt)
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!raw) throw new Error('empty response')
      const suggestion = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()) as GeminiSuggestion
      if (!suggestion.hook || !suggestion.category) throw new Error('invalid response')
      setHook(suggestion.hook.trim())
      setCategory(suggestion.category.trim())
      setMessage('추천 완료 — 곡 제목은 유지하고 핵심 문구와 노래 분류만 적용했어요.')
    } catch (error) {
      console.error(error)
      const reason = error instanceof Error ? error.message : ''
      const fallback = recommendLocally(lyrics, meta.title)
      setHook(fallback.hook)
      setCategory(fallback.category)
      setMessage(`Gemini 추천 실패(${translateGeminiError(reason)}). 가사 기반 기본 추천을 대신 적용했어요.`)
    } finally {
      setAnalyzing(false)
    }
  }, [apiKey, lyrics, meta.title, title])

  const download = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) {
      setMessage('먼저 배경 이미지를 불러와 주세요.')
      return
    }
    try {
      await draw()
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result)
          else reject(new Error('thumbnail blob creation failed'))
        }, 'image/png')
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(title || 'HOYA-Sound').replace(/[\\/:*?"<>|]/g, '-')}-thumbnail.png`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      a.remove()

      // Chrome may still be reading the object URL after click() returns.
      // Revoking it immediately can make later thumbnail downloads silently fail.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('유튜브 썸네일을 저장했어요.')
    } catch (error) {
      console.error(error)
      setMessage('썸네일 저장에 실패했습니다. 다시 눌러 주세요.')
    }
  }, [draw, imageUrl, title])

  return (
    <section className="thumbnail-tool" aria-label="유튜브 썸네일 만들기">
      <button className="panel__advanced-toggle thumbnail-tool__toggle" onClick={() => setOpen((value) => !value)}>
        유튜브 썸네일 만들기
        <span className={`panel__arrow ${open ? 'panel__arrow--up' : ''}`} />
      </button>
      {open && (
        <div className="thumbnail-tool__body">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="thumbnail-tool__canvas" />
          <p className="thumbnail-tool__size">1280 × 720 · 영상 배경 이미지를 자동 사용</p>
          <label className="thumbnail-tool__label">
            Gemini 무료 API 키
            <input className="cfg-input" type="password" value={apiKey} autoComplete="off"
              placeholder="Google AI Studio에서 발급한 키"
              onChange={(event) => setApiKey(event.target.value)} />
          </label>
          <p className="thumbnail-tool__privacy">키는 이 브라우저에 안전하게 저장되어 다음에도 자동으로 사용되며 영상 제작에는 사용되지 않습니다.</p>
          <button className="thumbnail-tool__analyze" type="button" disabled={analyzing || lyrics.length === 0} onClick={analyzeLyrics}>
            {analyzing ? '가사 분석 중…' : 'Gemini로 문구 추천'}
          </button>
          <label className="thumbnail-tool__label">곡 제목 · 업로드한 제목이 기본으로 적용됩니다
            <input className="cfg-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="thumbnail-tool__label">핵심 문구
            <input className="cfg-input" value={hook} onChange={(event) => setHook(event.target.value)} />
          </label>
          <label className="thumbnail-tool__label">노래 분류
            <input className="cfg-input" value={category} onChange={(event) => setCategory(event.target.value)} />
          </label>
          {message && <p className="thumbnail-tool__message" role="status">{message}</p>}
          <button className="panel__export panel__export--download" type="button" disabled={!imageUrl} onClick={download}>
            유튜브 썸네일 저장
          </button>
        </div>
      )}
    </section>
  )
}

async function requestGemini(apiKey: string, prompt: string) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, responseMimeType: 'application/json' },
  }
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash']
  let lastError = 'Gemini 추천 실패'
  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.ok) return response.json()
      const detail = await response.json().catch(() => null)
      lastError = detail?.error?.message || `Gemini 오류 ${response.status}`
      if (response.status !== 404) break
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
      break
    }
  }
  throw new Error(lastError)
}

function translateGeminiError(message: string) {
  if (/API_KEY_INVALID|API key not valid/i.test(message)) return 'API 키가 올바르지 않습니다.'
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(message)) return '무료 사용 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
  if (/Failed to fetch|network/i.test(message)) return '브라우저에서 Gemini에 연결하지 못했습니다.'
  if (/not found|404/i.test(message)) return '사용 가능한 Gemini 모델을 찾지 못했습니다.'
  return message.length > 120 ? `${message.slice(0, 120)}…` : message
}

function cleanThumbnailTitle(value: string) {
  const title = value.trim()
  const separatorIndex = Math.max(title.lastIndexOf('-'), title.lastIndexOf('–'), title.lastIndexOf('—'))
  if (separatorIndex <= 0) return title
  return title.slice(0, separatorIndex).trim() || title
}

function recommendLocally(lyrics: readonly LyricLine[], _metaTitle: string): GeminiSuggestion {
  const text = lyrics.map((line) => line.text).join(' ')

  if (/사장|장사|가게|매출|손님|배달|주방|자영업/.test(text)) {
    return { hook: '오늘도 가게를 지킨 당신께', category: '자영업자 위로곡' }
  }
  if (/퇴근|야근|출근|직장|회사|월요일/.test(text)) {
    return { hook: '긴 하루를 견딘 당신에게', category: '퇴근길 위로곡' }
  }
  if (/강아지|고양이|반려|무지개|꼬리|발자국/.test(text)) {
    return { hook: '언젠가 다시 만날 너에게', category: '반려동물 추모곡' }
  }
  if (/이별|헤어|떠나|그리움|보고 싶|눈물/.test(text)) {
    return { hook: '남겨진 마음을 위한 노래', category: '이별 감성곡' }
  }
  if (/꿈|희망|다시|일어나|내일|빛|괜찮/.test(text)) {
    return { hook: '다시 걸어갈 힘이 되기를', category: '희망 위로곡' }
  }
  return { hook: '마음 한편에 머무는 노래', category: '감성 위로곡' }
}

function drawVinylLogo(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.translate(78, 60)
  ctx.fillStyle = 'rgba(5,5,7,0.92)'
  ctx.beginPath()
  ctx.arc(0, 0, 36, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 1.5
  ctx.stroke()
  for (const radius of [15, 20, 25, 30]) {
    ctx.strokeStyle = `rgba(239,189,103,${0.2 - radius / 260})`
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#ead7af'
  ctx.beginPath()
  ctx.arc(0, 0, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#20170d'
  ctx.beginPath()
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawWave(ctx: CanvasRenderingContext2D, centerY: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(239,189,103,0.32)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < 58; i += 1) {
    const x = 60 + i * 6
    const height = (Math.sin(i * 0.58) * 0.5 + 0.5) * 18 + (i % 5) * 1.5
    ctx.moveTo(x, centerY - height / 2)
    ctx.lineTo(x, centerY + height / 2)
  }
  ctx.stroke()
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function trimText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let value = text
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1)
  return `${value}…`
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = [...text.trim()]
  const lines: string[] = []
  let line = ''
  for (const char of chars) {
    const test = line + char
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = char
      if (lines.length === maxLines - 1) break
    } else line = test
  }
  const consumed = lines.join('').length + line.length
  if (consumed < chars.length) line = trimText(ctx, chars.slice(consumed - line.length).join(''), maxWidth)
  lines.push(line)
  lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight))
  return Math.min(lines.length, maxLines)
}
