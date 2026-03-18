import type { Framework } from './types'

const SHADCN_MARKERS = ['--primary', '--background', '--foreground', '--card', '--radius']
const TAILWIND_V4_PATTERN = /^--color-|^--spacing-|^--radius-|^--font-/
const RADIX_PATTERN = /^--(tomato|red|ruby|crimson|pink|plum|purple|violet|iris|indigo|blue|cyan|teal|jade|green|grass|lime|mint|sky|amber|orange|yellow|bronze|gold|brown|gray|mauve|slate|sage|olive|sand)-\d{1,2}$/
const OPEN_PROPS_PATTERN = /^--(size-|font-size-|radius-|shadow-|ease-|animation-)/

/**
 * Detecte le framework/design system a partir des noms de variables
 */
export function detectFramework(varNames: string[]): Framework {
  const names = new Set(varNames)

  // shadcn : presence de plusieurs marqueurs
  const shadcnHits = SHADCN_MARKERS.filter(m => names.has(m))
  if (shadcnHits.length >= 3) return 'shadcn'

  // Tailwind v4 : vars prefixees --color-*, --spacing-*, etc.
  const tailwindHits = varNames.filter(n => TAILWIND_V4_PATTERN.test(n))
  if (tailwindHits.length >= 3) return 'tailwind-v4'

  // Radix Themes : echelle numerotee --{color}-{1-12}
  const radixHits = varNames.filter(n => RADIX_PATTERN.test(n))
  if (radixHits.length >= 5) return 'radix'

  // Open Props : --size-*, --font-size-*, etc.
  const openPropsHits = varNames.filter(n => OPEN_PROPS_PATTERN.test(n))
  if (openPropsHits.length >= 3) return 'open-props'

  return 'unknown'
}
