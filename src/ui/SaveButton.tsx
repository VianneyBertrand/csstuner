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
    <div style={styles.container}>
      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || status === 'saving'}
        style={{
          ...styles.button,
          ...styles.saveButton,
          ...(!hasChanges ? styles.disabled : {}),
        }}
      >
        {status === 'saving' ? 'Saving...' :
         status === 'saved' ? 'Saved!' :
         status === 'error' ? 'Error' :
         status === 'no-companion' ? 'Run npx csstuner' :
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
        }}
      >
        {copied ? 'Copied!' : 'Copy CSS'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 6,
    padding: '8px 16px 12px',
    borderTop: '1px solid #27272a',
  },
  button: {
    flex: 1,
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 150ms ease',
  },
  saveButton: {
    background: '#fafafa',
    color: '#09090b',
  },
  copyButton: {
    background: '#27272a',
    color: '#fafafa',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'default',
  },
}
