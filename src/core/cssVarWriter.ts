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
 * Genere les blocs CSS :root et .dark a partir des vars modifiees.
 */
export function exportCssBlock(
  lightVars: Record<string, string>,
  darkVars: Record<string, string> = {},
): string {
  const blocks: string[] = []

  if (Object.keys(lightVars).length > 0) {
    const lines = Object.entries(lightVars)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')
    blocks.push(`:root {\n${lines}\n}`)
  }

  if (Object.keys(darkVars).length > 0) {
    const lines = Object.entries(darkVars)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')
    blocks.push(`.dark {\n${lines}\n}`)
  }

  return blocks.join('\n\n')
}
