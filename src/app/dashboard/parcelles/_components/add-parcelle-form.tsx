"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2, MapPin, Upload, X, Check, ChevronsUpDown } from "lucide-react";
import { z } from "zod";
import dynamic from "next/dynamic";

import { useRouter } from "@/hooks/use-router";
import { http, type NormalizedError } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Load Leaflet map point picker dynamically (disable SSR)
const MapPointPicker = dynamic(() => import("./map-point-picker"), { ssr: false });

const parcelleSchema = z.object({
  reference: z.string().min(1, "La référence est requise."),
  area: z.coerce.number().positive("La superficie doit être supérieure à 0."),
  price: z.coerce.number().nonnegative("Le prix ne peut pas être négatif."),
  minDuration: z.coerce.number().int().nonnegative("La durée minimale doit être positive."),
  maxDuration: z.coerce.number().int().nonnegative("La durée maximale doit être positive."),
  pointOfSaleId: z.string().min(1, "Le point de vente est requis."),
  zoneId: z.string().min(1, "La zone est requise."),
  description: z.string().optional(),
  points: z
    .array(
      z.object({
        lng: z.coerce.number().min(-180).max(180),
        lat: z.coerce.number().min(-90).max(90),
      })
    )
    .min(3, "Définissez au moins 3 points pour le polygone."),
});

type FormValues = z.infer<typeof parcelleSchema>;

type Option = { id: string; name: string };
type ZoneOption = { id: string; code: string; commune: string; department: string };

type InitialData = {
  id: string;
  reference: string;
  area: number;
  price: number;
  minDuration: number;
  maxDuration: number;
  pointOfSaleId: string;
  zoneId: string;
  description: string;
  geom: { coordinates: [number, number][][] } | any;
  images: { id: string; path: string }[];
  status?: string;
};

export function AddParcelleForm({
  pointsOfSale,
  zones,
  initialData,
}: {
  pointsOfSale: Option[];
  zones: ZoneOption[];
  initialData?: InitialData;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Images state (holds URLs of uploaded images)
  const [images, setImages] = useState<string[]>(
    initialData ? initialData.images.map((img) => img.path) : []
  );

  // Hydration state & Map picker active index
  const [mounted, setMounted] = useState(false);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse initial coordinates if editing
  const initialPoints = useMemo(() => {
    if (initialData?.geom?.coordinates?.[0]) {
      // GeoJSON standard is [[[lng, lat], [lng, lat], ...]]
      // Let's extract them, ignoring the closing duplicate point if it matches the first
      const rawCoords = initialData.geom.coordinates[0];
      const pts = rawCoords.map((c: any) => ({ lng: c[0], lat: c[1] }));
      if (pts.length > 1 && pts[0].lng === pts[pts.length - 1].lng && pts[0].lat === pts[pts.length - 1].lat) {
        pts.pop();
      }
      return pts;
    }
    return [];
  }, [initialData]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(parcelleSchema) as any,
    defaultValues: {
      reference: initialData?.reference ?? "",
      area: initialData?.area ?? 0,
      price: initialData?.price ?? 0,
      minDuration: initialData?.minDuration ?? 0,
      maxDuration: initialData?.maxDuration ?? 0,
      pointOfSaleId: initialData?.pointOfSaleId ?? "",
      zoneId: initialData?.zoneId ?? "",
      description: initialData?.description ?? "",
      points: initialPoints,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "points",
  });

  const zoneId = watch("zoneId");
  const pointOfSaleId = watch("pointOfSaleId");
  const points = watch("points") ?? [];
  const selectedZone = useMemo(() => zones.find((z) => z.id === zoneId), [zoneId, zones]);
  const selectedPointOfSale = useMemo(
    () => pointsOfSale.find((p) => p.id === pointOfSaleId),
    [pointOfSaleId, pointsOfSale]
  );

  // Handle multi-image upload
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await http.post<{ urls: string[] }>("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages((prev) => [...prev, ...res.data.urls]);
    } catch (err) {
      const error = err as NormalizedError;
      setFormError(`Échec de l'upload des images: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Focus map on selected point index
  function openMapPicker(index: number) {
    setActivePointIndex(index);
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);

    // Build GeoJSON Polygon geometry.
    // Standard Polygon coordinates has first and last point identical: [[[lng, lat], ..., [firstLng, firstLat]]]
    const coords = values.points.map((pt) => [pt.lng, pt.lat]);
    coords.push([values.points[0].lng, values.points[0].lat]); // Close polygon
    const geom = {
      type: "Polygon",
      coordinates: [coords],
    };

    const payload = {
      reference: values.reference,
      area: values.area,
      price: values.price,
      minDuration: values.minDuration,
      maxDuration: values.maxDuration,
      pointOfSaleId: values.pointOfSaleId,
      zoneId: values.zoneId,
      description: values.description,
      geom,
      images,
      ...(initialData ? { status: initialData.status } : {}),
    };

    try {
      if (initialData) {
        await http.patch(`/parcelles/${initialData.id}`, payload);
      } else {
        await http.post("/parcelles", payload);
      }
      router.push("/dashboard/parcelles");
      router.refresh();
    } catch (err) {
      const error = err as NormalizedError;
      setFormError(error.message);
    }
  }

  // Prevent hydration issues with dynamically rendered Leaflet components
  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-text-2 bg-surface rounded-2xl border border-border">
        Chargement du formulaire de parcelle...
      </div>
    );
  }

  const labelCls = "mb-1 block text-sm font-medium text-text";
  const errCls = "mt-1 text-xs text-alert";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl" noValidate>
      {/* SECTION IMAGES */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="mb-2 text-base font-semibold text-text">Images de la parcelle (optionnel)</h2>
        <p className="text-xs text-text-2 mb-4">Ajoutez des photos pour illustrer la parcelle</p>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex h-24 w-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 transition-colors hover:bg-surface-2/80">
            <Upload className="h-6 w-6 text-text-2 mb-1" />
            <span className="text-xs font-semibold text-text-2">
              {isUploading ? "Upload en cours..." : "Ajouter des images"}
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </label>
          <span className="text-xs font-medium text-text-2">{images.length} image(s) sélectionnée(s)</span>
        </div>

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((url, idx) => (
              <div key={idx} className="group relative h-28 overflow-hidden rounded-xl border border-border bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Parcelle photo ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-2 right-2 rounded-full bg-alert/80 p-1 text-white opacity-0 transition-opacity hover:bg-alert group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
                {idx === 0 && (
                  <span className="absolute bottom-2 left-2 rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-semibold text-on-secondary">
                    Principale
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INFORMATIONS GENERALES */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="mb-4 text-base font-semibold text-text">Informations générales</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="reference">
              Référence de la parcelle
            </label>
            <Input id="reference" placeholder="Ex: Lot B12 — Les Palmiers" {...register("reference")} />
            {errors.reference && <p className={errCls}>{errors.reference.message}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="area">
              Superficie (m²)
            </label>
            <Input id="area" type="number" placeholder="Ex: 500" {...register("area")} />
            {errors.area && <p className={errCls}>{errors.area.message}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="price">
              Montant (FCFA)
            </label>
            <Input id="price" type="number" placeholder="Ex: 18500000" {...register("price")} />
            {errors.price && <p className={errCls}>{errors.price.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} htmlFor="minDuration">
                Durée min (ans)
              </label>
              <Input id="minDuration" type="number" {...register("minDuration")} />
              {errors.minDuration && <p className={errCls}>{errors.minDuration.message}</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="maxDuration">
                Durée max (ans)
              </label>
              <Input id="maxDuration" type="number" {...register("maxDuration")} />
              {errors.maxDuration && <p className={errCls}>{errors.maxDuration.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Point de vente</label>
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    role="combobox"
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-left text-sm text-text font-medium"
                  />
                }
              >
                <span className="truncate">
                  {selectedPointOfSale
                    ? selectedPointOfSale.name
                    : "Sélectionnez votre point de vente"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-2" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un point de vente..." />
                  <CommandList className="max-h-56">
                    <CommandEmpty>Aucun point de vente trouvé.</CommandEmpty>
                    <CommandGroup>
                      {pointsOfSale.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => setValue("pointOfSaleId", p.id, { shouldValidate: true })}
                        >
                          <Check
                            className={cn("h-4 w-4 mr-2", pointOfSaleId === p.id ? "opacity-100" : "opacity-0")}
                          />
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.pointOfSaleId && <p className={errCls}>{errors.pointOfSaleId.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Zone</label>
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    role="combobox"
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-left text-sm text-text font-medium"
                  />
                }
              >
                <span className="truncate">
                  {selectedZone
                    ? `${selectedZone.code} — ${selectedZone.commune} (${selectedZone.department})`
                    : "Sélectionnez une zone"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-2" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">
                <Command>
                  <CommandInput placeholder="Rechercher une zone..." />
                  <CommandList className="max-h-56">
                    <CommandEmpty>Aucune zone disponible.</CommandEmpty>
                    <CommandGroup>
                      {zones.map((z) => (
                        <CommandItem
                          key={z.id}
                          value={z.code + " " + z.commune}
                          onSelect={() => setValue("zoneId", z.id, { shouldValidate: true })}
                        >
                          <Check
                            className={cn("h-4 w-4 mr-2", zoneId === z.id ? "opacity-100" : "opacity-0")}
                          />
                          {z.code} — {z.commune} ({z.department})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.zoneId && <p className={errCls}>{errors.zoneId.message}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className={labelCls} htmlFor="description">
            Description
          </label>
          <Textarea id="description" placeholder="Description de la parcelle..." rows={3} {...register("description")} />
        </div>
      </div>

      {/* DELIMITATION GEOGRAPHIQUE */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="mb-2 text-base font-semibold text-text">Délimitation géographique</h2>
        <p className="text-xs text-text-2 mb-4">
          Définissez les points du polygone pour délimiter la parcelle (minimum 3 points). Cliquez sur la carte pour ajouter des sommets ou déplacez les marqueurs directement.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Map on the left */}
          <div className="h-[400px] w-full bg-surface-2/10 rounded-xl overflow-hidden p-2 border border-border">
            <MapPointPicker
              points={points}
              onPointsChange={(updatedPoints) => setValue("points", updatedPoints, { shouldValidate: true })}
              activePointIndex={activePointIndex}
              setActivePointIndex={setActivePointIndex}
            />
          </div>

          {/* Points list on the right */}
          <div className="flex flex-col gap-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-xl border border-border p-3 bg-surface-2/30">
                  <div className="flex-1 grid gap-3 grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-text-2 uppercase">Longitude (Point {idx + 1})</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ex: 2.420463"
                        className="h-9 text-xs"
                        {...register(`points.${idx}.lng`)}
                      />
                      {errors.points?.[idx]?.lng && (
                        <p className={errCls}>{errors.points?.[idx]?.lng?.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-text-2 uppercase">Latitude (Point {idx + 1})</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ex: 6.371539"
                        className="h-9 text-xs"
                        {...register(`points.${idx}.lat`)}
                      />
                      {errors.points?.[idx]?.lat && (
                        <p className={errCls}>{errors.points?.[idx]?.lat?.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openMapPicker(idx)}
                      title="Centrer la carte sur ce point"
                      className={cn("h-9 w-9 border-border hover:bg-surface-2 transition-colors", activePointIndex === idx && "border-amber-600 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20")}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                    {/* {fields.length > 3 && ( */}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 text-alert border-border hover:bg-alert/10 hover:text-alert transition-colors"
                        onClick={() => remove(idx)}
                        title="Supprimer ce point"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    {/* )} */}
                  </div>
                </div>
              ))}
            </div>

            {errors.points && typeof errors.points.message === "string" && (
              <p className="text-sm text-alert">{errors.points.message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs font-semibold"
              onClick={() => append({ lng: 2.420463, lat: 6.371539 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter un point
            </Button>
          </div>
        </div>
      </div>

      {formError && <p className="text-sm text-alert">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting
            ? "Enregistrement..."
            : initialData
              ? "Enregistrer les modifications"
              : "Enregistrer la parcelle"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/parcelles")}
          disabled={isSubmitting || isUploading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
export default AddParcelleForm;
