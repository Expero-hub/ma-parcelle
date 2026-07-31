/**
 * Types d'entrée/sortie de la simulation, alignés sur la feuille Excel
 * "Simul Dev". La simulation est STATELESS : aucun résultat n'est
 * persisté, c'est un calcul à la volée à partir de 3 sources :
 *  - la fiche Parcelle (prix, durée, paramètres techniques)
 *  - la saisie du client au moment de la simulation (âge, fréquence...)
 *  - rien d'autre : les paramètres techniques vivent sur Parcelle
 */

/** Fréquence de paiement (cellules G15:G18 du xlsm) */
export type FrequencePaiement = 1 | 2 | 4 | 12;
// 1 : Unique (durée = 1 an) ou Annuel (durée > 1 an) — voir libelleFrequence
// 2 : Semestriel | 4 : Trimestriel | 12 : Mensuel

/**
 * Libellé de la fréquence à afficher au client. freq=1 est ambigu tant
 * qu'on ne connaît pas la durée du contrat :
 *  - durée = 1 an  -> "Unique" (un seul paiement, qui couvre tout le contrat)
 *  - durée > 1 an  -> "Annuel" (un paiement chaque année, répété sur la durée)
 * Mathématiquement les deux cas utilisent la même formule (a_m = 1 quand
 * freq = 1) ; seul le libellé change selon la durée.
 */
export function libelleFrequence(freq: FrequencePaiement, dureeAnnees: number): string {
  if (freq === 1) {
    return dureeAnnees <= 1 ? 'Unique' : 'Annuel';
  }
  const labels: Record<2 | 4 | 12, string> = {
    2: 'Semestriel',
    4: 'Trimestriel',
    12: 'Mensuel',
  };
  return labels[freq];
}

/** Dérivé de Parcelle : price -> S0 et k, + paramètres techniques résolus */
export interface SimulationParcelleParams {
  /** Prix de la parcelle (Parcelle.price). Sert à la fois de S0
   *  (valeur actuelle) et de k (valeur garantie) — note L7 du xlsm :
   *  "la valeur actuelle et la valeur garantie doivent être le même". */
  valeurParcelle: number;
  /** Taux sans risque (résolu : override parcelle sinon barème par défaut). */
  tauxSansRisque: number;
  /** Volatilité — calibre la marge assureur (note L9). */
  volatilite: number;
  /** Taux de frais de mutation, appliqué seulement si le client n'en
   *  prend pas la charge lui-même. */
  fraisMutation: number;
  /** Taux actuariel d'actualisation. */
  tauxActuariel: number;
  /** Taux de frais de gestion. */
  fraisGestion: number;
  /** Taux de frais d'acquisition. */
  fraisAcquisition: number;
}

/**
 * Saisi par le client au moment de la simulation (C7, C8, C9, toggle F21).
 * Le xlsm annote ce bloc "à renseigner par le client" — la durée y est
 * incluse, ce n'est PAS une propriété figée de la parcelle : le client
 * choisit combien d'années il souhaite étaler son contrat.
 */
export interface SimulationClientInput {
  /** Durée du contrat en années (t), choisie par le client. */
  dureeAnnees: number;
  /** Âge de l'assuré (x). */
  age: number;
  /** Fréquence de paiement choisie (freq). */
  frequencePaiement: FrequencePaiement;
  /** Correspond au bouton "Pris en charge des frais de mutation et TF" (F21).
   *  true  -> le taux fraisMutation de la parcelle est appliqué
   *  false -> fm is forced to 0 (note G23 du xlsm) */
  priseEnChargeFraisMutation: boolean;
  /** Option Garantie en cas de décès */
  garantieDeces?: boolean;
}

export interface SimulationInput {
  parcelle: SimulationParcelleParams;
  client: SimulationClientInput;
}

/**
 * Barème technique par défaut (table BaremeTechniqueDefaut), modifiable
 * en masse en une seule opération.
 */
export interface BaremeTechniqueDefaut {
  tauxSansRisque: number;
  volatilite: number;
  fraisMutation: number;
  tauxActuariel: number;
  fraisGestion: number;
  fraisAcquisition: number;
}

/**
 * Overrides éventuels portés par une Parcelle précise (champs nullable
 * sur le modèle Prisma). `null`/`undefined` = pas d'override, on utilise
 * le barème par défaut pour ce paramètre.
 */
export interface ParcelleTechnicalOverrides {
  tauxSansRisque?: number | null;
  volatilite?: number | null;
  fraisMutation?: number | null;
  tauxActuariel?: number | null;
  fraisGestion?: number | null;
  fraisAcquisition?: number | null;
}

/*
export interface SimulationDebugDetails {
  v: number;
  axn: number;
  a_t: number;
  P_epargne: number;
  P_mutation: number;
  d1: number;
  d2: number;
  N_d1: number;
  N_d2: number;
  P_call: number;
  PUP_deces: number;
  PUI: number;
  PAI: number;
  PAC: number;
  a_m: number;
  sigma:number;
  r:number;
  t:number;
  fm:number;
  x:number;
  
}
*/

export interface SimulationResult {
  /** Montant à payer par échéance (résultat de la cellule G5 / a_m). */
  primeParEcheance: number;
  frequencePaiement: FrequencePaiement;
  /** Nombre d'échéances par an (= frequencePaiement). */
  echeancesParAn: number;
  dureeAnnees: number;
  /** Nombre total d'échéances sur toute la durée du contrat. */
  nombreEcheancesTotal: number;
  /** Estimation du coût total (primeParEcheance * nombreEcheancesTotal). */
  coutTotalEstime: number;
  /** Rappel des paramètres réellement utilisés, utile pour affichage/audit. */
  parametresUtilises: {
    S0: number;
    k: number;
    t: number;
    x: number;
    freq: FrequencePaiement;
    r: number;
    sigma: number;
    fm: number;
    it: number;
    fg: number;
    fa: number;
  };
  // debugDetails?: SimulationDebugDetails;
}
