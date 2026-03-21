import { useState, useCallback } from 'react'
import { exportCssBlock } from '../core/cssVarWriter'

const COMPANION_PORT = 5599

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'no-companion'

interface SaveButtonProps {
  modifiedVars: Record<string, string>
  companionUrl?: string
  onReset?: () => void
}

export function SaveButton({ modifiedVars, companionUrl, onReset }: SaveButtonProps) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [copied, setCopied] = useState(false)

  const baseUrl = companionUrl ?? `http://localhost:${COMPANION_PORT}`
  const hasChanges = Object.keys(modifiedVars).length > 0

  const handleSave = useCallback(async () => {
    if (!hasChanges) return

    setStatus('saving')
    try {
      const res = await fetch(`${baseUrl}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: modifiedVars }),
      })

      if (res.ok) {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('no-companion')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }, [modifiedVars, hasChanges, baseUrl])

  const handleCopy = useCallback(async () => {
    const css = exportCssBlock(modifiedVars)
    await navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [modifiedVars])

  return (
    <div style={styles.container} role="status" aria-live="polite">
      {/* Reset */}
      {hasChanges && onReset && (
        <button
          onClick={onReset}
          style={styles.resetButton}
          aria-label="Reset all"
          title="Reset all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      )}

      {/* Copy CSS */}
      <button
        onClick={handleCopy}
        disabled={!hasChanges}
        style={{
          ...styles.button,
          ...styles.copyButton,
          ...(!hasChanges ? styles.disabled : {}),
          ...(copied ? styles.copiedButton : {}),
        }}
      >
        {copied ? '\u2713 Copied' : 'Copy CSS'}
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || status === 'saving'}
        style={{
          ...styles.button,
          ...styles.saveButton,
          ...(!hasChanges ? styles.disabled : {}),
          ...(status === 'saved' ? styles.savedButton : {}),
        }}
      >
        {status === 'saving' ? 'Saving\u2026' :
         status === 'saved' ? '\u2713 Saved' :
         status === 'error' ? 'Error' :
         status === 'no-companion' ? 'npx csstuner' :
         'Save'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 6,
    padding: '10px 14px 14px',
    borderTop: '1px solid #e8e8ec',
    background: 'linear-gradient(180deg, rgba(245,245,246,0) 0%, rgba(245,245,246,0.9) 100%)',
  },
  button: {
    flex: 1,
    padding: '7px 12px',
    borderRadius: 3,
    border: 'none',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    letterSpacing: '0.1px',
    fontFamily: "inherit",
  },
  saveButton: {
    background: 'linear-gradient(135deg, #6366f1 0%, #7c5ce7 100%)',
    color: '#fff',
    boxShadow: '0 1px 3px rgba(99,102,241,0.25)',
  },
  savedButton: {
    background: '#22c55e',
    color: '#fff',
  },
  copyButton: {
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #e4e4e7',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  copiedButton: {
    background: '#fff',
    color: '#16a34a',
    borderColor: 'rgba(22,163,74,0.3)',
  },
  disabled: {
    opacity: 0.35,
    cursor: 'default',
    pointerEvents: 'none' as React.CSSProperties['pointerEvents'],
  },
  resetButton: {
    background: 'none',
    border: '1px solid #d4d4d8',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 100ms ease',
    flexShrink: 0,
  },
}
