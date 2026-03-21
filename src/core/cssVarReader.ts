import type { CssVariable } from './types'

/**
 * Lit les CSS custom properties depuis les regles matchant un selectorText donne.
 * Par defaut lit :root. Pour le dark mode, passer '.dark'.
 */
function readVarsFromSelector(selector: string): CssVariable[] {
  if (typeof window === 'undefined') return []

  const computed = getComputedStyle(document.documentElement)
  const vars: CssVariable[] = []
  const seen = new Set<string>()

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walkRules(sheet.cssRules, selector, computed, vars, seen)
    } catch {
      // Stylesheets cross-origin non lisibles
    }
  }

  return vars
}

function walkRules(
  rules: CSSRuleList,
  selector: string,
  computed: CSSStyleDeclaration,
  vars: CssVariable[],
  seen: Set<string>,
) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
      for (const prop of Array.from(rule.style)) {
        if (prop.startsWith('--') && !seen.has(prop)) {
          seen.add(prop)
          const authored = rule.style.getPropertyValue(prop).trim()
          // Pour :root on peut fallback sur computed. Pour .dark, on prefere authored uniquement.
          const value = authored && !authored.includes('var(')
            ? authored
            : selector === ':root'
              ? computed.getPropertyValue(prop).trim()
              : authored
          if (value) vars.push({ name: prop, value })
        }
      }
    } else if ('cssRules' in rule) {
      walkRules((rule as CSSGroupingRule).cssRules, selector, computed, vars, seen)
    }
  }
}

/**
 * Lit toutes les CSS custom properties declarees dans :root.
 */
export function readAllCssVars(): CssVariable[] {
  return readVarsFromSelector(':root')
}

/**
 * Lit les CSS custom properties declarees dans .dark.
 */
export function readDarkCssVars(): CssVariable[] {
  return readVarsFromSelector('.dark')
}

/**
 * Detecte si le projet a un mode dark (classe .dark dans les stylesheets).
 */
export function hasDarkMode(): boolean {
  if (typeof window === 'undefined') return false

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (checkForDarkSelector(sheet.cssRules)) return true
    } catch {
      // Cross-origin
    }
  }
  return false
}

function checkForDarkSelector(rules: CSSRuleList): boolean {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText === '.dark') {
      // Verifier qu'il contient au moins une custom property
      for (const prop of Array.from(rule.style)) {
        if (prop.startsWith('--')) return true
      }
    }
    if ('cssRules' in rule) {
      if (checkForDarkSelector((rule as CSSGroupingRule).cssRules)) return true
    }
  }
  return false
}

/**
 * Verifie si le mode dark est actuellement actif.
 */
export function isDarkModeActive(): boolean {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
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
