import { useEffect, useRef, useState } from 'react'
import type { LyricLine } from '../lrc/types'
import { findCurrentLyricIndex } from '../lrc/sync'

const BAR_COUNT = 32

export function useAudioSync(audioUrl: string | null, lyrics: readonly LyricLine[], autoPlay = false) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [bars, setBars] = useState<Uint8Array>(new Uint8Array(BAR_COUNT))
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!audioUrl) return

    const audio = new Audio(audioUrl)
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    audioRef.current = audio

    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    const source = ctx.createMediaElementSource(audio)
    sourceRef.current = source

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.82
    analyserRef.current = analyser

    source.connect(analyser)
    analyser.connect(ctx.destination)

    const onLoaded = () => setDuration(audio.duration)
    const onEnded = () => {
      setPlaying(false)
      cancelAnimationFrame(rafRef.current)
      setBars(new Uint8Array(BAR_COUNT))
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.pause()
      audio.src = ''
      source.disconnect()
      analyser.disconnect()
      ctx.close()
      audioRef.current = null
      analyserRef.current = null
      audioCtxRef.current = null
      sourceRef.current = null
    }
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    if (autoPlay) {
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
      audio.currentTime = 0
      audio.play()
    } else {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
      setCurrentTime(0)
      setBars(new Uint8Array(BAR_COUNT))
      cancelAnimationFrame(rafRef.current)
    }
  }, [autoPlay, audioUrl])

  useEffect(() => {
    if (!playing) return
    const freqData = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 0)
    const tick = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
      if (analyserRef.current && freqData.length > 0) {
        analyserRef.current.getByteFrequencyData(freqData)
        const binCount = analyserRef.current.frequencyBinCount
        const step = Math.max(1, Math.floor(binCount / BAR_COUNT))
        const out = new Uint8Array(BAR_COUNT)
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.min(i * step, binCount - 1)
          out[i] = freqData[idx]!
        }
        setBars(out)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  const activeIndex = findCurrentLyricIndex(lyrics, currentTime)

  return { currentTime, duration, playing, activeIndex, bars }
}
