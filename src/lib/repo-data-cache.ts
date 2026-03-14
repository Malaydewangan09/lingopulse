const DEFAULT_MAX_AGE_MS = 15_000;

const SESSION_KEY = 'lingopulse_active_analysis';

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const repoDataCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

interface ActiveAnalysis {
  repoId: string;
  startedAt: number;
  previousRunId: string | null;
  resolve: (() => void) | null;
}

let globalActiveAnalysis: ActiveAnalysis | null = null;
let analysisResolveFn: (() => void) | null = null;

export function getActiveAnalysis(): ActiveAnalysis | null {
  return globalActiveAnalysis;
}

export function setActiveAnalysis(repoId: string, previousRunId: string | null): void {
  globalActiveAnalysis = { repoId, startedAt: Date.now(), previousRunId, resolve: null };
}

export function setAnalysisResolve(fn: (() => void) | null): void {
  if (globalActiveAnalysis) {
    globalActiveAnalysis.resolve = fn;
  }
  analysisResolveFn = fn;
}

export function clearActiveAnalysis(): void {
  globalActiveAnalysis = null;
  analysisResolveFn = null;
}

export function peekRepoData<T>(repoId: string): T | null {
  const entry = repoDataCache.get(repoId);
  return entry ? (entry.data as T) : null;
}

export function getFreshRepoData<T>(repoId: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | null {
  const entry = repoDataCache.get(repoId);
  if (!entry) return null;
  if (Date.now() - entry.ts > maxAgeMs) return null;
  return entry.data as T;
}

export function setRepoDataCache<T>(repoId: string, data: T) {
  repoDataCache.set(repoId, { data, ts: Date.now() });
}

export function clearRepoDataCache(repoId?: string) {
  if (repoId) {
    repoDataCache.delete(repoId);
    inflightRequests.delete(repoId);
    return;
  }

  repoDataCache.clear();
  inflightRequests.clear();
}

export async function fetchRepoDataCached<T>(
  repoId: string,
  options: { force?: boolean; maxAgeMs?: number } = {},
): Promise<T> {
  const { force = false, maxAgeMs = DEFAULT_MAX_AGE_MS } = options;

  if (!force) {
    const cached = getFreshRepoData<T>(repoId, maxAgeMs);
    if (cached) return cached;

    const inflight = inflightRequests.get(repoId);
    if (inflight) return inflight as Promise<T>;
  }

  const request = fetch(`/api/repos/${repoId}`, { cache: 'no-store' })
    .then(async res => {
      if (!res.ok) {
        throw new Error(`${res.status}`);
      }

      const payload = (await res.json()) as T;
      setRepoDataCache(repoId, payload);
      return payload;
    })
    .finally(() => {
      inflightRequests.delete(repoId);
    });

  inflightRequests.set(repoId, request);
  return request;
}
