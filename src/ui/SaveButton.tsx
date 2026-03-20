import { useState, useCallback } from 'react'
import { exportCssBlock } from '../core/cssVarWriter'

const COMPANION_PORT = 5599

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'no-companion'

interface SaveButtonProps {
  modifiedVars: Record<string, string>
  companionUrl?: string
}

export function SaveButton({ modifiedVars, companionUrl }: SaveButtonProps) {
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
    borderRadius: 7,
    border: 'none',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    letterSpacing: '0.1px',
    fontFamily: "inherit",
  },
  saveButton: {
    background: '#1a1a1a',
    color: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
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
}
