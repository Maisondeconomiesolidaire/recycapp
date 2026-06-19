import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, PackageOpen, Plus, Search, Trash2, UserCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea, Checkbox } from "../ui/Field";
import { PhoneInput } from "../ui/PhoneInput";
import { AddressAutocomplete } from "../ui/AddressAutocomplete";
import { PhotoUpload } from "../ui/PhotoUpload";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";
import {
  AERO_OBJECT_TYPES,
  WOOD_TYPES,
  STRIPPING_OPTIONS,
  COATING_OPTIONS,
  COLLECTE_ITEM_OPTIONS,
  HOUSING_TYPES,
  TYPE_LABELS,
  TYPE_COLORS,
} from "../../lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type InternalType = "aerogommage" | "collecte" | "article";

type ClientRow = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  postalCode?: string;
  city?: string;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const pre = (v: unknown) =>
  v === "" || v === undefined || v === null ? undefined : Number(v);

const customerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(6, "Téléphone requis"),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});

const itemSchema = z.object({
  objectType: z.string().min(1, "Sélectionnez le type"),
  label: z.string().optional(),
  height: z.preprocess(pre, z.number({ invalid_type_error: "Requis" }).positive("Positif")),
  width: z.preprocess(pre, z.number({ invalid_type_error: "Requis" }).positive("Positif")),
  depth: z.preprocess(pre, z.number({ invalid_type_error: "Requis" }).positive("Positif")),
  quantity: z.preprocess(pre, z.number().positive().optional()),
  woodType: z.string().min(1, "Requis"),
  stripping: z.string().min(1, "Requis"),
  coating: z.string().min(1, "Requis"),
  coatingOther: z.string().optional(),
  delivery: z.boolean().optional(),
  retrieval: z.boolean().optional(),
  comment: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

const aeroSchema = z.object({
  customer: customerSchema,
  comment: z.string().optional(),
  items: z.array(itemSchema).min(1, "Ajoutez au moins un objet"),
});

const ouiNon = z.enum(["oui", "non"]).optional();

const collecteSchema = z.object({
  customer: customerSchema,
  collectAddress: z
    .object({
      address: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
  housingType: z.string().optional(),
  floors: z.preprocess(pre, z.number().nonnegative().optional()),
  dedicatedParking: z.boolean().optional(),
  parkingUnknown: z.boolean().optional(),
  parkingDistance: z.preprocess(pre, z.number().nonnegative().optional()),
  grosObjets: z.array(z.string()).optional(),
  grosObjetsAutre: z.string().optional(),
  petitsObjets: z.array(z.string()).optional(),
  petitsObjetsAutre: z.string().optional(),
  dismountable: ouiNon,
  reusableGoodCondition: ouiNon,
  sorted: ouiNon,
  noWaste: ouiNon,
  comment: z.string().optional(),
});

const articleSchema = z.object({
  customer: customerSchema,
  articleId: z.string().min(1, "Sélectionnez un article"),
  comment: z.string().optional(),
});

type AeroData = z.infer<typeof aeroSchema>;
type CollecteData = z.infer<typeof collecteSchema>;
type ArticleData = z.infer<typeof articleSchema>;

const emptyItem: AeroData["items"][number] = {
  objectType: "",
  label: "",
  height: "" as unknown as number,
  width: "" as unknown as number,
  depth: "" as unknown as number,
  quantity: "" as unknown as number,
  woodType: "",
  stripping: "",
  coating: "",
  coatingOther: "",
  delivery: false,
  retrieval: false,
  comment: "",
  photos: [],
};

// ─── Main wrapper ──────────────────────────────────────────────────────────────

export function NewRequestDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<InternalType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    onClose();
    setTimeout(() => setType(null), 250);
  }

  const titleNode =
    type !== null ? (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setType(null)}
          className="rounded-lg p-1 text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span>
          Nouvelle demande ·{" "}
          <span style={{ color: TYPE_COLORS[type] }}>{TYPE_LABELS[type]}</span>
        </span>
      </div>
    ) : (
      "Nouvelle demande"
    );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      variant="modal"
      title={titleNode}
      bodyClassName="p-0 flex flex-col overflow-hidden"
      footer={
        type !== null ? (
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setType(null)}>
              ← Retour
            </Button>
            <Button
              type="submit"
              form="new-request-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Création en cours…" : "Créer la demande"}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex-1 overflow-y-auto p-5">
        {type === null && <TypeChoice onSelect={setType} />}
        {type === "aerogommage" && (
          <AeroForm
            onDone={handleClose}
            onSubmittingChange={setIsSubmitting}
          />
        )}
        {type === "collecte" && (
          <CollecteForm
            onDone={handleClose}
            onSubmittingChange={setIsSubmitting}
          />
        )}
        {type === "article" && (
          <ArticleForm
            onDone={handleClose}
            onSubmittingChange={setIsSubmitting}
          />
        )}
      </div>
    </Drawer>
  );
}

// ─── Step 1: type selection ────────────────────────────────────────────────────

const TYPE_CHOICES: { key: InternalType; label: string; desc: string }[] = [
  {
    key: "aerogommage",
    label: "Aérogommage",
    desc: "Décapage / traitement du bois par aérogommage.",
  },
  {
    key: "collecte",
    label: "Collecte à domicile",
    desc: "Enlèvement de mobilier ou objets réemployables.",
  },
  {
    key: "article",
    label: "Boutique",
    desc: "Réservation d'un article disponible en boutique.",
  },
];

function TypeChoice({ onSelect }: { onSelect: (t: InternalType) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Sélectionnez le type de demande à créer.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {TYPE_CHOICES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c.key)}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-left transition hover:border-zinc-600 hover:bg-zinc-800/60"
          >
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[c.key] }}
            />
            <div>
              <p className="text-sm font-semibold text-zinc-100">{c.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Shared: client search ────────────────────────────────────────────────────

function ClientSearch({ onSelect }: { onSelect: (c: ClientRow) => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const clients = useQuery(api.clients.list) ?? [];

  const results =
    query.trim().length >= 1
      ? clients
          .filter((c) => {
            const q = query.toLowerCase();
            return (
              c.firstName.toLowerCase().includes(q) ||
              c.lastName.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q)
            );
          })
          .slice(0, 6)
      : [];

  function pick(c: ClientRow) {
    setSelected(c);
    setQuery("");
    onSelect(c);
  }

  function clear() {
    setSelected(null);
  }

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Client existant
      </p>
      {selected ? (
        <div className="flex items-center justify-between rounded-xl border border-brand-500/40 bg-brand-500/8 px-4 py-3">
          <div className="flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-brand-400" />
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                {selected.firstName} {selected.lastName}
              </p>
              <p className="text-xs text-zinc-500">{selected.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Changer
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] py-2.5 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-zinc-700 bg-[var(--crm-surface)] shadow-2xl">
              {results.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-zinc-800"
                >
                  <UserCircle className="h-5 w-5 shrink-0 text-zinc-500" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-200">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-zinc-600">
        Laissez vide pour saisir un nouveau client manuellement.
      </p>
    </div>
  );
}

// ─── Shared: customer fields ──────────────────────────────────────────────────

function CustomerSection({
  register,
  errors,
  watch,
  setValue,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: any;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom" required error={errors.customer?.firstName?.message}>
          <Input {...register("customer.firstName")} placeholder="Marie" />
        </Field>
        <Field label="Nom" required error={errors.customer?.lastName?.message}>
          <Input {...register("customer.lastName")} placeholder="Dupont" />
        </Field>
        <Field label="Email" required error={errors.customer?.email?.message}>
          <Input type="email" {...register("customer.email")} />
        </Field>
        <Field label="Téléphone" required error={errors.customer?.phone?.message}>
          <PhoneInput {...register("customer.phone")} />
        </Field>
      </div>
      <Field label="Adresse">
        <AddressAutocomplete
          value={(watch("customer.address") as string) ?? ""}
          onValueChange={(v) => setValue("customer.address", v)}
          onSelect={(a) => {
            setValue("customer.address", a.address);
            setValue("customer.postalCode", a.postalCode);
            setValue("customer.city", a.city);
          }}
          placeholder="12 rue des Lilas"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code postal">
          <Input {...register("customer.postalCode")} placeholder="60000" />
        </Field>
        <Field label="Ville">
          <Input {...register("customer.city")} placeholder="Beauvais" />
        </Field>
      </div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 mt-6 border-b border-zinc-800 pb-2 text-sm font-semibold text-zinc-300">
      {children}
    </h3>
  );
}

// ─── Form: Aérogommage ────────────────────────────────────────────────────────

function AeroForm({
  onDone,
  onSubmittingChange,
}: {
  onDone: () => void;
  onSubmittingChange: (v: boolean) => void;
}) {
  const submit = useMutation(api.requests.createInternal);
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AeroData>({
    resolver: zodResolver(aeroSchema),
    defaultValues: { items: [emptyItem] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  async function onSubmit(data: AeroData) {
    onSubmittingChange(true);
    try {
      await submit({
        type: "aerogommage",
        customer: data.customer,
        comment: data.comment || undefined,
        items: data.items.map((it) => ({
          objectType: it.objectType,
          label: it.label || undefined,
          height: it.height,
          width: it.width,
          depth: it.depth,
          quantity: it.quantity,
          woodType: it.woodType,
          stripping: it.stripping,
          coating: it.coating,
          coatingOther: it.coatingOther || undefined,
          delivery: !!it.delivery,
          retrieval: !!it.retrieval,
          comment: it.comment || undefined,
          photos: (it.photos ?? []) as Id<"_storage">[],
        })),
      });
      onDone();
    } finally {
      onSubmittingChange(false);
    }
  }

  return (
    <form id="new-request-form" onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <ClientSearch
        onSelect={(c) => {
          setValue("customer.firstName", c.firstName);
          setValue("customer.lastName", c.lastName);
          setValue("customer.email", c.email);
          setValue("customer.phone", c.phone);
          if (c.address) setValue("customer.address", c.address);
          if (c.postalCode) setValue("customer.postalCode", c.postalCode);
          if (c.city) setValue("customer.city", c.city);
        }}
      />

      <SectionHeader>Informations client</SectionHeader>
      <CustomerSection
        register={register as Parameters<typeof CustomerSection>[0]["register"]}
        errors={errors}
        watch={watch as Parameters<typeof CustomerSection>[0]["watch"]}
        setValue={setValue as Parameters<typeof CustomerSection>[0]["setValue"]}
      />

      <SectionHeader>Objets à décaper</SectionHeader>
      <div className="space-y-4">
        {fields.map((field, i) => {
          const isOtherType = watch(`items.${i}.objectType`) === "Autre (veuillez préciser)";
          const isOtherCoating = watch(`items.${i}.coating`) === "Autre (précisez)";
          return (
            <div
              key={field.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-300">Objet {i + 1}</p>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Retirer
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Type d'objet"
                  required
                  error={errors.items?.[i]?.objectType?.message}
                >
                  <Select {...register(`items.${i}.objectType`)} defaultValue="">
                    <option value="" disabled>Sélectionner…</option>
                    {AERO_OBJECT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                {isOtherType && (
                  <Field label="Précisez l'objet" required>
                    <Input {...register(`items.${i}.label`)} />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Hauteur (cm)" required error={errors.items?.[i]?.height?.message}>
                  <Input type="number" step="any" {...register(`items.${i}.height`)} />
                </Field>
                <Field label="Largeur (cm)" required error={errors.items?.[i]?.width?.message}>
                  <Input type="number" step="any" {...register(`items.${i}.width`)} />
                </Field>
                <Field label="Profondeur (cm)" required error={errors.items?.[i]?.depth?.message}>
                  <Input type="number" step="any" {...register(`items.${i}.depth`)} />
                </Field>
                <Field label="Quantité">
                  <Input type="number" step="1" min="1" {...register(`items.${i}.quantity`)} placeholder="1" />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nature du bois" required error={errors.items?.[i]?.woodType?.message}>
                  <Select {...register(`items.${i}.woodType`)} defaultValue="">
                    <option value="" disabled>Sélectionner…</option>
                    {WOOD_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
                  </Select>
                </Field>
                <Field label="Décapage" required error={errors.items?.[i]?.stripping?.message}>
                  <Select {...register(`items.${i}.stripping`)} defaultValue="">
                    <option value="" disabled>Sélectionner…</option>
                    {STRIPPING_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Revêtement" required error={errors.items?.[i]?.coating?.message}>
                  <Select {...register(`items.${i}.coating`)} defaultValue="">
                    <option value="" disabled>Sélectionner…</option>
                    {COATING_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                {isOtherCoating && (
                  <Field label="Précisez le revêtement" required>
                    <Input {...register(`items.${i}.coatingOther`)} />
                  </Field>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Checkbox label="Retrait à domicile" {...register(`items.${i}.retrieval`)} />
                <Checkbox label="Livraison à domicile" {...register(`items.${i}.delivery`)} />
              </div>

              <Field label="Commentaire">
                <Textarea {...register(`items.${i}.comment`)} placeholder="Précisions sur cet objet…" />
              </Field>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Photos de l'objet
                </p>
                <PhotoUpload
                  value={(watch(`items.${i}.photos`) ?? []) as Id<"_storage">[]}
                  onChange={(ids) => setValue(`items.${i}.photos`, ids)}
                />
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => append(emptyItem)}
        >
          <Plus className="h-4 w-4" /> Ajouter un objet
        </Button>
        {errors.items?.message && (
          <p className="text-sm text-red-400">{errors.items.message}</p>
        )}
      </div>

      <SectionHeader>Commentaire général</SectionHeader>
      <Field label="Commentaire">
        <Textarea {...register("comment")} placeholder="Informations complémentaires…" />
      </Field>

      {/* hidden submit — triggered by footer button via form="new-request-form" */}
      <button type="submit" className="hidden" aria-hidden disabled={isSubmitting} />
    </form>
  );
}

// ─── Form: Collecte ────────────────────────────────────────────────────────────

const AUTRE = "Autres (précisez)";

function CollecteForm({
  onDone,
  onSubmittingChange,
}: {
  onDone: () => void;
  onSubmittingChange: (v: boolean) => void;
}) {
  const submit = useMutation(api.requests.createInternal);
  const [sameAddress, setSameAddress] = useState(false);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CollecteData>({
    resolver: zodResolver(collecteSchema),
    defaultValues: { grosObjets: [], petitsObjets: [] },
  });

  const grosSel = watch("grosObjets") ?? [];
  const petitsSel = watch("petitsObjets") ?? [];

  function copyBilling() {
    const next = !sameAddress;
    setSameAddress(next);
    if (next) {
      setValue("collectAddress.address", watch("customer.address") ?? "");
      setValue("collectAddress.postalCode", watch("customer.postalCode") ?? "");
      setValue("collectAddress.city", watch("customer.city") ?? "");
    }
  }

  async function onSubmit(data: CollecteData) {
    onSubmittingChange(true);
    try {
      await submit({
        type: "collecte",
        customer: data.customer,
        comment: data.comment || undefined,
        collecteDetails: {
          dismountable: data.dismountable === "oui" ? true : data.dismountable === "non" ? false : undefined,
          reusableGoodCondition: data.reusableGoodCondition === "oui" ? true : data.reusableGoodCondition === "non" ? false : undefined,
          sorted: data.sorted === "oui" ? true : data.sorted === "non" ? false : undefined,
          noWaste: data.noWaste === "oui" ? true : data.noWaste === "non" ? false : undefined,
          grosObjets: data.grosObjets,
          grosObjetsAutre: data.grosObjets?.includes(AUTRE) ? data.grosObjetsAutre : undefined,
          petitsObjets: data.petitsObjets,
          petitsObjetsAutre: data.petitsObjets?.includes(AUTRE) ? data.petitsObjetsAutre : undefined,
          housingType: data.housingType || undefined,
          floors: data.floors,
          dedicatedParking: data.dedicatedParking,
          parkingUnknown: data.parkingUnknown,
          parkingDistance: data.parkingUnknown ? undefined : data.parkingDistance,
          collectAddress: data.collectAddress,
        },
      });
      onDone();
    } finally {
      onSubmittingChange(false);
    }
  }

  return (
    <form id="new-request-form" onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <ClientSearch
        onSelect={(c) => {
          setValue("customer.firstName", c.firstName);
          setValue("customer.lastName", c.lastName);
          setValue("customer.email", c.email);
          setValue("customer.phone", c.phone);
          if (c.address) setValue("customer.address", c.address);
          if (c.postalCode) setValue("customer.postalCode", c.postalCode);
          if (c.city) setValue("customer.city", c.city);
        }}
      />

      <SectionHeader>Informations client</SectionHeader>
      <CustomerSection
        register={register as Parameters<typeof CustomerSection>[0]["register"]}
        errors={errors}
        watch={watch as Parameters<typeof CustomerSection>[0]["watch"]}
        setValue={setValue as Parameters<typeof CustomerSection>[0]["setValue"]}
      />

      <SectionHeader>Adresse de collecte</SectionHeader>
      <div className="space-y-3">
        <Checkbox label="Identique à l'adresse de facturation" checked={sameAddress} onChange={copyBilling} />
        <Field label="Adresse">
          <AddressAutocomplete
            value={watch("collectAddress.address") ?? ""}
            onValueChange={(v) => setValue("collectAddress.address", v)}
            onSelect={(a) => {
              setValue("collectAddress.address", a.address);
              setValue("collectAddress.postalCode", a.postalCode);
              setValue("collectAddress.city", a.city);
            }}
            placeholder="Lieu où récupérer les objets"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code postal">
            <Input {...register("collectAddress.postalCode")} />
          </Field>
          <Field label="Ville">
            <Input {...register("collectAddress.city")} />
          </Field>
        </div>
      </div>

      <SectionHeader>Logement</SectionHeader>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type de logement">
            <Select {...register("housingType")} defaultValue="">
              <option value="">Sélectionner…</option>
              {HOUSING_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
            </Select>
          </Field>
          <Field label="Nombre d'étages">
            <Input type="number" min="0" step="1" {...register("floors")} placeholder="0" />
          </Field>
        </div>
        <Checkbox label="Place de parking dédiée / privée" {...register("dedicatedParking")} />
        <Checkbox label="Je ne connais pas la distance du parking" {...register("parkingUnknown")} />
        {!watch("parkingUnknown") && (
          <div>
            <Field label="Distance de la place de parking (mètres)">
              <Input type="number" min="0" step="any" {...register("parkingDistance")} placeholder="Ex : 15" />
            </Field>
            {Number(watch("parkingDistance")) > 25 && (
              <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-300">
                ⚠ Distance supérieure à 25 m — frais additionnels de 15 € possibles.
              </p>
            )}
          </div>
        )}
      </div>

      <SectionHeader>Objets à collecter</SectionHeader>
      <div className="space-y-4">
        <DarkItemMultiSelect title="Gros objets" name="grosObjets" selected={grosSel} register={register} />
        {grosSel.includes(AUTRE) && (
          <Field label="Autres gros objets (précisez)">
            <Input {...register("grosObjetsAutre")} />
          </Field>
        )}
        <DarkItemMultiSelect title="Petits objets" name="petitsObjets" selected={petitsSel} register={register} />
        {petitsSel.includes(AUTRE) && (
          <Field label="Autres petits objets (précisez)">
            <Input {...register("petitsObjetsAutre")} />
          </Field>
        )}
      </div>

      <SectionHeader>Conditions du don</SectionHeader>
      <div className="space-y-3">
        <DarkYesNo label="Le client peut assurer le démontage des meubles volumineux ?" name="dismountable" register={register} errors={errors} />
        <DarkYesNo label="Tous les objets sont en bon état / réemployables ?" name="reusableGoodCondition" register={register} errors={errors} />
        <DarkYesNo label="Objets triés par famille ?" name="sorted" register={register} errors={errors} />
        <DarkYesNo label="Don sans déchet / objets non collectables ?" name="noWaste" register={register} errors={errors} />
      </div>

      <SectionHeader>Commentaire</SectionHeader>
      <Field label="Commentaire">
        <Textarea {...register("comment")} placeholder="Précisions sur l'accès, l'étage, etc." />
      </Field>

      <button type="submit" className="hidden" aria-hidden disabled={isSubmitting} />
    </form>
  );
}

// ─── Form: Boutique / Article ─────────────────────────────────────────────────

function ArticleForm({
  onDone,
  onSubmittingChange,
}: {
  onDone: () => void;
  onSubmittingChange: (v: boolean) => void;
}) {
  const submit = useMutation(api.requests.createInternal);
  const articles = useQuery(api.articles.listAll, {}) ?? [];
  const available = articles.filter((a) => a.status === "disponible");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<ArticleData>({
    resolver: zodResolver(articleSchema),
    defaultValues: { articleId: "" },
  });

  function selectArticle(id: string) {
    setSelectedArticleId(id);
    setValue("articleId", id);
    clearErrors("articleId");
  }

  async function onSubmit(data: ArticleData) {
    onSubmittingChange(true);
    try {
      await submit({
        type: "article",
        customer: data.customer,
        comment: data.comment || undefined,
        articleId: data.articleId as Id<"articles">,
      });
      onDone();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la création.";
      setError("articleId", { message: msg });
    } finally {
      onSubmittingChange(false);
    }
  }

  return (
    <form id="new-request-form" onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <ClientSearch
        onSelect={(c) => {
          setValue("customer.firstName", c.firstName);
          setValue("customer.lastName", c.lastName);
          setValue("customer.email", c.email);
          setValue("customer.phone", c.phone);
          if (c.address) setValue("customer.address", c.address);
          if (c.postalCode) setValue("customer.postalCode", c.postalCode);
          if (c.city) setValue("customer.city", c.city);
        }}
      />

      <SectionHeader>Article à réserver</SectionHeader>
      {available.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 py-12 text-center">
          <PackageOpen className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">Aucun article disponible en boutique.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((a) => (
            <button
              key={a._id}
              type="button"
              onClick={() => selectArticle(a._id)}
              className={cn(
                "overflow-hidden rounded-2xl border text-left transition",
                selectedArticleId === a._id
                  ? "border-brand-500 ring-1 ring-brand-500/40"
                  : "border-zinc-800 hover:border-zinc-600",
              )}
            >
              {a.imageUrls[0] ? (
                <img
                  src={a.imageUrls[0]}
                  alt={a.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-800 text-zinc-600">
                  <PackageOpen className="h-8 w-8" />
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-semibold text-zinc-100 leading-5">{a.title}</p>
                <p className="mt-1 text-sm font-bold text-brand-400">{formatPrice(a.price)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {/* hidden field for validation */}
      <input type="hidden" {...register("articleId")} />
      {errors.articleId && (
        <p className="text-sm text-red-400">{errors.articleId.message}</p>
      )}

      <SectionHeader>Informations client</SectionHeader>
      <CustomerSection
        register={register as Parameters<typeof CustomerSection>[0]["register"]}
        errors={errors}
        watch={watch as Parameters<typeof CustomerSection>[0]["watch"]}
        setValue={setValue as Parameters<typeof CustomerSection>[0]["setValue"]}
      />

      <SectionHeader>Commentaire</SectionHeader>
      <Field label="Commentaire">
        <Textarea {...register("comment")} placeholder="Remarques éventuelles…" />
      </Field>

      <button type="submit" className="hidden" aria-hidden disabled={isSubmitting} />
    </form>
  );
}

// ─── Dark-mode multi-select ───────────────────────────────────────────────────

function DarkItemMultiSelect({
  title,
  name,
  selected,
  register,
}: {
  title: string;
  name: "grosObjets" | "petitsObjets";
  selected: string[];
  register: ReturnType<typeof useForm<CollecteData>>["register"];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {COLLECTE_ITEM_OPTIONS.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                checked
                  ? "border-brand-500/50 bg-brand-500/10 text-zinc-100"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700",
              )}
            >
              <input
                type="checkbox"
                value={opt}
                {...register(name)}
                className="h-4 w-4 rounded border-zinc-600 accent-brand-500"
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dark-mode Oui/Non ────────────────────────────────────────────────────────

function DarkYesNo({
  label,
  name,
  register,
  errors,
}: {
  label: string;
  name: "dismountable" | "reusableGoodCondition" | "sorted" | "noWaste";
  register: ReturnType<typeof useForm<CollecteData>>["register"];
  errors: ReturnType<typeof useForm<CollecteData>>["formState"]["errors"];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-sm text-zinc-300">{label}</p>
      <div className="mt-2 flex gap-4">
        {(["oui", "non"] as const).map((val) => (
          <label key={val} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
            <input
              type="radio"
              value={val}
              {...register(name)}
              className="h-4 w-4 border-zinc-600 accent-brand-500"
            />
            {val === "oui" ? "Oui" : "Non"}
          </label>
        ))}
      </div>
      {errors[name] && (
        <p className="mt-1 text-xs text-red-400">{errors[name]?.message as string}</p>
      )}
    </div>
  );
}
