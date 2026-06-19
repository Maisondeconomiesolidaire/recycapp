# Recyclerie

SAAS / CRM pour recyclerie : gestion des demandes d'**aérogommage**, de **collecte à
domicile** et des **réservations d'articles** de la boutique.

- **Boutique & formulaires publics** (light mode), intégrables en iframe.
- **CRM** (dark mode) : Kanban, calendrier, gestion des articles.
- Stack : **React (Vite + TS)** · **Convex** (base de données) · **Clerk** (auth CRM).

## Prérequis

- Node 18+
- Un compte [Convex](https://convex.dev) et un compte [Clerk](https://clerk.com) (offres
  gratuites suffisantes).

## Installation

```bash
npm install
```

## Configuration (à faire une fois)

### 1. Convex

```bash
npx convex dev
```

À la première exécution, la CLI vous connecte et crée un déploiement, puis remplit
automatiquement `CONVEX_DEPLOYMENT` et `VITE_CONVEX_URL` dans `.env.local`.
Laissez cette commande tourner pendant le développement (elle pousse le schéma et les
fonctions du dossier `convex/`).

### 2. Clerk

1. Créez une application sur le dashboard Clerk.
2. Copiez la **Publishable key** dans `.env.local` → `VITE_CLERK_PUBLISHABLE_KEY`.
3. Dans Clerk, créez un **JWT Template** nommé exactement `convex`
   (Configure → JWT Templates → New template → Convex).
4. Copiez l'**Issuer** (`https://xxx.clerk.accounts.dev`) affiché par le template, puis
   déclarez-le côté Convex :

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://votre-domaine.clerk.accounts.dev
```

`convex/auth.config.ts` lit cette variable pour valider les sessions Clerk.

## Lancement (2 terminaux)

```bash
npx convex dev     # backend Convex (laisser tourner)
npm run dev        # frontend Vite  → http://localhost:5173
```

## Routes

### Public (light mode)
| Route | Description |
| --- | --- |
| `/` | Page d'accueil |
| `/boutique` | Catalogue des articles |
| `/boutique/:id` | Détail + réservation d'un article |
| `/aerogommage` | Formulaire de demande d'aérogommage |
| `/collecte` | Formulaire de demande de collecte |
| `/velo` | Formulaire atelier vélo « Cycle en Bray » |
| `/merci` | Confirmation après envoi |

Les 4 types de demandes ont chacun leur couleur (charte Cycle en Bray) :
Aérogommage `#782170`, Collecte `#317fa0`, Boutique `#a0315a`, Cycle en Bray (vélo) `#196b24`.

Ajoutez `?embed=1` à un formulaire pour masquer l'en-tête/pied de page et l'intégrer en
iframe :

```html
<iframe src="https://votre-domaine/aerogommage?embed=1"
        style="width:100%;height:900px;border:0"></iframe>
```

### CRM (dark mode, connexion Clerk requise)
| Route | Description |
| --- | --- |
| `/crm` | Tableau de bord |
| `/crm/demandes` | Kanban (onglets Complètes / Incomplètes / Gagnées-Perdues) |
| `/crm/calendrier` | Calendrier des prestations planifiées |
| `/crm/articles` | Gestion des articles de la boutique |

## Build

```bash
npm run build
```
