import type { CssVariable, CssTunerVar, Framework, VarGroup } from './types'
import { isColorValue } from './cssVarReader'

// Groupes shadcn par pattern de nom de variable
const SHADCN_GROUPS: Array<{ name: string; match: (n: string) => boolean }> = [
  { name: 'Primary', match: n => /^--primary/.test(n) },
  { name: 'Secondary', match: n => /^--secondary/.test(n) },
  { name: 'Destructive', match: n => /^--destructive/.test(n) },
  { name: 'Accent', match: n => /^--accent/.test(n) && !/^--sidebar-accent/.test(n) },
  { name: 'Muted', match: n => /^--muted/.test(n) },
  { name: 'Surfaces', match: n => /^--(background|foreground|card|popover)/.test(n) },
  { name: 'Sidebar', match: n => /^--sidebar/.test(n) },
  { name: 'Charts', match: n => /^--chart/.test(n) },
  { name: 'Border & Input', match: n => /^--(border|input|ring)$/.test(n) },
  { name: 'Radius', match: n => n === '--radius' },
]

/**
 * Groupe et trie les variables selon le framework detecte et la config custom
 */
export function groupVars(
  vars: CssVariable[],
  framework: Framework,
  customConfig?: Record<string, CssTunerVar>,
): VarGroup[] {
  const groups = new Map<string, CssVariable[]>()
  const assigned = new Set<string>()

  // D'abord, les vars avec config custom
  if (customConfig) {
    for (const v of vars) {
      const config = customConfig[v.name]
      if (config) {
        const groupName = config.group ?? 'Custom'
        if (!groups.has(groupName)) groups.set(groupName, [])
        groups.get(groupName)!.push(v)
        assigned.add(v.name)
      }
    }
  }

  // Ensuite, auto-groupement par framework
  const remaining = vars.filter(v => !assigned.has(v.name))

  if (framework === 'shadcn') {
    groupByShadcn(remaining, groups, assigned)
  }

  // Tout ce qui reste va dans "Other"
  const unassigned = vars.filter(v => !assigned.has(v.name))
  if (unassigned.length > 0) {
    if (!groups.has('Other')) groups.set('Other', [])
    groups.get('Other')!.push(...unassigned)
  }

  return Array.from(groups.entries()).map(([name, groupVars]) => ({
    name,
    vars: groupVars,
  }))
}

function groupByShadcn(
  vars: CssVariable[],
  groups: Map<string, CssVariable[]>,
  assigned: Set<string>,
): void {
  for (const v of vars) {
    for (const g of SHADCN_GROUPS) {
      if (g.match(v.name)) {
        if (!groups.has(g.name)) groups.set(g.name, [])
        groups.get(g.name)!.push(v)
        assigned.add(v.name)
        break
      }
    }
  }
}

/**
 * Filtre pour ne garder que les variables couleur
 */
export function filterColorVars(vars: CssVariable[]): CssVariable[] {
  return vars.filter(v => isColorValue(v.value))
}

/**
 * Filtre pour les variables non-couleur (radius, spacing, etc.)
 */
export function filterNonColorVars(vars: CssVariable[]): CssVariable[] {
  return vars.filter(v => !isColorValue(v.value))
}
