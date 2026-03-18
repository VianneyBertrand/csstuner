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
      >
        <span style={styles.arrow}>{collapsed ? '\u25b6' : '\u25bc'}</span>
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
                <div style={styles.varRow}>
                  {/* Swatch ou valeur */}
                  {isColor ? (
                    <button
                      onClick={() => setOpenPicker(isPickerOpen ? null : v.name)}
                      style={{ ...styles.colorSwatch, backgroundColor: v.value }}
                      aria-label={`Edit ${varToLabel(v.name)}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={v.value}
                      onChange={e => onVarChange(v.name, e.target.value)}
                      style={styles.valueInput}
                    />
                  )}

                  {/* Label */}
                  <span style={{ ...styles.varLabel, ...(isModified ? styles.modifiedLabel : {}) }}>
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
                  <ColorPicker
                    value={v.value}
                    onChange={val => onVarChange(v.name, val)}
                  />
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
    marginBottom: 4,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '6px 0',
    background: 'none',
    border: 'none',
    color: '#fafafa',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
  },
  arrow: {
    fontSize: 8,
    color: '#71717a',
    width: 10,
  },
  groupName: {
    flex: 1,
  },
  count: {
    fontSize: 11,
    color: '#71717a',
  },
  varList: {
    paddingLeft: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  varItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  varRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '3px 0',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: '1px solid #3f3f46',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  },
  varLabel: {
    flex: 1,
    fontSize: 12,
    color: '#a1a1aa',
  },
  modifiedLabel: {
    color: '#fafafa',
    fontWeight: 500,
  },
  resetButton: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 2px',
    flexShrink: 0,
  },
  valueInput: {
    width: 70,
    padding: '2px 6px',
    fontSize: 12,
    fontFamily: 'monospace',
    background: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: 4,
    color: '#fafafa',
    outline: 'none',
    flexShrink: 0,
  },
}
