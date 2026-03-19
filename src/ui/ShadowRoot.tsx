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
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 12px;
    color: #e4e4e7;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  ::-webkit-scrollbar {
    width: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #27272a;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #3f3f46;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    height: 14px;
  }
  input[type="range"]::-webkit-slider-runnable-track {
    height: 3px;
    background: #27272a;
    border-radius: 2px;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #e4e4e7;
    border: 2px solid #09090b;
    margin-top: -5.5px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    transition: transform 100ms ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(0.95);
    background: #fff;
  }
  /* Focus indicators */
  button:focus-visible, input:focus-visible, canvas:focus-visible {
    outline: 2px solid #818cf8;
    outline-offset: 2px;
  }
  input[type="range"]:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(129,140,248,0.4), 0 1px 3px rgba(0,0,0,0.4);
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
