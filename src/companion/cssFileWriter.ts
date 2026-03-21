import { readFileSync, writeFileSync } from 'fs'
import { parseColor, formatAs, detectColorFormat } from '../core/colorConverter'

/**
 * Applique les changements de variables dans le fichier CSS,
 * scope au bloc du selector donne (:root ou .dark).
 */
export function applyChanges(
  filePath: string,
  changes: Record<string, string>,
  selector: ':root' | '.dark' = ':root',
): void {
  if (Object.keys(changes).length === 0) return

  let content = readFileSync(filePath, 'utf-8')

  // Trouver le bloc du selector
  const blockInfo = findBlock(content, selector)
  if (!blockInfo) {
    // Si le bloc n'existe pas, l'ajouter a la fin
    const lines = Object.entries(changes)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')
    content += `\n\n${selector} {\n${lines}\n}\n`
    writeFileSync(filePath, content, 'utf-8')
    return
  }

  const { start, end } = blockInfo
  let block = content.substring(start, end)

  for (const [varName, newValue] of Object.entries(changes)) {
    // Trouver la valeur actuelle dans le bloc pour detecter son format
    const currentMatch = block.match(
      new RegExp(`${escapeRegExp(varName)}\\s*:\\s*([^;]+);`)
    )
    const currentValue = currentMatch?.[1]?.trim()

    let formattedValue = newValue
    if (currentValue) {
      const color = parseColor(newValue)
      if (color) {
        const existingFormat = detectColorFormat(currentValue)
        formattedValue = formatAs(color, existingFormat)
      }
    }

    const pattern = new RegExp(
      `(${escapeRegExp(varName)}\\s*:\\s*)([^;]+)(;)`,
      'g',
    )
    block = block.replace(pattern, `$1${formattedValue}$3`)
  }

  content = content.substring(0, start) + block + content.substring(end)
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Trouve les bornes (start, end) du bloc CSS pour un selector donne.
 */
function findBlock(content: string, selector: string): { start: number; end: number } | null {
  const escaped = escapeRegExp(selector)
  const regex = new RegExp(`${escaped}\\s*\\{`)
  const match = regex.exec(content)
  if (!match) return null

  const start = match.index
  let depth = 0
  let end = start

  for (let i = match.index + match[0].length - 1; i < content.length; i++) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }

  return { start, end }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
