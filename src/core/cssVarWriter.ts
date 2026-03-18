/**
 * Modifie une CSS custom property sur :root en live
 */
export function setCssVar(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value)
}

/**
 * Supprime un override inline d'une CSS custom property
 */
export function removeCssVar(name: string): void {
  document.documentElement.style.removeProperty(name)
}

/**
 * Genere un bloc CSS :root a partir d'un record de vars
 */
export function exportCssBlock(vars: Record<string, string>): string {
  const lines = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  return `:root {\n${lines}\n}`
}
