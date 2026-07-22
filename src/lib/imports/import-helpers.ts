import * as XLSX from "xlsx";

export type RowResult = {
  line: number;
  status: "created" | "skipped" | "error";
  reference?: string;
  message?: string;
  warnings?: string[];
};

export type ImportSummary = {
  total: number;
  created: number;
  skipped: number;
  errors: number;
};

export type ImportResponse = {
  success: boolean;
  summary: ImportSummary;
  rows: RowResult[];
  message?: string;
};

/**
 * Normalise un nom d'en-tête (trim + majuscules + suppression des espaces superflus).
 */
export function normalizeHeader(header: unknown): string {
  if (!header) return "";
  return String(header)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/**
 * Normalise une chaîne pour comparaison (casse et accents insensibles).
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nettoie et convertit une valeur en nombre (montant).
 * Supprime les mentions comme "FCFA", "F CFA", "F", les espaces et séparateurs de milliers.
 */
export function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;

  let str = String(val).trim().toUpperCase();
  str = str
    .replace(/FCFA/g, "")
    .replace(/F CFA/g, "")
    .replace(/F/g, "")
    .replace(/[\s\u00A0]+/g, "");

  if (/^\d+,\d{1,2}$/.test(str)) {
    str = str.replace(",", ".");
  } else {
    str = str.replace(/,/g, "");
  }

  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Parse une date depuis divers formats (JS Date, série Excel, ISO, DD/MM/YYYY).
 */
export function parseDate(val: unknown): Date | null {
  if (!val) return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  if (typeof val === "number") {
    // Série temporelle Excel (Epoch 1899-12-30)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Format français DD/MM/YYYY ou DD-MM-YYYY
  const frMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (frMatch) {
    const day = parseInt(frMatch[1], 10);
    const month = parseInt(frMatch[2], 10) - 1;
    const year = parseInt(frMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format ISO YYYY-MM-DD
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Extrait les données d'un fichier FormData Excel ou CSV.
 */
export async function parseFileFromRequest(req: Request): Promise<{
  headerMap: Map<string, number>;
  dataRows: unknown[][];
  errorResponse?: ImportResponse;
}> {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return {
      headerMap: new Map(),
      dataRows: [],
      errorResponse: {
        success: false,
        summary: { total: 0, created: 0, skipped: 0, errors: 0 },
        rows: [],
        message: "Format de requête invalide (FormData attendu).",
      },
    };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return {
      headerMap: new Map(),
      dataRows: [],
      errorResponse: {
        success: false,
        summary: { total: 0, created: 0, skipped: 0, errors: 0 },
        rows: [],
        message: "Aucun fichier valide n'a été fourni dans le champ 'file'.",
      },
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        headerMap: new Map(),
        dataRows: [],
        errorResponse: {
          success: false,
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
          rows: [],
          message: "Le fichier ne contient aucune feuille de calcul.",
        },
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });

    if (rawRows.length === 0) {
      return {
        headerMap: new Map(),
        dataRows: [],
        errorResponse: {
          success: false,
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
          rows: [],
          message: "Le fichier est vide.",
        },
      };
    }

    const headerRow = rawRows[0] as unknown[];
    const headerMap = new Map<string, number>();

    headerRow.forEach((h, index) => {
      const norm = normalizeHeader(h);
      if (norm) {
        headerMap.set(norm, index);
      }
    });

    const dataRows = rawRows.slice(1);

    return { headerMap, dataRows };
  } catch (err) {
    console.error("Erreur de lecture du fichier Excel/CSV:", err);
    return {
      headerMap: new Map(),
      dataRows: [],
      errorResponse: {
        success: false,
        summary: { total: 0, created: 0, skipped: 0, errors: 0 },
        rows: [],
        message: "Impossible de lire le fichier. Assurez-vous qu'il s'agit d'un fichier .xlsx ou .csv valide.",
      },
    };
  }
}

/**
 * Calcule le résumé global à partir des résultats par ligne.
 */
export function buildImportSummary(rows: RowResult[]): ImportSummary {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of rows) {
    if (r.status === "created") created++;
    else if (r.status === "skipped") skipped++;
    else if (r.status === "error") errors++;
  }

  return {
    total: rows.length,
    created,
    skipped,
    errors,
  };
}
