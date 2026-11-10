export function compact(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function plain(n: number): string {
  return new Intl.NumberFormat('en').format(n);
}

export function money(cents: number): string {
  return cents === 0 ? '$0' : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function limit(n: number, unit = ''): string {
  return n < 0 ? 'Unlimited' : `${plain(n)}${unit}`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ago(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return shortDate(iso);
}

/** Percentage change, or null when there's no previous data to compare with. */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.min(999, Math.round(((current - previous) / previous) * 100));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
