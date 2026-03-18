import { useState, useEffect, useCallback } from 'react'
import type { CssTunerProps, CssVariable } from '../core/types'
import { useCssVars } from './hooks/useCssVars'
import { isColorValue, varToLabel } from '../core/cssVarReader'
import { VarGroup } from './VarGroup'
import { ColorPicker } from './ColorPicker'
import { SaveButton } from './SaveButton'

interface PanelProps {
  vars: CssTunerProps['vars']
  persist: boolean
  companionUrl?: string
  onClose: () => void
  width?: number
}

/**
 * Trouve les variables CSS referencees dans les regles qui s'appliquent a un element.
 * Remonte les stylesheets pour trouver les `var(--xxx)` effectivement utilises.
 */
function findReferencedVars(
  element: HTMLElement,
  trackedVarNames: Set<string>,
): string[] {
  const found: string[] = []
  const varRegex = /var\(\s*(--[\w-]+)/g

  /** Parcourt recursivement les regles CSS (supporte @media, @layer, @supports) */
  function walkRules(rules: CSSRuleList) {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        try {
          if (!element.matches(rule.selectorText)) continue
        } catch {
          continue
        }
        const text = rule.cssText
        let match: RegExpExecArray | null
        varRegex.lastIndex = 0
        while ((match = varRegex.exec(text)) !== null) {
          const varName = match[1]
          if (trackedVarNames.has(varName) && !found.includes(varName)) {
            found.push(varName)
          }
        }
      } else if ('cssRules' in rule) {
        // @media, @layer, @supports, @container, etc.
        walkRules((rule as CSSGroupingRule).cssRules)
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walkRules(sheet.cssRules)
    } catch {
      // Stylesheet cross-origin
    }
  }

  // Aussi scanner les styles inline pour var()
  const inlineStyle = element.getAttribute('style') || ''
  if (inlineStyle.includes('var(')) {
    varRegex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = varRegex.exec(inlineStyle)) !== null) {
      const varName = match[1]
      if (trackedVarNames.has(varName) && !found.includes(varName)) {
        found.push(varName)
      }
    }
  }

  return found
}

/**
 * Trouve les CSS variables utilisees par un element et ses enfants.
 * Approche fiable : remonte les stylesheets pour trouver les var() references.
 */
function findMatchingVars(
  element: HTMLElement,
  trackedVarNames: string[],
): string[] {
  const tracked = new Set(trackedVarNames)

  // Variables referencees par les regles CSS de l'element
  const matches = findReferencedVars(element, tracked)

  // Scanner aussi les enfants pour les conteneurs
  if (element.children.length > 0) {
    const children = element.querySelectorAll('*')
    children.forEach(child => {
      for (const varName of findReferencedVars(child as HTMLElement, tracked)) {
        if (!matches.includes(varName)) {
          matches.push(varName)
        }
      }
    })
  }

  return matches
}

export function Panel({ vars, persist, companionUrl, onClose, width = 300 }: PanelProps) {
  const { groups, framework, modifiedVars, setVar, resetVar, resetAll, originalVars } = useCssVars({
    customConfig: vars,
    persist,
  })

  const [inspecting, setInspecting] = useState(false)
  // Variables trouvees par l'inspect (noms)
  const [inspectedVarNames, setInspectedVarNames] = useState<string[]>([])
  const hasChanges = Object.keys(modifiedVars).length > 0

  // Liste plate de toutes les variables trackees
  const allVars = groups.flatMap(g => g.vars)
  const allVarNames = allVars.map(v => v.name)

  // Inspect mode: listeners sur le document
  useEffect(() => {
    if (!inspecting) return

    const isCssTunerElement = (target: HTMLElement) => {
      // Le shadow host est un enfant de #root
      const root = document.getElementById('root')
      if (!root) return false
      // Verifier si le target est le shadow host ou un de ses ancetres contient le shadow host
      return root.contains(target)
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isCssTunerElement(target)) return

      e.preventDefault()
      e.stopPropagation()

      const matches = findMatchingVars(target, allVarNames)
      // Seulement remplacer si on a trouve des variables
      if (matches.length > 0) {
        setInspectedVarNames(matches)
      }
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isCssTunerElement(target)) return
      target.style.outline = '2px solid #3b82f6'
      target.style.outlineOffset = '-2px'
    }

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      target.style.outline = ''
      target.style.outlineOffset = ''
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspecting(false)
        setInspectedVarNames([])
      }
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('mouseover', onMouseOver, true)
    document.addEventListener('mouseout', onMouseOut, true)
    document.addEventListener('keydown', onKeyDown)
    document.body.style.cursor = 'crosshair'

    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('mouseover', onMouseOver, true)
      document.removeEventListener('mouseout', onMouseOut, true)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.cursor = ''
    }
  }, [inspecting, allVarNames])

  const toggleInspect = useCallback(() => {
    setInspecting(prev => {
      if (!prev) {
        // Entrer en mode inspect: reset les resultats
        setInspectedVarNames([])
      }
      return !prev
    })
  }, [])

  // Variables resolues pour la vue inspect
  const inspectedVars: CssVariable[] = inspectedVarNames
    .map(name => allVars.find(v => v.name === name))
    .filter((v): v is CssVariable => v !== undefined)

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>CssTuner</span>
          {framework !== 'unknown' && !inspecting && (
            <span style={styles.badge}>{framework}</span>
          )}
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={toggleInspect}
            style={{
              ...styles.inspectButton,
              ...(inspecting ? styles.inspectButtonActive : {}),
            }}
            aria-label="Inspect element"
            title="Inspecter un element"
          >
            {'\u{1F50D}'}
          </button>
          {!inspecting && hasChanges && (
            <button onClick={resetAll} style={styles.resetAll} aria-label="Reset all">
              Reset
            </button>
          )}
          <button onClick={onClose} style={styles.closeButton} aria-label="Close panel">
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div style={styles.content}>
        {inspecting ? (
          // --- Vue inspect ---
          inspectedVars.length === 0 ? (
            <div style={styles.inspectEmpty}>
              <div style={styles.inspectEmptyIcon}>{'\u{1F50D}'}</div>
              <p style={styles.inspectEmptyText}>
                Cliquez sur un element de la page pour modifier ses couleurs
              </p>
              <button onClick={toggleInspect} style={styles.exitInspectButton}>
                Quitter l'inspection
              </button>
            </div>
          ) : (
            <div style={styles.inspectResults}>
              <div style={styles.inspectResultsHeader}>
                <p style={styles.inspectResultsCount}>
                  {inspectedVars.length} variable{inspectedVars.length > 1 ? 's' : ''}
                </p>
                <button onClick={toggleInspect} style={styles.exitInspectSmall}>
                  Quitter
                </button>
              </div>
              {inspectedVars.map(v => {
                const isModified = v.name in modifiedVars
                return (
                  <div key={v.name} style={styles.inspectVarItem}>
                    <div style={styles.inspectVarHeader}>
                      <div style={{ ...styles.inspectSwatch, backgroundColor: v.value }} />
                      <span style={styles.inspectVarName}>{varToLabel(v.name)}</span>
                      {isModified && (
                        <button
                          onClick={() => resetVar(v.name)}
                          style={styles.resetButton}
                          aria-label={`Reset ${varToLabel(v.name)}`}
                        >
                          {'\u21ba'}
                        </button>
                      )}
                    </div>
                    {isColorValue(v.value) && (
                      <ColorPicker
                        value={v.value}
                        onChange={val => setVar(v.name, val)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )
        ) : (
          // --- Vue normale (groupes) ---
          groups.length === 0 ? (
            <p style={styles.empty}>Aucune CSS variable detectee sur :root</p>
          ) : (
            groups.map(group => (
              <VarGroup
                key={group.name}
                group={group}
                modifiedVars={modifiedVars}
                onVarChange={setVar}
                onVarReset={resetVar}
              />
            ))
          )
        )}
      </div>

      {/* Footer */}
      <SaveButton modifiedVars={modifiedVars} companionUrl={companionUrl} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 99998,
    width: 300,
    height: '100vh',
    background: '#09090b',
    color: '#fafafa',
    borderRadius: 0,
    boxShadow: '2px 0 12px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
  },
  header: {
    padding: '10px 16px',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
  },
  badge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: '#27272a',
    color: '#a1a1aa',
    fontWeight: 500,
  },
  resetAll: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    fontSize: 11,
    padding: '2px 6px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 2px',
  },
  content: {
    padding: '8px 16px',
    flex: 1,
    overflowY: 'auto',
  },
  empty: {
    color: '#71717a',
    fontSize: 12,
    textAlign: 'center',
    padding: '24px 0',
  },
  inspectButton: {
    background: 'none',
    border: '1px solid #3f3f46',
    borderRadius: 4,
    color: '#a1a1aa',
    cursor: 'pointer',
    fontSize: 12,
    padding: '2px 5px',
    lineHeight: 1,
  },
  inspectButtonActive: {
    background: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
  // Inspect empty state
  inspectEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    gap: 12,
  },
  inspectEmptyIcon: {
    fontSize: 32,
    opacity: 0.4,
  },
  inspectEmptyText: {
    color: '#a1a1aa',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  exitInspectButton: {
    marginTop: 8,
    padding: '6px 16px',
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: 6,
    color: '#a1a1aa',
    cursor: 'pointer',
    fontSize: 12,
  },
  // Inspect results
  inspectResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  inspectResultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectResultsCount: {
    color: '#71717a',
    fontSize: 11,
  },
  exitInspectSmall: {
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: 4,
    color: '#a1a1aa',
    cursor: 'pointer',
    fontSize: 10,
    padding: '2px 8px',
  },
  inspectVarItem: {
    background: '#18181b',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 8,
  },
  inspectVarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  inspectSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: '1px solid #3f3f46',
    flexShrink: 0,
  },
  inspectVarName: {
    flex: 1,
    fontSize: 12,
    fontWeight: 500,
    color: '#fafafa',
  },
  resetButton: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 2px',
    flexShrink: 0,
  },
}
