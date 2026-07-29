/**
 * Simulation de prime pour la vente de parcelles.
 *
 * Traduction TypeScript pure (aucune dépendance Excel/VBA/NestJS) des
 * formules de la feuille "Simul Dev" du classeur Excel d'origine.
 * Utilisable directement dans une API route, une server action, ou
 * un composant client Next.js.
 *
 * STATELESS : ces fonctions ne lisent ni n'écrivent rien en base.
 * Tu leur passes la parcelle (déjà chargée, avec ses paramètres
 * techniques) et la saisie du client, elles renvoient le résultat.
 */

import {
  BaremeTechniqueDefaut,
  FrequencePaiement,
  ParcelleTechnicalOverrides,
  SimulationClientInput,
  SimulationInput,
  SimulationParcelleParams,
  SimulationResult,
  libelleFrequence,
} from './simulation.types';

// ============================================================
// 1. Table de mortalité CIMA H (L(x) = nombre de survivants à l'âge x)
//    Index 0 = L(0). Constante actuarielle, ne dépend d'aucun fichier Excel.
// ============================================================
const TABLE_MORTALITE: number[] = [
  1000000, 994632, 993906, 993351, 992878, 992474, 992105, 991773, 991460, 991147,
  990853, 990541, 990228, 989860, 989422, 988884, 988176, 987279, 986166, 984848,
  983382, 981830, 980227, 978596, 976943, 975262, 973552, 971800, 970004, 968166,
  966281, 964354, 962390, 960362, 958244, 956000, 953632, 951116, 948445, 945596,
  942539, 939243, 935659, 931782, 927588, 923065, 918199, 912999, 907484, 901669,
  895561, 889166, 882462, 875435, 868076, 860365, 852299, 843874, 834933, 825402,
  815120, 804094, 792181, 779390, 765737, 751090, 735479, 718901, 701530, 683352,
  664363, 644551, 623917, 602490, 580303, 557382, 533740, 509389, 484367, 458695,
  432348, 405299, 377577, 349317, 320761, 292218, 263970, 236285, 209445, 183727,
  159409, 136733, 114773, 92830, 71779, 52557, 36022, 22789, 13083, 6678,
  2955, 1100, 332, 78, 13, 2, 0,
];

// ============================================================
// 2. Fonctions mathématiques de base
// ============================================================

/** Approximation d'Abramowitz & Stegun de la fonction d'erreur (précision ~1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Fonction de répartition de la loi normale centrée réduite N(0,1).
 * Équivalent Excel : NORM.S.DIST(x, TRUE)
 */
function normaleStandard_old(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function normaleStandard(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);

  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return x >= 0 ? 1 - p : p;
}

/**
 * Valeur actuelle d'une rente certaine de t termes, au taux i.
 * Équivalent VBA : Function Rentecertainte(i, t)
 */
function renteCertaine(i: number, t: number): number {
  const v = 1 / (1 + i);
  let sum = 0;
  for (let k = 0; k < t; k++) {
    sum += Math.pow(v, k);
  }
  return sum;
}

// ============================================================
// 3. Formule principale — équivalent VBA : Function PrimeParcelle(...)
//    (feuille "Simul Dev", cellule G5)
// ============================================================

/**
 * Calcule la prime brute par échéance.
 *
 * @param S0 Valeur actuelle du sous-jacent (= prix de la parcelle)
 * @param k Valeur garantie (= prix de la parcelle, S0 = k imposé par le xlsm)
 * @param t Durée du contrat (années)
 * @param r Taux sans risque (Black-Scholes)
 * @param sigma Volatilité (Black-Scholes)
 * @param fm Frais de mutation (0 si le client en prend la charge lui-même)
 * @param x Âge de l'assuré
 * @param it Taux actuariel d'actualisation
 * @param fg Frais de gestion
 * @param fa Frais d'acquisition
 * @param freq Fréquence de paiement (1, 2, 4 ou 12)
 */
function calculerPrimeParcelle(
  S0: number,
  k: number,
  t: number,
  r: number,
  sigma: number,
  fm: number,
  x: number,
  it: number,
  fg: number,
  fa: number,
  freq: number,
  garantieDeces: boolean,
): number {
  const v = 1 / (1 + it);
  const L = TABLE_MORTALITE;
  const ageMax = L.length - 1;

  const Dx: number[] = new Array(L.length).fill(0);
  const Nx: number[] = new Array(L.length).fill(0);

  // Calcul des Dx
  for (let i = 0; i <= ageMax; i++) {
    Dx[i] = L[i] * Math.pow(v, i);
  }

  // Calcul des Nx
  Nx[ageMax] = Dx[ageMax];
  for (let i = ageMax - 1; i >= 0; i--) {
    Nx[i] = Dx[i] + Nx[i + 1];
  }

  const axn = (Nx[x] - Nx[x + t]) / Dx[x];

  // === Prime Épargne et Mutation ===
  const a_t = renteCertaine(it, t);
  const P_epargne = k * Math.pow(v, t);
  const P_mutation = fm * k * Math.pow(v, t);

  // === Prime Option Call (Black-Scholes) ===
  const d1 = (Math.log(S0 / k) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  const N_d1 = normaleStandard(d1);
  const N_d2 = normaleStandard(d2);

  const P_call = S0 * N_d1 - k * Math.exp(-r * t) * N_d2;

  // === Prime Décès ===
  let PUP_deces = 0;
  if (garantieDeces) {
    for (let ki = 0; ki < t; ki++) {
      // NOTE: reproduit tel quel le comportement du VBA d'origine.
      // À ki = 0, cela accède à L[x - 1] (index précédent l'âge x),
      // exactement comme "L(x + ki - 1)" en VBA lorsque ki = 0.
      const qx = L[x + ki - 1] / L[x + ki] - 1;
      let kPx = L[x + ki] / L[x];
      if (ki === 0) {
        kPx = 1;
      }

      const pv_future_primes = (P_epargne / a_t) * renteCertaine(it, t - ki);

      PUP_deces += kPx * qx * Math.pow(v, ki + 0.5) * pv_future_primes;
    }
  }

  const PUI = (P_epargne + P_call + PUP_deces + P_mutation) / (1 - fg);
  const PAI = PUI / axn;
  const PAC = PAI / (1 - fa);
  const a_m = (1 - v) / (1 - Math.pow(v, 1 / freq));

  return P_call;
  // return PAC / a_m;
}

// ============================================================
// 4. Validation
// ============================================================

function validerInput(parcelle: SimulationParcelleParams, client: SimulationClientInput): void {
  if (parcelle.valeurParcelle <= 0) {
    throw new Error('La valeur de la parcelle doit être positive.');
  }
  if (!Number.isInteger(client.dureeAnnees) || client.dureeAnnees <= 0) {
    throw new Error('La durée choisie par le client doit être un entier positif.');
  }
  if (!Number.isInteger(client.age) || client.age < 0 || client.age + client.dureeAnnees >= 110) {
    throw new Error("L'âge du client combiné à la durée dépasse la table de mortalité disponible.");
  }
  if (client.garantieDeces && client.age + client.dureeAnnees > 70) {
    throw new Error("Vous ne pouvez pas souscrire à une garantie de décès.");
  }
  const frequencesValides: FrequencePaiement[] = [1, 2, 4, 12];
  if (!frequencesValides.includes(client.frequencePaiement)) {
    throw new Error('Fréquence de paiement invalide (valeurs autorisées : 1, 2, 4, 12).');
  }
  if (parcelle.volatilite <= 0) {
    throw new Error('La volatilité doit être strictement positive.');
  }
}

// ============================================================
// 5. Point d'entrée — à appeler depuis ton code Next.js
// ============================================================

/**
 * Résout les paramètres techniques réellement applicables à une
 * parcelle : ses overrides éventuels, sinon le barème par défaut actif.
 * `null`/`undefined` sur un champ de la parcelle = pas d'override.
 */
export function resoudreParametresTechniques(
  overrides: ParcelleTechnicalOverrides,
  baremeDefaut: BaremeTechniqueDefaut,
): BaremeTechniqueDefaut {
  return {
    tauxSansRisque: overrides.tauxSansRisque ?? baremeDefaut.tauxSansRisque,
    volatilite: overrides.volatilite ?? baremeDefaut.volatilite,
    fraisMutation: overrides.fraisMutation ?? baremeDefaut.fraisMutation,
    tauxActuariel: overrides.tauxActuariel ?? baremeDefaut.tauxActuariel,
    fraisGestion: overrides.fraisGestion ?? baremeDefaut.fraisGestion,
    fraisAcquisition: overrides.fraisAcquisition ?? baremeDefaut.fraisAcquisition,
  };
}

/**
 * Simule la prime à payer par le client. Fonction pure, stateless :
 * aucun accès base de données, aucun effet de bord.
 */
export function simulerPrimeParcelle(input: SimulationInput): SimulationResult {
  const { parcelle, client } = input;

  validerInput(parcelle, client);

  const S0 = parcelle.valeurParcelle;
  const k = parcelle.valeurParcelle; // S0 = k imposé par le xlsm (note L7)
  const t = client.dureeAnnees; // durée choisie par le client (C7)
  const x = client.age;
  const freq = client.frequencePaiement;

  const r = parcelle.tauxSansRisque;
  const sigma = parcelle.volatilite;
  // Toggle "prise en charge des frais de mutation" : si false, fm = 0.
  const fm = client.priseEnChargeFraisMutation ? parcelle.fraisMutation : 0;
  const it = parcelle.tauxActuariel;
  const fg = parcelle.fraisGestion;
  const fa = parcelle.fraisAcquisition;

  const primeParEcheance = calculerPrimeParcelle(
    S0,
    k,
    t,
    r,
    sigma,
    fm,
    x,
    it,
    fg,
    fa,
    freq,
    client.garantieDeces ?? false,
  );

  const nombreEcheancesTotal = t * freq;
  const coutTotalEstime = primeParEcheance * nombreEcheancesTotal;

  return {
    primeParEcheance: arrondi(primeParEcheance),
    frequencePaiement: freq,
    echeancesParAn: freq,
    dureeAnnees: t,
    nombreEcheancesTotal,
    coutTotalEstime: arrondi(coutTotalEstime),
    parametresUtilises: { S0, k, t, x, freq, r, sigma, fm, it, fg, fa },
  };
}

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/**
 * Calcule le prix simulé d'affichage pour une parcelle.
 * Ce prix simule un contrat sur la durée maximale de 7 ans,
 * avec garantie de décès activée (pour un âge de référence de 35 ans),
 * mensuelle, incluant tous les frais de barème.
 * Arrondi à la centaine près.
 */
export function computeDisplayedPrice(p: {
  price: number;
  tauxSansRisque?: number | null;
  volatilite?: number | null;
  fraisMutation?: number | null;
  tauxActuariel?: number | null;
  fraisGestion?: number | null;
  fraisAcquisition?: number | null;
}): number {
  try {
    const S0 = Number(p.price);
    const k = S0;
    const t = 7; // Durée max
    const x = 35; // Âge standard
    const freq = 12; // Mensuel
    const r = p.tauxSansRisque ?? 0.02;
    const sigma = p.volatilite ?? 0.06;
    const fm = p.fraisMutation ?? 0.20; // Inclus
    const it = p.tauxActuariel ?? 0.035;
    const fg = p.fraisGestion ?? 0.05;
    const fa = p.fraisAcquisition ?? 0.03;

    const primeParEcheance = calculerPrimeParcelle(S0, k, t, r, sigma, fm, x, it, fg, fa, freq, true);
    const nombreEcheancesTotal = t * freq;
    return Math.round(primeParEcheance * nombreEcheancesTotal * 100) / 100;
  } catch (err) {
    console.error("Erreur computeDisplayedPrice:", err);
    return Math.round(Number(p.price) * 100) / 100;
  }
}

// ============================================================
// 6. Présentation du résultat au client
// ============================================================

/** Formate un montant en FCFA avec séparateur de milliers. Ex: 19178 -> "19 178 FCFA" */
export function formaterMontantFCFA(montant: number): string {
  const entier = Math.round(montant);
  const avecEspaces = entier.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${avecEspaces} FCFA`;
}
