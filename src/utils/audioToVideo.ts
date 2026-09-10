import { Muxer, ArrayBufferTarget } from 'webm-muxer'

export async function audioToVideoBlob(audioFile: File): Promise<string> {
  const sampleRate = 48000
  const audioContext = new AudioContext({ sampleRate })
  const arrayBuffer = await audioFile.arrayBuffer()
  const decoded = await audioContext.decodeAudioData(arrayBuffer)

  const numberOfChannels = Math.min(decoded.numberOfChannels, 2)
  const duration = decoded.duration

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'V_VP8',
      width: 2,
      height: 2,
    },
    audio: {
      codec: 'A_OPUS',
      numberOfChannels,
      sampleRate,
    },
    firstTimestampBehavior: 'offset',
  })

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error('AudioEncoder error:', e),
  })
  audioEncoder.configure({
    codec: 'opus',
    numberOfChannels,
    sampleRate,
    bitrate: 128_000,
  })

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e),
  })
  videoEncoder.configure({
    codec: 'vp8',
    width: 2,
    height: 2,
    bitrate: 1000,
  })

  // Encode a single black video frame
  const canvas = new OffscreenCanvas(2, 2)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 2, 2)
  const bitmap = canvas.transferToImageBitmap()

  const frame = new VideoFrame(bitmap, {
    timestamp: 0,
    duration: Math.round(duration * 1_000_000),
  })
  videoEncoder.encode(frame, { keyFrame: true })
  frame.close()
  bitmap.close()

  // Encode audio in 20ms chunks
  const chunkDuration = 0.02
  const totalChunks = Math.ceil(duration / chunkDuration)

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkDuration
    const end = Math.min(start + chunkDuration, duration)
    const frameCount = Math.round((end - start) * sampleRate)
    if (frameCount <= 0) continue

    const planar = new Float32Array(numberOfChannels * frameCount)
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const channelData = decoded.getChannelData(ch)!
      const offset = Math.round(start * sampleRate)
      planar.set(new Float32Array(channelData.buffer, offset * 4, frameCount), ch * frameCount)
    }

    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: frameCount,
      numberOfChannels,
      timestamp: Math.round(start * 1_000_000),
      data: planar,
    })
    audioEncoder.encode(audioData)
    audioData.close()
  }

  await videoEncoder.flush()
  await audioEncoder.flush()

  videoEncoder.close()
  audioEncoder.close()

  muxer.finalize()
  audioContext.close()

  const blob = new Blob([target.buffer], { type: 'video/webm;codecs=vp8,opus' })
  return URL.createObjectURL(blob)
}
