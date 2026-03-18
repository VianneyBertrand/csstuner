'use client'

interface FabProps {
  position: 'bottom-left' | 'bottom-right'
  onClick: () => void
  open: boolean
}

export function Fab({ position, onClick, open }: FabProps) {
  const positionStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: 16,
    [position === 'bottom-left' ? 'left' : 'right']: 16,
    zIndex: 99999,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: open ? '#18181b' : '#09090b',
    color: '#fafafa',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    transition: 'transform 150ms ease, background 150ms ease',
    transform: open ? 'rotate(45deg)' : 'none',
    fontSize: 18,
  }

  return (
    <button
      onClick={onClick}
      style={positionStyles}
      aria-label={open ? 'Close CssTuner' : 'Open CssTuner'}
      title="CssTuner"
    >
      ✦
    </button>
  )
}
