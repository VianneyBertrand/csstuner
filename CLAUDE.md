# CssTuner

Devtool overlay pour tweaker les CSS design tokens en live. Se branche sur n'importe quel projet CSS-var-based (shadcn, Tailwind v4, Radix, etc.).

## Quick start

```bash
npm run dev:demo   # lance la demo Vite (localhost:5173+)
npm run build      # build la lib avec tsup
npm run lint       # type-check TypeScript
```

## Architecture

```
src/
  core/          # logique pure, zero React — lecture/ecriture CSS vars, detection framework, conversions couleur (culori)
  ui/            # composants React — Panel, Fab, ColorPicker, VarGroup, SaveButton
  mount/         # points de montage — react.tsx (<CssTuner /> exportable)
  companion/     # serveur Node.js CLI (npx csstuner) — save-to-file
```

- `core/` n'importe jamais React. Testable independamment.
- `ui/` utilise des **styles inlines** (pas de CSS externe — Shadow DOM).
- Deux entry points tsup : `src/index.ts` (package npm) et `src/companion/server.ts` (CLI).

## Stack

- TypeScript strict, React 19, culori (conversions couleur OKLCH)
- Shadow DOM pour l'isolation CSS
- tsup (build), Vite (demo dev)
- Format interne : OKLCH

## Conventions

- Styles inlines via objets `Record<string, React.CSSProperties>` en bas de chaque composant UI
- Le color picker utilise des thumbs DOM (pas dessinés sur le canvas) pour éviter le clipping
- Le panneau est un sidebar fixe à gauche, pleine hauteur, thème light neutre (#f5f5f6)
- Les noms de groupes viennent de `core/grouper.ts` (uppercase via CSS, noms en sentence case)
- Font : Geist Mono (chargée via Google Fonts dans le Shadow DOM)

## UI Patterns

### Scrollbar custom overlay
La scrollbar native est masquée (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`). Un div positionné en absolu (`scrollThumb` dans Panel.tsx) simule un thumb de scrollbar :
- Position et hauteur calculées depuis `scrollTop` / `scrollHeight` / `clientHeight`
- Visible uniquement pendant le scroll (state `scrollVisible`, timeout 800ms)
- Ne réserve aucun espace — se superpose au contenu (z-index + pointer-events: none)
- 4px de large, arrondi, `rgba(0,0,0,0.15)`

### Color picker thumbs
Les thumbs (zone LC et hue) sont des divs positionnés en absolu par-dessus le canvas, pas dessinés sur le canvas. Pattern : `areaOuter` (padding vertical pour le débordement) > `areaInner` (position: relative) > canvas + thumb. Le thumb peut déborder du canvas dans le padding de `areaOuter`.

### Conteneur actif (swatch + picker)
Quand un swatch est sélectionné, le `varItem` prend un fond blanc qui s'étend bord à bord du panel. Le padding horizontal est sur chaque `varItem` individuellement (pas sur le parent), ce qui évite les margin négatifs pour le full-bleed.

## Spec complète

Voir `docs/spec.md` pour la vision produit, roadmap (V1/V1.5/V2), pricing, et architecture détaillée.
