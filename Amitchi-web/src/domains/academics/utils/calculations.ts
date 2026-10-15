import { GradingScale } from "../types";

export const calculateStudentMetrics = (
  classWork: number,
  examNote: number,
  coefficient: number,
  isHigherEd: boolean
) => {
  if (isHigherEd) {
    // For Higher Ed, examNote is usually the total /20
    const weighted = examNote * coefficient;
    return {
      total: examNote,
      average: examNote,
      weighted,
    };
  } else {
    const total = classWork + examNote;
    const average = total / 2;
    const weighted = average * coefficient;
    return {
      total,
      average,
      weighted,
    };
  }
};

export const getAppreciation = (average: number, scale: GradingScale[]) => {
  const sortedScale = [...scale].sort((a, b) => b.baseScore - a.baseScore);
  for (const item of sortedScale) {
    if (average >= item.baseScore) {
      return item.name;
    }
  }
  return "Insuffisant";
};

export const calculateRanks = (students: { id: number; weighted: number }[]) => {
  const sorted = [...students].sort((a, b) => b.weighted - a.weighted);
  const ranks: Record<number, number> = {};
  let currentRank = 0;
  let lastVal = -1;

  sorted.forEach((item, index) => {
    if (item.weighted !== lastVal) {
      currentRank = index + 1;
    }
    ranks[item.id] = currentRank;
    lastVal = item.weighted;
  });

  return ranks;
};

export const formatRank = (rank: number | string) => {
  if (!rank || rank === "-" || rank === "N/A") return "-";
  const n = Number(rank);
  if (isNaN(n) || n <= 0) return "-";
  if (n === 1) return "1er";
  return `${n}ème`;
};

export const getDecision = (
  average: number, 
  minPass: number, 
  redouble: number, 
  exclude: number
) => {
  if (average >= minPass) return "ADMIS ✅";
  if (average >= redouble) return "REDOUBLE ❌";
  if (average < exclude) return "EXCLU 🚫";
  return "REDOUBLE ❌"; // Default fallback
};
