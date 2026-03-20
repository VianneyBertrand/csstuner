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
- Le panneau est un sidebar fixe à gauche, pleine hauteur
- Les noms de groupes viennent de `core/grouper.ts` (sentence case, pas d'uppercase CSS)

## Spec complète

Voir `docs/spec.md` pour la vision produit, roadmap (V1/V1.5/V2), pricing, et architecture détaillée.
