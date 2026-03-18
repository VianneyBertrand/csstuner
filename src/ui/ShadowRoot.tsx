import { useRef, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ShadowRootProps {
  children: ReactNode
  open?: boolean
  panelWidth?: number
}

const RESET_STYLES = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    color: #fafafa;
    line-height: 1.4;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`

/**
 * Wrapper qui rend les enfants dans un Shadow DOM isole.
 * Empeche les styles de l'app hote de fuiter dans l'overlay et inversement.
 */
export function ShadowContainer({ children, open, panelWidth = 300 }: ShadowRootProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || host.shadowRoot) {
      if (host?.shadowRoot) setShadowRoot(host.shadowRoot)
      return
    }

    const shadow = host.attachShadow({ mode: 'open' })

    // Injecter les styles de reset dans le Shadow DOM
    const style = document.createElement('style')
    style.textContent = RESET_STYLES
    shadow.appendChild(style)

    // Container pour le portail React
    const container = document.createElement('div')
    shadow.appendChild(container)

    setShadowRoot(shadow)
  }, [])

  return (
    <>
      <div ref={hostRef} style={{
        position: 'fixed',
        zIndex: 99999,
        top: 0,
        left: 0,
        ...(open ? { width: panelWidth, height: '100vh' } : {}),
      }} />
      {shadowRoot && createPortal(children, shadowRoot)}
    </>
  )
}
