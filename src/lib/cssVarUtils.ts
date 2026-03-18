/**
 * Converts a CSS var name to a human-readable label.
 * --primary-foreground → "Primary Foreground"
 * --sidebar-accent → "Sidebar Accent"
 */
export function varToLabel(varName: string): string {
  return varName
    .replace(/^--/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Sets a CSS custom property on :root.
 */
export function setCssVar(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value)
}

/**
 * Removes a CSS custom property override from :root inline styles.
 */
export function removeCssVar(name: string): void {
  document.documentElement.style.removeProperty(name)
}

/**
 * Checks if a CSS value looks like a color (oklch, hsl, rgb, hex, etc.)
 */
export function isColorValue(value: string): boolean {
  return /^(oklch|hsl|rgb|#|color\()/.test(value.trim())
}

/**
 * Generates a CSS :root block from a record of vars.
 */
export function exportCss(vars: Record<string, string>): string {
  const lines = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  return `:root {\n${lines}\n}`
}
