import { areMathExpressionsEquivalent } from './mathEvaluator';

export interface IdentificationResult {
  isCorrect: boolean;
  matchedVariant: string | null;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function stringSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1 - dist / maxLen;
}

export function checkIdentificationAnswer(
  userAnswer: string,
  correctAnswer: string,
  acceptVariants: string[] = []
): IdentificationResult {
  const trimmed = userAnswer.trim();
  if (trimmed.length === 0) {
    return { isCorrect: false, matchedVariant: null };
  }

  const normalizedInput = trimmed.toLowerCase();
  const normalizedCorrect = correctAnswer.toLowerCase().trim();

  if (normalizedInput === normalizedCorrect) {
    return { isCorrect: true, matchedVariant: correctAnswer };
  }

  if (areMathExpressionsEquivalent(trimmed, correctAnswer)) {
    return { isCorrect: true, matchedVariant: correctAnswer };
  }

  for (const variant of acceptVariants) {
    const normVariant = variant.toLowerCase().trim();
    if (normalizedInput === normVariant) {
      return { isCorrect: true, matchedVariant: variant };
    }
    if (areMathExpressionsEquivalent(trimmed, variant)) {
      return { isCorrect: true, matchedVariant: variant };
    }
  }

  const allTargets = [correctAnswer, ...acceptVariants];
  for (const target of allTargets) {
    const norm = target.toLowerCase().trim();
    const sim = stringSimilarity(normalizedInput, norm);
    // 0.75 similarity threshold corresponds to fuse score <= 0.25
    if (sim >= 0.75) {
      return { isCorrect: true, matchedVariant: target };
    }
  }

  return { isCorrect: false, matchedVariant: null };
}
