import { useState, useEffect, useCallback, useRef } from 'react'
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

// Proprietes CSS heritables qui justifient de remonter les parents
const INHERITABLE_PROPS = /\b(color|font|letter-spacing|line-height|text|word-spacing|visibility|cursor|direction|white-space)\b/

/**
 * Trouve les CSS variables utilisees par un element, ses enfants, et ses ancetres
 * (pour les proprietes heritables comme color, font, etc.)
 */
function findMatchingVars(
  element: HTMLElement,
  trackedVarNames: string[],
): string[] {
  const tracked = new Set(trackedVarNames)
  const matches = findReferencedVars(element, tracked)

  // Descendre : scanner les enfants
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

  // Remonter : scanner les ancetres pour les proprietes heritables
  let parent = element.parentElement
  while (parent) {
    const parentVars = findReferencedVarsFiltered(parent, tracked, INHERITABLE_PROPS)
    for (const varName of parentVars) {
      if (!matches.includes(varName)) {
        matches.push(varName)
      }
    }
    parent = parent.parentElement
  }

  return matches
}

/**
 * Comme findReferencedVars mais filtre pour ne garder que les variables
 * utilisees dans des proprietes matchant le pattern donne.
 */
function findReferencedVarsFiltered(
  element: HTMLElement,
  trackedVarNames: Set<string>,
  propFilter: RegExp,
): string[] {
  const found: string[] = []
  const varRegex = /var\(\s*(--[\w-]+)/g

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walkRulesFiltered(sheet.cssRules, element, trackedVarNames, propFilter, varRegex, found)
    } catch {
      // Cross-origin
    }
  }

  return found
}

function walkRulesFiltered(
  rules: CSSRuleList,
  element: HTMLElement,
  trackedVarNames: Set<string>,
  propFilter: RegExp,
  varRegex: RegExp,
  found: string[],
) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      try {
        if (!element.matches(rule.selectorText)) continue
      } catch {
        continue
      }
      // Scanner chaque propriete individuellement
      for (const prop of Array.from(rule.style)) {
        if (!propFilter.test(prop)) continue
        const value = rule.style.getPropertyValue(prop)
        varRegex.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = varRegex.exec(value)) !== null) {
          const varName = match[1]
          if (trackedVarNames.has(varName) && !found.includes(varName)) {
            found.push(varName)
          }
        }
      }
    } else if ('cssRules' in rule) {
      walkRulesFiltered((rule as CSSGroupingRule).cssRules, element, trackedVarNames, propFilter, varRegex, found)
    }
  }
}

export function Panel({ vars, persist, companionUrl, onClose, width = 300 }: PanelProps) {
  const {
    groups, framework, modifiedVars, setVar, resetVar, resetAll, originalVars,
    activeMode, hasDarkMode, switchMode, lightModified, darkModified,
  } = useCssVars({
    customConfig: vars,
    persist,
  })

  const [inspecting, setInspecting] = useState(false)
  const [inspectedVarNames, setInspectedVarNames] = useState<string[]>([])
  const hasChanges = Object.keys(lightModified).length + Object.keys(darkModified).length > 0

  const allVars = groups.flatMap(g => g.vars)
  const allVarNames = allVars.map(v => v.name)

  // Inspect mode: listeners sur le document
  useEffect(() => {
    if (!inspecting) return

    const isCssTunerElement = (target: HTMLElement) => {
      const root = document.getElementById('root')
      if (!root) return false
      return root.contains(target)
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isCssTunerElement(target)) return

      e.preventDefault()
      e.stopPropagation()

      const matches = findMatchingVars(target, allVarNames)
      setInspectedVarNames(matches)
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isCssTunerElement(target)) return
      target.style.outline = '1.5px solid rgba(99,102,241,0.6)'
      target.style.outlineOffset = '1px'
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
        setInspectedVarNames([])
      }
      return !prev
    })
  }, [])

  const inspectedVars: CssVariable[] = inspectedVarNames
    .map(name => allVars.find(v => v.name === name))
    .filter((v): v is CssVariable => v !== undefined)

  // Custom overlay scrollbar
  const contentRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const [scrollVisible, setScrollVisible] = useState(false)

  const updateScrollThumb = useCallback(() => {
    const el = contentRef.current
    const thumb = thumbRef.current
    if (!el || !thumb) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight) {
      thumb.style.opacity = '0'
      return
    }
    const thumbH = Math.max(24, (clientHeight / scrollHeight) * clientHeight)
    const thumbY = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbH)
    thumb.style.height = `${thumbH}px`
    thumb.style.transform = `translateY(${thumbY}px)`
  }, [])

  const handleScroll = useCallback(() => {
    setScrollVisible(true)
    updateScrollThumb()
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      setScrollVisible(false)
    }, 800)
  }, [updateScrollThumb])

  // Cleanup scroll timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [])

  return (
    <div style={styles.panel} role="region" aria-label="CSS Variable Tuner">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <pre style={styles.asciiLogo} aria-label="CssTuner">
            <span style={{ color: '#18181b' }}>{'█▀▀ █▀▀ █▀▀'}</span>
            <span style={{ color: '#6366f1' }}>{' ▀█▀ █ █ █▀█ █▀▀ █▀▄'}</span>
            {'\n'}
            <span style={{ color: '#18181b' }}>{'█   ▀▀█ ▀▀█'}</span>
            <span style={{ color: '#6366f1' }}>{' \u00A0█\u00A0 █ █ █ █ █▀▀ █▀▄'}</span>
            {'\n'}
            <span style={{ color: '#18181b' }}>{'▀▀▀ ▀▀▀ ▀▀▀'}</span>
            <span style={{ color: '#6366f1' }}>{' \u00A0▀\u00A0 ▀▀▀ ▀ ▀ ▀▀▀ ▀ ▀'}</span>
          </pre>
        </div>
        <div style={styles.headerRight}>
          {hasDarkMode && (
            <button
              onClick={() => switchMode(activeMode === 'light' ? 'dark' : 'light')}
              style={styles.headerButton}
              aria-label={activeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={activeMode === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {activeMode === 'light' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              )}
            </button>
          )}
          <button
            onClick={toggleInspect}
            style={{
              ...styles.headerButton,
              ...(inspecting ? styles.inspectButtonActive : {}),
            }}
            aria-label="Inspect element"
            aria-pressed={inspecting}
            title="Inspect element"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 22 1-1h3l9-9"/>
              <path d="M3 21v-3l9-9 3 3-9 9"/>
              <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l-3-3Z"/>
              <path d="m2 22 2-2"/>
            </svg>
          </button>
          <button onClick={onClose} style={styles.headerButton} aria-label="Close panel" title="Close panel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>


      {/* Contenu */}
      <div style={styles.contentWrap}>
        <div ref={contentRef} onScroll={handleScroll} style={styles.content}>
          {inspecting ? (
          // --- Vue inspect ---
          inspectedVars.length === 0 ? (
            <div style={styles.inspectEmpty}>
              <div style={styles.inspectEmptyRing}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3f3f46' }}>
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <p style={styles.inspectEmptyText}>
                Select an element to inspect its CSS variables
              </p>
              <button onClick={toggleInspect} style={styles.exitInspectButton}>
                Exit inspection
              </button>
            </div>
          ) : (
            <div style={styles.inspectResults}>
              <div style={styles.inspectResultsHeader}>
                <p style={styles.inspectResultsCount}>
                  {inspectedVars.filter(v => isColorValue(v.value)).length} variable{inspectedVars.filter(v => isColorValue(v.value)).length > 1 ? 's' : ''}
                </p>
                <button onClick={toggleInspect} style={styles.exitInspectSmall} aria-label="Exit inspection mode">
                  Exit
                </button>
              </div>
              {inspectedVars.filter(v => isColorValue(v.value)).map(v => {
                const isModified = v.name in modifiedVars
                return (
                  <div key={v.name} style={styles.inspectVarItem}>
                    <div style={styles.inspectVarHeader}>
                      <div style={{
                        ...styles.inspectSwatch,
                        backgroundColor: v.value,
                      }} aria-hidden="true" />
                      <span style={styles.inspectVarName}>{varToLabel(v.name)}</span>
                      {isModified && (
                        <button
                          onClick={() => resetVar(v.name)}
                          style={styles.resetButton}
                          aria-label={`Reset ${varToLabel(v.name)}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                          </svg>
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
            <p style={styles.empty}>No CSS variables found on :root</p>
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
        {/* Custom overlay scrollbar */}
        <div
          ref={thumbRef}
          style={{
            ...styles.scrollThumb,
            opacity: scrollVisible ? 1 : 0,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Footer */}
      <SaveButton
        lightModified={lightModified}
        darkModified={darkModified}
        companionUrl={companionUrl}
        onReset={resetAll}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 99998,
    width: 272,
    height: '100vh',
    background: '#f5f5f6',
    color: '#1a1a1a',
    borderRadius: 0,
    borderRight: '1px solid #d4d4d8',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Geist Mono', 'SF Mono', ui-monospace, monospace",
    fontSize: 12,
    WebkitFontSmoothing: 'antialiased',
    boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
  },
  header: {
    padding: '12px 16px',
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
    gap: 2,
    marginRight: -6,
  },

  asciiLogo: {
    margin: 0,
    padding: 0,
    fontSize: '5px',
    lineHeight: 1.15,
    fontFamily: "'Geist Mono', 'SF Mono', ui-monospace, monospace",
    color: '#18181b',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  } as React.CSSProperties,
  headerButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
    minWidth: 28,
    minHeight: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 100ms ease, background 100ms ease',
  },
  inspectButtonActive: {
    color: '#6366f1',
    background: 'rgba(99,102,241,0.08)',
  },
  contentWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    padding: '12px 0',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  scrollThumb: {
    position: 'absolute',
    top: 0,
    right: 1,
    width: 4,
    borderRadius: 4,
    background: 'rgba(0,0,0,0.15)',
    pointerEvents: 'none',
    transition: 'opacity 300ms ease',
    zIndex: 10,
  },
  empty: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    padding: '32px 0',
    fontStyle: 'italic',
  },
  // Inspect empty state
  inspectEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '56px 24px',
    gap: 16,
  },
  inspectEmptyRing: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: '#fff',
    border: '1px solid #d4d4d8',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectEmptyText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 200,
  },
  exitInspectButton: {
    marginTop: 4,
    padding: '6px 14px',
    background: '#fff',
    border: '1px solid #d4d4d8',
    borderRadius: 6,
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
    transition: 'all 150ms ease',
    fontFamily: 'inherit',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  // Inspect results
  inspectResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  inspectResultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    padding: '0 16px',
  },
  inspectResultsCount: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.3px',
  },
  exitInspectSmall: {
    background: '#fff',
    border: '1px solid #d4d4d8',
    borderRadius: 4,
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 500,
    padding: '3px 8px',
    transition: 'all 150ms ease',
    fontFamily: 'inherit',
  },
  inspectVarItem: {
    background: '#fff',
    borderRadius: 12,
    padding: '8px 16px',
    gap: 8,
    display: 'flex',
    flexDirection: 'column',
  },
  inspectVarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  inspectSwatch: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid #fff',
    flexShrink: 0,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)',
  },
  inspectVarName: {
    flex: 1,
    fontSize: 12,
    fontWeight: 400,
    color: '#52525b',
    letterSpacing: '0px',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  resetButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: 6,
    marginRight: -6,
    minWidth: 28,
    minHeight: 28,
    flexShrink: 0,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 100ms ease',
  },
}
