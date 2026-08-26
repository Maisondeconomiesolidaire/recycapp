import { createContext, useContext, useState, type ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { api } from "../../convex/_generated/api";

/**
 * Le compte partagé « accueil » est utilisé par plusieurs personnes. Avant
 * d'accéder au CRM, l'utilisateur doit choisir son persona (un encadrant de
 * l'onglet Équipe). Ce nom est ensuite enregistré sur chaque modification
 * (« Modifié par … ») pour savoir qui, derrière le compte, a agi.
 */
const ACCUEIL_EMAIL = "accueil.recyclerie@eco-solidaire.fr";
type PersonaContextValue = {
  persona: string | null;
  requiresPersona: boolean;
  setPersona: (name: string | null) => void;
};

const PersonaContext = createContext<PersonaContextValue>({
  persona: null,
  requiresPersona: false,
  setPersona: () => {},
});

/** Nom à attribuer aux modifications : persona du compte accueil, sinon `null`. */
export function usePersona(): string | null {
  return useContext(PersonaContext).persona;
}

export function usePersonaContext(): PersonaContextValue {
  return useContext(PersonaContext);
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const requiresPersona = email === ACCUEIL_EMAIL;

  // Volontairement en mémoire uniquement (pas de storage) : à chaque refresh de
  // la page, l'état est réinitialisé et le persona est redemandé (« Qui êtes-
  // vous ? »). La navigation interne à l'app conserve le persona.
  const [persona, setPersona] = useState<string | null>(null);

  const value: PersonaContextValue = {
    persona: requiresPersona ? persona : null,
    requiresPersona,
    setPersona,
  };

  if (requiresPersona && !persona) {
    return <PersonaPicker onPick={setPersona} />;
  }

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

function PersonaPicker({ onPick }: { onPick: (name: string) => void }) {
  const personas = useQuery(api.polyvalents.listPersonas, {}) as
    | { _id: string; name: string; role: string | null }[]
    | undefined;
  // L'équipe suit désormais l'annuaire RH : la liste est trop longue pour être
  // parcourue à l'œil, on la filtre au clavier.
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLocaleLowerCase("fr-FR");
  const visible = (personas ?? []).filter(
    (person) => !normalized || person.name.toLocaleLowerCase("fr-FR").includes(normalized),
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[var(--crm-bg)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-6 shadow-2xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white">
          <Users className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-zinc-100">Qui êtes-vous ?</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Sélectionnez votre nom avant d'accéder au CRM. Il sera enregistré sur vos modifications.
        </p>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher votre nom…"
          className="mt-4 w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <div className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
          {personas === undefined ? (
            <p className="py-6 text-center text-sm text-zinc-500">Chargement…</p>
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              {personas.length === 0
                ? "Aucun membre d'équipe. Les salariés des recycleries 60 et 76 apparaissent depuis les ressources humaines."
                : "Aucun nom ne correspond à cette recherche."}
            </p>
          ) : (
            visible.map((person) => (
              <button
                key={person._id}
                type="button"
                onClick={() => onPick(person.name)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-left transition hover:border-brand-500"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  {person.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-100">{person.name}</span>
                  {person.role ? <span className="block truncate text-xs text-zinc-500">{person.role}</span> : null}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
