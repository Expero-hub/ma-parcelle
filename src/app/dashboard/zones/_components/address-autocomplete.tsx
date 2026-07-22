"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { GeocodeResult } from "@/lib/geocode";

export function AddressAutocomplete({
  onSelect,
  initialValue = "",
  placeholder = "Ex: Fidjrosse, Akpakpa, Calavi...",
}: {
  onSelect: (result: GeocodeResult) => void;
  initialValue?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    // 500ms de debounce : respecte la limite Nominatim (1 requete/seconde) et
    // evite de spammer l'API a chaque frappe.
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
        const data = await response.json();
        if (!response.ok) {
          setError(data?.error ?? "Recherche indisponible.");
          setResults([]);
        } else {
          setResults(data.results ?? []);
          setOpen(true);
        }
      } catch {
        setError("Recherche indisponible.");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(result: GeocodeResult) {
    onSelect(result);
    setQuery(result.label);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="border-border bg-surface pl-9 text-text focus-visible:ring-primary"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-2" />
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {error && <p className="px-3 py-3 text-sm text-alert">{error}</p>}
          {!error &&
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelect(result)}
                className="flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-2"
              >
                <span className="text-sm font-medium text-text">
                  {[result.district, result.commune].filter(Boolean).join(", ") || result.label}
                </span>
                <span className="text-xs text-text-2">{result.fullAddress}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
