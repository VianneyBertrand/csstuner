import { useState, useCallback, useEffect, useRef } from 'react'
import { parseColor, isInSrgbGamut, formatAs, detectColorFormat, clampToSrgb } from '../core/colorConverter'
import { formatHex, converter, type Color } from 'culori'
import type { ColorFormat } from '../core/types'

const toSrgb = converter('rgb')

/** Convertit oklch -> hex affichable (clamp si hors gamut) */
function oklchToHex(l: number, c: number, h: number): string {
  const color = { mode: 'oklch' as const, l, c, h }
  return formatHex(clampToSrgb(color)) ?? '#000000'
}

const AREA_W = 252
const AREA_H = 150
const HUE_H = 14
const MAX_C = 0.4

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [lightness, setLightness] = useState(0.5)
  const [chroma, setChroma] = useState(0.1)
  const [hue, setHue] = useState(0)
  const [textInput, setTextInput] = useState(value)
  const [inGamut, setInGamut] = useState(true)
  const [outputFormat, setOutputFormat] = useState<ColorFormat>('oklch')

  const areaCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueCanvasRef = useRef<HTMLCanvasElement>(null)
  const draggingArea = useRef(false)
  const draggingHue = useRef(false)

  // Sync depuis la valeur externe
  useEffect(() => {
    const color = parseColor(value)
    if (color) {
      setLightness(color.l)
      setChroma(color.c)
      setHue(color.h ?? 0)
      setInGamut(isInSrgbGamut(color))
      setOutputFormat(detectColorFormat(value))
    }
    setTextInput(value)
  }, [value])

  const emitChange = useCallback((l: number, c: number, h: number) => {
    const color = { mode: 'oklch' as const, l, c, h }
    setInGamut(isInSrgbGamut(color))
    const formatted = formatAs(color, outputFormat)
    onChange(formatted)
    setTextInput(formatted)
  }, [onChange, outputFormat])

  // --- Dessiner la zone L×C (gradient seulement, pas de crosshair) ---
  useEffect(() => {
    const canvas = areaCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imgData = ctx.createImageData(AREA_W, AREA_H)
    const data = imgData.data
    for (let y = 0; y < AREA_H; y++) {
      const l = 1 - y / (AREA_H - 1) // top = light, bottom = dark
      for (let x = 0; x < AREA_W; x++) {
        const c = (x / (AREA_W - 1)) * MAX_C
        const color = { mode: 'oklch' as const, l, c, h: hue }
        const rgb = toSrgb(clampToSrgb(color) as unknown as Color) as { r?: number; g?: number; b?: number } | undefined
        const idx = (y * AREA_W + x) * 4
        data[idx] = Math.round((rgb?.r ?? 0) * 255)
        data[idx + 1] = Math.round((rgb?.g ?? 0) * 255)
        data[idx + 2] = Math.round((rgb?.b ?? 0) * 255)
        data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }, [hue])

  // --- Dessiner la barre de hue (gradient seulement, pas d'indicateur) ---
  useEffect(() => {
    const canvas = hueCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imgData = ctx.createImageData(AREA_W, HUE_H)
    const data = imgData.data
    for (let x = 0; x < AREA_W; x++) {
      const h = (x / (AREA_W - 1)) * 360
      const hex = oklchToHex(0.7, 0.15, h)
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      for (let y = 0; y < HUE_H; y++) {
        const idx = (y * AREA_W + x) * 4
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }, [])

  // --- Interactions souris zone L×C ---
  const pickFromArea = useCallback((e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement> | MouseEvent) => {
    const canvas = areaCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const newC = x * MAX_C
    const newL = 1 - y
    setLightness(newL)
    setChroma(newC)
    emitChange(newL, newC, hue)
  }, [hue, emitChange])

  const onAreaDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    draggingArea.current = true
    pickFromArea(e)
  }, [pickFromArea])

  // --- Interactions souris barre hue ---
  const pickFromHue = useCallback((e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement> | MouseEvent) => {
    const canvas = hueCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newH = x * 360
    setHue(newH)
    emitChange(lightness, chroma, newH)
  }, [lightness, chroma, emitChange])

  const onHueDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    draggingHue.current = true
    pickFromHue(e)
  }, [pickFromHue])

  // --- Global mousemove/mouseup pour drag ---
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingArea.current) pickFromArea(e)
      if (draggingHue.current) pickFromHue(e)
    }
    const onUp = () => {
      draggingArea.current = false
      draggingHue.current = false
    }
    // Attacher sur le shadow root ou document
    const root = areaCanvasRef.current?.getRootNode() as ShadowRoot | Document | null
    const target = root ?? document
    target.addEventListener('mousemove', onMove as EventListener)
    target.addEventListener('mouseup', onUp)
    return () => {
      target.removeEventListener('mousemove', onMove as EventListener)
      target.removeEventListener('mouseup', onUp)
    }
  }, [pickFromArea, pickFromHue])

  const handleLightness = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const l = parseFloat(e.target.value)
    setLightness(l)
    emitChange(l, chroma, hue)
  }, [chroma, hue, emitChange])

  const handleChroma = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const c = parseFloat(e.target.value)
    setChroma(c)
    emitChange(lightness, c, hue)
  }, [lightness, hue, emitChange])

  const handleHue = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const h = parseFloat(e.target.value)
    setHue(h)
    emitChange(lightness, chroma, h)
  }, [lightness, chroma, emitChange])

  const handleTextInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setTextInput(raw)

    const color = parseColor(raw)
    if (color) {
      setLightness(color.l)
      setChroma(color.c)
      setHue(color.h ?? 0)
      setInGamut(isInSrgbGamut(color))
      const formatted = formatAs(color, detectColorFormat(raw))
      onChange(formatted)
    }
  }, [onChange])

  // Thumb positions as percentages of canvas size
  const areaThumbX = `${(chroma / MAX_C) * 100}%`
  const areaThumbY = `${(1 - lightness) * 100}%`
  const hueThumbX = `${(hue / 360) * 100}%`
  const thumbColor = oklchToHex(lightness, chroma, hue)

  return (
    <div style={styles.container}>
      {/* 2D color area: lightness (Y) × chroma (X) */}
      <div
        style={styles.areaOuter}
        onMouseDown={onAreaDown}
        role="img"
        aria-label="Color picker: lightness and chroma"
        tabIndex={0}
      >
        <div style={styles.areaInner}>
          <canvas
            ref={areaCanvasRef}
            width={AREA_W}
            height={AREA_H}
            style={styles.areaCanvas}
          />
          {/* DOM-based thumb — positioned relative to areaInner (= canvas size) */}
          <div
            style={{
              ...styles.areaThumb,
              left: areaThumbX,
              top: areaThumbY,
              backgroundColor: thumbColor,
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Hue strip */}
      <div
        style={styles.hueOuter}
        onMouseDown={onHueDown}
        role="img"
        aria-label="Hue selector"
        tabIndex={0}
      >
        <div style={styles.hueInner}>
          <canvas
            ref={hueCanvasRef}
            width={AREA_W}
            height={HUE_H}
            style={styles.hueCanvas}
          />
          {/* DOM-based hue thumb */}
          <div
            style={{
              ...styles.hueThumb,
              left: hueThumbX,
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Value input + gamut warning */}
      <div style={styles.previewRow}>
        <input
          type="text"
          value={textInput}
          onChange={handleTextInput}
          placeholder="hex, hsl, rgb, oklch..."
          style={styles.textInput}
          aria-label="Color value"
        />
        {!inGamut && (
          <span style={styles.gamutWarning} title="Color is outside sRGB gamut" aria-label="Outside sRGB gamut">P3</span>
        )}
      </div>

      {/* Sliders */}
      <div style={styles.slidersContainer}>
        <div style={styles.sliderRow}>
          <label style={styles.label}>L</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={lightness}
            onChange={handleLightness}
            style={styles.slider}
            aria-label="Lightness"
            aria-valuetext={`${(lightness * 100).toFixed(0)}%`}
          />
          <span style={styles.sliderValue} aria-hidden="true">{(lightness * 100).toFixed(0)}%</span>
        </div>

        <div style={styles.sliderRow}>
          <label style={styles.label}>C</label>
          <input
            type="range"
            min="0"
            max="0.4"
            step="0.002"
            value={chroma}
            onChange={handleChroma}
            style={styles.slider}
            aria-label="Chroma"
            aria-valuetext={chroma.toFixed(3)}
          />
          <span style={styles.sliderValue} aria-hidden="true">{chroma.toFixed(3)}</span>
        </div>

        <div style={styles.sliderRow}>
          <label style={styles.label}>H</label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={hue}
            onChange={handleHue}
            style={styles.slider}
            aria-label="Hue"
            aria-valuetext={`${hue.toFixed(0)} degrees`}
          />
          <span style={styles.sliderValue} aria-hidden="true">{hue.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  areaOuter: {
    cursor: 'crosshair',
    // vertical padding for thumb overflow, NO horizontal — container handles alignment
    padding: '4px 0',
  },
  areaInner: {
    position: 'relative',
  },
  areaCanvas: {
    width: '100%',
    height: AREA_H,
    borderRadius: 6,
    display: 'block',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  areaThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2.5px solid #fff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
  },
  hueOuter: {
    cursor: 'crosshair',
    padding: 0,
  },
  hueInner: {
    position: 'relative',
  },
  hueCanvas: {
    width: '100%',
    height: HUE_H,
    borderRadius: 4,
    display: 'block',
    border: '1px solid rgba(0,0,0,0.08)',
  },
  hueThumb: {
    position: 'absolute',
    top: '50%',
    width: 4,
    height: HUE_H + 4,
    borderRadius: 2,
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.25)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  gamutWarning: {
    fontSize: 9,
    fontWeight: 600,
    color: '#d97706',
    background: 'rgba(217,119,6,0.08)',
    padding: '1px 5px',
    borderRadius: 3,
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  slidersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    width: 12,
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: 600,
    flexShrink: 0,
    fontFamily: "inherit",
    letterSpacing: '0.3px',
  },
  slider: {
    flex: 1,
    height: 14,
  },
  sliderValue: {
    width: 38,
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'right',
    flexShrink: 0,
    fontFamily: "inherit",
    letterSpacing: '-0.2px',
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    padding: '5px 8px',
    fontSize: 11,
    fontFamily: "inherit",
    background: '#fff',
    border: '1px solid #e4e4e7',
    borderRadius: 5,
    color: '#1a1a1a',
    outline: 'none',
    letterSpacing: '-0.2px',
    transition: 'border-color 150ms ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
}
