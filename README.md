<p align="center">
  <img src="https://raw.githubusercontent.com/VianneyBertrand/csstuner/main/assets/logo.svg" alt="CssTuner" width="400" />
</p>

Devtool overlay to tune CSS design tokens live on your real pages.

## Install

```bash
npm install csstuner
```

## Usage

```tsx
import { CssTuner } from 'csstuner'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CssTuner />
      </body>
    </html>
  )
}
```

Auto-removes itself in production.

## Features

- **OKLCH color picker** — perceptually uniform sliders (L/C/H) + paste any format (hex, hsl, rgb, oklch)
- **Dark mode toggle** — edit light and dark tokens independently
- **Inspect mode** — click any element to see which tokens affect it
- **Save to file** — writes changes back to your CSS file via companion
- **AI palette** — describe a style ("fintech, deep blue, serious") and get a coherent palette
- **Gamut awareness** — sRGB indicator for wide-gamut colors

## Framework support

Works with any CSS custom properties on `:root`. Auto-detects and groups variables for:

- shadcn/ui
- Tailwind v4
- Radix Themes
- Open Props
- Any custom CSS variables

## Props

```tsx
<CssTuner
  vars={{
    '--brand-orange': { label: 'Brand', group: 'Custom' },
    '--success': { label: 'Success', group: 'Feedback' },
  }}
  position="bottom-left"   // 'bottom-left' | 'bottom-right'
  persist={true}            // save tweaks to localStorage
  companionUrl="http://localhost:7801"
  aiEndpoint="https://your-endpoint.com/api/ai"
/>
```

All props are optional. Zero config by default.

## Save to file

Run the companion server to write changes back to your CSS:

```bash
npx csstuner
```

It auto-detects your CSS file (`components.json`, `:root {}` blocks, `@theme` directives). No config needed.

## AI palette

The AI prompt bar generates palettes from natural language descriptions. It respects your existing variable names and applies changes live.

Works in inspect mode too — select an element first, then prompt to restyle only that element's tokens.

## License

MIT
