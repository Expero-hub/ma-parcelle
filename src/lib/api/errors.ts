import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

/** Erreur applicative avec code HTTP + code métier. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

type ErrorBody = { error: { code: string; message: string; fieldErrors?: Record<string, string> } };

/** Convertit n'importe quelle erreur en réponse JSON normalisée. */
export function toErrorResponse(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Données invalides.", fieldErrors } },
      { status: 422 },
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Cette ressource existe déjà." } },
        { status: 409 },
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ressource introuvable." } },
        { status: 404 },
      );
    }
  }

  console.error("[api] Unhandled error:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Une erreur interne est survenue." } },
    { status: 500 },
  );
}
