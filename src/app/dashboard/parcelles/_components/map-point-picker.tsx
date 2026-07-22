"use client";

import { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMapEvents, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import { Search, MapPin, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COTONOU_CENTER: LatLngExpression = [6.371539, 2.420463]; // Cotonou, Benin

// Fit bounds of the polygon once on mount
function MapFitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (points.length >= 3 && !hasFit.current) {
      try {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
        hasFit.current = true;
      } catch (err) {
        console.error("Failed to fit bounds", err);
      }
    }
  }, [points, map]);

  return null;
}

// Handle map click events to add points and map flight centering
function MapEventsHandler({
  onMapClick,
  centerPos,
}: {
  onMapClick: (lat: number, lng: number) => void;
  centerPos: [number, number] | null;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (centerPos) {
      map.setView(centerPos, Math.max(map.getZoom(), 15));
    }
  }, [centerPos, map]);

  return null;
}

interface MapPointPickerProps {
  points: { lat: number; lng: number }[];
  onPointsChange: (points: { lat: number; lng: number }[]) => void;
  activePointIndex: number | null;
  setActivePointIndex: (index: number | null) => void;
}

export function MapPointPicker({
  points,
  onPointsChange,
  activePointIndex,
  setActivePointIndex,
}: MapPointPickerProps) {
  const [geoQuery, setGeoQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Address search via OpenStreetMap Nominatim
  const runGeocode = async () => {
    const q = geoQuery.trim();
    if (!q) return;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { "Accept-Language": "fr" } }
      );
      const j = await r.json();
      if (j && j[0]) {
        const lat = parseFloat(j[0].lat);
        const lon = parseFloat(j[0].lon);
        setMapCenter([lat, lon]);
      }
    } catch (e) {
      console.warn("Geocode failed", e);
    }
  };

  const handleGeoKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runGeocode();
    }
  };

  // Import points from a GeoJSON file
  const handleImportGeoJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const gj = JSON.parse(reader.result as string);
        let coords: [number, number][] | null = null;
        const geom = (o: any) =>
          o.type === "FeatureCollection"
            ? o.features[0].geometry
            : o.type === "Feature"
            ? o.geometry
            : o;
        const g = geom(gj);
        if (g.type === "Polygon") {
          coords = g.coordinates[0];
        } else if (g.type === "MultiPolygon") {
          coords = g.coordinates[0][0];
        } else if (g.type === "LineString") {
          coords = g.coordinates;
        }
        if (coords) {
          const pts = coords.map((c: any) => ({
            lat: parseFloat(c[1]),
            lng: parseFloat(c[0]),
          }));
          // Remove closing duplicate if it matches the first one
          if (
            pts.length > 1 &&
            pts[0].lat === pts[pts.length - 1].lat &&
            pts[0].lng === pts[pts.length - 1].lng
          ) {
            pts.pop();
          }
          onPointsChange(pts);
          if (pts.length > 0) {
            setMapCenter([pts[0].lat, pts[0].lng]);
          }
        }
      } catch (err) {
        console.warn("GeoJSON parse failed", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Add a point by clicking on the map
  const handleMapClick = (lat: number, lng: number) => {
    const newPoint = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
    const updated = [...points, newPoint];
    onPointsChange(updated);
    setActivePointIndex(updated.length - 1);
  };

  // Update specific point when its marker is dragged
  const handleMarkerDrag = (idx: number, lat: number, lng: number) => {
    const updated = points.map((p, i) =>
      i === idx ? { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) } : p
    );
    onPointsChange(updated);
  };

  // Center on active point when index changes
  useEffect(() => {
    if (activePointIndex !== null && points[activePointIndex]) {
      const activePoint = points[activePointIndex];
      setMapCenter([activePoint.lat, activePoint.lng]);
    }
  }, [activePointIndex, points]);

  const defaultCenter: LatLngExpression =
    points.length > 0 ? [points[0].lat, points[0].lng] : COTONOU_CENTER;

  // Custom icon styled orange numbered circle
  const createNumberedIcon = (num: number, isActive: boolean) => {
    const border = isActive ? "border-amber-700 ring-2 ring-amber-500/50" : "border-white";
    const bg = isActive ? "bg-amber-600" : "bg-[#c05a35]";
    return L.divIcon({
      className: "",
      html: `<div class="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-extrabold border-2 ${border} ${bg} shadow-md transition-all cursor-grab">${num}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className="flex flex-col h-full w-full gap-3">
      {/* Geocoding and GeoJSON upload tools */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-2" />
          <Input
            value={geoQuery}
            onChange={(e) => setGeoQuery(e.target.value)}
            onKeyDown={handleGeoKey}
            placeholder="Rechercher une adresse / lieu..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={runGeocode}
          className="h-9 px-3 text-xs bg-surface-2 hover:bg-surface-2/80 font-semibold"
        >
          Localiser
        </Button>
        <label className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg border border-border bg-surface-2 hover:bg-surface-2/80 cursor-pointer transition-colors text-text shadow-[var(--shadow-xs)]">
          <Upload className="h-3.5 w-3.5" />
          Importer GeoJSON
          <input
            type="file"
            accept=".json,.geojson,application/json"
            onChange={handleImportGeoJSON}
            className="hidden"
          />
        </label>
      </div>

      {/* Leaflet Map */}
      <div className="flex-1 w-full relative min-h-[300px] rounded-xl border border-border overflow-hidden bg-surface-2">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          className="h-full w-full z-10"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draw Polygon if at least 3 points */}
          {points.length >= 3 && (
            <Polygon
              positions={points.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: "#c05a35",
                weight: 2.5,
                fillColor: "#c05a35",
                fillOpacity: 0.22,
              }}
            />
          )}

          {/* Draw temporary dashed line if exactly 2 points */}
          {points.length === 2 && (
            <Polyline
              positions={points.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: "#c05a35",
                weight: 2,
                dashArray: "6, 5",
              }}
            />
          )}

          {/* Draggable Markers for all vertices */}
          {points.map((p, idx) => (
            <Marker
              key={idx}
              position={[p.lat, p.lng]}
              draggable={true}
              icon={createNumberedIcon(idx + 1, activePointIndex === idx)}
              eventHandlers={{
                click: () => {
                  setActivePointIndex(idx);
                },
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  handleMarkerDrag(idx, pos.lat, pos.lng);
                  setActivePointIndex(idx);
                },
              }}
            />
          ))}

          {/* Fit map bounds once on mount */}
          <MapFitBounds points={points} />

          {/* Handle search centering and map clicks to append points */}
          <MapEventsHandler onMapClick={handleMapClick} centerPos={mapCenter} />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPointPicker;
