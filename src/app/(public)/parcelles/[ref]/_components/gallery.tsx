"use client";

import { useState } from "react";
import Image from "next/image";

const HATCH_LG =
  "repeating-linear-gradient(135deg,var(--surface-2),var(--surface-2) 12px,transparent 12px,transparent 24px),var(--bg)";
const HATCH_SM =
  "repeating-linear-gradient(135deg,var(--surface-2),var(--surface-2) 8px,transparent 8px,transparent 16px),var(--bg)";

const DEFAULT_GALLERY_IMAGES = [
  "/images/hero/hero4.jpg",
  "/images/hero/hero3.jpg",
  "/images/hero/hero2.jpg",
];

export function Gallery({ images }: { images?: string[] }) {
  const displayImages =
    images && images.length > 0 ? images : DEFAULT_GALLERY_IMAGES;

  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Guarantee valid index
  const safeIdx = selectedIdx < displayImages.length ? selectedIdx : 0;
  const currentMainImage = displayImages[safeIdx];

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Grande Image Principale */}
      <div
        className="relative aspect-video overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300"
        style={{ background: HATCH_LG }}
      >
        {currentMainImage ? (
          <Image
            src={currentMainImage}
            alt="Vue principale du terrain"
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 800px"
            className="object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-text-2 opacity-55">
            photo-terrain · 16:9
          </div>
        )}
      </div>

      {/* Grid de 3 petites images / vignettes */}
      <div className="grid grid-cols-3 gap-[10px]">
        {displayImages.slice(0, 3).map((imgPath, idx) => {
          const isSelected = safeIdx === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-primary border-primary scale-[1.02]"
                  : "border-border hover:opacity-90 opacity-75"
              }`}
              style={{ background: HATCH_SM }}
              aria-label={`Afficher la photo ${idx + 1}`}
            >
              {imgPath ? (
                <Image
                  src={imgPath}
                  alt={`Vue terrain ${idx + 1}`}
                  fill
                  sizes="260px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-text-2 opacity-50">
                  vue-{idx + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


