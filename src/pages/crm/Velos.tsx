import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bike, Check, ImagePlus, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Drawer } from "../../components/ui/Drawer";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { useUpload } from "../../lib/useUpload";
import { confirmDelete } from "../../lib/confirm";
import { errorMessage } from "../../lib/convexError";
import { formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";

/**
 * Stock vélos, géré depuis le CRM de la Recyclerie.
 *
 * Même table que le CRM de Cycle en Bray (`bikes`) : un vélo ajouté ou passé
 * « Disponible » ici apparaît dans la boutique et la vitrine Cycle en Bray. Le
 * formulaire reprend celui de Cycle en Bray, pour que les deux CRM produisent
 * des fiches identiques.
 */

type Site = "60" | "76";
type BikeStatus = "inactive" | "available" | "purchase_pending" | "sold";
type BikeUseMode = "purchase" | "rental";
type BikeWithPhotos = Doc<"bikes"> & { photoUrls: string[] };

type BikeForm = {
  photos: Id<"_storage">[];
  description: string;
  site: Site;
  gdrReference: string;
  category: string;
  condition: string;
  status: BikeStatus;
  price: string;
  profile: string;
  useMode: BikeUseMode;
};

const CATEGORIES = ["VTT", "VTC", "Vélo de route", "Vélo de ville", "Vélo vintage"];
const PROFILES = ["Homme", "Femme", "Enfant"];
const CONDITIONS = ["Neuf", "Très bon état", "Bon état", "À réviser"];
const USE_MODES: Record<BikeUseMode, string> = { purchase: "Achat", rental: "Location" };
const SITES: Array<{ value: Site; label: string }> = [
  { value: "60", label: "Recyclerie 60" },
  { value: "76", label: "Recyclerie 76" },
];
const STATUS_LABELS: Record<BikeStatus, string> = {
  inactive: "Inactif",
  available: "Disponible",
  purchase_pending: "Achat en cours",
  sold: "Vendu",
};

/** Préfixe GDR de chaque site : seuls les quatre derniers chiffres se saisissent. */
function gdrPrefix(site: Site) {
  return site === "76" ? "56294995344" : "28147497673";
}

const INITIAL_FORM: BikeForm = {
  photos: [],
  description: "",
  site: "60",
  gdrReference: gdrPrefix("60"),
  category: "Vélo de ville",
  condition: "Bon état",
  status: "inactive",
  price: "",
  profile: "Homme",
  useMode: "purchase",
};

/** Les anciens statuts (en ligne, réservé…) se ramènent aux quatre du formulaire. */
function normalizedStatus(status: string): BikeStatus {
  if (status === "available" || status === "online") return "available";
  if (status === "purchase_pending" || status === "waiting" || status === "reserved") {
    return "purchase_pending";
  }
  if (status === "sold") return "sold";
  return "inactive";
}

function formFromBike(bike: BikeWithPhotos): BikeForm {
  return {
    photos: bike.photos,
    description: bike.description,
    site: bike.site,
    gdrReference: bike.gdrReference ?? "",
    category: bike.category,
    condition: bike.condition,
    status: normalizedStatus(bike.status),
    price: bike.price === undefined ? "" : String(bike.price),
    profile: bike.sizeLabel ?? "Homme",
    useMode: bike.useMode === "rental" ? "rental" : "purchase",
  };
}

function formToPayload(form: BikeForm) {
  const price = Number(form.price.replace(",", "."));
  return {
    photos: form.photos,
    description: form.description,
    site: form.site,
    gdrReference: form.gdrReference || undefined,
    category: form.category,
    condition: form.condition,
    status: form.status,
    price: form.useMode === "purchase" && form.price.trim() && Number.isFinite(price) ? price : undefined,
    profile: form.profile,
    useMode: form.useMode,
  };
}

function bikePrice(bike: BikeWithPhotos) {
  if (bike.useMode === "rental") return "Location";
  return bike.price === undefined ? "Prix sur demande" : formatPrice(bike.price);
}

const STATUS_TONES: Record<BikeStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-400",
  purchase_pending: "bg-orange-500/15 text-orange-400",
  sold: "bg-zinc-500/20 text-zinc-400",
  inactive: "bg-zinc-500/10 text-zinc-500",
};

export function Velos() {
  const [search, setSearch] = useState("");
  const [site, setSite] = useState<"" | Site>("");
  const [status, setStatus] = useState<"" | BikeStatus>("");
  const bikes = useQuery(api.bikes.list, {
    searchText: search || undefined,
    site: site || undefined,
    status: status || undefined,
  }) as BikeWithPhotos[] | undefined;
  const createBike = useMutation(api.bikes.create);
  const updateBike = useMutation(api.bikes.update);
  const updateStatus = useMutation(api.bikes.updateStatus);
  const removeBike = useMutation(api.bikes.remove);
  const upload = useUpload();

  const [form, setForm] = useState<BikeForm>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<Id<"bikes"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function openForm(bike?: BikeWithPhotos) {
    setError("");
    setEditingId(bike?._id ?? null);
    setForm(bike ? formFromBike(bike) : INITIAL_FORM);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of Array.from(files).slice(0, 8)) ids.push(await upload(file));
      setForm((current) => ({ ...current, photos: [...current.photos, ...ids] }));
    } catch (caught) {
      setError(errorMessage(caught, "Envoi de l'image impossible."));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) await updateBike({ id: editingId, ...formToPayload(form) });
      else await createBike(formToPayload(form));
      closeForm();
    } catch (caught) {
      setError(errorMessage(caught, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(bike: BikeWithPhotos) {
    if (!(await confirmDelete(`Supprimer « ${bike.title} » ? Il disparaîtra aussi de Cycle en Bray.`))) return;
    await removeBike({ id: bike._id });
  }

  return (
    <div>
      <PageHeader
        title="Vélos"
        subtitle="Publiés dans la boutique et la vitrine Cycle en Bray"
        actions={
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4" /> Nouveau vélo
          </Button>
        }
      />
      <main className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Recherche, REF GDR…"
              className="pl-9"
            />
          </div>
          <Select value={site} onChange={(event) => setSite(event.target.value as "" | Site)}>
            <option value="">Tous les sites</option>
            {SITES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value as "" | BikeStatus)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>

        {bikes === undefined ? (
          <FullSpinner label="Chargement des vélos…" />
        ) : bikes.length === 0 ? (
          <EmptyState icon={<Bike className="h-10 w-10" />} title="Aucun vélo" description="Ajoutez un vélo pour l'afficher dans Cycle en Bray." />
        ) : (
          <div className="grid gap-4">
            {bikes.map((bike) => {
              const current = normalizedStatus(bike.status);
              return (
                <article
                  key={bike._id}
                  className="grid gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 lg:grid-cols-[200px_1fr]"
                >
                  <div className="overflow-hidden rounded-lg bg-[var(--crm-surface-2)]">
                    {bike.photoUrls[0] ? (
                      <img src={bike.photoUrls[0]} alt={bike.title} loading="lazy" className="aspect-[4/3] h-full w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center text-zinc-500">
                        <Bike className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={cn("rounded-full px-2 py-0.5 font-semibold", STATUS_TONES[current])}>
                            {STATUS_LABELS[current]}
                          </span>
                          <span className="rounded-full bg-[var(--crm-surface-2)] px-2 py-0.5">
                            {bike.useMode === "rental" ? "Location" : "Achat"}
                          </span>
                          <span className="rounded-full bg-[var(--crm-surface-2)] px-2 py-0.5">
                            {bike.site === "60" ? "Recyclerie 60" : "Recyclerie 76"}
                          </span>
                          {bike.gdrReference && (
                            <span className="rounded-full bg-[var(--crm-surface-2)] px-2 py-0.5 font-mono">
                              GDR {bike.gdrReference}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">{bike.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{bike.description}</p>
                      </div>
                      <p className="text-xl font-semibold">{bikePrice(bike)}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openForm(bike)}>
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus({ id: bike._id, status: current === "available" ? "inactive" : "available" })
                        }
                      >
                        {current === "available" ? "Rendre inactif" : "Disponible"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => updateStatus({ id: bike._id, status: "sold" })}>
                        Vendu
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove(bike)} aria-label="Supprimer">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Drawer open={formOpen} onClose={closeForm} title={editingId ? "Modifier le vélo" : "Nouveau vélo"}>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Site de traitement">
              <Select
                value={form.site}
                onChange={(event) => {
                  const nextSite = event.target.value as Site;
                  const suffix = form.gdrReference.replace(/\D/g, "").slice(-4);
                  setForm({ ...form, site: nextSite, gdrReference: `${gdrPrefix(nextSite)}${suffix}` });
                }}
              >
                {SITES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="REF GDR" required>
              <div className="flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-[var(--border)] bg-[var(--crm-surface-2)] px-3 font-mono text-sm text-zinc-500">
                  {gdrPrefix(form.site)}
                </span>
                <Input
                  value={form.gdrReference.replace(/\D/g, "").slice(gdrPrefix(form.site).length)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      gdrReference: `${gdrPrefix(form.site)}${event.target.value.replace(/\D/g, "").slice(0, 4)}`,
                    })
                  }
                  className="rounded-l-none font-mono"
                  inputMode="numeric"
                  placeholder="0000"
                  maxLength={4}
                  required
                />
              </div>
            </Field>
            <Field label="Catégorie">
              <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Profil">
              <Select value={form.profile} onChange={(event) => setForm({ ...form, profile: event.target.value })}>
                {PROFILES.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Disponible pour">
              <Select
                value={form.useMode}
                onChange={(event) => {
                  const useMode = event.target.value as BikeUseMode;
                  setForm({ ...form, useMode, price: useMode === "rental" ? "" : form.price });
                }}
              >
                {Object.entries(USE_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Statut">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BikeStatus })}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            <Field label="État">
              <Select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
                {CONDITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </Field>
            {form.useMode === "purchase" && (
              <Field label="Prix (€)">
                <Input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} inputMode="decimal" />
              </Field>
            )}
          </div>
          <Field label="Description" required>
            <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </Field>

          <BikePhotos photos={form.photos} onChange={(photos) => setForm({ ...form, photos })} />
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] p-4 text-center text-sm text-zinc-500">
            {uploading ? <Loader2 className="mb-2 h-5 w-5 animate-spin" /> : <ImagePlus className="mb-2 h-5 w-5" />}
            {form.photos.length ? `${form.photos.length} photo(s) — en ajouter` : "Ajouter des photos"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void onFiles(event.target.files)} />
          </label>

          {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[var(--crm-border)] pt-4">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingId ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

function BikePhotos({
  photos,
  onChange,
}: {
  photos: Id<"_storage">[];
  onChange: (photos: Id<"_storage">[]) => void;
}) {
  const urls = useQuery(api.bikes.photoUrls, photos.length > 0 ? { ids: photos } : "skip");
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {photos.map((photoId, index) => (
        <div key={photoId} className="relative overflow-hidden rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)]">
          {urls?.[index] ? (
            <img src={urls[index] ?? ""} alt="" className="aspect-square w-full object-cover" />
          ) : (
            <div className="grid aspect-square place-items-center text-xs text-zinc-500">Photo</div>
          )}
          <button
            type="button"
            onClick={() => onChange(photos.filter((id) => id !== photoId))}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-600 shadow-sm hover:bg-red-50"
            aria-label="Retirer la photo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
