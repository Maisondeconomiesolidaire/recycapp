import { query } from "./_generated/server";

// NOTE (backend Convex partagé avec l'app « mesoutils ») :
// Le module complet de notifications « mesoutils » (table dédiée + logique)
// vit dans le dépôt mesoutils et n'est pas encore synchronisé ici. Comme ce
// dépôt déploie sur le MÊME déploiement Convex, un déploiement depuis ici
// retirait cette fonction → erreur côté client
// « Could not find public function for 'mesoutilsNotifications:unreadCount' ».
//
// Ce placeholder rétablit la fonction (renvoie 0) pour stopper l'erreur, en
// attendant de resynchroniser la vraie implémentation depuis le dépôt mesoutils.
export const unreadCount = query({
  args: {},
  handler: async () => 0,
});
