import { useRef, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ShadowRootProps {
  children: ReactNode
  open?: boolean
  panelWidth?: number
}

const RESET_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&display=swap');
  :host {
    all: initial;
    font-family: 'Geist Mono', 'SF Mono', ui-monospace, monospace;
    font-size: 12px;
    color: #1a1a1a;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  * {
    scrollbar-width: none;
  }
  ::-webkit-scrollbar {
    display: none;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    height: 16px;
  }
  input[type="range"]::-webkit-slider-runnable-track {
    height: 0;
    background: transparent;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 1.5px solid #d4d4d8;
    margin-top: -8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    transition: transform 100ms ease, box-shadow 150ms ease, border-color 150ms ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    border-color: #a1a1aa;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(0.95);
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15), 0 1px 3px rgba(0,0,0,0.1);
  }
  /* Focus indicators */
  button:focus-visible, input:focus-visible, canvas:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
  input[type="range"]:focus-visible::-webkit-slider-thumb {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.2), 0 1px 3px rgba(0,0,0,0.1);
  }
  /* High contrast mode support */
  @media (forced-colors: active) {
    button, input { border: 1px solid ButtonText; }
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
