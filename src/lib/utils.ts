export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function coverageColor(pct: number): string {
  if (pct === 0) return 'var(--coverage-empty)';
  if (pct < 40) return 'var(--coverage-40)';
  if (pct < 60) return 'var(--coverage-60)';
  if (pct < 75) return 'var(--coverage-60)';
  if (pct < 88) return 'var(--coverage-88)';
  if (pct < 96) return 'var(--coverage-96)';
  return 'var(--coverage-100)';
}

export function coverageTextColor(pct: number): string {
  if (pct < 40) return 'var(--danger)';
  if (pct < 75) return 'var(--warning)';
  if (pct < 96) return 'var(--success)';
  return 'var(--accent)';
}

export function coverageLabel(pct: number): string {
  if (pct >= 96) return 'Perfect';
  if (pct >= 88) return 'Good';
  if (pct >= 75) return 'Moderate';
  if (pct >= 60) return 'Low';
  if (pct >= 40) return 'Critical';
  return 'Missing';
}

export function qualityColor(score: number): string {
  if (score >= 9) return '#00E5A0';
  if (score >= 8) return '#3FC87A';
  if (score >= 7) return '#E6A817';
  if (score >= 6) return '#FF6B35';
  return '#F05248';
}

export function trendLabel(delta: number): string {
  if (delta === 0) return '—';
  return delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
}

export function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
