> ⚠️ **BACKEND CONVEX PARTAGÉ — NE DÉPLOIE PAS DEPUIS CE DÉPÔT.**
>
> Toutes nos applications (Mes Outils, Recyclerie/Recycapp, Klyde, Cycle en Bray)
> partagent **un seul déploiement Convex**. Un déploiement reflète exactement UN
> dossier `convex/` : déployer depuis ici **effacerait les fonctions des autres apps**.
>
> Le `convex/` **canonique** (sur-ensemble de toutes les apps) vit dans le dépôt
> **`mesoutils`** (`~/mesoutils`). Règles à respecter :
>
> - On déploie le backend Convex **uniquement** depuis là :
>   `cd ~/mesoutils && npx convex deploy` (ou `npx convex dev` pendant le dev).
> - Toute nouvelle fonction ou table backend — **même si elle concerne CETTE app** —
>   s'ajoute dans `~/mesoutils/convex/`, puis on déploie depuis mesoutils.
> - Le dossier `convex/` de CE dépôt sert seulement au typecheck local du frontend.
>   **Ne lance jamais `npx convex dev` ni `npx convex deploy` ici.**

---

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
