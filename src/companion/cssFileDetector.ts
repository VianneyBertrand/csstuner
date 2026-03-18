import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

/**
 * Trouve le fichier CSS contenant les design tokens du projet.
 * Ordre de priorite : components.json (shadcn) → scan :root → scan @theme
 */
export function findCssFile(projectRoot: string): string | null {
  // 1. Chercher via components.json (shadcn)
  const fromShadcn = findViaShadcnConfig(projectRoot)
  if (fromShadcn) return fromShadcn

  // 2. Scanner les fichiers CSS pour :root avec des custom properties
  const fromRootScan = findViaCssScan(projectRoot)
  if (fromRootScan) return fromRootScan

  return null
}

function findViaShadcnConfig(projectRoot: string): string | null {
  const configPath = join(projectRoot, 'components.json')
  if (!existsSync(configPath)) return null

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    const cssPath = config?.tailwind?.css
    if (!cssPath) return null

    const resolved = resolve(projectRoot, cssPath)
    if (existsSync(resolved)) return resolved
  } catch {
    // Config invalide
  }

  return null
}

function findViaCssScan(projectRoot: string): string | null {
  const searchDirs = ['src', 'app', 'styles', '.']
  const candidates: Array<{ path: string; varCount: number }> = []

  for (const dir of searchDirs) {
    const dirPath = join(projectRoot, dir)
    if (!existsSync(dirPath)) continue

    const cssFiles = findCssFiles(dirPath)
    for (const file of cssFiles) {
      const content = readFileSync(file, 'utf-8')
      const varCount = countRootVars(content)
      if (varCount > 0) {
        candidates.push({ path: file, varCount })
      }
    }
  }

  if (candidates.length === 0) return null

  // Prendre celui avec le plus de variables
  candidates.sort((a, b) => b.varCount - a.varCount)
  return candidates[0].path
}

function findCssFiles(dirPath: string, depth = 0): string[] {
  if (depth > 3) return []

  const results: string[] = []

  try {
    const entries = readdirSync(dirPath)
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue

      const fullPath = join(dirPath, entry)
      const stat = statSync(fullPath)

      if (stat.isFile() && entry.endsWith('.css')) {
        results.push(fullPath)
      } else if (stat.isDirectory()) {
        results.push(...findCssFiles(fullPath, depth + 1))
      }
    }
  } catch {
    // Dossier non lisible
  }

  return results
}

function countRootVars(content: string): number {
  // Matcher les blocs :root ou @theme contenant des --vars
  const rootMatch = content.match(/:root\s*\{[^}]*\}/g)
  const themeMatch = content.match(/@theme\s*\{[^}]*\}/g)
  const blocks = [...(rootMatch ?? []), ...(themeMatch ?? [])]

  let count = 0
  for (const block of blocks) {
    const vars = block.match(/--[\w-]+\s*:/g)
    if (vars) count += vars.length
  }

  return count
}
