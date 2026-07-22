# Design System — Ma Parcelle

Tokens extraits du design de référence Claude Design (`Parcelles.dc.html` /
`Accueil.dc.html`) et de `design-system-assur-immo.md`. Thème métier : **vente
de parcelles au Bénin** — confiance, clarté du parcours, ancrage local (terre /
latérite). Implémenté avec **Next.js 16 (App Router) + Tailwind v4 + shadcn/ui**.

Les tokens vivent dans [`src/app/globals.css`](src/app/globals.css) : `:root`
(mode clair) et `.dark` (mode sombre, via `next-themes` `attribute="class"`).
Les alias sémantiques shadcn (`--background`, `--primary`, `--card`…) pointent
sur ces tokens, et `@theme inline` les expose en utilitaires Tailwind
(`bg-surface`, `text-text-2`, `text-gold`, `font-display`…).

## 1. Palette

### Mode clair (`:root`)

| Rôle | Token | Hex / valeur |
|---|---|---|
| Fond principal (Sable) | `--bg` | `#F4ECE1` |
| Surface / carte (Blanc cassé) | `--surface` | `#FFFDF9` |
| Surface secondaire | `--surface-2` | `#EFE5D6` |
| Texte principal (Anthracite) | `--text` | `#22201D` |
| Texte secondaire | `--text-2` | `#5A554C` |
| Primaire (Terre Latérite) | `--primary` | `#B1502F` |
| Secondaire (Vert Savane) | `--secondary` | `#2F5233` |
| Accent (Or Cadastral) | `--gold` | `#C9962C` |
| Alerte (Rouge Argile) | `--alert` | `#9C3B2E` |
| Admin (Bleu Nuit Cotonou) | `--navy` | `#1B3A4B` |
| Sur primaire | `--on-primary` | `#FFFDF9` |
| Bordures | `--border` | `rgba(34,32,29,0.12)` |
| Fond hero / blocs sombres | `--hero-bg` | `#211D18` |

### Mode sombre (`.dark`)

| Rôle | Token | Hex / valeur |
|---|---|---|
| Fond principal (Anthracite profond) | `--bg` | `#1A1815` |
| Surface / carte | `--surface` | `#242019` |
| Surface secondaire | `--surface-2` | `#2C271F` |
| Texte principal (Sable) | `--text` | `#F4ECE1` |
| Texte secondaire | `--text-2` | `#B8B0A2` |
| Primaire (Terre Latérite éclaircie) | `--primary` | `#D97A54` |
| Secondaire (Vert Savane éclairci) | `--secondary` | `#5C8A5F` |
| Accent (Or Cadastral, inchangé) | `--gold` | `#C9962C` |
| Alerte (éclaircie) | `--alert` | `#C4584A` |
| Sur primaire | `--on-primary` | `#1A1815` |
| Bordures | `--border` | `rgba(244,236,225,0.12)` |
| Fond hero / blocs sombres | `--hero-bg` | `#141210` |

Règles d'usage : **max 1 accent doré par écran** (preuves de confiance :
badge « titre vérifié », certificat). Les couleurs de marque gardent leur teinte
dans les deux thèmes ; seules surfaces et texte basculent. Contraste AA validé.

## 2. Typographie

| Rôle | Police | Poids | Usage |
|---|---|---|---|
| Display | **Outfit** (`--font-outfit`) | 400/500/600/700 | H1–H3, titres |
| Texte courant | **Inter** (`--font-inter`) | 400/500/600 | UI, paragraphes, boutons |
| Données / codes | **IBM Plex Mono** (`--font-plex-mono`) | 400/500 | Références parcelle, coordonnées GPS, montants |

> Le design de référence prévoyait *Fraunces* en display ; le fichier `.dc.html`
> livré utilise **Outfit** (chargé via Google Fonts). On suit le fichier réel,
> chargé par `next/font/google` dans [`src/app/layout.tsx`](src/app/layout.tsx).

Échelle (base 16px, ratio ~1.25) : H1 48/56 · H2 36/44 · H3 28/36 · H4 22/30 ·
Body L 18/28 · Body 16/26 · Small 14/20 · Caption/Mono 12–13/16. Les titres de
hero/section utilisent `clamp()` pour la fluidité.

## 3. Grille & espacements

- Base **4px** : `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.
- Conteneurs : 1200px (accueil) / 1280px (header, catalogue), marges latérales
  `clamp(16–20px, 4–5vw, 64–80px)`.
- Breakpoints design : 480 / 768 / 1024 / 1440 (gérés par Tailwind, pas de
  mesure `window`).
- Grille parcelles : 1 col (mobile) → 2 col (desktop) pour la vue Grille.

## 4. Rayons & élévation

| Élément | Rayon |
|---|---|
| Cartes (parcelle, feature) | 16px (`rounded-2xl`) |
| Grandes cartes / hero plan | 18px (`rounded-3xl` ~) |
| Boutons | 10px (`--radius`, `rounded-lg`) |
| Champs / filtres | 8px |
| Badges de statut | 999px (pilule) |

Ombres (tokens `--shadow` / `--shadow-hover`) :
- Repos : `0 2px 8px rgba(27,42,56,0.08)` (clair) / `0 2px 8px rgba(0,0,0,0.4)` (sombre)
- Survol / modale : `0 8px 24px rgba(27,42,56,0.14)` (clair) / `…rgba(0,0,0,0.5)` (sombre)

## 5. Élément signature — le « Repère cadastral »

Pastille façon borne d'arpentage + code en IBM Plex Mono (`B-01`, `AC-0142`…).
Composant [`CadastralBadge`](src/components/shared/cadastral-badge.tsx). Réutilisé
dans le stepper « Comment ça marche », les références de carte parcelle, les pins
du plan cadastral et les identifiants de dossier. Vocabulaire visuel de bornage.

## 6. Composants identifiés

- **Boutons** : primaire (Terre Latérite), secondaire (Vert Savane), ghost/outline, désactivé.
- **Cartes parcelle** : image, badge statut, ref, tags (superficie/paiement/vérifié), prix, CTA.
- **Badges de statut** : Disponible (vert) · Réservé (or) · Vendu (rouge) · Titre vérifié (or).
- **Filtres** : selects ville / statut / paiement + réinitialiser.
- **Plan cadastral SVG** : polygones par statut, pins, popup, légende, nord.
- **Stepper** : 4 repères cadastraux animés au survol.
- **Barre de recherche héro** : ville / superficie / budget + comptant/échelonné.
- **Sidebar de réservation** : prix, toggle paiement, flux réserver → formulaire → confirmation.
- **Header / Footer** : logo borne, nav, `ModeToggle` (clair/sombre/système), footer riche + mini.

## 7. Pages / vues répliquées

| Route | Source | Contenu |
|---|---|---|
| `/` | `Accueil.dc.html` | Hero + recherche, chiffres clés, process, parcelles à la une, atouts, témoignages, CTA, footer riche |
| `/parcelles` | `Parcelles.dc.html` (vue browse) | Filtres + bascule **Grille ⇄ Carte** (grille 2 col / plan cadastral interactif) |
| `/parcelles/[ref]` | `Parcelles.dc.html` (vue détail) | Galerie, plan cadastral, caractéristiques, documents, sidebar réservation |

## 8. Accessibilité & responsive

- Contraste texte/fond AA (Anthracite sur Sable, etc.).
- Focus clavier visible : `outline: 2px solid var(--primary)` sur tout élément interactif.
- Mobile-first ; menu mobile + bascule de vues sur petits écrans.
- `prefers-reduced-motion` respecté (animations de reveal / stepper désactivées).
