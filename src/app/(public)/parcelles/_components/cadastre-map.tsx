"use client";

import "leaflet/dist/leaflet.css";

import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { Fragment, useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import {
  STATUT_META,
  fmtFCFA,
  parseCoord,
  type Parcelle,
} from "@/lib/parcelles";

const BENIN_CENTER: LatLngExpression = [7.3, 2.3];

/** Couleurs résolues (Leaflet ne comprend pas les var CSS des SVG overlays). */
const STATUT_COLOR: Record<string, string> = {
  disponible: "#2F5233",
  reserve: "#C9962C",
  vendu: "#9C3B2E",
};

/** Petit carré placeholder autour d'une parcelle (~130 m). Remplaçable plus
 *  tard par la vraie géométrie cadastrale (GeoJSON). */
function squareAround([lat, lng]: [number, number]): LatLngExpression[] {
  const d = 0.0009;
  return [
    [lat + d, lng - d],
    [lat + d, lng + d],
    [lat - d, lng + d],
    [lat - d, lng - d],
  ];
}

/** Ajuste la vue : fit sur l'ensemble filtré, et recentre sur la sélection. */
function MapController({
  parcelles,
  selectedId,
  hoverId,
}: {
  parcelles: Parcelle[];
  selectedId: string | null;
  hoverId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (parcelles.length === 0) return;
    const bounds = parcelles.map(parseCoord) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelles.map((p) => p.ref).join(",")]);

  useEffect(() => {
    const targetId = selectedId || hoverId;
    if (!targetId) return;
    const p = parcelles.find((x) => x.ref === targetId);
    if (p) map.flyTo(parseCoord(p), Math.max(map.getZoom(), 13), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, hoverId]);

  return null;
}

export function CadastreMap({
  parcelles,
  selectedId,
  hoverId,
  onSelect,
  onHover,
}: {
  parcelles: Parcelle[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (ref: string) => void;
  onHover: (ref: string | null) => void;
}) {
  const points = useMemo(
    () => parcelles.map((p) => ({ p, pos: parseCoord(p) })),
    [parcelles],
  );

  return (
    <MapContainer
      center={BENIN_CENTER}
      zoom={8}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "var(--surface-2)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map(({ p, pos }) => {
        const color = STATUT_COLOR[p.statut];
        const active = selectedId === p.ref || hoverId === p.ref;
        return (
          <Fragment key={p.ref}>
            <Polygon
              positions={squareAround(pos)}
              pathOptions={{
                color,
                weight: active ? 3 : 1.5,
                fillColor: color,
                fillOpacity: active ? 0.45 : 0.25,
              }}
              eventHandlers={{
                click: () => onSelect(p.ref),
                mouseover: () => onHover(p.ref),
                mouseout: () => onHover(null),
              }}
            />
            <CircleMarker
              center={pos}
              radius={active ? 10 : 7}
              pathOptions={{
                color: "#FFFDF9",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => onSelect(p.ref),
                mouseover: () => onHover(p.ref),
                mouseout: () => onHover(null),
              }}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-plex-mono), monospace",
                      fontSize: 11,
                      color: "#5A554C",
                    }}
                  >
                    {p.ref} · {STATUT_META[p.statut].label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-outfit), sans-serif",
                      fontWeight: 600,
                      fontSize: 15,
                      margin: "2px 0",
                    }}
                  >
                    {p.ville} · {p.quartier}
                  </div>
                  <div style={{ fontSize: 12, color: "#5A554C" }}>
                    {p.surf} m² · {fmtFCFA(p.monthlyPayment7Years ?? 0)} F/mois sur 7 ans
                  </div>
                  <a
                    href={`/parcelles/${p.ref}`}
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      color: "#B1502F",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Voir la parcelle →
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        );
      })}

      <MapController parcelles={parcelles} selectedId={selectedId} hoverId={hoverId} />
    </MapContainer>
  );
}
