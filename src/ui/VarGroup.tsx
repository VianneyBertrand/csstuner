import { useState } from 'react'
import { isColorValue, varToLabel } from '../core/cssVarReader'
import { ColorPicker } from './ColorPicker'
import type { VarGroup as VarGroupType } from '../core/types'

interface VarGroupProps {
  group: VarGroupType
  modifiedVars: Record<string, string>
  onVarChange: (name: string, value: string) => void
  onVarReset: (name: string) => void
}

export function VarGroup({ group, modifiedVars, onVarChange, onVarReset }: VarGroupProps) {
  const [openPicker, setOpenPicker] = useState<string | null>(null)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.groupName}>{group.name}</span>
      </div>

      {/* Variables */}
      <div style={styles.varList}>
          {group.vars.map(v => {
            const isColor = isColorValue(v.value)
            const isModified = v.name in modifiedVars
            const isPickerOpen = openPicker === v.name

            return (
              <div key={v.name} style={{
                ...styles.varItem,
                ...(isPickerOpen ? styles.varItemActive : {}),
              }}>
                <div
                  style={{
                    ...styles.varRow,
                    ...(isPickerOpen ? styles.varRowActive : {}),
                    ...(isColor ? { cursor: 'pointer' } : {}),
                  }}
                  {...(isColor ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `Edit ${varToLabel(v.name)}`,
                    'aria-expanded': isPickerOpen,
                    onClick: () => setOpenPicker(isPickerOpen ? null : v.name),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpenPicker(isPickerOpen ? null : v.name)
                      }
                    },
                  } : {})}
                >
                  {/* Swatch ou valeur */}
                  {isColor ? (
                    <div
                      style={{
                        ...styles.colorSwatch,
                        backgroundColor: v.value,
                        ...(isPickerOpen ? styles.swatchActive : {}),
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={v.value}
                      onChange={e => onVarChange(v.name, e.target.value)}
                      style={styles.valueInput}
                      aria-label={varToLabel(v.name)}
                    />
                  )}

                  {/* Label */}
                  <span style={{
                    ...styles.varLabel,
                    ...(isModified ? styles.modifiedLabel : {}),
                    ...(isPickerOpen ? styles.activeLabel : {}),
                  }}>
                    {varToLabel(v.name)}
                  </span>

                  {/* Reset */}
                  {isModified && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onVarReset(v.name)
                        setOpenPicker(null)
                      }}
                      style={styles.resetButton}
                      aria-label={`Reset ${varToLabel(v.name)}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Color picker inline */}
                {isPickerOpen && isColor && (
                  <div style={styles.pickerWrap}>
                    <ColorPicker
                      value={v.value}
                      onChange={val => onVarChange(v.name, val)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: '1px solid #e8e8ec',
    paddingBottom: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px 6px',
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as React.CSSProperties['textTransform'],
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  groupName: {
    flex: 1,
  },
  count: {
    fontSize: 10,
    color: '#c4c4cc',
    fontWeight: 500,
    fontFamily: "inherit",
  },
  varList: {
    paddingLeft: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  varItem: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 8,
    padding: '8px 16px',
  },
  varItemActive: {
    background: '#fff',
    gap: 8,
    borderRadius: 12,
  },
  varRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 0,
    borderRadius: 5,
  },
  varRowActive: {
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid #fff',
    flexShrink: 0,
    padding: 0,
    transition: 'transform 100ms ease, box-shadow 150ms ease',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)',
  },
  swatchActive: {
  },
  varLabel: {
    flex: 1,
    fontSize: 12,
    color: '#52525b',
    fontWeight: 400,
    letterSpacing: '0px',
    transition: 'color 100ms ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  modifiedLabel: {
  },
  activeLabel: {
    color: '#6b7280',
  },
  resetButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: 6,
    marginRight: -6,
    minWidth: 28,
    minHeight: 28,
    flexShrink: 0,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 100ms ease',
  },
  valueInput: {
    width: 72,
    padding: '3px 6px',
    fontSize: 11,
    fontFamily: "inherit",
    background: '#fff',
    border: '1px solid #e4e4e7',
    borderRadius: 4,
    color: '#1a1a1a',
    outline: 'none',
    flexShrink: 0,
    transition: 'border-color 150ms ease',
    letterSpacing: '-0.3px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  pickerWrap: {
    padding: 0,
  },
}
