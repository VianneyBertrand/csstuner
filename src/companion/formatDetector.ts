import type { ColorFormat } from '../core/types'

/**
 * Detecte le format couleur dominant dans un fichier CSS.
 * Analyse les valeurs des custom properties dans :root.
 */
export function detectFileFormat(cssContent: string): ColorFormat {
  const counts: Record<ColorFormat, number> = {
    oklch: 0,
    hsl: 0,
    rgb: 0,
    hex: 0,
  }

  // Extraire les valeurs des custom properties
  const varValues = cssContent.match(/--[\w-]+\s*:\s*([^;]+)/g) ?? []

  for (const match of varValues) {
    const value = match.replace(/--[\w-]+\s*:\s*/, '').trim()

    if (value.startsWith('oklch')) counts.oklch++
    else if (value.startsWith('hsl')) counts.hsl++
    else if (value.startsWith('rgb')) counts.rgb++
    else if (value.startsWith('#')) counts.hex++
  }

  // Retourner le format le plus frequent
  let max: ColorFormat = 'oklch'
  let maxCount = 0
  for (const [format, count] of Object.entries(counts)) {
    if (count > maxCount) {
      max = format as ColorFormat
      maxCount = count
    }
  }

  return max
}
