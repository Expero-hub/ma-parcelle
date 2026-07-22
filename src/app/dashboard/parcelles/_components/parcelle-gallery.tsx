"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ParcelleGallery({ images }: { images: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-border bg-surface-2 text-text-2 font-medium">
        Aucune photo disponible
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Big Main Image */}
      <div className="relative h-96 w-full overflow-hidden rounded-2xl border border-border bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeIdx]}
          alt={`Photo principale de la parcelle`}
          className="h-full w-full object-cover transition-all duration-300"
        />
        <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-xs">
          PHOTO {activeIdx === 0 ? "PRINCIPALE" : `${activeIdx + 1}`}
        </span>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "h-16 w-24 overflow-hidden rounded-lg border bg-surface-2 transition-all hover:opacity-90",
                activeIdx === idx ? "border-primary ring-2 ring-primary/20 scale-102" : "border-border"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Miniature ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export default ParcelleGallery;
