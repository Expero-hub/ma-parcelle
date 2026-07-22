"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GeocodeResult } from "@/lib/geocode";
import { AddressAutocomplete } from "./address-autocomplete";

type ZoneFormState = {
  id?: string;
  code: string;
  fullAddress: string;
  department: string;
  commune: string;
  district: string;
  latitude: string;
  longitude: string;
};

const EMPTY_STATE: ZoneFormState = {
  code: "",
  fullAddress: "",
  department: "",
  commune: "",
  district: "",
  latitude: "",
  longitude: "",
};

export function AddZoneModal({
  initialZone,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: {
  initialZone?: ZoneFormState;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Appelé après une création ou modification réussie, pour que le parent puisse rafraîchir sa liste. */
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setLocalOpen;

  const [form, setForm] = useState<ZoneFormState>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mode = initialZone ? "edit" : "create";

  useEffect(() => {
    if (open && initialZone) {
      setForm(initialZone);
    } else if (open) {
      setForm(EMPTY_STATE);
    }
  }, [open, initialZone]);

  function handleGeocodeSelect(result: GeocodeResult) {
    setForm((prev) => ({
      ...prev,
      code: result.code,
      fullAddress: result.fullAddress,
      department: result.department ?? "",
      commune: result.commune ?? "",
      district: result.district ?? "",
      latitude: Number.isFinite(result.latitude)
        ? result.latitude.toFixed(6)
        : "",
      longitude: Number.isFinite(result.longitude)
        ? result.longitude.toFixed(6)
        : "",
    }));
  }

  function handleSubmit() {
    if (!form.code.trim()) {
      setError("Le code de la zone est requis.");
      return;
    }
    if (!form.commune.trim()) {
      setError("Sélectionnez une adresse pour renseigner la commune.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          code: form.code.trim(),
          fullAddress: form.fullAddress.trim() || null,
          department: form.department.trim() || null,
          commune: form.commune.trim() || null,
          district: form.district.trim() || null,
          latitude: form.latitude ? Number.parseFloat(form.latitude) : null,
          longitude: form.longitude ? Number.parseFloat(form.longitude) : null,
        };

        const url = mode === "edit" ? `/api/zones/${form.id}` : "/api/zones";
        const methodStr = mode === "edit" ? "PATCH" : "POST";

        const response = await fetch(url, {
          method: methodStr,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(
            data?.error ?? "Une erreur est survenue. Veuillez réessayer.",
          );
          return;
        }

        setForm(EMPTY_STATE);
        setOpen(false);
        // Prévient le parent (ZonesBoard) qu'il doit relancer SON propre fetch
        // client, car router.refresh() seul ne suffit pas à mettre à jour
        // un state local déjà monté dans un client component.
        onSuccess?.();
        router.refresh();
      } catch {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          setForm(EMPTY_STATE);
          setError(null);
          if (onOpenChange) {
            onOpenChange(false);
          }
        }
      }}
    >
      {trigger !== null && (
        <DialogTrigger>
          {trigger ? (
            trigger
          ) : (
            <Button className="h-10">
              <PlusCircle className="h-4 w-4" />
              Ajouter une zone
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="border-border bg-surface text-text sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-text">
            {mode === "create"
              ? "Ajouter une nouvelle zone"
              : "Modifier la zone"}
          </DialogTitle>
          <DialogDescription className="text-text-2">
            {mode === "create"
              ? "Recherchez un quartier pour pré-remplir la localisation, puis ajustez si besoin."
              : "Modifiez les informations de la zone en recherchant une nouvelle adresse."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-text">Rechercher une adresse</Label>
            <AddressAutocomplete
              onSelect={handleGeocodeSelect}
              initialValue={form.fullAddress}
            />
            
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zone-code" className="text-text">
                Code
              </Label>
              <Input
                id="zone-code"
                value={form.code}
                disabled
                className="border-border bg-surface-2 text-text-2 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-department" className="text-text">
                Département
              </Label>
              <Input
                id="zone-department"
                value={form.department}
                disabled
                className="border-border bg-surface-2 text-text-2 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-commune" className="text-text">
                Commune (ville)
              </Label>
              <Input
                id="zone-commune"
                value={form.commune}
                disabled
                className="border-border bg-surface-2 text-text-2 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-district" className="text-text">
                Quartier
              </Label>
              <Input
                id="zone-district"
                value={form.district}
                disabled
                className="border-border bg-surface-2 text-text-2 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-lat" className="text-text">
                Latitude
              </Label>
              <Input
                id="zone-lat"
                value={form.latitude}
                disabled
                className="border-border bg-surface-2 text-text-2 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-lng" className="text-text">
                Longitude
              </Label>
              <Input
                id="zone-lng"
                value={form.longitude}
                disabled
                className="border-border bg-surface-2 text-text-2 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-address" className="text-text">
              Adresse complète
            </Label>
            <Textarea
              id="zone-address"
              value={form.fullAddress}
              disabled
              rows={2}
              className="border-border bg-surface-2 text-text-2 cursor-not-allowed"
            />
          </div>

          {error && <p className="text-sm text-alert">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button className="h-10" onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Ajout..."
                : "Modification..."
              : mode === "create"
                ? "Ajouter"
                : "Modifier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
