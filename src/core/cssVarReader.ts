import type { CssVariable } from './types'

/**
 * Lit toutes les CSS custom properties declarees dans :root
 */
export function readAllCssVars(): CssVariable[] {
  if (typeof window === 'undefined') return []

  const computed = getComputedStyle(document.documentElement)
  const vars: CssVariable[] = []
  const seen = new Set<string>()

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
          for (const prop of Array.from(rule.style)) {
            if (prop.startsWith('--') && !seen.has(prop)) {
              seen.add(prop)
              vars.push({
                name: prop,
                value: computed.getPropertyValue(prop).trim(),
              })
            }
          }
        }
      }
    } catch {
      // Stylesheets cross-origin non lisibles
    }
  }

  return vars
}

/**
 * Convertit un nom de var CSS en label lisible.
 * --primary-foreground → "Primary Foreground"
 */
export function varToLabel(varName: string): string {
  return varName
    .replace(/^--/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Verifie si une valeur CSS ressemble a une couleur
 */
export function isColorValue(value: string): boolean {
  return /^(oklch|hsl|rgb|#|color\()/.test(value.trim())
}
