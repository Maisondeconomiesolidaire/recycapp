import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  PackageOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserCircle,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea, Checkbox } from "../ui/Field";
import { PhoneInput } from "../ui/PhoneInput";
import { AddressAutocomplete } from "../ui/AddressAutocomplete";
import { PhotoUpload } from "../ui/PhotoUpload";
import { formatPrice, formatDate } from "../../lib/format";
import { cn } from "../../lib/cn";
import {
  SummaryPill,
  WizardShell,
  WizardStepIntro,
  type SlideDirection,
} from "./Wizard";
import {
  AERO_OBJECT_TYPES,
  ARTICLE_CATEGORIES,
  ARTICLE_SUBCATEGORIES,
  WOOD_TYPES,
  STRIPPING_OPTIONS,
  COATING_OPTIONS,
  HOUSING_TYPES,
  TYPE_LABELS,
  TYPE_COLORS,
} from "../../lib/constants";
import {
  CollecteCategoryPicker,
  buildCategoryPhotosPayload,
  selectedCategoryKeys,
  type CategoryPhotoMap,
} from "../public/CollecteCategoryPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

type InternalType = "aerogommage" | "collecte" | "article" | "livraison";

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
  objectCategories: z.array(z.string()).optional(),
  grosObjetsAutre: z.string().optional(),
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

const livraisonSchema = z.object({
  customer: customerSchema,
  articleTitle: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  reference: z.string().optional(),
  articlePrice: z.preprocess(pre, z.number().nonnegative().optional()),
  deliveryAddress: z
    .object({
      address: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
  comment: z.string().optional(),
});

type AeroData = z.infer<typeof aeroSchema>;
type CollecteData = z.infer<typeof collecteSchema>;
type ArticleData = z.infer<typeof articleSchema>;
type LivraisonData = z.infer<typeof livraisonSchema>;

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
        type !== null && type !== "livraison" ? (
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
        <div className="mx-auto w-full max-w-2xl">
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
        {type === "livraison" && (
          <LivraisonForm
            onDone={handleClose}
            onSubmittingChange={setIsSubmitting}
          />
        )}
        </div>
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
  {
    key: "livraison",
    label: "Livraison",
    desc: "Livraison d'un article : analyse IA, frais au km, créneaux groupés.",
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
            className="flex flex-col gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-5 text-left transition hover:border-zinc-600 hover:bg-[var(--crm-surface-3)]"
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
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-[var(--crm-border-strong)] bg-[var(--crm-surface)] shadow-2xl">
              {results.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-[var(--crm-surface-3)]"
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
    <h3 className="mb-4 mt-6 border-b border-[var(--crm-border)] pb-2 text-sm font-semibold text-zinc-300">
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
              className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 space-y-3"
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
    defaultValues: { objectCategories: [] },
  });

  const [categoryPhotos, setCategoryPhotos] = useState<CategoryPhotoMap>({});

  function handleCategoryChange(next: CategoryPhotoMap) {
    setCategoryPhotos(next);
    setValue("objectCategories", selectedCategoryKeys(next));
  }

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
          objectCategories: data.objectCategories,
          categoryPhotos: buildCategoryPhotosPayload(categoryPhotos),
          grosObjetsAutre: data.grosObjetsAutre?.trim() || undefined,
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
        <p className="text-xs text-zinc-500">
          Touchez une catégorie pour ajouter des photos. Une catégorie est prise en compte dès
          qu'elle contient au moins une photo.
        </p>
        <CollecteCategoryPicker value={categoryPhotos} onChange={handleCategoryChange} theme="dark" />
        <Field label="Autre catégorie (précisez)">
          <Input {...register("grosObjetsAutre")} />
        </Field>
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
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] py-12 text-center">
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
                  : "border-[var(--crm-border)] hover:border-zinc-600",
              )}
            >
              {a.imageUrls[0] ? (
                <img
                  src={a.imageUrls[0]}
                  alt={a.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--crm-surface-3)] text-zinc-600">
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

// ─── Form: Livraison ──────────────────────────────────────────────────────────

type AnalysisResult = {
  articleTitle: string;
  category: string;
  subcategory: string;
  reference: string;
  referenceFromBarcode: boolean;
  articlePrice: number | null;
};

type SlotResult = {
  slots: {
    requestReference: string;
    scheduledDate: number;
    distanceKm: number;
    city: string | null;
    discount: number;
    reducedDeliveryFee: number;
  }[];
  message: string;
};

function LivraisonForm({
  onDone,
  onSubmittingChange,
}: {
  onDone: () => void;
  onSubmittingChange: (v: boolean) => void;
}) {
  const submit = useMutation(api.requests.createInternal);
  const analyze = useAction(api.livraison.analyzePhotos);
  const computeFee = useAction(api.livraison.computeDeliveryFee);
  const findSlots = useAction(api.livraison.advantageousSlots);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("forward");
  const [sameAddress, setSameAddress] = useState(false);
  const [articlePhotos, setArticlePhotos] = useState<Id<"_storage">[]>([]);
  const [referencePhotos, setReferencePhotos] = useState<Id<"_storage">[]>([]);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastAnalyzedPhotos, setLastAnalyzedPhotos] = useState("");

  const [fee, setFee] = useState<{ distanceKm: number; deliveryFee: number } | null>(null);
  const [computingFee, setComputingFee] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [lastFeeAddress, setLastFeeAddress] = useState("");

  const [slots, setSlots] = useState<SlotResult | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotResult["slots"][number] | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"standard" | "grouped">("standard");
  const [lastSlotsAddress, setLastSlotsAddress] = useState("");

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<LivraisonData>({
    resolver: zodResolver(livraisonSchema),
    defaultValues: {
      customer: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        postalCode: "",
        city: "",
      },
      deliveryAddress: {
        address: "",
        postalCode: "",
        city: "",
      },
      articleTitle: "",
      category: "",
      subcategory: "",
      reference: "",
      articlePrice: undefined,
      comment: "",
    },
  });

  const deliveryAddress = watch("deliveryAddress");
  const manualCategory = watch("category") ?? "";
  const manualArticleTitle = watch("articleTitle") ?? "";
  const manualSubcategory = watch("subcategory") ?? "";
  const manualReference = watch("reference") ?? "";
  const manualArticlePrice = watch("articlePrice");
  const photoSignature = `${articlePhotos[0] ?? ""}:${referencePhotos[0] ?? ""}`;
  const addressSignature = [
    deliveryAddress?.address ?? "",
    deliveryAddress?.postalCode ?? "",
    deliveryAddress?.city ?? "",
  ]
    .map((value) => value.trim())
    .join("|");

  const resolvedArticleTitle = manualArticleTitle.trim() || analysis?.articleTitle || "";
  const resolvedCategory = manualCategory.trim() || analysis?.category || "";
  const resolvedSubcategory = manualSubcategory.trim() || analysis?.subcategory || "";
  const resolvedReference = manualReference.trim() || analysis?.reference || "";
  const articlePrice =
    typeof manualArticlePrice === "number" && Number.isFinite(manualArticlePrice)
      ? manualArticlePrice
      : analysis?.articlePrice ?? null;
  const baseDeliveryFee = fee?.deliveryFee ?? null;
  const baseTotal =
    articlePrice !== null && baseDeliveryFee !== null
      ? articlePrice + baseDeliveryFee
      : null;
  const baseAcompte = baseTotal !== null ? Math.round(baseTotal * 0.2 * 100) / 100 : null;
  const reducedTotal =
    articlePrice !== null && selectedSlot
      ? articlePrice + selectedSlot.reducedDeliveryFee
      : null;
  const reducedAcompte =
    reducedTotal !== null ? Math.round(reducedTotal * 0.2 * 100) / 100 : null;
  const effectiveDeliveryFee =
    deliveryMode === "grouped" && selectedSlot
      ? selectedSlot.reducedDeliveryFee
      : baseDeliveryFee;
  const effectiveTotal =
    articlePrice !== null && effectiveDeliveryFee !== null
      ? articlePrice + effectiveDeliveryFee
      : null;
  const effectiveAcompte =
    effectiveTotal !== null ? Math.round(effectiveTotal * 0.2 * 100) / 100 : null;

  // Champs à compléter manuellement : uniquement ceux que l'IA n'a pas renseignés.
  const needArticleTitle = !resolvedArticleTitle;
  const needReference = !resolvedReference;
  const needCategory = !resolvedCategory;
  const needSubcategory = !resolvedSubcategory;
  const needArticlePrice = articlePrice === null;
  const showManualFields =
    needArticleTitle ||
    needReference ||
    needCategory ||
    needSubcategory ||
    needArticlePrice;

  const steps = [
    {
      eyebrow: "Livraison",
      title: "Informations client",
      helper: "Commencez par le client et son adresse de facturation.",
    },
    {
      eyebrow: "Livraison",
      title: "Article et référence",
      helper: "Ajoutez les photos. L'analyse IA et la récupération du prix se lancent automatiquement.",
    },
    {
      eyebrow: "Livraison",
      title: "Adresse de livraison",
      helper: "Indiquez l'adresse du client. Les frais se recalculent en direct.",
    },
    {
      eyebrow: "Livraison",
      title: "Validation et acompte",
      helper: "Comparez le coût standard et, si disponible, l'option groupée à moins de 5 km.",
    },
  ] as const;

  function copyBilling() {
    const next = !sameAddress;
    setSameAddress(next);
    if (next) {
      setValue("deliveryAddress.address", watch("customer.address") ?? "");
      setValue("deliveryAddress.postalCode", watch("customer.postalCode") ?? "");
      setValue("deliveryAddress.city", watch("customer.city") ?? "");
    }
  }

  function deliveryAddressArgs() {
    const da = getValues("deliveryAddress");
    return {
      address: (da?.address ?? "").trim(),
      postalCode: (da?.postalCode ?? "").trim() || undefined,
      city: (da?.city ?? "").trim() || undefined,
    };
  }

  function goTo(nextStep: number) {
    setDirection(nextStep > step ? "forward" : "back");
    setStep(nextStep);
  }

  async function next() {
    if (step === 0) {
      const valid = await trigger([
        "customer.firstName",
        "customer.lastName",
        "customer.email",
        "customer.phone",
      ]);
      if (!valid) return;
    }
    if (step === 1 && !articlePhotos[0]) {
      setAnalysisError("Ajoutez d'abord la photo de l'article.");
      return;
    }
    if (step === 2) {
      const valid = await trigger("deliveryAddress.address");
      if (!valid) return;
    }
    if (step < steps.length - 1) goTo(step + 1);
  }

  function back() {
    if (step > 0) goTo(step - 1);
  }

  async function runAnalysis(signature = photoSignature) {
    if (!articlePhotos[0]) {
      setAnalysisError("Ajoutez d'abord la photo de l'article.");
      return;
    }
    setLastAnalyzedPhotos(signature);
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyze({
        articlePhotoId: articlePhotos[0],
        referencePhotoId: referencePhotos[0],
      });
      setAnalysis(result);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analyse impossible.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runComputeFee(signature = addressSignature) {
    const da = deliveryAddressArgs();
    if (!da.address) {
      setFee(null);
      setSlots(null);
      setSelectedSlot(null);
      setLastFeeAddress("");
      setFeeError("Renseignez l'adresse de livraison.");
      return;
    }
    setLastFeeAddress(signature);
    setComputingFee(true);
    setFeeError(null);
    try {
      const result = await computeFee(da);
      setFee(result);
    } catch (e) {
      setFeeError(e instanceof Error ? e.message : "Calcul impossible.");
    } finally {
      setComputingFee(false);
    }
  }

  async function runFindSlots(signature = addressSignature) {
    const da = deliveryAddressArgs();
    if (!da.address) {
      setSlots(null);
      setSelectedSlot(null);
      setLastSlotsAddress("");
      setSlotsError("Renseignez l'adresse de livraison.");
      return;
    }
    setLastSlotsAddress(signature);
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const result = await findSlots({ ...da, deliveryFee: fee?.deliveryFee });
      setSlots(result);
      setSelectedSlot((current) => {
        if (!result.slots.length) return null;
        if (!current) return null;
        return (
          result.slots.find(
            (slot) =>
              slot.requestReference === current.requestReference &&
              slot.scheduledDate === current.scheduledDate,
          ) ?? null
        );
      });
    } catch (e) {
      setSlotsError(e instanceof Error ? e.message : "Recherche impossible.");
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    if (!articlePhotos[0] || analyzing || photoSignature === lastAnalyzedPhotos) return;
    setAnalysisError(null);
    setAnalysis(null);
    void runAnalysis(photoSignature);
  }, [analyzing, articlePhotos, lastAnalyzedPhotos, photoSignature, referencePhotos]);

  useEffect(() => {
    if (!analysis) return;
    if (!getValues("articleTitle")?.trim()) setValue("articleTitle", analysis.articleTitle);
    if (!getValues("category")?.trim()) setValue("category", analysis.category);
    if (!getValues("subcategory")?.trim()) setValue("subcategory", analysis.subcategory);
    if (!getValues("reference")?.trim()) setValue("reference", analysis.reference);
    if (
      analysis.articlePrice !== null &&
      (getValues("articlePrice") === undefined || getValues("articlePrice") === null)
    ) {
      setValue("articlePrice", analysis.articlePrice);
    }
  }, [analysis, getValues, setValue]);

  useEffect(() => {
    if (!deliveryAddress?.address?.trim()) {
      setFee(null);
      setSlots(null);
      setSelectedSlot(null);
      setFeeError(null);
      setSlotsError(null);
      setLastFeeAddress("");
      setLastSlotsAddress("");
      return;
    }
    if (computingFee || addressSignature === lastFeeAddress) return;
    const timer = window.setTimeout(() => {
      void runComputeFee(addressSignature);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [addressSignature, computingFee, deliveryAddress, lastFeeAddress]);

  useEffect(() => {
    if (!deliveryAddress?.address?.trim() || !fee || loadingSlots || addressSignature === lastSlotsAddress) {
      return;
    }
    const timer = window.setTimeout(() => {
      void runFindSlots(addressSignature);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [addressSignature, deliveryAddress, fee, lastSlotsAddress, loadingSlots]);

  useEffect(() => {
    if (!slots?.slots.length) {
      setDeliveryMode("standard");
      return;
    }
    if (deliveryMode === "grouped" && !selectedSlot) {
      setSelectedSlot(slots.slots[0]);
    }
  }, [deliveryMode, selectedSlot, slots]);

  async function onSubmit(data: LivraisonData) {
    setFormError(null);
    if (!articlePhotos[0]) {
      setFormError("La photo de l'article est obligatoire.");
      return;
    }
    if (!data.deliveryAddress?.address?.trim()) {
      setFormError("L'adresse de livraison est obligatoire.");
      return;
    }
    onSubmittingChange(true);
    try {
      await submit({
        type: "livraison",
        customer: data.customer,
        comment: data.comment || undefined,
        livraisonDetails: {
          deliveryAddress: data.deliveryAddress,
          sameAsBilling: sameAddress,
          articlePhoto: articlePhotos[0],
          referencePhoto: referencePhotos[0],
          articleTitle: resolvedArticleTitle || undefined,
          category: resolvedCategory || undefined,
          subcategory: resolvedSubcategory || undefined,
          condition: undefined,
          reference: resolvedReference || undefined,
          referenceFromBarcode: analysis?.referenceFromBarcode,
          articlePrice: articlePrice ?? undefined,
          acompte: effectiveAcompte ?? undefined,
          distanceKm: fee?.distanceKm,
          deliveryFee: effectiveDeliveryFee ?? undefined,
          suggestedSlot: deliveryMode === "grouped" && selectedSlot
            ? {
                requestReference: selectedSlot.requestReference,
                scheduledDate: selectedSlot.scheduledDate,
                distanceKm: selectedSlot.distanceKm,
                city: selectedSlot.city ?? undefined,
                discount: selectedSlot.discount,
                reducedDeliveryFee: selectedSlot.reducedDeliveryFee,
              }
            : undefined,
        },
      });
      onDone();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      onSubmittingChange(false);
    }
  }

  return (
    <form id="new-request-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <WizardShell
        eyebrow={steps[step].eyebrow}
        title={steps[step].title}
        stepIndex={step}
        stepCount={steps.length}
        direction={direction}
        onBack={back}
      >
        {step === 0 && (
          <div>
            <WizardStepIntro
              eyebrow="Étape 1"
              title="Client"
              helper="On récupère ici l'identité, le contact et l'adresse de facturation."
            >
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
              <CustomerSection
                register={register as Parameters<typeof CustomerSection>[0]["register"]}
                errors={errors}
                watch={watch as Parameters<typeof CustomerSection>[0]["watch"]}
                setValue={setValue as Parameters<typeof CustomerSection>[0]["setValue"]}
              />
            </WizardStepIntro>
          </div>
        )}

        {step === 1 && (
          <div>
            <WizardStepIntro
              eyebrow="Étape 2"
              title="Photos article + référence"
              helper="L'article est analysé automatiquement dès qu'une photo est disponible."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Photo de l'article <span className="text-red-400">*</span>
                  </p>
                  <PhotoUpload value={articlePhotos} onChange={setArticlePhotos} />
                  <p className="mt-1.5 text-[11px] text-zinc-600">
                    Sert à catégoriser l'article et à vérifier sa désignation.
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Photo de la référence / code-barres
                  </p>
                  <PhotoUpload value={referencePhotos} onChange={setReferencePhotos} />
                  <p className="mt-1.5 text-[11px] text-zinc-600">
                    Permet de reprendre la référence et le prix de l'article en temps réel.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {resolvedArticleTitle && <SummaryPill label="Article" value={resolvedArticleTitle} />}
                {resolvedReference && <SummaryPill label="Référence" value={resolvedReference} />}
                {articlePrice !== null && <SummaryPill label="Prix article" value={formatPrice(articlePrice)} />}
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-zinc-100">Analyse IA</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void runAnalysis()} disabled={analyzing || !articlePhotos[0]}>
                    <Sparkles className="h-4 w-4" />
                    {analyzing ? "Analyse…" : "Relancer"}
                  </Button>
                </div>
                {analysisError && <p className="mt-3 text-sm text-red-400">{analysisError}</p>}
                {!analysis && !analysisError && (
                  <p className="mt-3 text-zinc-500">
                    {analyzing ? "Analyse de l'article et du code-barres en cours…" : "Ajoutez les photos pour lancer l'analyse."}
                  </p>
                )}
                {analysis && (
                  <div className="mt-3 space-y-1 text-zinc-400">
                    <p className="font-semibold text-zinc-100">{resolvedArticleTitle || analysis.articleTitle}</p>
                    <p>
                      Catégorie : <span className="text-zinc-200">{resolvedCategory || analysis.category}</span>
                      {" · "}
                      <span className="text-zinc-200">{resolvedSubcategory || analysis.subcategory}</span>
                    </p>
                    <p>
                      Référence : <span className="font-mono text-zinc-200">{resolvedReference || analysis.reference}</span>
                      {" "}
                      <span className="text-zinc-500">
                        ({analysis.referenceFromBarcode ? "code-barres" : "générée"})
                      </span>
                    </p>
                    <p>
                      Prix article :{" "}
                      <span className="text-zinc-200">
                        {articlePrice !== null ? formatPrice(articlePrice) : "non trouvé"}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {showManualFields && (
                <div className="mt-4 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
                  <p className="text-sm font-semibold text-zinc-100">Compléter manuellement</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    L'IA n'a pas tout renseigné. Complétez les champs manquants ci-dessous.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {needArticleTitle && (
                      <Field label="Nom de l'article">
                        <Input {...register("articleTitle")} placeholder="Ex : Table basse scandinave" />
                      </Field>
                    )}
                    {needReference && (
                      <Field label="Référence">
                        <Input {...register("reference")} placeholder="Ex : 123456" />
                      </Field>
                    )}
                    {needCategory && (
                      <Field label="Catégorie">
                        <Select
                          {...register("category")}
                          value={manualCategory}
                          onChange={(e) => {
                            setValue("category", e.target.value);
                            setValue("subcategory", "");
                          }}
                        >
                          <option value="">Sélectionner…</option>
                          {ARTICLE_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                    {needSubcategory && (
                      <Field label="Sous-catégorie">
                        <Select {...register("subcategory")} value={manualSubcategory}>
                          <option value="">Sélectionner…</option>
                          {(ARTICLE_SUBCATEGORIES[resolvedCategory] ?? []).map((subcategory) => (
                            <option key={subcategory} value={subcategory}>
                              {subcategory}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                    {needArticlePrice && (
                      <Field label="Prix article">
                        <Input type="number" min="0" step="0.01" {...register("articlePrice")} placeholder="Ex : 49" />
                      </Field>
                    )}
                  </div>
                </div>
              )}
            </WizardStepIntro>
          </div>
        )}

        {step === 2 && (
          <div>
            <WizardStepIntro
              eyebrow="Étape 3"
              title="Adresse de livraison"
              helper="Les frais de livraison se recalculent automatiquement dès que l'adresse est connue."
            >
              <div className="space-y-3">
                <Checkbox
                  label="Identique à l'adresse de facturation"
                  checked={sameAddress}
                  onChange={copyBilling}
                />
                <Field label="Adresse" error={errors.deliveryAddress?.address?.message}>
                  <AddressAutocomplete
                    value={watch("deliveryAddress.address") ?? ""}
                    onValueChange={(v) => setValue("deliveryAddress.address", v)}
                    onSelect={(a) => {
                      setValue("deliveryAddress.address", a.address);
                      setValue("deliveryAddress.postalCode", a.postalCode);
                      setValue("deliveryAddress.city", a.city);
                    }}
                    placeholder="Lieu de livraison"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Code postal">
                    <Input {...register("deliveryAddress.postalCode")} />
                  </Field>
                  <Field label="Ville">
                    <Input {...register("deliveryAddress.city")} />
                  </Field>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Frais de livraison</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      0,50 € / km · aller-retour depuis le dépôt de Lachapelle-aux-Pots.
                    </p>
                  </div>
                  {(computingFee || loadingSlots) && (
                    <span className="text-xs text-zinc-500">
                      {computingFee ? "Calcul…" : "Recherche créneaux…"}
                    </span>
                  )}
                </div>
                {feeError && <p className="mt-3 text-sm text-red-400">{feeError}</p>}
                {fee && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SummaryPill label="Distance A/R" value={`${fee.distanceKm} km`} />
                    <SummaryPill label="Livraison" value={formatPrice(fee.deliveryFee)} />
                    {effectiveAcompte !== null && <SummaryPill label="Acompte 20%" value={formatPrice(effectiveAcompte)} />}
                  </div>
                )}
              </div>
            </WizardStepIntro>
          </div>
        )}

        {step === 3 && (
          <div>
            <WizardStepIntro
              eyebrow="Étape 4"
              title="Validation du montant"
              helper="Choisissez clairement le mode de livraison, puis vérifiez le total et l'acompte demandé."
            >
              <div className="mb-4 grid gap-3 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("standard")}
                  className={cn(
                    "rounded-3xl border p-4 text-left transition",
                    deliveryMode === "standard"
                      ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30"
                      : "border-[var(--crm-border)] bg-[var(--crm-surface)] hover:border-brand-500/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Livraison standard</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Aller-retour depuis le dépôt jusqu'au client.
                      </p>
                    </div>
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      deliveryMode === "standard"
                        ? "bg-brand-500 text-white"
                        : "bg-[var(--crm-surface-2)] text-zinc-300",
                    )}>
                      {deliveryMode === "standard" ? "Selectionnee" : "Choisir"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!slots?.slots.length}
                  onClick={() => {
                    if (!slots?.slots.length) return;
                    setDeliveryMode("grouped");
                    if (!selectedSlot) setSelectedSlot(slots.slots[0]);
                  }}
                  className={cn(
                    "rounded-3xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                    deliveryMode === "grouped"
                      ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400/30"
                      : "border-[var(--crm-border)] bg-[var(--crm-surface)] hover:border-emerald-400/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Livraison groupée</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Regroupement avec une collecte deja planifiee a 5 km ou moins.
                      </p>
                    </div>
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      deliveryMode === "grouped"
                        ? "bg-emerald-500 text-white"
                        : "bg-[var(--crm-surface-2)] text-zinc-300",
                    )}>
                      {deliveryMode === "grouped" ? "Selectionnee" : "Choisir"}
                    </span>
                  </div>
                </button>
              </div>

              <div className="mb-4 rounded-3xl border border-amber-400/20 bg-amber-400/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Acompte a demander</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold text-zinc-100">
                      {effectiveAcompte !== null ? formatPrice(effectiveAcompte) : "En attente"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      20% de {articlePrice !== null ? formatPrice(articlePrice) : "prix article"} + {effectiveDeliveryFee !== null ? formatPrice(effectiveDeliveryFee) : "livraison"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--crm-surface)] px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Total retenu</span>
                      <span className="font-semibold text-zinc-100">
                        {effectiveTotal !== null ? formatPrice(effectiveTotal) : "En attente"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-[var(--crm-surface)] px-4 py-3 text-sm text-zinc-300">
                  Le client doit verser <span className="font-semibold text-white">{effectiveAcompte !== null ? formatPrice(effectiveAcompte) : "..."}</span> d'acompte a la creation de la demande.
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Tarif standard</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">
                    {resolvedArticleTitle || "Article en attente d'analyse"}
                  </p>
                  <div className="mt-4 space-y-3 text-sm">
                    <PriceRow label="Prix article" value={articlePrice !== null ? formatPrice(articlePrice) : "En attente"} />
                    <PriceRow label="Livraison" value={baseDeliveryFee !== null ? formatPrice(baseDeliveryFee) : "En attente"} />
                    <PriceRow label="Total" value={baseTotal !== null ? formatPrice(baseTotal) : "En attente"} strong />
                    <PriceRow label="Acompte 20%" value={baseAcompte !== null ? formatPrice(baseAcompte) : "En attente"} strong />
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/8 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Option groupée ≤ 5 km</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Sélectionnez cette option uniquement si vous souhaitez appliquer la livraison groupée.
                  </p>
                  {!slots && !slotsError && (
                    <p className="mt-4 text-sm text-zinc-400">Recherche automatique des collectes planifiées à proximité…</p>
                  )}
                  {slotsError && <p className="mt-4 text-sm text-red-300">{slotsError}</p>}
                  {slots && slots.slots.length === 0 && (
                    <p className="mt-4 text-sm text-zinc-400">{slots.message}</p>
                  )}
                  {slots && slots.slots.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-300">{slots.message}</p>
                      <div className="space-y-2">
                        {slots.slots.map((slot) => {
                          const active =
                            selectedSlot?.requestReference === slot.requestReference &&
                            selectedSlot?.scheduledDate === slot.scheduledDate;
                          return (
                            <button
                              key={slot.requestReference + slot.scheduledDate}
                              type="button"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setDeliveryMode("grouped");
                              }}
                              className={cn(
                                "w-full rounded-2xl border px-4 py-3 text-left transition",
                                active
                                  ? "border-emerald-400 bg-emerald-500/12 ring-1 ring-emerald-400/30"
                                  : "border-[var(--crm-border)] bg-[var(--crm-surface)] hover:border-emerald-400/40",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-zinc-100">
                                    {formatDate(slot.scheduledDate)}
                                    {slot.city ? ` · ${slot.city}` : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    Demande #{slot.requestReference} · {slot.distanceKm} km à vol d'oiseau
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    Livraison groupée : {formatPrice(slot.reducedDeliveryFee)}
                                  </p>
                                </div>
                                {slot.discount > 0 && (
                                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                    −{formatPrice(slot.discount)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 flex justify-end">
                                <span className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                                  active && deliveryMode === "grouped"
                                    ? "bg-emerald-400/20 text-emerald-200"
                                    : "bg-[var(--crm-surface-2)] text-zinc-300",
                                )}>
                                  {active && deliveryMode === "grouped" ? "Option active" : "Activer cette option"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedSlot && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-[var(--crm-surface)] p-4 text-sm">
                          <PriceRow label="Prix article" value={articlePrice !== null ? formatPrice(articlePrice) : "En attente"} />
                          <PriceRow label="Livraison groupée" value={formatPrice(selectedSlot.reducedDeliveryFee)} />
                          <PriceRow label="Total réduit" value={reducedTotal !== null ? formatPrice(reducedTotal) : "En attente"} strong />
                          <PriceRow label="Acompte 20%" value={reducedAcompte !== null ? formatPrice(reducedAcompte) : "En attente"} strong />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <Field label="Commentaire">
                  <Textarea {...register("comment")} placeholder="Précisions sur la livraison…" />
                </Field>
              </div>
            </WizardStepIntro>
          </div>
        )}

        {formError && <p className="mt-4 text-sm text-red-400">{formError}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={step === 0 ? onDone : back}>
            {step === 0 ? "Fermer" : "Retour"}
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => void next()}>
              Continuer
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création en cours…" : "Créer la demande"}
            </Button>
          )}
        </div>
      </WizardShell>

      <button type="submit" className="hidden" aria-hidden disabled={isSubmitting} />
    </form>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--crm-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-zinc-400">{label}</span>
      <span className={strong ? "text-base font-semibold text-zinc-100" : "text-zinc-200"}>
        {value}
      </span>
    </div>
  );
}

// ─── Dark-mode multi-select ───────────────────────────────────────────────────

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
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3">
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
