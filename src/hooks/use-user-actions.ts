"use client";

import { useState } from "react";

import { useRouter } from "@/hooks/use-router";
import { http, type NormalizedError } from "@/lib/http";

/**
 * Actions de mutation sur un utilisateur (activer/désactiver, supprimer).
 * Encapsule l'appel API + le rafraîchissement (via le router branché au top loader).
 */
export function useUserActions() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(id: string, active: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await http.patch(`/users/${id}`, { active: !active });
      router.refresh();
    } catch (e) {
      setError((e as NormalizedError).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, hard: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await http.delete(`/users/${id}${hard ? "?hard=true" : ""}`);
      router.refresh();
    } catch (e) {
      setError((e as NormalizedError).message);
    } finally {
      setBusyId(null);
    }
  }

  return { busyId, error, toggleActive, remove };
}
