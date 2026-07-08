import type { NextRequest } from "next/server";

import { toErrorResponse } from "@/lib/api/errors";

/** Enrobe un handler de route : try/catch centralisé → enveloppe d'erreur standard. */
export function route(fn: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
