export function fitTitleFontSize(title: string, baseFontSize: number, maxWidth: number) {
  const units = [...title.trim()].reduce((total, char) => {
    if (/\s/.test(char)) return total + 0.45
    if (/^[\x00-\x7F]$/.test(char)) return total + 0.62
    return total + 1
  }, 0)

  if (units === 0) return baseFontSize
  const fitted = maxWidth / units
  return Math.round(Math.max(baseFontSize * 0.75, Math.min(baseFontSize, fitted)))
}
