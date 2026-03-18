import { useEffect, useState } from 'react'

/**
 * Reads all CSS custom properties from :root and returns them as a record.
 * Filters to color-like and design-token vars.
 */
export function useCssVars(): Record<string, string> {
  const [vars, setVars] = useState<Record<string, string>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return

    const computed = getComputedStyle(document.documentElement)
    const result: Record<string, string> = {}

    // Read all CSS rules to find custom properties
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
            for (const prop of Array.from(rule.style)) {
              if (prop.startsWith('--')) {
                result[prop] = computed.getPropertyValue(prop).trim()
              }
            }
          }
        }
      } catch {
        // Skip cross-origin stylesheets
      }
    }

    setVars(result)
  }, [])

  return vars
}
