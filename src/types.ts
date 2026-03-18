export interface CssTunerVar {
  /** Display label in the panel */
  label: string
  /** Group name for organizing vars */
  group?: string
}

export interface CssTunerProps {
  /**
   * Custom labels and grouping for CSS variables.
   * By default, CssTuner auto-detects and auto-labels all CSS vars.
   */
  vars?: Record<string, CssTunerVar>

  /**
   * Position of the fab button.
   * @default 'bottom-left'
   */
  position?: 'bottom-left' | 'bottom-right'

  /**
   * Persist tweaks in localStorage between sessions.
   * @default true
   */
  persist?: boolean
}
