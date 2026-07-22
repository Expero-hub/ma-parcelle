export type NominatimAddress = {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  state_district?: string;
  country?: string;
};

export type NominatimItem = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
};

export type GeocodeResult = {
  id: number;
  label: string;
  fullAddress: string;
  department: string | null;
  commune: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
  code: string;
};

// Garde uniquement les lettres/chiffres, enleve les accents, tronque a 4 caracteres.
function slugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 4);
}

// Genere un code lisible ex: "LIT-COTO-FIDJ-042". Le champ Zone.code n'a pas
// de contrainte unique en base, mais le suffixe aleatoire limite les collisions visuelles.
export function buildZoneCode(
  department: string | null,
  commune: string | null,
  district: string | null,
) {
  const parts = [department, commune, district].filter(Boolean) as string[];
  const base = parts.map(slugPart).filter(Boolean).join("-") || "ZONE";
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base}-${suffix}`;
}

export function toGeocodeResult(item: NominatimItem): GeocodeResult {
  const address = item.address ?? {};

  const department = address.state ?? address.region ?? address.state_district ?? null;
  const commune = address.city ?? address.town ?? address.municipality ?? address.county ?? null;
  const district =
    address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district ?? null;

  const latitude = Number.parseFloat(item.lat);
  const longitude = Number.parseFloat(item.lon);

  return {
    id: item.place_id,
    label: item.display_name,
    fullAddress: item.display_name,
    department,
    commune,
    district,
    latitude,
    longitude,
    code: buildZoneCode(department, commune, district),
  };
}
