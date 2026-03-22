import { useState } from 'react'
import { isColorValue, varToLabel } from '../core/cssVarReader'
import { parseColor } from '../core/colorConverter'
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
          {group.vars.filter(v => isColorValue(v.value)).map(v => {
            const isModified = v.name in modifiedVars
            const isPickerOpen = openPicker === v.name
            const isLight = (parseColor(v.value)?.l ?? 1) > 0.85

            return (
              <div key={v.name} style={{
                ...styles.varItem,
                ...(isPickerOpen ? styles.varItemActive : {}),
              }}>
                <div
                  style={{
                    ...styles.varRow,
                    cursor: 'pointer',
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit ${varToLabel(v.name)}`}
                  aria-expanded={isPickerOpen}
                  onClick={() => setOpenPicker(isPickerOpen ? null : v.name)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenPicker(isPickerOpen ? null : v.name)
                    }
                  }}
                >
                  {/* Swatch */}
                  <div
                    style={{
                      ...styles.colorSwatch,
                      backgroundColor: v.value,
                      ...(isLight ? { border: '1px solid #d4d4d8' } : {}),
                    }}
                  />

                  {/* Label */}
                  <span style={{
                    ...styles.varLabel,
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
                      <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Color picker inline */}
                {isPickerOpen && (
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
      <div style={styles.separator} aria-hidden="true" />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 16px 6px',
    color: '#52525b',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as React.CSSProperties['textTransform'],
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  groupName: {
    flex: 1,
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
    padding: '8px 16px',
  },
  varItemActive: {
    background: '#fff',
    gap: 8,
    boxShadow: 'inset 1px 0 0 #d4d4d8, 0 1px 0 #d4d4d8, 0 -1px 0 #d4d4d8',
  },
  varRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 0,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 3,
    border: 'none',
    flexShrink: 0,
    padding: 0,
  },
  varLabel: {
    flex: 1,
    fontSize: 12,
    color: '#52525b',
    fontWeight: 400,
    userSelect: 'none',
    WebkitUserSelect: 'none',
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
    marginRight: -10,
    minWidth: 28,
    minHeight: 28,
    flexShrink: 0,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 100ms ease',
  },
  pickerWrap: {
    padding: 0,
  },
  separator: {
    margin: '8px 0 0',
    height: 0,
    borderBottom: '1px solid #d4d4d8',
  },
}
