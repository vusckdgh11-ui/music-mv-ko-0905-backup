import { useState, useCallback, useRef, useEffect, useMemo, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { FileUploader } from './upload/FileUploader'
import { parseLRC } from './lrc/parser'
import { exportVideo } from './exporter/VideoExporter'
import { computeFrequencyBars } from './utils/frequency'
import { RemotionPlayer } from './remotion/RemotionPlayer'
import type { AspectRatio } from './exporter/canvasRenderer'
import type { LyricLine, LrcMeta } from './lrc/types'
import type { VisualizerStyle } from './remotion/SpectrumVisualizer'
import { ThumbnailMaker } from './thumbnail/ThumbnailMaker'

export interface ExportConfig {
  startTime: number
  endTime: number
  crf: number
  audioBitrate: string
  scale: number
}

const DEFAULT_EXPORT: ExportConfig = {
  startTime: 0,
  endTime: 0,
  crf: 23,
  audioBitrate: '192k',
  scale: 1,
}

function cleanSongTitle(value: string) {
  const title = value.trim()
  const separatorIndex = Math.max(title.lastIndexOf('-'), title.lastIndexOf('–'), title.lastIndexOf('—'))
  return separatorIndex > 0 ? title.slice(0, separatorIndex).trim() : title
}

const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']
const LYRIC_EXTENSIONS = ['lrc', 'txt']
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

function relativeFilePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
}

function fileExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase() || ''
}

function fileStem(file: File) {
  return file.name.replace(/\.[^.]+$/, '').toLowerCase()
}

function parentPath(file: File) {
  const path = relativeFilePath(file)
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [audioUrl, setAudioUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [meta, setMeta] = useState<LrcMeta>({ title: '', artist: '', album: '' })
  const [ratio, setRatio] = useState<AspectRatio>('16:9')
  const [bgPosition] = useState({ x: 50, y: 50 })
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showMeta, setShowMeta] = useState(true)
  const [style, setStyle] = useState<'normal' | 'pixel'>('normal')
  const [effect, setEffect] = useState<'ripple' | 'snow' | 'rain' | 'particles' | 'stars' | 'fog' | 'embers' | 'dust' | 'fireflies' | 'bokeh' | 'zoom' | 'none'>('none')
  const [effectDirection, setEffectDirection] = useState<'natural' | 'right' | 'left'>('natural')
  const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>('bars')
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const audioFileRef = useRef<File | null>(null)
  const imageFileRef = useRef<File | null>(null)
  const audioVideoUrlRef = useRef<string>('')
  const [muted] = useState(true)
  const [audioDuration, setAudioDuration] = useState(0)
  const [frequencyBars, setFrequencyBars] = useState<Uint8Array[]>([])
  const [freqLoading, setFreqLoading] = useState(false)
  const [inputMsg, setInputMsg] = useState('')
  const [folderFiles, setFolderFiles] = useState<File[]>([])
  const [folderSongPath, setFolderSongPath] = useState('')
  const [folderMsg, setFolderMsg] = useState('')
  const folderInputRef = useRef<HTMLInputElement>(null)
  const audioLoadIdRef = useRef(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    document.title = t('title')
  }, [t, i18n.language])

  const cfg = {
    ...exportConfig,
    endTime: exportConfig.endTime || audioDuration || 0,
  }

  const startPct = audioDuration > 0 ? (cfg.startTime / audioDuration) * 100 : 0
  const endPct = audioDuration > 0 ? (cfg.endTime / audioDuration) * 100 : 100

  useEffect(() => {
    if (audioDuration > 0) {
      setExportConfig((c) => ({ ...c, endTime: c.endTime || audioDuration }))
    }
  }, [audioDuration])

  const handleLRC = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseLRC(text)
      setLyrics(parsed.lyrics)
      setPreviewUrl('')
      setInputMsg(parsed.lyrics.length > 0 ? '' : t('invalidLyrics'))
      if (parsed.meta.title || parsed.meta.artist) {
        setMeta((current) => ({
          title: cleanSongTitle(parsed.meta.title || current.title),
          artist: parsed.meta.artist || current.artist,
          album: cleanSongTitle(parsed.meta.album || parsed.meta.title || current.album),
        }))
      }
    }
    reader.onerror = () => setInputMsg(t('lyricReadFailed'))
    reader.readAsText(file)
  }, [t])
  const handleAudio = useCallback((file: File) => {
    const loadId = ++audioLoadIdRef.current
    audioFileRef.current = file
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    audioVideoUrlRef.current = url
    setPreviewUrl('')
    setFrequencyBars([])
    setInputMsg('')
    const name = cleanSongTitle(file.name.replace(/\.[^.]+$/, ''))
    setMeta((m) => ({ ...m, title: name, album: name }))
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      if (loadId !== audioLoadIdRef.current) return
      setAudioDuration(audio.duration)
      setExportConfig((c) => ({ ...c, endTime: 0 }))
    }
    audio.onerror = () => {
      if (loadId !== audioLoadIdRef.current) return
      setAudioDuration(0)
      setInputMsg(t('audioPrepareFailed'))
    }
    setFreqLoading(true)
    const fps = 30
    file.arrayBuffer().then((buf) => computeFrequencyBars(buf, fps)).then((bars) => {
      if (loadId !== audioLoadIdRef.current) return
      setFrequencyBars(bars)
      setFreqLoading(false)
    }).catch(() => {
      if (loadId !== audioLoadIdRef.current) return
      setFrequencyBars([])
      setFreqLoading(false)
    })
  }, [audioUrl, t])

  const handleImage = useCallback((file: File) => {
    imageFileRef.current = file
    setImageUrl(URL.createObjectURL(file))
    setPreviewUrl('')
  }, [])

  const loadFolderSong = useCallback((songPath: string, files = folderFiles) => {
    const audioFile = files.find((file) => relativeFilePath(file) === songPath)
    if (!audioFile) return

    const stem = fileStem(audioFile)
    const directory = parentPath(audioFile)
    const sameSongFiles = files.filter((file) => parentPath(file) === directory && fileStem(file) === stem)
    const lyricFile = LYRIC_EXTENSIONS
      .map((extension) => sameSongFiles.find((file) => fileExtension(file) === extension))
      .find(Boolean)
    const imageFile = IMAGE_EXTENSIONS
      .map((extension) => sameSongFiles.find((file) => fileExtension(file) === extension))
      .find(Boolean)

    handleAudio(audioFile)
    if (lyricFile) handleLRC(lyricFile)
    if (imageFile) handleImage(imageFile)
    setFolderSongPath(songPath)
    setFolderMsg(`음원 연결 완료 · 가사 ${lyricFile ? '✓' : '없음'} · 배경 이미지 ${imageFile ? '✓' : '없음'}`)
  }, [folderFiles, handleAudio, handleImage, handleLRC])

  const handleFolder = useCallback((files: File[]) => {
    const audioFiles = files.filter((file) => AUDIO_EXTENSIONS.includes(fileExtension(file)))
    setFolderFiles(files)
    setFolderSongPath('')
    if (audioFiles.length === 0) {
      setFolderMsg('선택한 폴더에서 음원 파일을 찾지 못했습니다.')
      return
    }
    setFolderMsg(`음원 ${audioFiles.length}개를 찾았습니다. 작업할 곡을 선택해 주세요.`)
    if (audioFiles.length === 1) loadFolderSong(relativeFilePath(audioFiles[0]!), files)
  }, [loadFolderSong])

  const ready = Boolean(audioUrl && imageUrl && lyrics.length > 0 && audioDuration > 0)
  const canExport = ready && !freqLoading

  const previewInputProps = useMemo(() => ({
    bgUrl: imageUrl,
    audioVideoUrl: audioVideoUrlRef.current || '',
    lyrics,
    meta,
    ratio,
    bgPosition,
    duration: audioDuration || 180,
    startTime: 0,
    frequencyBars,
    effect,
    effectDirection,
    visualizerStyle,
    style,
  }), [imageUrl, lyrics, meta, ratio, bgPosition, audioDuration, frequencyBars, effect, effectDirection, visualizerStyle, style])

  const handleRender = useCallback(async () => {
    if (!canExport || exporting) return
    const audioFile = audioFileRef.current
    const audioVideoUrl = audioVideoUrlRef.current
    if (!audioFile || !audioVideoUrl) {
      setExportMsg(t('audioPreparing'))
      return
    }

    setExporting(true)
    setExportMsg(t('rendering'))
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = await exportVideo({
        bgUrl: imageUrl,
        audioVideoUrl,
        audioFile,
        lyrics,
        ratio,
        bgPosition,
        meta,
        exportConfig,
        frequencyBars,
        effect,
        effectDirection,
        visualizerStyle,
        style,
        onProgress: (_p, message) => setExportMsg(message),
      })
      setPreviewUrl(url)
      const downloadLink = document.createElement('a')
      downloadLink.href = url
      downloadLink.download = `${meta.title || 'lyric-video'}.mp4`
      downloadLink.click()
      setExportMsg('')
    } catch (err) {
      console.error('Render failed:', err)
      const reason = err instanceof Error ? err.message : ''
      setExportMsg(reason ? `${t('renderFailed')} (${reason})` : t('renderFailed'))
    } finally {
      setExporting(false)
    }
  }, [canExport, exporting, imageUrl, lyrics, ratio, bgPosition, meta, exportConfig, previewUrl, style, effect, effectDirection, visualizerStyle, frequencyBars, t])

  const handleDownload = useCallback(() => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `${meta.title || 'lyric-video'}.mp4`
    a.click()
  }, [previewUrl])

  return (
    <div className="app">
      <div className="layout">
        <div className="panel">
          <div className="panel__header">
            <div>
              <h1 className="panel__title">{t('title')}</h1>
              <p className="panel__desc">{t('description')}</p>
            </div>
            <a
              href="https://github.com/hocgin/music-mv"
              target="_blank"
              rel="noopener noreferrer"
              className="panel__github"
              aria-label={t('sourceCode')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" display="inline-block" overflow="visible">
                <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"/>
              </svg>
            </a>
            <select
              className="ratio-btn"
              aria-label={t('language')}
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="zh-CN">中文</option>
            </select>
          </div>

          <div className="panel__section">
            <h2 className="panel__section-title">{t('ratio')}</h2>
            <div className="ratio-group">
              {(['16:9', '9:16'] as const).map((r) => (
                <button
                  key={r}
                  className={`ratio-btn ${ratio === r ? 'ratio-btn--active' : ''}`}
                  onClick={() => { setRatio(r); setPreviewUrl('') }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="panel__section">
            <h2 className="panel__section-title">{t('style')}</h2>
            <div className="ratio-group">
              {([
                { label: t('styleNormal'), value: 'normal', disabled: false },
                { label: t('stylePixel'), value: 'pixel', disabled: false },
              ] as const).map((s) => (
                <button
                  key={s.value}
                  className={`ratio-btn ${!s.disabled && style === s.value ? 'ratio-btn--active' : ''}`}
                  disabled={s.disabled}
                  onClick={() => { setStyle(s.value); setPreviewUrl('') }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel__section">
            <h2 className="panel__section-title">{t('effect')}</h2>
            <div className="effect-group">
              {([
                { label: t('effectRipple'), value: 'ripple' as const },
                { label: t('effectSnow'), value: 'snow' as const },
                { label: t('effectRain'), value: 'rain' as const },
                { label: t('effectParticles'), value: 'particles' as const },
                { label: t('effectStars'), value: 'stars' as const },
                { label: t('effectFog'), value: 'fog' as const },
                { label: t('effectEmbers'), value: 'embers' as const },
                { label: t('effectDust'), value: 'dust' as const },
                { label: t('effectFireflies'), value: 'fireflies' as const },
                { label: t('effectBokeh'), value: 'bokeh' as const },
                { label: t('effectZoom'), value: 'zoom' as const },
                { label: t('effectNone'), value: 'none' as const },
              ]).map((e) => (
                <button
                  key={e.value}
                  className={`ratio-btn ${effect === e.value ? 'ratio-btn--active' : ''}`}
                  onClick={() => setEffect(e.value)}
                >
                  {e.label}
                </button>
              ))}
            </div>
            <h3 className="panel__sub-label">{t('effectDirection')}</h3>
            <div className="ratio-group">
              {([
                { label: t('directionNatural'), value: 'natural' as const },
                { label: t('directionRight'), value: 'right' as const },
                { label: t('directionLeft'), value: 'left' as const },
              ]).map((item) => (
                <button key={item.value} className={`ratio-btn ${effectDirection === item.value ? 'ratio-btn--active' : ''}`}
                  onClick={() => { setEffectDirection(item.value); setPreviewUrl('') }}>{item.label}</button>
              ))}
            </div>
          </div>

          <div className="panel__section">
            <h2 className="panel__section-title">{t('visualizerStyle')}</h2>
            <div className="effect-group">
              {([
                { label: t('visualizerBars'), value: 'bars' as const },
                { label: t('visualizerRounded'), value: 'rounded' as const },
                { label: t('visualizerSymmetric'), value: 'symmetric' as const },
                { label: t('visualizerWave'), value: 'wave' as const },
                { label: t('visualizerDots'), value: 'dots' as const },
              ]).map((item) => (
                <button key={item.value} className={`ratio-btn ${visualizerStyle === item.value ? 'ratio-btn--active' : ''}`}
                  onClick={() => { setVisualizerStyle(item.value); setPreviewUrl('') }}>{item.label}</button>
              ))}
            </div>
          </div>

          <div className="panel__section">
            <h2 className="panel__section-title">{t('upload')}</h2>
            <div className="folder-import">
              <button className="folder-import__button" type="button" onClick={() => folderInputRef.current?.click()}>
                곡 폴더 선택
              </button>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as InputHTMLAttributes<HTMLInputElement>)}
                onChange={(event) => {
                  const files = Array.from(event.target.files || [])
                  if (files.length > 0) handleFolder(files)
                  event.target.value = ''
                }}
                hidden
              />
              {folderFiles.length > 0 && (
                <select
                  className="folder-import__select"
                  value={folderSongPath}
                  onChange={(event) => loadFolderSong(event.target.value)}
                  aria-label="작업할 음원 선택"
                >
                  <option value="">작업할 음원을 선택하세요</option>
                  {folderFiles
                    .filter((file) => AUDIO_EXTENSIONS.includes(fileExtension(file)))
                    .map((file) => (
                      <option key={relativeFilePath(file)} value={relativeFilePath(file)}>{relativeFilePath(file)}</option>
                    ))}
                </select>
              )}
              <p className="folder-import__hint">같은 폴더에서 파일명이 같은 가사와 배경 이미지를 자동으로 연결합니다.</p>
              {folderMsg && <p className="folder-import__status" role="status">{folderMsg}</p>}
            </div>
            <div className="panel__files">
              <FileUploader label={t('songFile')} accept="audio/*" onFile={handleAudio} preview={audioUrl || undefined} displayName={audioFileRef.current?.name} />
              <FileUploader label={t('lyricFile')} accept=".lrc,.txt" onFile={handleLRC} preview={lyrics.length > 0 ? 'lrc' : undefined} displayName={lyrics.length > 0 ? t('lyricsLoaded', { count: lyrics.length }) : undefined} />
              <FileUploader label={t('bgImage')} accept="image/*" onFile={handleImage} preview={imageUrl || undefined} displayName={imageFileRef.current?.name} />
            </div>
            {inputMsg && <p className="panel__status panel__status--error" role="alert">{inputMsg}</p>}
            {freqLoading ? (
              <p className="panel__status" role="status">{t('computingFreq')}</p>
            ) : !canExport && !inputMsg && (
              <p className="panel__status" role="status">
                {t('filesNeeded', {
                  audio: audioUrl ? '✓' : '○',
                  lyrics: lyrics.length > 0 ? '✓' : '○',
                  image: imageUrl ? '✓' : '○',
                })}
              </p>
            )}
          </div>

          <div className="panel__section">
            <button className="panel__advanced-toggle" onClick={() => setShowMeta(!showMeta)}>
              {t('songInfo')}
              <span className={`panel__arrow ${showMeta ? 'panel__arrow--up' : ''}`} />
            </button>
            {showMeta && (
              <div className="panel__advanced">
                <input
                  className="cfg-input"
                  type="text"
                  value={meta.title}
                  placeholder={t('songNamePlaceholder')}
                  onChange={(e) => { setMeta((m) => ({ ...m, title: e.target.value, album: m.album || e.target.value })); setPreviewUrl('') }}
                />
                <input
                  className="cfg-input"
                  type="text"
                  value={meta.album}
                  placeholder={t('albumNamePlaceholder')}
                  onChange={(e) => { setMeta((m) => ({ ...m, album: e.target.value })); setPreviewUrl('') }}
                />
              </div>
            )}
          </div>

          <button className="panel__advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? t('collapseAdvanced') : t('expandAdvanced')}
            <span className={`panel__arrow ${showAdvanced ? 'panel__arrow--up' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="panel__advanced">
              <div className="quick-range">
                {([
                  { label: t('speedSlow'), value: 1 },
                  { label: t('speedMedium'), value: 0.75 },
                  { label: t('speedFast'), value: 0.25 },
                ] as const).map((item) => (
                  <button
                    key={item.label}
                    className={`ratio-btn ${exportConfig.scale === item.value ? 'ratio-btn--active' : ''}`}
                    onClick={() => setExportConfig((c) => ({ ...c, scale: item.value }))}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="quick-range">
                {([
                  { label: t('segment15s'), value: 15 },
                  { label: t('segment30s'), value: 30 },
                  { label: t('segmentFull'), value: 0 },
                ] as const).map((item) => {
                  const isFull = item.value === 0
                  const active = isFull
                    ? cfg.startTime === 0 && cfg.endTime >= audioDuration - 0.5
                    : cfg.startTime === 0 && Math.abs(cfg.endTime - item.value) < 0.5
                  return (
                    <button
                      key={item.label}
                      className={`ratio-btn ${active ? 'ratio-btn--active' : ''}`}
                      onClick={() => setExportConfig((c) => ({
                        ...c,
                        startTime: 0,
                        endTime: isFull ? audioDuration : item.value,
                      }))}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div className="range-slider">
                <div className="range-slider__labels">
                  <span>{formatCfgTime(cfg.startTime)}</span>
                  <span>{formatCfgTime(cfg.endTime)}</span>
                </div>
                <div className="range-slider__track" ref={trackRef}>
                  <div className="range-slider__fill" style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
                  <input
                    className="range-slider__thumb range-slider__thumb--min"
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={startPct}
                    onChange={(e) => {
                      const v = Math.min(Number(e.target.value), endPct - 0.5)
                      setExportConfig((c) => ({ ...c, startTime: (v / 100) * audioDuration }))
                    }}
                  />
                  <input
                    className="range-slider__thumb range-slider__thumb--max"
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={endPct}
                    onChange={(e) => {
                      const v = Math.max(Number(e.target.value), startPct + 0.5)
                      setExportConfig((c) => ({ ...c, endTime: (v / 100) * audioDuration }))
                    }}
                  />
                </div>
                <div className="range-slider__hint">{formatCfgTime(audioDuration)}</div>
              </div>
            </div>
          )}

          <div className="panel__actions">
            <button
              className="panel__export"
              onClick={handleRender}
              disabled={!canExport || exporting}
            >
              {exporting ? exportMsg || t('rendering') : t('render')}
            </button>
            {previewUrl && !exporting && (
              <button
                className="panel__export panel__export--download"
                onClick={handleDownload}
              >
                {t('download')}
              </button>
            )}
          </div>
          {exportMsg && !exporting && <p className="panel__status panel__status--error" role="status">{exportMsg}</p>}
          <ThumbnailMaker imageUrl={imageUrl} lyrics={lyrics} meta={meta} />
        </div>

        <div className="preview">
          <div className={`phone phone--${ratio === '9:16' ? 'portrait' : 'landscape'}`}>
            <div className="phone__screen">
              {previewUrl ? (
                <video
                  ref={videoRef}
                  src={previewUrl}
                  className="preview__video"
                  controls
                  playsInline
                  autoPlay
                  loop
                  muted={muted}
                />
              ) : ready ? (
                <RemotionPlayer key={`${ratio}-${effect}-${style}`} inputProps={previewInputProps} duration={audioDuration || 180} />
              ) : freqLoading ? (
                <div className="phone__placeholder">
                  <span>{t('computingFreq')}</span>
                </div>
              ) : (
                <div className="phone__placeholder">
                  <span>{t('uploadToPreview')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCfgTime(s: number): string {
  if (s <= 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
