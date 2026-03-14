export type PrCheckStatus = 'passing' | 'failing' | 'warning' | 'pending';

function toNumber(value: unknown): number {
  const next = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

export function derivePrCheckStatus(input: {
  coverageBefore?: number | string | null;
  coverageAfter?: number | string | null;
  missingKeys?: number | string | null;
  existingStatus?: PrCheckStatus | string | null;
}): PrCheckStatus {
  if (input.existingStatus === 'pending') return 'pending';

  const coverageBefore = toNumber(input.coverageBefore);
  const coverageAfter = toNumber(input.coverageAfter);
  const missingKeys = Math.max(0, Math.round(toNumber(input.missingKeys)));
  const coverageDelta = coverageAfter - coverageBefore;

  if (missingKeys === 0 && coverageDelta >= 0) return 'passing';
  if (coverageDelta <= -2 || missingKeys >= 12) return 'failing';
  if (missingKeys > 0 || coverageDelta < 0) return 'warning';

  return 'passing';
}
