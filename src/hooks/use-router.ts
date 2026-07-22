"use client";

/**
 * Router de navigation branché sur le top loader (`NextTopLoader`).
 *
 * `next/link` déclenche la barre de progression automatiquement, mais pas
 * `router.push()` / `router.replace()` : il faudrait sinon appeler
 * `NProgress.start()` à la main avant chaque navigation. Ce hook réexporte le
 * `useRouter` de `nextjs-toploader/app`, qui enrobe `push`/`replace`/`back`/
 * `forward` pour démarrer la barre à chaque navigation programmatique.
 *
 * Usage : remplacer `import { useRouter } from "next/navigation"` par
 * `import { useRouter } from "@/hooks/use-router"`. L'API est identique
 * (`AppRouterInstance`), donc c'est un drop-in.
 *
 * Pour un contrôle manuel de la barre (ex. pendant une Server Action longue),
 * `useTopLoader()` expose `start` / `done` / `setProgress` / `inc`.
 */
export { useRouter } from "nextjs-toploader/app";
export { useTopLoader } from "nextjs-toploader";
