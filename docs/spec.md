# CssTuner — Product Spec

## Vision

**CssTuner** est un devtool overlay qui se branche sur n'importe quel projet utilisant des CSS variables pour son theming. Le dev installe, ouvre son app, et tweake ses couleurs/radius/fonts en live — directement sur ses vraies pages, pas sur des démos génériques.

**Positionnement :** "Vercel Toolbar for your design tokens."

Tous les outils existants (shadcn/themes, tweakcn, générateurs en ligne) sortent le dev de son contexte. CssTuner est le premier outil **intégré directement dans l'app**, avec feedback immédiat sur les vrais composants, les vraies pages.

---

## Cible

- Tout projet utilisant des CSS custom properties pour le theming
- Marché prioritaire : projets shadcn/ui (communauté massive, vars standardisées)
- Fonctionne aussi avec : Radix Themes, Park UI, Chakra v3, Open Props, tout design system CSS-var-based

---

## Modèle progressif

```
npm install csstuner → overlay avec couleurs, radius, fonts (0 friction)
         ↓
   Le dev veut plus de contrôle sur un composant ?
         ↓
   Il le tokenise depuis l'overlay → sliders ajoutés
         ↓
   Il répète sur les composants qu'il veut
```

Pas de template. Pas de migration. Pas de tout-ou-rien. La valeur augmente avec l'usage.

---

## V1 — Overlay

### Installation

```bash
npm install csstuner
```

```tsx
// layout.tsx
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

Le composant s'auto-désactive en production (tree-shaked).

### UX

- Bouton circulaire flottant en bas à gauche (style Vercel toolbar)
- Click → panneau slide depuis le côté
- Le panneau ne casse pas le layout de l'app hôte (isolation CSS)
- Rétractable, draggable

### Fonctionnalités V1

#### Onglet AI
- Prompt bar : "SaaS fintech, sérieux, bleu profond"
- Génère une palette cohérente (color theory : complementary, analogous, triadic)
- Respect des règles WCAG (contraste)
- Résultat instantané sur la page

#### Onglet Custom
- Au lancement, lit les CSS vars existantes via `getComputedStyle(document.documentElement)`
- Part de l'état réel du projet (pas de valeurs par défaut imposées)
- Un swatch par variable couleur, groupé logiquement :
  - Primary, Secondary, Destructive, Accent, Muted
  - Surfaces (Background, Card, Popover)
  - Sidebar
  - Charts
  - Custom vars détectées automatiquement
- Slider pour radius global (`--radius`)
- Sélecteur de fonts (sans, heading, mono)
- Labels auto-générés (`--primary` → "Primary", `--sidebar-accent` → "Sidebar Accent")
- Config optionnelle pour nommer/grouper ses vars custom :

```tsx
<CssTuner
  vars={{
    '--brand-orange': { label: 'Brand', group: 'Custom' },
    '--success': { label: 'Success', group: 'Feedback' },
  }}
/>
```

#### Export
- Bouton "Copy CSS" → génère le bloc `:root` + `.dark` prêt à coller
- Persistance localStorage entre sessions (opt-in)

---

## V2 — Tokenisation de composants

### Principe

Le dev peut tokeniser n'importe quel composant depuis l'overlay. Le script remplace les classes Tailwind hardcodées par des CSS variables. Le composant reste visuellement identique, mais des sliders apparaissent dans l'overlay.

### UX

Nouvel onglet "Components" dans l'overlay :

1. CssTuner scanne le dossier composants (défaut : `src/components/ui/`)
2. Pour chaque fichier, analyse les valeurs hardcodées tokenisables
3. Affiche la liste :

```
○ Button      — 12 valeurs tokenisables
○ Card        — 8 valeurs tokenisables
● Input       — déjà tokenisé ✓
○ Dialog      — 6 valeurs tokenisables
```

4. Le dev clique sur un composant → preview des changements proposés
5. Il confirme → le fichier source est modifié
6. Hot reload → sliders apparaissent dans l'overlay

Tout se passe dans l'overlay. Le dev ne quitte jamais son app.

### Fonctionnement du tokenize

Le mapping Tailwind → CSS var est déterministe :

```
rounded-lg  →  --button-radius: 0.5rem      →  rounded-[var(--button-radius)]
h-9         →  --button-height: 2.25rem     →  h-[var(--button-height)]
px-4        →  --button-px: 1rem            →  px-[var(--button-px)]
text-sm     →  --button-font-size: 0.875rem →  text-[length:var(--button-font-size)]
gap-2       →  --button-gap: 0.5rem         →  gap-[var(--button-gap)]
```

Fonctionne avec :
- Classes simples dans `className="..."`
- `cn()` calls
- `cva()` avec variantes (chaque variante tokenisée séparément)
- Composants shadcn vanilla, customisés, ou entièrement custom

### Communication browser ↔ filesystem

L'overlay tourne côté client mais doit modifier des fichiers source. Solution : un pont serveur local.

- API route Next.js ou WebSocket intégré au dev server
- Le browser envoie "tokenise ce fichier" → le serveur fait le remplacement
- Hot reload met à jour le composant
- Les nouvelles CSS vars sont détectées → sliders apparaissent

Même pattern que les devtools Next.js, Storybook, ou Vercel toolbar.

---

## Faisabilité technique

### V1 — Facile

| Tâche | Difficulté | Détail |
|-------|-----------|--------|
| Overlay UI (panneau, bouton fab) | Facile | Composant React isolé, shadow DOM ou namespace CSS |
| Lire CSS vars existantes | Facile | `getComputedStyle(document.documentElement)` |
| Modifier CSS vars en live | Facile | `document.documentElement.style.setProperty()` |
| Persister en localStorage | Facile | JSON serialize/deserialize |
| Export CSS | Facile | String template |
| Color picker OKLCH | Moyen | Lib existante (react-colorful) + conversion |
| Isolation CSS du panneau | Moyen | Shadow DOM ou scope strict `--cst-*` |
| AI palette generation | Moyen | Prompt engineering + API call (Claude/OpenAI) |

### V2 — Moyen

| Tâche | Difficulté | Détail |
|-------|-----------|--------|
| Scanner dossier composants | Facile | Lire fichiers, matcher patterns Tailwind |
| Table de lookup Tailwind → valeurs | Facile | Mapping fini et documenté |
| Remplacer classes dans le source | Moyen | Find & replace sur patterns connus dans strings |
| Gérer `cva()` variantes | Moyen | Parser les objets de variantes, remplacer par variante |
| Pont browser ↔ serveur local | Moyen | API route ou WebSocket, pattern standard |
| Détection auto composants sur la page | Moyen | Scanner les imports ou le dossier composants |

Aucun point bloquant identifié.

---

## Stack technique

| Outil | Usage |
|-------|-------|
| React | Composant overlay |
| TypeScript | Strict |
| react-colorful | Color picker |
| culori | Conversions OKLCH |
| Shadow DOM ou CSS scoping | Isolation du panneau |
| localStorage | Persistance des tweaks |
| Node.js (API route) | V2 : modification fichiers source |
| Claude API ou OpenAI | AI palette generation |

### Distribution

- Package npm : `csstuner`
- CLI : `npx csstuner init` (ajoute `<CssTuner />` au layout)
- Zero config par défaut, config optionnelle via props

---

## Ce que CssTuner n'est PAS

- Pas un design system / starter kit
- Pas un fork de shadcn
- Pas un générateur de thèmes externe
- Pas un outil qui impose une structure

C'est un **instrument** : tu le branches, tu ajustes, tu exportes. Il s'adapte à ton projet, pas l'inverse.
