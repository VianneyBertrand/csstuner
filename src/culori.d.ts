declare module 'culori' {
  export interface Oklch {
    mode: 'oklch'
    l: number
    c: number
    h?: number
    alpha?: number
  }

  export interface Color {
    mode: string
    [key: string]: unknown
  }

  export function parse(color: string): Color | undefined
  export function formatHex(color: Color | Oklch): string
  export function formatHsl(color: Color | Oklch): string
  export function displayable(color: Color | Oklch): boolean
  export function clampChroma(color: Color | Oklch, mode: string): Color
  export function converter(mode: string): (color: Color) => Oklch
}
