/**
 * Activités alimentées par les demandes (aérogommage, collecte, livraison) :
 * une demande datée apparaît d'elle-même dans Gestion › Planning › Général, où
 * l'on y affecte les salariés. En faire aussi une tâche planifierait deux fois
 * le même travail : ces tâches sont masquées du planning et du catalogue, et
 * on ne peut plus les recréer.
 */
const REQUEST_DRIVEN_TASKS = ["aerogommage", "collecte", "livraison"];

export function isRequestDrivenTask(name: string | undefined) {
  if (!name) return false;
  const normalized = name.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[̀-ͯ]/g, "");
  return REQUEST_DRIVEN_TASKS.includes(normalized);
}
