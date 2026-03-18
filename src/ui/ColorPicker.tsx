import { useState, useCallback, useEffect, useRef } from 'react'
import { parseColor, formatOklch, isInSrgbGamut, formatAs, detectColorFormat, clampToSrgb } from '../core/colorConverter'
import { formatHex, converter } from 'culori'
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

  // --- Dessiner la zone L×C ---
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
        const rgb = toSrgb(clampToSrgb(color))
        const idx = (y * AREA_W + x) * 4
        data[idx] = Math.round((rgb?.r ?? 0) * 255)
        data[idx + 1] = Math.round((rgb?.g ?? 0) * 255)
        data[idx + 2] = Math.round((rgb?.b ?? 0) * 255)
        data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)

    // Crosshair
    const cx = (chroma / MAX_C) * (AREA_W - 1)
    const cy = (1 - lightness) * (AREA_H - 1)
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI)
    ctx.strokeStyle = lightness > 0.5 ? '#000' : '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }, [hue, lightness, chroma])

  // --- Dessiner la barre de hue ---
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

    // Indicator
    const hx = (hue / 360) * (AREA_W - 1)
    ctx.beginPath()
    ctx.rect(hx - 2, 0, 4, HUE_H)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }, [hue])

  // --- Interactions souris zone L×C ---
  const pickFromArea = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = areaCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(AREA_W - 1, e.clientX - rect.left))
    const y = Math.max(0, Math.min(AREA_H - 1, e.clientY - rect.top))
    const newC = (x / (AREA_W - 1)) * MAX_C
    const newL = 1 - y / (AREA_H - 1)
    setLightness(newL)
    setChroma(newC)
    emitChange(newL, newC, hue)
  }, [hue, emitChange])

  const onAreaDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    draggingArea.current = true
    pickFromArea(e)
  }, [pickFromArea])

  // --- Interactions souris barre hue ---
  const pickFromHue = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = hueCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(AREA_W - 1, e.clientX - rect.left))
    const newH = (x / (AREA_W - 1)) * 360
    setHue(newH)
    emitChange(lightness, chroma, newH)
  }, [lightness, chroma, emitChange])

  const onHueDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const previewColor = formatOklch({ mode: 'oklch', l: lightness, c: chroma, h: hue })

  return (
    <div style={styles.container}>
      {/* 2D color area: lightness (Y) × chroma (X) */}
      <canvas
        ref={areaCanvasRef}
        width={AREA_W}
        height={AREA_H}
        style={styles.areaCanvas}
        onMouseDown={onAreaDown}
      />

      {/* Hue strip */}
      <canvas
        ref={hueCanvasRef}
        width={AREA_W}
        height={HUE_H}
        style={styles.hueCanvas}
        onMouseDown={onHueDown}
      />

      {/* Swatch + gamut warning */}
      <div style={styles.previewRow}>
        <div style={{ ...styles.swatch, backgroundColor: previewColor }} />
        {!inGamut && <span style={styles.gamutWarning}>hors sRGB</span>}
      </div>

      {/* Slider L */}
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
        />
        <span style={styles.sliderValue}>{(lightness * 100).toFixed(0)}%</span>
      </div>

      {/* Slider C */}
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
        />
        <span style={styles.sliderValue}>{chroma.toFixed(3)}</span>
      </div>

      {/* Slider H */}
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
        />
        <span style={styles.sliderValue}>{hue.toFixed(0)}</span>
      </div>

      {/* Input texte multi-format */}
      <input
        type="text"
        value={textInput}
        onChange={handleTextInput}
        placeholder="hex, hsl, rgb, oklch..."
        style={styles.textInput}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  areaCanvas: {
    width: AREA_W,
    height: AREA_H,
    borderRadius: 4,
    cursor: 'crosshair',
    display: 'block',
  },
  hueCanvas: {
    width: AREA_W,
    height: HUE_H,
    borderRadius: 3,
    cursor: 'crosshair',
    display: 'block',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: '1px solid #3f3f46',
    flexShrink: 0,
  },
  gamutWarning: {
    fontSize: 11,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 14,
    fontSize: 11,
    color: '#a1a1aa',
    fontWeight: 600,
    flexShrink: 0,
  },
  slider: {
    flex: 1,
    height: 4,
    appearance: 'none' as React.CSSProperties['appearance'],
    background: '#27272a',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  sliderValue: {
    width: 42,
    fontSize: 11,
    color: '#a1a1aa',
    textAlign: 'right',
    flexShrink: 0,
  },
  textInput: {
    width: '100%',
    padding: '4px 8px',
    fontSize: 12,
    fontFamily: 'monospace',
    background: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: 4,
    color: '#fafafa',
    outline: 'none',
  },
}
