interface FabProps {
  position: 'bottom-left' | 'bottom-right'
  onClick: () => void
}

export function Fab({ position, onClick }: FabProps) {
  const style: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    [position === 'bottom-left' ? 'left' : 'right']: 20,
    zIndex: 99999,
    width: 40,
    height: 40,
    borderRadius: 11,
    border: '1px solid rgba(0,0,0,0.08)',
    background: '#fff',
    color: '#1a1a1a',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
    transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease',
    fontSize: 15,
    letterSpacing: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    pointerEvents: 'auto',
  }

  return (
    <button
      onClick={onClick}
      style={style}
      aria-label="Open CssTuner"
      title="CssTuner"
    >
      {'\u2726'}
    </button>
  )
}
