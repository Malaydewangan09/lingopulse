export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function coverageColor(pct: number): string {
  if (pct === 0)   return '#1C2B3A';
  if (pct < 40)    return '#5C1A1A';
  if (pct < 60)    return '#7A3012';
  if (pct < 75)    return '#5C4500';
  if (pct < 88)    return '#1A5C38';
  if (pct < 96)    return '#0D7A4A';
  return 'rgba(0,229,160,0.3)';
}

export function coverageTextColor(pct: number): string {
  if (pct < 40) return '#F87171';
  if (pct < 60) return '#FB923C';
  if (pct < 75) return '#FBBF24';
  if (pct < 88) return '#4ADE80';
  return '#00E5A0';
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
