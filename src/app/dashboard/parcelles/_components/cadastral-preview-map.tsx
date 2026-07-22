"use client";

import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import L from "leaflet";

function MapController({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = positions as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    }
  }, [positions, map]);

  return null;
}

export function CadastralPreviewMap({ geom }: { geom: any }) {
  const positions = useMemo<LatLngExpression[]>(() => {
    if (geom?.coordinates?.[0]) {
      const rawCoords = geom.coordinates[0];
      // Convert standard GeoJSON [lng, lat] to Leaflet [lat, lng]
      return rawCoords.map((c: any) => [c[1], c[0]] as LatLngExpression);
    }
    return [];
  }, [geom]);

  if (positions.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-border bg-surface-2 text-text-2 font-medium">
        Emprise cadastrale non définie
      </div>
    );
  }

  const center: LatLngExpression = positions[0];

  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl border border-border bg-surface-2 relative">
      <MapContainer center={center} zoom={15} className="h-full w-full" style={{ background: "var(--surface-2)" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polygon
          positions={positions}
          pathOptions={{
            color: "#B1502F",
            weight: 3,
            fillColor: "#B1502F",
            fillOpacity: 0.3,
          }}
        />
        <MapController positions={positions} />
      </MapContainer>
      <span className="absolute bottom-3 right-3 z-400 rounded-md bg-surface/90 border border-border px-2 py-1 text-[10px] font-semibold text-text shadow-sm">
        {positions.length - 1} points · polygone
      </span>
    </div>
  );
}
export default CadastralPreviewMap;
