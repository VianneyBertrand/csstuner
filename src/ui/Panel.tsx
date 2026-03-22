import { useState, useEffect, useCallback, useRef } from 'react'
import type { CssTunerProps, CssVariable } from '../core/types'
import { useCssVars } from './hooks/useCssVars'
import { VarGroup } from './VarGroup'
import { SaveButton } from './SaveButton'

interface PanelProps {
  vars: CssTunerProps['vars']
  persist: boolean
  companionUrl?: string
  aiEndpoint?: string
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

  // Remonter les ancetres pour les proprietes heritables,
  // mais exclure celles que l'element override directement
  const directProps = getDirectProperties(element)
  let parent = element.parentElement
  while (parent) {
    const parentVars = findReferencedVarsWithProps(parent, tracked, INHERITABLE_PROPS)
    for (const { varName, prop } of parentVars) {
      if (!matches.includes(varName) && !directProps.has(prop)) {
        matches.push(varName)
      }
    }
    parent = parent.parentElement
  }

  return matches
}

/**
 * Trouve les proprietes CSS definies directement sur un element
 * (via les regles qui le matchent), pour savoir ce qu'il override.
 */
function getDirectProperties(element: HTMLElement): Set<string> {
  const props = new Set<string>()

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collectDirectProps(sheet.cssRules, element, props)
    } catch {
      // Cross-origin
    }
  }

  return props
}

function collectDirectProps(rules: CSSRuleList, element: HTMLElement, props: Set<string>) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      try {
        if (!element.matches(rule.selectorText)) continue
      } catch {
        continue
      }
      for (const prop of Array.from(rule.style)) {
        props.add(prop)
      }
    } else if ('cssRules' in rule) {
      collectDirectProps((rule as CSSGroupingRule).cssRules, element, props)
    }
  }
}

/**
 * Trouve les variables heritables d'un element avec le nom de la propriete,
 * pour pouvoir filtrer celles qui sont overridees par l'element enfant.
 */
function findReferencedVarsWithProps(
  element: HTMLElement,
  trackedVarNames: Set<string>,
  propFilter: RegExp,
): Array<{ varName: string; prop: string }> {
  const found: Array<{ varName: string; prop: string }> = []
  const varRegex = /var\(\s*(--[\w-]+)/g

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walkRulesWithProps(sheet.cssRules, element, trackedVarNames, propFilter, varRegex, found)
    } catch {
      // Cross-origin
    }
  }

  return found
}

function walkRulesWithProps(
  rules: CSSRuleList,
  element: HTMLElement,
  trackedVarNames: Set<string>,
  propFilter: RegExp,
  varRegex: RegExp,
  found: Array<{ varName: string; prop: string }>,
) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      try {
        if (!element.matches(rule.selectorText)) continue
      } catch {
        continue
      }
      for (const prop of Array.from(rule.style)) {
        if (!propFilter.test(prop)) continue
        const value = rule.style.getPropertyValue(prop)
        varRegex.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = varRegex.exec(value)) !== null) {
          const varName = match[1]
          if (trackedVarNames.has(varName) && !found.some(f => f.varName === varName)) {
            found.push({ varName, prop })
          }
        }
      }
    } else if ('cssRules' in rule) {
      walkRulesWithProps((rule as CSSGroupingRule).cssRules, element, trackedVarNames, propFilter, varRegex, found)
    }
  }
}

const AI_ENDPOINT_DEFAULT = 'https://landing-theta-inky.vercel.app/api/ai'

export function Panel({ vars, persist, companionUrl, aiEndpoint, onClose, width = 300 }: PanelProps) {
  const {
    groups, framework, modifiedVars, setVar, resetVar, resetAll, originalVars,
    activeMode, hasDarkMode, switchMode, lightModified, darkModified,
  } = useCssVars({
    customConfig: vars,
    persist,
  })

  const [inspecting, setInspecting] = useState(false)
  const [inspectedVarNames, setInspectedVarNames] = useState<string[]>([])
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [licenseKey, setLicenseKey] = useState(() => {
    try { return localStorage.getItem('csstuner:pro') ?? '' } catch { return '' }
  })
  const [aiNeedsKey, setAiNeedsKey] = useState(!licenseKey.startsWith('cst_'))
  const [aiJustActivated, setAiJustActivated] = useState(false)
  const [aiShowKeyInput, setAiShowKeyInput] = useState(false)
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

  const handleAiSubmit = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)

    // En mode inspect avec sélection, ne changer que les variables de l'élément
    const targetVars = inspecting && inspectedVarNames.length > 0
      ? inspectedVarNames
      : allVarNames

    try {
      const endpoint = aiEndpoint ?? AI_ENDPOINT_DEFAULT
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          variables: targetVars,
          licenseKey,
        }),
      })
      if (res.status === 403) {
        setLicenseKey('')
        try { localStorage.removeItem('csstuner:pro') } catch {}
        setAiNeedsKey(true)
        setAiJustActivated(false)
        setAiShowKeyInput(false)
        setAiLoading(false)
        return
      }
      if (!res.ok) throw new Error('AI request failed')
      const { palette } = await res.json() as { palette: Record<string, string> }
      for (const [name, value] of Object.entries(palette)) {
        if (targetVars.includes(name)) {
          setVar(name, value)
        }
      }
      setAiNeedsKey(false)
    } catch (err) {
      console.error('CssTuner AI error:', err)
    } finally {
      setAiLoading(false)
    }
  }, [aiPrompt, aiLoading, aiEndpoint, allVarNames, inspecting, inspectedVarNames, setVar, licenseKey])

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
          <button
            onClick={() => setAiOpen(prev => !prev)}
            style={{
              ...styles.headerButton,
              ...(aiOpen ? styles.inspectButtonActive : {}),
            }}
            aria-label="AI palette"
            aria-pressed={aiOpen}
            title="AI palette"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/>
              <circle cx="9" cy="14" r="1"/>
              <circle cx="15" cy="14" r="1"/>
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

      {/* AI input */}
      {aiOpen && (
        <div style={styles.aiBar}>
          {aiNeedsKey ? (
            <div style={styles.aiKeySection}>
              <div style={styles.aiKeyRow}>
                {(licenseKey.startsWith('cst_') || aiShowKeyInput) ? (
                  <>
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={e => {
                        setLicenseKey(e.target.value)
                        try { localStorage.setItem('csstuner:pro', e.target.value) } catch {}
                      }}
                      onKeyDown={e => { if (e.key === 'Enter' && licenseKey.startsWith('cst_')) { setAiNeedsKey(false); setAiJustActivated(true) }}}
                      placeholder="Paste your license key"
                      style={styles.aiInput}
                      autoFocus
                    />
                    {licenseKey.startsWith('cst_') ? (
                      <button
                        onClick={() => { setAiNeedsKey(false); setAiJustActivated(true) }}
                        style={styles.aiSubmit}
                      >
                        Activate
                      </button>
                    ) : (
                      <a
                        href="https://buy.stripe.com/test_dRm00jaOaeCt19YefS3wQ00"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.aiGetPro}
                      >
                        Get Pro
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Describe a style..."
                      style={styles.aiInput}
                      readOnly
                      onFocus={() => setAiShowKeyInput(true)}
                    />
                    <a
                      href="https://buy.stripe.com/test_dRm00jaOaeCt19YefS3wQ00"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.aiGetPro}
                    >
                      Get Pro
                    </a>
                  </>
                )}
              </div>
              <p style={styles.aiKeyDesc}>
                {(licenseKey.startsWith('cst_') || aiShowKeyInput)
                  ? 'Paste the key from your purchase confirmation.'
                  : 'Describe a vibe in plain text and let AI generate a matching color palette for your tokens. Powered by Claude (Anthropic). Requires a Pro license key.'}
              </p>
            </div>
          ) : (
            <div style={styles.aiKeySection}>
              <div style={styles.aiKeyRow}>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => { setAiPrompt(e.target.value); setAiJustActivated(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiSubmit() }}
                  placeholder="Describe a style... e.g. &quot;fintech, deep blue, serious&quot;"
                  style={styles.aiInput}
                  disabled={aiLoading}
                />
                <button
                  onClick={handleAiSubmit}
                  disabled={aiLoading || !aiPrompt.trim()}
                  style={{
                    ...styles.aiSubmit,
                    ...(aiLoading || !aiPrompt.trim() ? { opacity: 0.4 } : {}),
                  }}
                >
                  {aiLoading ? '...' : '->'}
                </button>
              </div>
              {aiJustActivated && (
                <p style={styles.aiKeyDesc}>
                  Pro unlocked. Describe any mood, style, or reference — Claude handles the rest. Happy shipping.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      <div style={styles.contentWrap}>
        <div ref={contentRef} onScroll={handleScroll} style={styles.content}>
          {inspecting ? (
          // --- Vue inspect ---
          inspectedVars.length === 0 ? (
            <p style={styles.inspectEmptyText}>
              Click an element to inspect its CSS variables
            </p>
          ) : (
            <VarGroup
              group={{ name: 'Inspected', vars: inspectedVars }}
              modifiedVars={modifiedVars}
              onVarChange={setVar}
              onVarReset={resetVar}
            />
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
    background: '#ffffff',
    color: '#1a1a1a',
    borderRadius: 0,
    borderRight: '1px solid #d4d4d8',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Geist Mono', 'SF Mono', ui-monospace, monospace",
    fontSize: 12,
    WebkitFontSmoothing: 'antialiased',
    boxShadow: 'none',
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

  aiBar: {
    display: 'flex',
    gap: 6,
    padding: '8px 14px',
    borderBottom: '1px solid #d4d4d8',
    flexShrink: 0,
  },
  aiKeySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  } as React.CSSProperties,
  aiKeyRow: {
    display: 'flex',
    gap: 6,
  },
  aiKeyDesc: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.4,
    color: '#71717a',
    fontFamily: 'inherit',
  },
  aiInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 11,
    fontFamily: 'inherit',
    background: '#fff',
    border: '1px solid #d4d4d8',
    color: '#18181b',
    outline: 'none',
  },
  aiSubmit: {
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
  aiGetPro: {
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit',
    background: 'linear-gradient(135deg, #6366f1 0%, #7c5ce7 100%)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  } as React.CSSProperties,
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
  inspectEmptyText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    padding: '40px 24px',
  },
}
