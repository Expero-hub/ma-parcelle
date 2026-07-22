"use client";

import dynamic from "next/dynamic";

export const CadastralPreviewMap = dynamic(
  () => import("./cadastral-preview-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-surface-2 text-sm text-text-2">
        Chargement de la carte...
      </div>
    ),
  }
);
export default CadastralPreviewMap;
