import { parse, formatHex, formatHsl, displayable, clampChroma, converter } from 'culori'
import type { Oklch } from 'culori'
import type { ColorFormat } from './types'

const toOklch = converter('oklch')

/**
 * Parse n'importe quel format couleur en OKLCH
 */
export function parseColor(input: string): Oklch | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const parsed = parse(trimmed)
  if (!parsed) return null

  return toOklch(parsed)
}

/**
 * Formate une couleur OKLCH en string oklch()
 */
export function formatOklch(color: Oklch): string {
  const l = round(color.l, 4)
  const c = round(color.c, 4)
  const h = round(color.h ?? 0, 2)
  return `oklch(${l} ${c} ${h})`
}

/**
 * Convertit une couleur OKLCH vers le format cible
 */
export function formatAs(color: Oklch, format: ColorFormat): string {
  switch (format) {
    case 'oklch':
      return formatOklch(color)
    case 'hex':
      return formatHex(clampToSrgb(color))
    case 'hsl': {
      const hsl = formatHsl(clampToSrgb(color))
      return hsl
    }
    case 'rgb': {
      const hex = formatHex(clampToSrgb(color))
      return hex // rgb() pas natif dans culori, hex suffit
    }
  }
}

/**
 * Detecte le format d'une valeur couleur CSS
 */
export function detectColorFormat(value: string): ColorFormat {
  const trimmed = value.trim()
  if (trimmed.startsWith('oklch')) return 'oklch'
  if (trimmed.startsWith('hsl')) return 'hsl'
  if (trimmed.startsWith('rgb')) return 'rgb'
  if (trimmed.startsWith('#')) return 'hex'
  return 'oklch'
}

/**
 * Verifie si une couleur OKLCH est dans le gamut sRGB
 */
export function isInSrgbGamut(color: Oklch): boolean {
  return displayable(color)
}

/**
 * Clamp une couleur OKLCH dans le gamut sRGB
 */
export function clampToSrgb(color: Oklch): Oklch {
  if (displayable(color)) return color
  return clampChroma(color, 'oklch') as unknown as Oklch
}

function round(n: number, digits: number): number {
  const factor = Math.pow(10, digits)
  return Math.round(n * factor) / factor
}
