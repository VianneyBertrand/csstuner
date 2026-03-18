'use client'

import type { CssTunerProps } from '../types'

interface PanelProps {
  vars: CssTunerProps['vars']
  persist: boolean
  onClose: () => void
}

export function Panel({ vars, persist, onClose }: PanelProps) {
  // TODO: implement panel with tabs (AI, Custom), color swatches, sliders, export

  const panelStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: 72,
    left: 16,
    zIndex: 99998,
    width: 320,
    maxHeight: 'calc(100vh - 96px)',
    background: '#09090b',
    color: '#fafafa',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
  }

  return (
    <div style={panelStyles}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>CssTuner</span>
      </div>

      {/* Content placeholder */}
      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
        <p style={{ color: '#a1a1aa' }}>Panel coming soon — colors, radius, fonts, AI.</p>
      </div>
    </div>
  )
}
