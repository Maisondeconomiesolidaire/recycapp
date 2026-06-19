# Recyclerie — Notes de développement

SAAS / CRM pour la recyclerie **Cycle en Bray**. Ce document récapitule en détail
tout ce qui a été construit, l'architecture, le modèle de données, les fonctions
backend, les écrans, les décisions prises et ce qui reste à faire.

> Application : front **React (Vite + TypeScript)**, base de données + backend
> **Convex**, authentification **Clerk** (CRM uniquement). Police **Geist Sans**.
> Boutique et formulaires publics en **light mode**, CRM en **dark mode**.

---

## 1. Vue d'ensemble

L'application couvre **4 types de demandes** :

| Type | Clé interne | Couleur charte | Formulaire public |
| --- | --- | --- | --- |
| Aérogommage | `aerogommage` | `#782170` | `/aerogommage` |
| Collecte à domicile | `collecte` | `#317fa0` | `/collecte` |
| Boutique (réservation article) | `article` | `#a0315a` | `/boutique/:id` |
| Cycle en Bray (atelier vélo) | `velo` | `#196b24` | `/velo` |

- **Couleur primaire de l'app** : orange `#ff7700`.
- Chaque type a sa **couleur officielle** utilisée partout (badges, cartes Kanban,
  filtres, calendrier, graphiques).

Trois espaces :
1. **Boutique publique** (light) — catalogue + réservation simple, sans paiement.
2. **Formulaires publics** (light) — un par type, **intégrables en iframe** via `?embed=1`.
3. **CRM** (dark, protégé Clerk) — Kanban, calendrier, clients, articles, équipe.

---

## 2. Stack & dépendances

- `vite`, `react` 19, `react-dom`, `typescript`, `@vitejs/plugin-react`
- `tailwindcss` v4 + `@tailwindcss/vite` (dark mode par classe, scopé au CRM)
- `react-router-dom` v7
- `convex` (DB, fonctions serveur, stockage fichiers)
- `@clerk/clerk-react` + `@clerk/localizations` (frFR) + `convex/react-clerk`
- `react-hook-form` + `zod` + `@hookform/resolvers`
- `date-fns` (calendrier, formats FR)
- `lucide-react` (icônes)
- `geist` (police, fichier copié dans `public/fonts/Geist-Variable.woff2`)
- `clsx` (helper `cn`)
- `@types/node` (dev — requis par le typecheck Convex de `auth.config.ts`)

> `@dnd-kit/*` est encore installé mais **plus utilisé** (le drag & drop du Kanban
> a été retiré au profit d'un avancement par cases à cocher du process).

---

## 3. Arborescence

```
recycapp/
  index.html, vite.config.ts, tsconfig*.json, package.json
  .env.local            # CONVEX_DEPLOYMENT, VITE_CONVEX_URL, VITE_CLERK_PUBLISHABLE_KEY
  public/
    leaf.svg
    fonts/Geist-Variable.woff2
  convex/
    schema.ts           # tables articles, requests, teamMembers
    auth.config.ts      # provider Clerk (CLERK_JWT_ISSUER_DOMAIN)
    lib.ts              # requireStaff + calculs de complétude
    processes.ts        # définition des process par type + sous-type collecte
    files.ts            # generateUploadUrl (upload photos)
    requests.ts         # envois publics + lecture/MAJ CRM des demandes
    articles.ts         # CRUD articles + listes publiques
    team.ts             # CRUD salariés
    clients.ts          # agrégat clients + fiche client
    dashboard.ts        # statistiques du tableau de bord
    _generated/         # types Convex (régénérés par `npx convex dev`)
  src/
    main.tsx            # Providers (Clerk > Convex > Router) + écran MissingConfig
    App.tsx             # routes publiques + CRM
    index.css           # Tailwind, @font-face Geist, tokens couleurs, animations
    lib/
      constants.ts      # types, libellés, couleurs, options de formulaires, helpers
      format.ts         # formatPrice, formatDate, formatRelative, initials
      cn.ts             # clsx wrapper
      address.ts        # recherche d'adresses (Base Adresse Nationale)
      useUpload.ts      # hook d'upload fichier -> storageId Convex
    components/
      MissingConfig.tsx
      ui/               # Button, Field (Input/Select/Textarea/Checkbox), Badge,
                        #   Spinner, EmptyState, Modal, Drawer, PhotoUpload,
                        #   Lightbox, AddressAutocomplete
      public/           # PublicLayout, FormShell, CustomerFields
      crm/              # CrmLayout, PageHeader, TypeBadge, KanbanColumn,
                        #   RequestCard, RequestDrawer, ArticleForm
    pages/
      public/  Landing, Boutique, ArticleDetail, AerogommageForm, CollecteForm,
               VeloForm, Merci
      crm/     Dashboard, Demandes, Calendrier, Clients, Articles, Equipe
```

---

## 4. Modèle de données (Convex — `convex/schema.ts`)

### Table `articles`
- `title`, `description`, `price` (number), `category`, `subcategory?`,
  `condition`, `images` (array `_storage`), `status` (`disponible | reserve | vendu`),
  `createdAt`.
- Index `by_status`.

### Table `requests`
Champs communs :
- `type` : `aerogommage | collecte | article | velo`
- `stage` : `nouveau | validation | planifie` (conservé mais la colonne Kanban est
  désormais **déduite du process**, pas de ce champ)
- `outcome` : `open | gagnee | perdue`
- `complete` : booléen, calculé au moment de l'envoi
- `processSteps` : `string[]` — la liste ordonnée des étapes résolue selon le type
- `completedSteps` : number — nombre d'étapes cochées
- `processLog?` : `{ step, by, at }[]` — qui a coché quelle étape et quand
- `collecteType?` : `indefini | C1 | C2 | C3`
- **Gestion** : `site?` (`60 | 76`), `assignedTo?` (id `teamMembers`),
  `estimatedHours?`, `actualHours?`, `quoteAmount?`, `quoteDetails?`
- `scheduledDate?` (timestamp, calendrier)
- `customer` : `{ firstName, lastName, email, phone, address?, postalCode?, city? }`
  (l'adresse ici = **facturation**)
- `comment?`, `photos` (array `_storage`)
- `createdAt`, `updatedAt`
- Index `by_type`, `by_outcome`, `by_scheduledDate`.

Détails spécifiques :
- `aerogommage?` : **tableau** d'objets `aerogommageItem` :
  `{ objectType?, label? (précision « Autre »), height?, width?, depth?, quantity?,
  woodType?, stripping?, coating?, coatingOther?, delivery?, retrieval?, comment?,
  photos? (array _storage, rattachées à l'objet) }`
- `collecte?` :
  `{ dismountable?, reusableGoodCondition?, sorted?, noWaste?,
  grosObjets? (string[]), grosObjetsAutre?, petitsObjets? (string[]),
  petitsObjetsAutre?, housingType?, floors?, dedicatedParking?,
  parkingDistance?, parkingUnknown?, collectAddress? {address,postalCode,city},
  + champs hérités parkingNearby?, largeItems?, furniture?, smallItems? }`
- `article?` : `{ articleId, articleTitle }`
- `velo?` : `{ bikeType?, service?, brand?, condition?, description? }`

### Table `teamMembers`
- `{ name, role?, email?, active (bool), createdAt }`

---

## 5. Process (suivi par étapes) — `convex/processes.ts`

Liste maître des étapes : Contact pris → Devis édité → Devis signé →
Prestation planifiée → Prestation terminée → Facture éditée → Facture réglée.

Par type :
- **Aérogommage** : les 7 étapes.
- **Vélo** : les 7 étapes (placeholder — à redéfinir plus tard).
- **Boutique (article)** : Contact pris → Facture réglée.
- **Collecte** : dépend du sous-type, choisi dans le CRM ; par défaut « Collecte à
  définir » (process vide tant que non choisi) :
  - **C1** : Contact pris → Prestation planifiée → Prestation terminée.
  - **C2 / C3** : les 7 étapes.

Règles d'avancement (mutations `advanceProcess` / `retreatProcess`) :
- On ne peut cocher que **l'étape suivante** (pas de saut) et décocher que **la
  dernière** cochée.
- Cocher la **dernière** étape passe la demande automatiquement en **Gagnée** ;
  la décocher la **rouvre**.
- Chaque coche enregistre dans `processLog` **qui** (nom de l'utilisateur Clerk
  transmis par le front) et **quand**.

Colonne Kanban **déduite** du process (`deriveStage`) :
- 0 étape cochée → **Nouveau**
- « Prestation planifiée » cochée → **Prestation planifiée**
- sinon → **Validation client**

---

## 6. Fonctions Convex

### `requests.ts`
Publiques (sans auth) :
- `submitAerogommage({ customer, comment?, photos, items[] })` — `site` par défaut `60`.
- `submitCollecte({ customer, comment?, photos, details })` — arrive en
  `collecteType: "indefini"`.
- `submitVelo({ customer, comment?, photos, details })`.
- `submitArticleReservation({ customer, comment?, articleId })` — passe l'article
  en `reserve`.

CRM (protégées `requireStaff`) :
- `list({ type? })`, `get({ id })` (résout URLs des photos demande **et** par objet
  aérogommage via `aerogommagePhotos`), `scheduled({ from, to })`.
- `setOutcome`, `schedule`, `advanceProcess({ id, by? })`, `retreatProcess`,
  `setCollecteType`, `patchManagement` (site / assignedTo / heures / devis ;
  `null` efface un champ), `updateCustomer`.

### `articles.ts`
- `listPublic` — articles **non vendus** (disponibles + en cours d'achat).
- `getPublic({ id })`, `listAll` (CRM), `create`, `update`, `remove`.
- Toutes les listes résolvent les URLs d'images (`imageUrls`).

### `team.ts` — `list`, `create`, `update`, `remove`.

### `clients.ts`
- `list` — agrégat des clients par email (déduit des demandes) : contact, ville,
  nombre de demandes, types, date de dernière demande.
- `get({ email })` — fiche : coordonnées + toutes les demandes du client.

### `dashboard.ts`
- `stats` — total, open, won, lost, incomplete, planifiées aujourd'hui,
  répartition par type, pipeline par étape (déduit du process).

### `files.ts` — `generateUploadUrl`.

### `lib.ts`
- `requireStaff(ctx)` — exige une session Clerk valide (**CRM ouvert à tout compte
  connecté** pour l'instant ; filtre par email/rôle à ajouter plus tard).
- `isAerogommageComplete`, `isCollecteComplete`, `isArticleComplete`,
  `isVeloComplete` — calculent `complete`.

---

## 7. Pages & écrans

### Public (light mode)
- **`/` Landing** — présentation + 4 cartes services (couleurs par type).
- **`/boutique`** — grille d'articles ; bandeau **« En cours d'achat »** sur les
  articles réservés.
- **`/boutique/:id`** — galerie + détail + **formulaire de réservation** (nom,
  prénom, email, téléphone, message). Bandeau « En cours d'achat » si réservé.
- **`/aerogommage`** — formulaire **multi-objets** : « Ajouter un objet » duplique
  un bloc complet (type d'objet, dimensions, quantité, bois, décapage, revêtement,
  retrait/livraison avec message de frais, commentaire, **photos par objet**).
- **`/collecte`** — formulaire détaillé (cf. §8).
- **`/velo`** — atelier Cycle en Bray (type de vélo, prestation, marque, état,
  description, photos).
- **`/merci`** — confirmation (message selon `?type=`).
- Header public **sans logo** (texte « Recyclerie »). `?embed=1` masque header/footer.

### CRM (dark mode, `/crm`, protégé Clerk)
- **Sidebar** : Tableau de bord, Demandes, Calendrier, Clients, Articles, Équipe.
  En-tête **sans icône logo** (texte « Recyclerie / CRM Cycle en Bray »).
- **Dashboard** — cartes de stats + répartition par type + pipeline.
- **Demandes** — Kanban :
  - Onglets **Demandes complètes / Demandes incomplètes / Gagnées-Perdues**.
  - **Filtre par type** (Tous + 4 types).
  - Colonnes Nouveau / Validation client / Prestation planifiée **déduites du
    process** (onglet ouvert) ou Gagnées / Perdues.
  - **Plus de drag & drop** : avancement par cases à cocher dans le détail.
  - Colonnes en **pleine largeur**.
  - **Cartes pleines à la couleur du type** (texte blanc, contraste vérifié),
    badge « Incomplète », barre de progression du process, prochaine étape,
    nb de photos, **assigné**, date programmée.
- **Détail d'une demande** (drawer latéral large) — **3 onglets** :
  - **Demande** : infos saisies par le client (objets aérogommage en sous-onglets
    avec leurs photos, collecte, vélo, article), commentaire, photos (ouvrent la
    **visionneuse**).
  - **Gestion** : sous-type collecte (C1/C2/C3), **process à cocher** (avec qui/quand),
    **Site** (Recyclerie 60/76), **Attribuée à**, **Date programmée**, **Temps
    estimé** / **Temps réel passé** (h), **Devis** (montant € + détails calcul).
    Pied : Marquer perdue / Rouvrir.
  - **Client** : coordonnées **éditables** + adresse de facturation (autocomplétion).
- **Calendrier** — vue mois des prestations planifiées (pastilles colorées par type),
  navigation mois, clic sur une demande = détail.
- **Clients** — tableau (recherche), **ligne cliquable** → fiche client (coordonnées
  + toutes les demandes, chacune ouvrant le détail).
- **Articles** — grille + création/édition (titre, description, prix, **catégorie /
  sous-catégorie**, état, statut, photos), suppression. Statut affiché
  (Disponible / Réservé / Vendu).
- **Équipe** — ajout / édition / suppression de salariés (nom, rôle, email, actif),
  utilisés dans « Attribuée à ».

---

## 8. Détail du formulaire Collecte

- **Coordonnées** client.
- **Adresse de facturation** (autocomplétion).
- **Adresse de collecte** (autocomplétion) + case « identique à la facturation ».
- **Logement** : type (Maison / Appartement / Studio / Autre), nombre d'étages,
  **place de parking dédiée/privée** (case), **distance du parking en mètres** avec
  case **« je ne connais pas la distance »** ; au-delà de **25 m** → message de
  **frais additionnels (15 €)**.
- **Objets à collecter** — multi-sélection répartie en **Gros objets** et **Petits
  objets** parmi : Meubles, Petit/Gros électroménager, Écran, Sports et Loisirs,
  Jouets, Vaisselle, Déco/Bibelots, Puériculture, Textile, Bricolage et Jardin,
  Autres (précisez → champ texte).
- **Conditions du don** — 4 questions **Oui / Non** : démontage des meubles
  volumineux, objets en bon état / réemployables, objets triés par famille, don
  sans déchet / objets collectables.
- **Photos** (multi-upload) + **commentaire**.

---

## 9. Composants transverses notables

- **Lightbox** (`ui/Lightbox.tsx`) — visionneuse plein écran : fermeture ✕ / fond /
  Échap, navigation ←/→, compteur. Utilisée pour les photos client, les photos par
  objet d'aérogommage et la boutique.
- **AddressAutocomplete** (`ui/AddressAutocomplete.tsx`) — autocomplétion d'adresse
  sur **tous** les champs adresse, via la **Base Adresse Nationale**
  (`api-adresse.data.gouv.fr`, gratuit, sans clé), **biaisée autour de
  Lachapelle-aux-Pots 60650** (lat/lon dans `lib/address.ts`). À la sélection,
  remplit rue + code postal + ville.
- **PhotoUpload** (`ui/PhotoUpload.tsx`) — upload multi-fichiers vers le stockage
  Convex, prévisualisations, suppression.
- **Drawer / Modal** — panneaux dark du CRM, fermeture Échap/clic-fond.

---

## 10. Thème & design

- `index.css` : `@font-face` Geist, variante dark par classe
  (`@custom-variant dark (&:where(.dark, .dark *))`), tokens de couleurs
  (palette `brand` orange, couleurs par type), scrollbars sombres, animations
  `fade-in` / `slide-in-right`.
- Le CRM applique `.dark` à la racine de son layout ; le public reste clair.
- Couleurs par type centralisées dans `lib/constants.ts` (`TYPE_COLORS`,
  `typeBadgeStyle`, `TypeBadge`).

---

## 11. Authentification & accès

- **Clerk** protège tout `/crm` (`<SignedIn>` / `<SignedOut>` + `<SignIn>`).
- `requireStaff` exige une session valide ; **le CRM est ouvert à tout compte
  connecté** (filtre par email/rôle volontairement désactivé, à rebrancher plus
  tard dans `convex/lib.ts`).
- Le nom de l'utilisateur connecté (Clerk `useUser`) est transmis lors du cochage
  d'une étape de process pour alimenter `processLog`.

---

## 12. Configuration & lancement

1. `npm install`
2. **Convex** : `npx convex dev` (laisser tourner). Remplit `CONVEX_DEPLOYMENT` et
   `VITE_CONVEX_URL`. Déploiement actuel : `nautical-eagle-786`.
3. **Clerk** :
   - Copier la **Publishable key** dans `.env.local` → `VITE_CLERK_PUBLISHABLE_KEY`.
   - Créer un **JWT Template** nommé `convex`.
   - `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<...>.clerk.accounts.dev`
   - (Optionnel) ajouter un claim `email` = `{{user.primary_email_address}}` au
     template `convex` si on veut filtrer par email plus tard.
4. `npm run dev` → http://localhost:5173

Tant que les clés manquent, l'app affiche l'écran **MissingConfig** au lieu de planter.

Scripts : `npm run dev` (Vite), `npm run dev:backend` (Convex), `npm run build`
(`tsc -b && vite build`), `npm run preview`.

---

## 13. Notes techniques / décisions

- Les types Convex `_generated` sont **régénérés** à chaque `npx convex dev` ; ils
  ont été écrits à la main au tout début pour permettre un build hors-ligne, puis
  écrasés par Convex une fois le déploiement créé.
- `auth.config.ts` utilise `process.env` → nécessite `@types/node` côté typecheck
  Convex (sans cela : erreur `Cannot find name 'process'`).
- Une **migration** a été exécutée une fois (`backfillProcess`) pour ajouter
  `processSteps`/`completedSteps` aux demandes créées avant le système de process,
  puis le fichier de migration a été supprimé.
- Les champs ajoutés en cours de route (process, collecte v2, etc.) sont **optionnels**
  ou ont été migrés afin de ne pas casser les demandes existantes.
- Le **drag & drop** du Kanban a été retiré : la règle « pas de saut d'étape » le
  rendait incohérent ; l'avancement se fait par cases à cocher.

---

## 14. Reste à faire / pistes

- **Process Vélo (Cycle en Bray)** : actuellement les 7 étapes par défaut — à définir.
- **Filtre d'accès CRM** par email/rôle (liste blanche) — à rebrancher quand fourni.
- **Code-splitting** : le bundle dépasse 500 kB (avertissement Vite) — non bloquant.
- Nettoyage possible : retirer `@dnd-kit/*` (plus utilisé).
- Paiement en ligne boutique : volontairement **non** implémenté (réservation simple).
