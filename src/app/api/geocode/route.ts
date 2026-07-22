import { NextResponse } from "next/server";

import { toGeocodeResult, type NominatimItem } from "@/lib/geocode";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// La politique d'usage de Nominatim exige un User-Agent identifiable avec un
// contact valide. A adapter avec le nom/domaine reel du projet.
// https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = "MaParcelle/1.0 (contact@maparcelle.bj)";

// Bounding box approximative du Benin (lon_min,lat_max,lon_max,lat_min) pour
// biaiser les resultats vers le pays sans les exclure completement.
const BENIN_VIEWBOX = "0.77,12.42,3.85,6.13";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "bj",
    viewbox: BENIN_VIEWBOX,
    bounded: "1",
    limit: "6",
    "accept-language": "fr",
  });

  let response: Response;
  try {
    response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "fr",
      },
      // Nominatim recommande de mettre les reponses en cache cote appelant.
      next: { revalidate: 3600 },
    });
  } catch {
    return NextResponse.json({ error: "Le service de geocodage est indisponible." }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Le service de geocodage est indisponible." }, { status: 502 });
  }

  const data = (await response.json()) as NominatimItem[];
  const results = Array.isArray(data) ? data.map(toGeocodeResult) : [];

  return NextResponse.json({ results });
}
