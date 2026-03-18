export interface CssTunerVar {
  label: string
  group?: string
}

export interface CssTunerProps {
  vars?: Record<string, CssTunerVar>
  position?: 'bottom-left' | 'bottom-right'
  persist?: boolean
  companionUrl?: string
}

export interface CssVariable {
  name: string
  value: string
}

export type ColorFormat = 'oklch' | 'hsl' | 'rgb' | 'hex'

export type Framework = 'shadcn' | 'tailwind-v4' | 'radix' | 'open-props' | 'unknown'

export interface VarGroup {
  name: string
  vars: CssVariable[]
}

export interface CompanionSavePayload {
  vars: Record<string, string>
}

export interface CompanionHealthResponse {
  ok: boolean
  cssFile: string | null
}
