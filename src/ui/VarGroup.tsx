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
  const [collapsed, setCollapsed] = useState(false)
  const [openPicker, setOpenPicker] = useState<string | null>(null)

  return (
    <div style={styles.container}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={styles.header}
        aria-expanded={!collapsed}
        aria-label={`${group.name}, ${group.vars.length} variables`}
      >
        <span style={{
          ...styles.arrow,
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 150ms ease',
        }}>
          {'\u25BE'}
        </span>
        <span style={styles.groupName}>{group.name}</span>
        <span style={styles.count}>{group.vars.length}</span>
      </button>

      {/* Variables */}
      {!collapsed && (
        <div style={styles.varList}>
          {group.vars.map(v => {
            const isColor = isColorValue(v.value)
            const isModified = v.name in modifiedVars
            const isPickerOpen = openPicker === v.name

            return (
              <div key={v.name} style={styles.varItem}>
                <div style={{
                  ...styles.varRow,
                  ...(isPickerOpen ? styles.varRowActive : {}),
                }}>
                  {/* Swatch ou valeur */}
                  {isColor ? (
                    <button
                      onClick={() => setOpenPicker(isPickerOpen ? null : v.name)}
                      style={{
                        ...styles.colorSwatch,
                        backgroundColor: v.value,
                        ...(isPickerOpen ? styles.swatchActive : {}),
                      }}
                      aria-label={`Edit ${varToLabel(v.name)}`}
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
                      onClick={() => {
                        onVarReset(v.name)
                        setOpenPicker(null)
                      }}
                      style={styles.resetButton}
                      aria-label={`Reset ${varToLabel(v.name)}`}
                    >
                      {'\u21ba'}
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
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '7px 4px',
    background: 'none',
    border: 'none',
    color: '#e4e4e7',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'left',
    borderRadius: 4,
    transition: 'background 100ms ease',
    letterSpacing: '0.2px',
    textTransform: 'uppercase' as React.CSSProperties['textTransform'],
  },
  arrow: {
    fontSize: 9,
    color: '#71717a',
    width: 10,
    display: 'inline-block',
    textAlign: 'center',
  },
  groupName: {
    flex: 1,
  },
  count: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: 500,
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  varList: {
    paddingLeft: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    marginBottom: 4,
  },
  varItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  varRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 6px',
    borderRadius: 5,
    transition: 'background 100ms ease',
  },
  varRowActive: {
    background: 'rgba(255,255,255,0.03)',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 5,
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    transition: 'transform 100ms ease, box-shadow 150ms ease',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
  },
  swatchActive: {
    boxShadow: '0 0 0 2px #09090b, 0 0 0 3px rgba(255,255,255,0.2), inset 0 0 0 1px rgba(0,0,0,0.15)',
  },
  varLabel: {
    flex: 1,
    fontSize: 12,
    color: '#a1a1aa',
    transition: 'color 100ms ease',
  },
  modifiedLabel: {
    color: '#e4e4e7',
    fontWeight: 500,
  },
  activeLabel: {
    color: '#a1a1aa',
  },
  resetButton: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    fontSize: 13,
    padding: '4px 6px',
    minWidth: 28,
    minHeight: 28,
    flexShrink: 0,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 100ms ease, background 100ms ease',
  },
  valueInput: {
    width: 72,
    padding: '3px 6px',
    fontSize: 11,
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
    background: '#0c0c0e',
    border: '1px solid #1e1e21',
    borderRadius: 4,
    color: '#e4e4e7',
    outline: 'none',
    flexShrink: 0,
    transition: 'border-color 150ms ease',
    letterSpacing: '-0.3px',
  },
  pickerWrap: {
    paddingLeft: 6,
    paddingBottom: 4,
  },
}
