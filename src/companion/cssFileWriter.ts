import { readFileSync, writeFileSync } from 'fs'
import type { ColorFormat } from '../core/types'
import { parseColor, formatAs } from '../core/colorConverter'

/**
 * Applique les changements de variables dans le fichier CSS.
 * Preserve le formatage existant et ne modifie que les valeurs changees.
 */
export function applyChanges(
  filePath: string,
  changes: Record<string, string>,
  targetFormat: ColorFormat,
): void {
  let content = readFileSync(filePath, 'utf-8')

  for (const [varName, newValue] of Object.entries(changes)) {
    // Convertir la valeur dans le format cible du projet
    const formattedValue = convertToFormat(newValue, targetFormat)

    // Remplacer la valeur dans le fichier (dans :root, .dark, @theme, etc.)
    const pattern = new RegExp(
      `(${escapeRegExp(varName)}\\s*:\\s*)([^;]+)(;)`,
      'g',
    )
    content = content.replace(pattern, `$1${formattedValue}$3`)
  }

  writeFileSync(filePath, content, 'utf-8')
}

function convertToFormat(value: string, format: ColorFormat): string {
  const color = parseColor(value)
  if (!color) return value

  return formatAs(color, format)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
