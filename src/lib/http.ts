import axios, { AxiosError } from "axios";

/** Erreur normalisée exposée aux appelants. */
export type NormalizedError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
};

export const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: NormalizedError }>) => {
    if (error.response) {
      const body = error.response.data?.error;
      const normalized: NormalizedError = {
        code: body?.code ?? "HTTP_ERROR",
        message: body?.message ?? "Une erreur est survenue.",
        fieldErrors: body?.fieldErrors,
        status: error.response.status,
      };
      return Promise.reject(normalized);
    }
    const normalized: NormalizedError = {
      code: error.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR",
      message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
    };
    return Promise.reject(normalized);
  },
);
