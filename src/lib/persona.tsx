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
const STORAGE_KEY = "recyclerie-persona";

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

  const [persona, setPersonaState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem(STORAGE_KEY),
  );

  const setPersona = (name: string | null) => {
    if (name) sessionStorage.setItem(STORAGE_KEY, name);
    else sessionStorage.removeItem(STORAGE_KEY);
    setPersonaState(name);
  };

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
  const personas = useQuery(api.team.listPersonas, {}) as
    | { _id: string; name: string; role: string | null }[]
    | undefined;

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
        <div className="mt-5 max-h-[55vh] space-y-2 overflow-y-auto">
          {personas === undefined ? (
            <p className="py-6 text-center text-sm text-zinc-500">Chargement…</p>
          ) : personas.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Aucun membre d'équipe. Ajoutez des encadrants dans l'onglet Équipe.
            </p>
          ) : (
            personas.map((person) => (
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
