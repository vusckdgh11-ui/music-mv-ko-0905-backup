export async function computeFrequencyBars(
  arrayBuffer: ArrayBuffer,
  fps: number,
  barCount = 32,
): Promise<Uint8Array[]> {
  const sampleRate = 48000
  const ctx = new OfflineAudioContext(1, 1, sampleRate)
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
  const raw = decoded.getChannelData(0)

  const windowSize = 1024
  const totalFrames = Math.floor(raw.length / (sampleRate / fps))
  const result: Uint8Array[] = []
  const real = new Float64Array(windowSize)
  const imag = new Float64Array(windowSize)
  const bins = getFrequencyBinRanges(barCount, sampleRate, windowSize)

  for (let f = 0; f < totalFrames; f++) {
    const center = Math.floor((f + 0.5) * sampleRate / fps)
    const start = Math.max(0, center - windowSize / 2)
    const end = Math.min(raw.length, start + windowSize)
    real.fill(0)
    imag.fill(0)
    const count = end - start
    for (let i = 0; i < count; i++) {
      real[i] = raw[start + i]! * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / windowSize))
    }

    fft(real, imag)

    const bars = new Uint8Array(barCount)
    for (let b = 0; b < barCount; b++) {
      const [from, to] = bins[b]!
      let peak = 0
      for (let bin = from; bin <= to; bin++) {
        peak = Math.max(peak, Math.hypot(real[bin]!, imag[bin]!))
      }
      const normalizedMagnitude = peak / (windowSize * 0.5)
      const db = 20 * Math.log10(Math.max(0.000001, normalizedMagnitude))
      bars[b] = Math.max(0, Math.min(220, Math.round(((db + 72) / 72) * 220)))
    }
    result.push(bars)

    if (f > 0 && f % 120 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }

  normalizeDynamicRange(result, barCount)
  return result
}

function normalizeDynamicRange(frames: Uint8Array[], barCount: number): void {
  if (frames.length === 0) return
  for (let band = 0; band < barCount; band++) {
    const samples = frames.map((frame) => frame[band] || 0).sort((a, b) => a - b)
    const low = samples[Math.floor(samples.length * 0.18)] || 0
    const high = Math.max(low + 18, samples[Math.floor(samples.length * 0.95)] || 1)
    const floor = low * 0.55
    const range = high - floor
    for (const frame of frames) {
      const normalized = Math.max(0, Math.min(1, ((frame[band] || 0) - floor) / range))
      const compressed = Math.pow(normalized, 1.22) * 0.88
      frame[band] = Math.round(Math.min(0.94, compressed) * 255)
    }
  }
}

function getFrequencyBinRanges(count: number, sampleRate: number, fftSize: number): Array<[number, number]> {
  const minFreq = 60
  const maxFreq = Math.min(sampleRate / 2, 14000)
  const bins: Array<[number, number]> = []
  for (let i = 0; i < count; i++) {
    const lowT = i / count
    const highT = (i + 1) / count
    const lowHz = minFreq * Math.pow(maxFreq / minFreq, lowT)
    const highHz = minFreq * Math.pow(maxFreq / minFreq, highT)
    const from = Math.max(1, Math.floor(lowHz * fftSize / sampleRate))
    const to = Math.min(fftSize / 2 - 1, Math.max(from, Math.ceil(highHz * fftSize / sampleRate)))
    bins.push([from, to])
  }
  return bins
}

function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[real[i], real[j]] = [real[j]!, real[i]!]
      ;[imag[i], imag[j]] = [imag[j]!, imag[i]!]
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len
    const wLenCos = Math.cos(angle)
    const wLenSin = Math.sin(angle)
    for (let i = 0; i < n; i += len) {
      let wCos = 1
      let wSin = 0
      for (let j = 0; j < len / 2; j++) {
        const even = i + j
        const odd = even + len / 2
        const oddReal = real[odd]! * wCos - imag[odd]! * wSin
        const oddImag = real[odd]! * wSin + imag[odd]! * wCos
        real[odd] = real[even]! - oddReal
        imag[odd] = imag[even]! - oddImag
        real[even] = real[even]! + oddReal
        imag[even] = imag[even]! + oddImag
        const nextCos = wCos * wLenCos - wSin * wLenSin
        wSin = wCos * wLenSin + wSin * wLenCos
        wCos = nextCos
      }
    }
  }
}
