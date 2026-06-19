export type AddressSuggestion = {
  label: string;
  address: string;
  postalCode: string;
  city: string;
};

// Biais de proximité : Lachapelle-aux-Pots (60650), Oise.
const BIAS = { lat: 49.4517, lon: 1.9236 };

/**
 * Recherche d'adresses via la Base Adresse Nationale (api-adresse.data.gouv.fr).
 * Gratuit, sans clé, résultats triés par proximité de Lachapelle-aux-Pots.
 */
export async function searchAddresses(
  query: string,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}` +
    `&limit=6&lat=${BIAS.lat}&lon=${BIAS.lon}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features: {
        properties: {
          label: string;
          name?: string;
          postcode?: string;
          city?: string;
        };
      }[];
    };
    return (data.features ?? []).map((f) => ({
      label: f.properties.label,
      address: f.properties.name ?? f.properties.label,
      postalCode: f.properties.postcode ?? "",
      city: f.properties.city ?? "",
    }));
  } catch {
    return [];
  }
}
