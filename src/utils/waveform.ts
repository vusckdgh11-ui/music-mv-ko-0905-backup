export async function computeWaveform(arrayBuffer: ArrayBuffer, samples = 120): Promise<Uint8Array> {
  const ctx = new OfflineAudioContext(1, 1, 44100)
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
  const raw = decoded.getChannelData(0)
  const blockSize = Math.floor(raw.length / samples)
  const peaks = new Uint8Array(samples)
  for (let i = 0; i < samples; i++) {
    let sum = 0
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(raw[i * blockSize + j]!)
    }
    peaks[i] = Math.min(255, Math.round((sum / blockSize) * 255))
  }
  return peaks
}
