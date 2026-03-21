# CssTuner - Product Spec

## Vision

**CssTuner** est un devtool overlay qui se branche sur n'importe quel projet utilisant des CSS variables pour son theming. Le dev installe, ouvre son app, et tweake ses couleurs/radius/fonts en live - directement sur ses vraies pages, pas sur des demos generiques.

**Positionnement :** "Vercel Toolbar for your design tokens."

Tous les outils existants (shadcn/themes, tweakcn, generateurs en ligne) sortent le dev de son contexte. CssTuner est le premier outil **integre directement dans l'app**, avec feedback immediat sur les vrais composants, les vraies pages.

---

## Cible

- Tout projet utilisant des CSS custom properties pour le theming
- Marche prioritaire : projets shadcn/ui (communaute massive, vars standardisees)
- Fonctionne aussi avec : Radix Themes, Park UI, Chakra v3, Open Props, tout design system CSS-var-based

---

## Distribution

### Strategie d'acquisition (entonnoir)

| Etape | Canal | Friction | But |
|-------|-------|----------|-----|
| Decouverte | **Extension Chrome** | Zero (un clic sur le Chrome Web Store) | "Essaye en 10 sec" |
| Adoption | **Plugin Vite/Next** | Une ligne dans la config | Integration au workflow |
| Power user | **Composant React** | npm install + modifier layout | Config custom via props |

L'extension Chrome est la porte d'entree principale. Le dev ne touche ni terminal, ni code, ni fichier. Il installe l'extension, ouvre son app en localhost, l'overlay apparait.

### Extension Chrome (canal principal)

- Installation depuis le Chrome Web Store, un clic
- L'overlay s'active automatiquement sur localhost
- Zero config, zero modification de code
- Bouton Save ecrit dans le projet via un companion local (voir section Save-to-file)

### Plugin Vite/Next (canal secondaire)

```js
// vite.config.ts
import csstuner from 'csstuner/vite'
export default { plugins: [csstuner()] }
```

Le plugin injecte l'overlay automatiquement en dev mode. Auto-desactive en prod.

### Composant React (power users)

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

Le composant s'auto-desactive en production (tree-shaked). Permet la config custom via props (vars, groupes, labels).

---

## Pricing

### Gratuit

- Lire et modifier les CSS variables en live
- Color picker OKLCH (sliders L/C/H + input multi-format)
- **Save-to-file** (ecrit directement dans le fichier CSS du projet)
- Persistance localStorage entre sessions
- Gamut awareness (indicateur sRGB)

### Pro (~5-9$/mois ou ~49$/an)

- **AI palette generation** - prompt bar ("SaaS fintech, serieux, bleu profond") qui genere une palette coherente avec respect WCAG. Cout serveur (API Claude/OpenAI) qui justifie l'abonnement.
- **Presets** - sauvegarder, comparer, switcher entre plusieurs themes
- **Export multi-format** - Tailwind v4, JSON tokens, Figma variables
- **V2 : tokenisation de composants** (voir section V2)

### Logique du split

Le gratuit est un outil complet et autonome : le dev tweake, sauvegarde, c'est dans son code. Le pro apporte de l'intelligence (AI) et de la productivite en plus. L'AI est le levier de conversion principal - c'est le "wow moment" (le dev tape un prompt, sa page change instantanement) et il a un cout reel qui justifie un abonnement.

---

## Roadmap

### V1 (MVP)

Composant React + companion local. Le dev installe, tweake, sauvegarde.

- Composant React (`<CssTuner />`)
- Lire et modifier les CSS vars en live
- Color picker OKLCH (sliders L/C/H + input multi-format + culori)
- Auto-detection framework (shadcn, Tailwind v4, Radix, Open Props)
- Shadow DOM isolation
- Save-to-file via companion (`npx csstuner`)
- Detection auto du fichier CSS cible
- Copy CSS (alternative au Save)
- Dark mode toggle (light/dark, deux sets independants)
- localStorage entre sessions

### V1.5

Canaux de distribution zero-friction.

- Extension Chrome (acquisition zero config via Chrome Web Store)
- Plugin Vite/Next (companion integre, une ligne dans la config)

### V2 (Pro)

Monetisation et features avancees.

- AI palette generation
- Presets (sauvegarder/comparer des themes)
- Export multi-format (Tailwind v4, JSON tokens, Figma variables)
- Tokenisation de composants

Pas de template. Pas de migration. Pas de tout-ou-rien. La valeur augmente avec l'usage.

---

## V1 - Overlay

### UX

- Bouton circulaire flottant en bas a gauche (style Vercel toolbar)
- Click → panneau slide depuis le cote
- Le panneau ne casse pas le layout de l'app hote (isolation CSS via Shadow DOM)
- Retractable, draggable

### Isolation CSS : Shadow DOM

L'overlay est rendu dans un Shadow DOM attache a un element custom (`<csstuner-root>`). C'est la solution definitive pour l'isolation :
- Les styles de l'app hote ne fuient pas dans l'overlay
- Les styles de l'overlay ne fuient pas dans l'app hote
- Fonctionne dans tous les contextes (extension Chrome, composant React, plugin Vite)
- C'est le pattern utilise par tous les devtools overlays serieux (Eruda, Vue DevTools, Plasmo)

`@scope` (CSS Cascading Level 6) n'est pas suffisant : il ne fournit pas d'encapsulation forte et les styles de l'app hote peuvent encore fuiter dans l'overlay.

### Fonctionnalites V1

#### Onglet Custom (gratuit)

##### Detection des CSS variables

Au lancement, lit les CSS vars existantes via `getComputedStyle(document.documentElement)`. Part de l'etat reel du projet (pas de valeurs par defaut imposees).

##### Auto-detection du framework

CssTuner detecte automatiquement le framework/design system utilise en analysant les noms des variables presentes :

| Framework | Pattern de detection | Groupement auto |
|-----------|---------------------|-----------------|
| **shadcn/ui** | `--primary`, `--background`, `--card`, `--sidebar-*`, `--chart-*`, `--radius` | Primary, Secondary, Destructive, Accent, Muted, Surfaces (Background/Card/Popover), Sidebar, Charts |
| **Tailwind v4** | `--color-*`, `--spacing-*`, `--radius-*`, `--font-*` (via `@theme`) | Par categorie Tailwind |
| **Radix Themes** | `--{color}-{1-12}` (echelle numerotee) | Par couleur, 12 niveaux |
| **Open Props** | `--size-*`, `--font-size-*`, `--radius-*`, `--shadow-*` | Par categorie |
| **Inconnu** | Toute var `--*` sur `:root` | Groupe "Other", label auto-genere |

Strategie :
1. Lire TOUTES les CSS custom properties depuis `:root`
2. Matcher les noms contre les patterns connus
3. Grouper et labelliser automatiquement (`--primary` → "Primary", `--sidebar-accent` → "Sidebar Accent")
4. Vars non reconnues → groupe "Other"
5. Config custom toujours possible via props pour les power users

##### Controles

- Un swatch par variable couleur, groupe logiquement selon le framework detecte
- Slider pour radius global (`--radius`)
- Selecteur de fonts (sans, heading, mono)
- Labels auto-generes a partir du nom de la variable
- Config optionnelle pour nommer/grouper ses vars custom (via composant React) :

```tsx
<CssTuner
  vars={{
    '--brand-orange': { label: 'Brand', group: 'Custom' },
    '--success': { label: 'Success', group: 'Feedback' },
  }}
/>
```

#### Dark Mode - Decisions

**Toggle light/dark dans le header du panel.**

Le panel affiche un toggle sun/moon qui switch le mode actif. Le dev edite un mode a la fois, sur sa vraie page.

**Detection automatique :**
- Check la presence de la class `.dark` sur `<html>` (convention shadcn/Tailwind)
- Fallback sur `prefers-color-scheme` media query
- Si aucune regle `.dark` trouvee dans les stylesheets → le toggle est masque

**Deux sets de valeurs independants :**
- Lecture des vars via iteration `document.styleSheets` → `cssRules`, en matchant `selectorText === ':root'` (light) et `selectorText === '.dark'` (dark)
- Chaque mode a son propre state en memoire
- Le toggle switch reellement la page (ajoute/retire `.dark` sur `<html>`) pour que le dev voie le resultat live

**Edition par mode :**
- Le dev edite les vars du mode actuellement affiche
- Les modifications sont appliquees en live via `setProperty` sur `:root` (inline override)
- Quand il switch de mode, les sliders/swatches se mettent a jour avec les valeurs de l'autre mode

**Save :**
- Le companion ecrit les deux blocs (`:root {}` et `.dark {}`) dans le fichier CSS
- Seules les vars modifiees sont ecrites, les autres restent intactes

**localStorage :**
- Persiste les deux sets separement (cle `csstuner:light` et `csstuner:dark`)

#### Onglet AI (Pro)
- Prompt bar : "SaaS fintech, serieux, bleu profond"
- Genere une palette coherente (color theory : complementary, analogous, triadic)
- Respect des regles WCAG (contraste)
- Resultat instantane sur la page

#### Color Picker - Decisions

> Benchmark : tweakcn (OKLCH interne), Shadcn Studio (OKLCH + multi-format), oklch.net (reference UX), Evil Martians oklch-picker.

**Format interne : OKLCH.**
C'est le standard adopte par shadcn/ui, Tailwind v4, et tous les editeurs modernes. Perceptuellement uniforme, wide gamut (P3, Rec2020), meilleur que HSL pour les modifications de couleur.

**Edition : 3 sliders L/C/H + champ texte multi-format.**
- Sliders Lightness, Chroma, Hue (comme oklch.net) - plus precis que la roue HSL classique pour le design tokens
- Champ texte en bas : accepte le **paste en n'importe quel format** (hex, hsl, rgb, oklch) → conversion automatique via culori
- Swatch de preview a cote de chaque slider group

**Gamut awareness.**
- Si la couleur depasse sRGB : indicateur visuel + preview du fallback sRGB
- Le browser clamp automatiquement, mais on informe le dev

**Multi-format input, OKLCH output.**
- Quelle que soit la source (projet en HSL, hex, rgb), l'edition se fait en OKLCH
- L'export respecte le format du projet (voir section Save-to-file)

#### Save-to-file (gratuit)

Le bouton "Save" dans l'overlay ecrit les valeurs modifiees directement dans le fichier CSS du projet. Le flow :

1. Le dev tweake ses couleurs/radius/fonts dans l'overlay
2. Il clique "Save"
3. L'overlay envoie les valeurs au companion local via HTTP/WebSocket
4. Le companion trouve le fichier CSS, remplace les valeurs dans `:root {}` et `.dark {}`
5. Le dev server (Vite/Next) detecte le changement et hot-reload

##### Detection automatique du fichier CSS cible

Le companion trouve le bon fichier sans configuration, par ordre de priorite :

1. **`components.json` (shadcn)** - contient le chemin exact : `"tailwind": { "css": "app/globals.css" }`
2. **Scan des fichiers CSS** - cherche dans `src/`, `app/`, `styles/` les fichiers `.css` contenant un bloc `:root { --... }`
3. **Scan des blocs `@theme`** (Tailwind v4) - meme logique pour les fichiers utilisant la directive `@theme`
4. **Fallback** - si plusieurs fichiers trouves, prendre celui avec le plus de variables. Si ambiguite, demander au dev via l'overlay.

Pas besoin d'argument CLI. Le companion detecte tout seul.

##### Companion local

Petit serveur Node.js qui fait le pont entre le browser et le filesystem.

Selon le canal de distribution :
- **Extension Chrome** : le dev lance `npx csstuner` une fois (le companion tourne en tache de fond)
- **Plugin Vite/Next** : le companion est integre au plugin, rien a lancer
- **Composant React** : le dev lance `npx csstuner` separement

##### Format de sauvegarde

Le companion respecte le format existant du projet :
- Si le projet utilise OKLCH → sauvegarde en OKLCH
- Si le projet utilise HSL → sauvegarde en HSL
- Si le projet utilise hex → sauvegarde en hex
- Detection automatique en lisant le format des valeurs existantes dans le fichier CSS

#### Export (gratuit)
- Bouton "Copy CSS" → genere le bloc `:root` + `.dark` pret a coller (alternative au Save pour ceux qui preferent)
- Persistance localStorage entre sessions

---

## V2 - Tokenisation de composants (Pro)

### Principe

Le dev peut tokeniser n'importe quel composant depuis l'overlay. Le script remplace les classes Tailwind hardcodees par des CSS variables. Le composant reste visuellement identique, mais des sliders apparaissent dans l'overlay.

### UX

Nouvel onglet "Components" dans l'overlay :

1. CssTuner scanne le dossier composants (defaut : `src/components/ui/`)
2. Pour chaque fichier, analyse les valeurs hardcodees tokenisables
3. Affiche la liste :

```
○ Button      - 12 valeurs tokenisables
○ Card        - 8 valeurs tokenisables
● Input       - deja tokenise ✓
○ Dialog      - 6 valeurs tokenisables
```

4. Le dev clique sur un composant → preview des changements proposes
5. Il confirme → le fichier source est modifie
6. Hot reload → sliders apparaissent dans l'overlay

Tout se passe dans l'overlay. Le dev ne quitte jamais son app.

### Fonctionnement du tokenize

Le mapping Tailwind → CSS var est deterministe :

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
- `cva()` avec variantes (chaque variante tokenisee separement)
- Composants shadcn vanilla, customises, ou entierement custom

### Communication browser ↔ filesystem

L'overlay tourne cote client mais doit modifier des fichiers source. Utilise le meme companion local que le Save-to-file.

- Le browser envoie "tokenise ce fichier" → le companion fait le remplacement
- Hot reload met a jour le composant
- Les nouvelles CSS vars sont detectees → sliders apparaissent

Meme pattern que les devtools Next.js, Storybook, ou Vercel toolbar.

---

## Architecture

### Structure du code

Le code est organise pour etre reutilisable entre tous les canaux de distribution (composant React, extension Chrome, plugin Vite). Chaque couche est independante :

```
src/
  core/             ← logique pure, zero dependance UI
    cssVarReader.ts     lecture des CSS vars via getComputedStyle
    cssVarWriter.ts     modification en live via setProperty
    frameworkDetector.ts detection shadcn/Tailwind/Radix/Open Props
    grouper.ts          groupement et labellisation des vars
    colorConverter.ts   conversions multi-format via culori
    storage.ts          persistance localStorage
    types.ts            types partages

  ui/               ← composants React de l'overlay (styles inlines)
    Panel.tsx           panneau principal
    Fab.tsx             bouton flottant
    ColorPicker.tsx     sliders L/C/H + input multi-format
    VarGroup.tsx        groupe de variables avec swatches
    SaveButton.tsx      bouton save + status

  mount/            ← points de montage (un par canal)
    react.tsx           V1 : composant <CssTuner /> exportable
    content.ts          V1.5 : content script pour extension Chrome

  companion/        ← serveur Node.js (entry point separee)
    server.ts           serveur HTTP
    cssFileDetector.ts  detection auto du fichier CSS cible
    cssFileWriter.ts    parse et reecriture du fichier CSS
    formatDetector.ts   detection du format existant (oklch/hsl/hex)
```

### Principes

- **`core/` et `ui/` sont partages** entre tous les canaux. Seul `mount/` change.
- **`core/` n'importe jamais React.** C'est de la logique pure, testable independamment.
- **`ui/` utilise des styles inlines ou injectes dans le Shadow DOM.** Pas de stylesheet externe (le Shadow DOM bloque les CSS externes par defaut).
- **`companion/` est un entry point tsup separe.** Il produit un binaire CLI (`npx csstuner`), independant du code client.

### Transition V1 → V1.5

La V1.5 (extension Chrome) ajoute `mount/content.ts` comme nouveau point de montage, sans toucher a `core/` ni `ui/`. Differences :

| | V1 (composant React) | V1.5 (extension Chrome) |
|---|---------------------|------------------------|
| Montage | `<CssTuner />` dans le layout du dev | Content script cree `<csstuner-root>` |
| React | Peer dependency (vient de l'app hote) | Bundle dans l'extension |
| Build | tsup ESM/CJS | WXT (framework extension cross-browser) |
| Companion | `npx csstuner` lance separement | `npx csstuner` lance separement |

Le passage est une nouvelle entry point + config build, pas une reecriture.

### Build

Deux entry points tsup :
- `src/index.ts` → package npm (ESM/CJS + types) - exporte `<CssTuner />` et les types
- `src/companion/server.ts` → binaire CLI (`npx csstuner`) - exporte rien, c'est un executable

---

## Faisabilite technique

### V1 - Facile

| Tache | Difficulte | Detail |
|-------|-----------|--------|
| Overlay UI (panneau, bouton fab) | Facile | Composants React, styles inlines dans Shadow DOM |
| Lire CSS vars existantes | Facile | `getComputedStyle(document.documentElement)` |
| Auto-detection framework | Facile | Pattern matching sur les noms de vars |
| Modifier CSS vars en live | Facile | `document.documentElement.style.setProperty()` |
| Persister en localStorage | Facile | JSON serialize/deserialize |
| Color picker OKLCH | Moyen | Sliders L/C/H custom + culori pour conversions multi-format |
| Shadow DOM isolation | Moyen | Creer container, attacher Shadow DOM, monter React dedans, styles inlines |
| Companion local (save-to-file) | Moyen | Serveur Node.js, parse/write CSS, detection auto du fichier cible |
| Detection fichier CSS cible | Moyen | Parse `components.json`, scan `:root` et `@theme` dans les fichiers CSS |
| Dark mode toggle | Facile | Toggle dans le header, lecture des deux sets via `cssRules`, switch class `.dark` sur `<html>` |

### V1.5

| Tache | Difficulte | Detail |
|-------|-----------|--------|
| Extension Chrome | Moyen | WXT + Manifest V3, content script qui monte le meme `ui/` dans Shadow DOM |
| Bundle React dans l'extension | Facile | Config WXT, React en dependance directe au lieu de peer |
| Plugin Vite/Next | Moyen | Injection de l'overlay + companion integre au dev server |

### V2

| Tache | Difficulte | Detail |
|-------|-----------|--------|
| Scanner dossier composants | Facile | Lire fichiers, matcher patterns Tailwind |
| Table de lookup Tailwind → valeurs | Facile | Mapping fini et documente |
| Remplacer classes dans le source | Moyen | Find & replace sur patterns connus dans strings |
| Gerer `cva()` variantes | Moyen | Parser les objets de variantes, remplacer par variante |
| Detection auto composants sur la page | Moyen | Scanner les imports ou le dossier composants |

### Pro - AI

| Tache | Difficulte | Detail |
|-------|-----------|--------|
| AI palette generation | Moyen | Prompt engineering + API call (Claude/OpenAI) |
| Backend auth/billing | Moyen | Stripe + verification licence dans l'extension |

Aucun point bloquant identifie.

---

## Stack technique

| Outil | Usage |
|-------|-------|
| TypeScript | Strict |
| React | UI de l'overlay (styles inlines dans Shadow DOM) |
| culori | Conversions couleur multi-format (hex/hsl/rgb ↔ oklch), gamut mapping |
| Shadow DOM | Isolation du panneau dans l'app hote |
| localStorage | Persistance des tweaks |
| tsup | Build package npm (ESM/CJS) + CLI companion |
| Node.js (companion) | Save-to-file, V2 tokenisation |
| WXT | V1.5 : framework extension Chrome (Manifest V3, HMR, cross-browser) |
| Claude API ou OpenAI | V2 Pro : AI palette generation |
| Stripe | V2 Pro : billing |

### Distribution

- **Package npm** : `csstuner` (composant React + CLI companion) - V1
- **Extension Chrome** : Chrome Web Store (via WXT) - V1.5
- **Plugin Vite/Next** : `csstuner/vite` - V1.5
- Zero config par defaut, config optionnelle via props

---

## Ce que CssTuner n'est PAS

- Pas un design system / starter kit
- Pas un fork de shadcn
- Pas un generateur de themes externe
- Pas un outil qui impose une structure

C'est un **instrument** : tu le branches, tu ajustes, tu sauvegardes. Il s'adapte a ton projet, pas l'inverse.
