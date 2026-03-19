interface FabProps {
  position: 'bottom-left' | 'bottom-right'
  onClick: () => void
  open: boolean
}

export function Fab({ position, onClick, open }: FabProps) {
  const style: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    [position === 'bottom-left' ? 'left' : 'right']: 20,
    zIndex: 99999,
    width: 40,
    height: 40,
    borderRadius: 11,
    border: '1px solid rgba(255,255,255,0.06)',
    background: open
      ? 'linear-gradient(145deg, #1c1c1f, #111113)'
      : 'linear-gradient(145deg, #18181b, #09090b)',
    color: open ? '#a1a1aa' : '#e4e4e7',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: open
      ? '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
      : '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)',
    transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease, background 200ms ease',
    transform: open ? 'rotate(45deg) scale(0.95)' : 'none',
    fontSize: 15,
    letterSpacing: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    WebkitFontSmoothing: 'antialiased',
  }

  return (
    <button
      onClick={onClick}
      style={style}
      aria-label={open ? 'Close CssTuner' : 'Open CssTuner'}
      title="CssTuner"
    >
      {'\u2726'}
    </button>
  )
}
