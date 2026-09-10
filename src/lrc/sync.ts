import type { LyricLine } from './types'

export function findCurrentLyricIndex(
  lyrics: readonly LyricLine[],
  currentTimeInSeconds: number,
): number {
  let result = -1
  let lo = 0
  let hi = lyrics.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lyrics[mid]!.time <= currentTimeInSeconds) {
      result = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return result
}
