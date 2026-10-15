/**
 * LMD & ECTS Grading and Deliberation Engine
 * Conforme aux standards internationaux (REESAO, CAMES, ECTS Européen)
 */

export interface EcuInput {
  id: number;
  codeEcu?: string;
  nameEcu: string;
  coefficient: number;
  creditsEcts: number;
  eliminatoryGrade?: number; // Défaut: 7.0 / 20
  classWorkScore?: number | null; // Devoirs (40%)
  examScore?: number | null;      // Examen (60%)
  totalScore?: number | null;     // Note globale directe si renseignée
  rattrapageScore?: number | null; // Rattrapage (Session 2)
  sessionType?: "Normale" | "Rattrapage";
}

export interface EcuResult extends EcuInput {
  finalGrade: number; // Note / 20
  weightedGrade: number; // Note * coefficient
  isValidated: boolean; // Note >= 10
  isEliminated: boolean; // Note < eliminatoryGrade
}

export interface UeInput {
  id: number;
  codeUe: string;
  nameUe: string;
  typeUe: "Fondamentale" | "Méthodologique" | "Transversale" | "Optionnelle";
  creditsEcts: number; // ex: 6.0
  minPassingGrade?: number; // Défaut: 10.0
  isEliminatory?: boolean;
  ecus: EcuInput[];
}

export interface UeResult {
  id: number;
  codeUe: string;
  nameUe: string;
  typeUe: string;
  creditsEcts: number;
  creditsAcquired: number; // 0 ou creditsEcts
  average: number; // Note / 20
  totalCoefficients: number;
  status: "V" | "VC" | "NV" | "CAP" | "RAT"; // V: Validé, VC: Validé par Compensation, NV: Non Validé, CAP: Capitalisé, RAT: En Rattrapage
  hasEliminatoryGrade: boolean;
  ecuResults: EcuResult[];
}

export interface SemesterDeliberationResult {
  semester: string;
  semesterAverage: number;
  totalCreditsTarget: number; // 30.0 ECTS
  creditsAcquired: number;
  isSemesterValidated: boolean;
  decision: "Admis" | "Admis par Compensation" | "Ajourné" | "Admis avec Dettes" | "Enjambement";
  mention: "Passable" | "Assez Bien" | "Bien" | "Très Bien" | "Ajourné";
  ueResults: UeResult[];
  deliberationNotes: string[];
}

/**
 * 1. Calcul de la note finale d'un ECU (Matière)
 */
export function calculateEcuFinalGrade(ecu: EcuInput): EcuResult {
  const cc = ecu.classWorkScore !== null && ecu.classWorkScore !== undefined ? Number(ecu.classWorkScore) : null;
  const exam = ecu.examScore !== null && ecu.examScore !== undefined ? Number(ecu.examScore) : null;
  const total = ecu.totalScore !== null && ecu.totalScore !== undefined ? Number(ecu.totalScore) : null;
  const rat = ecu.rattrapageScore !== null && ecu.rattrapageScore !== undefined ? Number(ecu.rattrapageScore) : null;

  let session1Grade: number;
  if (total !== null && !isNaN(total)) {
    session1Grade = Number(total.toFixed(2));
  } else if (cc !== null && exam !== null) {
    session1Grade = Number(((cc * 0.4) + (exam * 0.6)).toFixed(2));
  } else if (exam !== null) {
    session1Grade = Number(exam.toFixed(2));
  } else if (cc !== null) {
    session1Grade = Number(cc.toFixed(2));
  } else {
    session1Grade = 0.0;
  }

  let finalGrade = session1Grade;
  if (ecu.sessionType === "Rattrapage" && rat !== null) {
    // Règle du meilleur score entre Session 1 et Rattrapage
    finalGrade = Math.max(session1Grade, Number(rat.toFixed(2)));
  }

  const coef = Math.max(1, Number(ecu.coefficient) || 1);
  const elimThreshold = ecu.eliminatoryGrade !== undefined ? Number(ecu.eliminatoryGrade) : 7.0;
  const isEliminated = finalGrade < elimThreshold;
  const isValidated = finalGrade >= 10.0 && !isEliminated;

  return {
    ...ecu,
    finalGrade,
    weightedGrade: Number((finalGrade * coef).toFixed(2)),
    isValidated,
    isEliminated,
  };
}

/**
 * 2. Calcul des métriques d'une Unité d'Enseignement (UE)
 */
export function calculateUeMetrics(ue: UeInput): UeResult {
  const ecuResults = ue.ecus.map(calculateEcuFinalGrade);

  let totalWeighted = 0;
  let totalCoefs = 0;
  let hasEliminatoryGrade = false;
  let evaluatedCount = 0;

  for (const ecuRes of ecuResults) {
    const isEvaluated = ecuRes.examScore !== null || ecuRes.classWorkScore !== null || ecuRes.totalScore !== null;
    if (isEvaluated) {
      totalWeighted += ecuRes.weightedGrade;
      totalCoefs += ecuRes.coefficient;
      evaluatedCount++;
      if (ecuRes.isEliminated) {
        hasEliminatoryGrade = true;
      }
    }
  }

  const allCoefs = ecuResults.reduce((acc, e) => acc + (Number(e.coefficient) || 1), 0);
  // Average is computed on evaluated ECUs (or 0 if none evaluated)
  const average = totalCoefs > 0 ? Number((totalWeighted / totalCoefs).toFixed(2)) : 0.0;
  const minPass = ue.minPassingGrade ?? 10.0;

  // Une UE est validée si moyenne >= 10, au moins 1 ECU évalué, et aucune note éliminatoire
  const isValidated = evaluatedCount > 0 && average >= minPass && !hasEliminatoryGrade;

  let status: "V" | "VC" | "NV" | "CAP" | "RAT" = "NV";
  let creditsAcquired = 0.0;

  if (isValidated) {
    status = "V";
    creditsAcquired = Number(ue.creditsEcts) || 0.0;
  } else if (ecuResults.some(e => e.sessionType === "Rattrapage")) {
    status = "RAT";
  }

  return {
    id: ue.id,
    codeUe: ue.codeUe,
    nameUe: ue.nameUe,
    typeUe: ue.typeUe,
    creditsEcts: ue.creditsEcts,
    creditsAcquired,
    average,
    totalCoefficients: totalCoefs > 0 ? totalCoefs : allCoefs,
    status,
    hasEliminatoryGrade,
    ecuResults,
  };
}

/**
 * 3. Moteur de Délibération Semestrielle et Compensation Inter-UE (30 Crédits ECTS)
 */
export function deliberateSemester(ues: UeInput[], semesterLabel: string = "S1"): SemesterDeliberationResult {
  const initialUeResults = ues.map(calculateUeMetrics);
  const deliberationNotes: string[] = [];

  let totalUePoints = 0;
  let totalUeCredits = 0;

  for (const ueRes of initialUeResults) {
    totalUePoints += ueRes.average * ueRes.creditsEcts;
    totalUeCredits += ueRes.creditsEcts;
  }

  const semesterAverage = totalUeCredits > 0 ? Number((totalUePoints / totalUeCredits).toFixed(2)) : 0.0;
  const hasSemesterAverage = semesterAverage >= 10.0;

  // Appliquer le principe de compensation inter-UE
  const finalUeResults = initialUeResults.map((ueRes) => {
    if (ueRes.status === "V" || ueRes.status === "CAP") {
      return ueRes;
    }

    // Si le semestre a la moyenne (>=10) et que l'UE n'a pas de note éliminatoire, compensation possible
    if (hasSemesterAverage && !ueRes.hasEliminatoryGrade) {
      deliberationNotes.push(`UE ${ueRes.codeUe} (${ueRes.nameUe}) validée par compensation (Moy: ${ueRes.average}/20).`);
      return {
        ...ueRes,
        status: "VC" as const,
        creditsAcquired: ueRes.creditsEcts,
      };
    }

    return ueRes;
  });

  const totalCreditsAcquired = finalUeResults.reduce((sum, ue) => sum + ue.creditsAcquired, 0);
  const isSemesterValidated = totalCreditsAcquired >= 30.0 || (hasSemesterAverage && finalUeResults.every(u => u.status === "V" || u.status === "VC"));

  let decision: "Admis" | "Admis par Compensation" | "Ajourné" | "Admis avec Dettes" | "Enjambement" = "Ajourné";
  if (isSemesterValidated) {
    const hasCompensation = finalUeResults.some(u => u.status === "VC");
    decision = hasCompensation ? "Admis par Compensation" : "Admis";
  } else if (totalCreditsAcquired >= 20.0) {
    decision = "Admis avec Dettes";
  }

  let mention: "Passable" | "Assez Bien" | "Bien" | "Très Bien" | "Ajourné" = "Ajourné";
  if (isSemesterValidated) {
    if (semesterAverage >= 16.0) mention = "Très Bien";
    else if (semesterAverage >= 14.0) mention = "Bien";
    else if (semesterAverage >= 12.0) mention = "Assez Bien";
    else mention = "Passable";
  }

  return {
    semester: semesterLabel,
    semesterAverage,
    totalCreditsTarget: 30.0,
    creditsAcquired: totalCreditsAcquired,
    isSemesterValidated,
    decision,
    mention,
    ueResults: finalUeResults,
    deliberationNotes,
  };
}

/**
 * 4. Déterminer la Progression Annuelle (Enjambement L1 -> L2, L2 -> L3)
 */
export function checkAnnualProgression(
  s1Credits: number,
  s2Credits: number,
  previousYearCredits: number = 60,
  currentLevel: "L1" | "L2" | "L3" | "M1" | "M2" = "L1"
): {
  isPromoted: boolean;
  isEnjambement: boolean;
  totalYearCredits: number;
  debtCredits: number;
  decision: string;
} {
  const totalYearCredits = s1Credits + s2Credits;
  const debtCredits = 60 - totalYearCredits;

  if (totalYearCredits >= 60) {
    return {
      isPromoted: true,
      isEnjambement: false,
      totalYearCredits,
      debtCredits: 0,
      decision: `ADMIS EN ANNÉE SUPÉRIEURE (${currentLevel === "L1" ? "L2" : currentLevel === "L2" ? "L3" : "DIPLÔMÉ"})`,
    };
  }

  // Règle des 45 crédits minimum (75%)
  if (totalYearCredits >= 45 && previousYearCredits >= 60) {
    return {
      isPromoted: true,
      isEnjambement: true,
      totalYearCredits,
      debtCredits,
      decision: `ENJAMBEMENT AUTORISÉ AVEC ${debtCredits} CRÉDIT(S) DE DETTE`,
    };
  }

  return {
    isPromoted: false,
    isEnjambement: false,
    totalYearCredits,
    debtCredits,
    decision: "AJOURNÉ / SESSION DE RATTRAPAGE OU REDOUBLEMENT",
  };
}
