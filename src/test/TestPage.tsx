import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { RemotionPlayer } from '../remotion/RemotionPlayer'
import { parseLRC } from '../lrc/parser'
import { computeFrequencyBars } from '../utils/frequency'
import { audioToVideoBlob } from '../utils/audioToVideo'
import type { AspectRatio } from '../exporter/canvasRenderer'
import type { LyricLine, LrcMeta } from '../lrc/types'

const TEST_BG = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800'

const SAMPLE_LRC = `[ti:Bohemian Rhapsody]
[ar:Queen]
[al:A Night at the Opera]
[00:12.00]Is this the real life
[00:16.50]Is this just fantasy
[00:21.00]Caught in a landslide
[00:25.50]No escape from reality
[00:30.00]Open your eyes
[00:34.00]Look up to the skies and see
[00:40.00]I'm just a poor boy
[00:43.50]I need no sympathy
[00:48.50]Because I'm easy come, easy go
[00:53.00]Little high, little low
[00:57.50]Any way the wind blows
[01:02.00]Doesn't really matter to me
[01:06.50]To me
[01:15.00]Mama, just killed a man
[01:19.00]Put a gun against his head
[01:23.00]Pulled my trigger, now he's dead
[01:27.00]Mama, life had just begun
[01:31.00]But now I've gone and thrown it all away
[01:38.00]Mama, ooh
[01:43.00]Didn't mean to make you cry
[01:47.00]If I'm not back again this time tomorrow
[01:53.00]Carry on, carry on
[01:57.00]As if nothing really matters
[02:10.00]Too late, my time has come
[02:14.00]Sends shivers down my spine
[02:18.00]Body's aching all the time
[02:22.00]Goodbye, everybody, I've got to go
[02:26.00]Gotta leave you all behind and face the truth
[02:33.00]Mama, ooh
[02:38.00]I don't wanna die
[02:42.00]I sometimes wish I'd never been born at all
[03:00.00]I see a little silhouetto of a man
[03:03.50]Scaramouche, Scaramouche
[03:05.50]Will you do the Fandango
[03:08.00]Thunderbolt and lightning
[03:10.00]Very, very frightening me
[03:13.00]Galileo, Galileo
[03:15.50]Galileo, Galileo
[03:18.00]Galileo Figaro, magnifico-o-o-o
[03:23.00]I'm just a poor boy, nobody loves me
[03:27.00]He's just a poor boy from a poor family
[03:31.00]Spare him his life from this monstrosity
[03:35.50]Easy come, easy go, will you let me go
[03:39.50]Bismillah, no, we will not let you go
[03:43.50]Let him go
[03:45.00]Bismillah, we will not let you go
[03:47.00]Let him go
[03:48.00]Will not let you go
[03:49.00]Let me go
[03:50.00]Never let you go
[03:51.50]No, no, no, no, no, no, no
[03:56.00]Oh, mama mia, mama mia
[03:59.50]Mama mia, let me go
[04:03.50]Beelzebub has a devil put aside for me
[04:03.50]For me, for me
[04:07.00]So you think you can stone me and spit in my eye
[04:14.50]So you think you can love me and leave me to die
[04:22.00]Oh, baby, can't do this to me, baby
[04:28.00]Just gotta get out, just gotta get right outta here
[04:35.00]Nothing really matters
[04:40.00]Anyone can see
[04:44.00]Nothing really matters
[04:49.00]Nothing really matters to me
[04:54.00]Any way the wind blows`

export function TestPage() {
  const [audioUrl, setAudioUrl] = useState('')
  const [imageUrl, setImageUrl] = useState(TEST_BG)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [meta, setMeta] = useState<LrcMeta>({ title: '', artist: '', album: '' })
  const [ratio, setRatio] = useState<AspectRatio>('9:16')
  const [bgPosition] = useState({ x: 50, y: 50 })
  const [frequencyBars, setFrequencyBars] = useState<Uint8Array[]>([])
  const [freqLoading, setFreqLoading] = useState(false)
  const audioVideoUrlRef = useRef<string>('')
  const [audioDuration, setAudioDuration] = useState(0)

  useEffect(() => {
    const parsed = parseLRC(SAMPLE_LRC)
    setLyrics(parsed.lyrics)
    setMeta(parsed.meta)
  }, [])

  const duration = audioDuration || 180
  const startTime = 0
  const fps = 30

  const handleAudio = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration)
    }
    audioToVideoBlob(file).then((vUrl) => {
      audioVideoUrlRef.current = vUrl
    })
    setFreqLoading(true)
    file.arrayBuffer().then((buf) => computeFrequencyBars(buf, fps)).then((bars) => {
      setFrequencyBars(bars)
      setFreqLoading(false)
    }).catch(() => setFreqLoading(false))
  }, [])

  const handleLRC = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseLRC(text)
      setLyrics(parsed.lyrics)
      if (parsed.meta.title || parsed.meta.artist) {
        setMeta(parsed.meta)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleImage = useCallback((file: File) => {
    setImageUrl(URL.createObjectURL(file))
  }, [])

  const mockBars = useMemo(() => {
    if (frequencyBars.length > 0) return frequencyBars
    const totalFrames = Math.ceil(duration * fps)
    const barCount = 32
    const bars: Uint8Array[] = []
    for (let f = 0; f < totalFrames; f++) {
      const arr = new Uint8Array(barCount)
      for (let i = 0; i < barCount; i++) {
        const base = Math.sin(f * 0.1 + i * 0.4) * 0.5 + 0.5
        const beat = Math.sin(f * 0.3) > 0.3 ? 0.4 : 0
        const noise = Math.random() * 0.2
        arr[i] = Math.min(255, Math.round((base + beat + noise) * 200))
      }
      bars.push(arr)
    }
    return bars
  }, [frequencyBars, duration, fps])

  const inputProps = useMemo(() => ({
    bgUrl: imageUrl,
    audioVideoUrl: audioVideoUrlRef.current || '',
    lyrics,
    meta,
    ratio,
    bgPosition,
    duration,
    startTime,
    frequencyBars: mockBars,
  }), [imageUrl, lyrics, meta, ratio, bgPosition, duration, startTime, mockBars])

  const isPortrait = ratio === '9:16'

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#0e0e10', color: '#e0e0e0' }}>
      <div style={{ width: 320, padding: 20, overflow: 'auto', flexShrink: 0, borderRight: '1px solid #222' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>LyricVideo Preview</h2>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>MP3 Audio</label>
          <label style={{ display: 'block', padding: '8px 12px', border: '1px dashed #333', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {audioUrl ? 'Audio loaded' : 'Click to upload MP3'}
            <input type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudio(f) }} />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>LRC Lyrics</label>
          <label style={{ display: 'block', padding: '8px 12px', border: '1px dashed #333', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {lyrics.length > 0 ? `${lyrics.length} lines` : 'Click to upload LRC'}
            <input type="file" accept=".lrc,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLRC(f) }} />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Background Image</label>
          <label style={{ display: 'block', padding: '8px 12px', border: '1px dashed #333', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Click to upload image
            <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Ratio</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['9:16', '16:9'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                style={{
                  flex: 1, padding: '6px 0', border: `1px solid ${ratio === r ? '#fe2c55' : '#333'}`,
                  borderRadius: 4, background: 'transparent', color: ratio === r ? '#fe2c55' : '#666',
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Title</label>
          <input
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #333', borderRadius: 4, background: '#161618', color: '#ddd', fontSize: 13 }}
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Album</label>
          <input
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #333', borderRadius: 4, background: '#161618', color: '#ddd', fontSize: 13 }}
            value={meta.album}
            onChange={(e) => setMeta((m) => ({ ...m, album: e.target.value }))}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Artist</label>
          <input
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #333', borderRadius: 4, background: '#161618', color: '#ddd', fontSize: 13 }}
            value={meta.artist}
            onChange={(e) => setMeta((m) => ({ ...m, artist: e.target.value }))}
          />
        </div>

        {freqLoading && <div style={{ fontSize: 12, color: '#666' }}>Computing frequency bars...</div>}
        <div style={{ fontSize: 11, color: '#444', marginTop: 8 }}>
          Duration: {Math.round(duration)}s | Frames: {Math.ceil(duration * fps)}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{
          width: isPortrait ? 360 : 640,
          height: isPortrait ? 640 : 360,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <RemotionPlayer
            inputProps={inputProps}
            duration={duration}
          />
        </div>
      </div>
    </div>
  )
}
