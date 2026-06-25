import {
  Bell,
  CalendarDays,
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  Package,
  PackagePlus,
  PackageMinus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type CrmAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "manage"
  | "reply"
  | "share"
  | "checkout"
  | "print"
  | "analyze"
  | "start";

export type CrmPageKey =
  | "dashboard"
  | "notifications"
  | "messages"
  | "documents"
  | "demandes"
  | "calendrier"
  | "clients"
  | "articles"
  | "caisse"
  | "ateliers"
  | "arrivages"
  | "sorties"
  | "tournees"
  | "flotte"
  | "equipe"
  | "admin";

export type CrmGrant = {
  pageKey: string;
  actions: string[];
};

export type CrmAccess = {
  role: string;
  isStaff: boolean;
  isAdmin: boolean;
  email: string | null;
  bootstrapMode: boolean;
  grants: CrmGrant[];
};

export type CrmPageDefinition = {
  key: CrmPageKey;
  label: string;
  description: string;
  to: string;
  end?: boolean;
  icon: LucideIcon;
  actions: CrmAction[];
  adminOnly?: boolean;
};

export const ACTION_LABELS: Record<CrmAction, string> = {
  read: "Lecture",
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  manage: "Gestion",
  reply: "Répondre",
  share: "Partager",
  checkout: "Encaisser",
  print: "Imprimer",
  analyze: "Analyse IA",
  start: "Démarrer",
};

export const CRM_PAGES: CrmPageDefinition[] = [
  {
    key: "dashboard",
    label: "Tableau de bord",
    description: "Vue globale des demandes, ventes et indicateurs.",
    to: "/crm",
    end: true,
    icon: LayoutDashboard,
    actions: ["read"],
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Alertes internes et demandes à traiter.",
    to: "/crm/notifications",
    icon: Bell,
    actions: ["read", "manage"],
  },
  {
    key: "messages",
    label: "Messages",
    description: "Conversations avec les clients.",
    to: "/crm/messages",
    icon: MessageSquare,
    actions: ["read", "reply"],
  },
  {
    key: "documents",
    label: "Documents",
    description: "Gestionnaire de fichiers, dossiers, devis et factures.",
    to: "/crm/documents",
    icon: FolderOpen,
    actions: ["read", "create", "update", "delete", "share"],
  },
  {
    key: "demandes",
    label: "Demandes",
    description: "Pipeline des demandes clients et fiches de suivi.",
    to: "/crm/demandes",
    icon: KanbanSquare,
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "calendrier",
    label: "Calendrier",
    description: "Planning des interventions et dates programmées.",
    to: "/crm/calendrier",
    icon: CalendarDays,
    actions: ["read", "update"],
  },
  {
    key: "clients",
    label: "Clients",
    description: "Fiches clients et historique.",
    to: "/crm/clients",
    icon: Users,
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "articles",
    label: "Stock articles",
    description: "Articles boutique, lots, statuts et étiquettes.",
    to: "/crm/articles",
    icon: Package,
    actions: ["read", "create", "update", "delete", "print", "analyze"],
  },
  {
    key: "caisse",
    label: "Caisse boutique",
    description: "Encaissement et historique magasin.",
    to: "/crm/caisse",
    icon: ShoppingCart,
    actions: ["read", "checkout", "delete"],
  },
  {
    key: "ateliers",
    label: "Atelier valorisation",
    description: "Sessions atelier, réparation et valorisation.",
    to: "/crm/ateliers",
    icon: Wrench,
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "arrivages",
    label: "Arrivages",
    description: "Enregistrement des objets entrants (catégories, poids, étiquettes).",
    to: "/crm/arrivages",
    icon: PackagePlus,
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "sorties",
    label: "Sorties",
    description: "Sorties de stock (vente, don, déchèterie…) et évacuations.",
    to: "/crm/sorties",
    icon: PackageMinus,
    actions: ["read", "create", "delete"],
  },
  {
    key: "tournees",
    label: "Tournées collecte",
    description: "Création, suivi et conduite des tournées.",
    to: "/crm/tournees",
    icon: CalendarDays,
    actions: ["read", "create", "update", "delete", "start"],
  },
  {
    key: "flotte",
    label: "Flotte",
    description: "Véhicules utilitaires, disponibilités et affectations.",
    to: "/crm/flotte",
    icon: Truck,
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "equipe",
    label: "Équipe",
    description: "Salariés, attribution et informations internes.",
    to: "/crm/equipe",
    icon: UserCog,
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "admin",
    label: "Admin",
    description: "Permissions CRM, pages et fonctionnalités.",
    to: "/crm/admin",
    icon: ShieldCheck,
    actions: ["read", "manage"],
    adminOnly: true,
  },
];

export function canAccess(
  access: CrmAccess | undefined,
  pageKey: CrmPageKey | string,
  action: CrmAction = "read",
) {
  if (!access) return false;
  if (access.isAdmin || access.bootstrapMode) return true;
  if (!access.isStaff) return false;
  return Boolean(
    access.grants.find((grant) => grant.pageKey === pageKey)?.actions.includes(action),
  );
}

export function pageByKey(key: CrmPageKey) {
  return CRM_PAGES.find((page) => page.key === key);
}
