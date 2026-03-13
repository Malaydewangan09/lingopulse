/**
 * GitHub API helpers
 * Fetches i18n files from a repo and registers webhooks.
 */

export interface GithubFile {
  path: string;
  content: string;
  sha: string;
}

interface GithubWebhook {
  id: number;
  config?: {
    url?: string;
  };
}

interface GithubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  head?: {
    ref?: string;
    sha?: string;
  };
  user?: {
    login?: string;
  };
}

interface GithubPullRequestFile {
  filename: string;
}

// Known locale codes (2-letter + regional variants)
const LOCALE_CODE = /^([a-z]{2}(?:[-_][A-Za-z]{2,4})?)$/;

// Files to always exclude
const EXCLUDED_FILES = [
  'package.json', 'package-lock.json', 'yarn.lock', 'tsconfig.json',
  '.eslintrc.json', 'jest.config.json', 'babel.config.json', 'next.config.json',
  'vercel.json', 'netlify.json', 'turbo.json', 'lerna.json', 'nx.json',
  'renovate.json', '.prettierrc.json', 'manifest.json', 'schema.json',
];

// Directory names that are clearly not i18n
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__tests__', 'test', 'tests', 'spec'];

export function isI18nFilePath(path: string): boolean {
  // Must be JSON or YAML
  if (!path.endsWith('.json') && !path.endsWith('.yaml') && !path.endsWith('.yml')) return false;

  const filename = path.split('/').pop() ?? '';
  const parts = path.split('/');

  // Exclude known non-i18n filenames
  if (EXCLUDED_FILES.some(e => filename === e || path.endsWith('/' + e))) return false;

  // Exclude files in non-i18n directories
  if (EXCLUDED_DIRS.some(d => parts.includes(d))) return false;

  // ① File is in a directory named like a locale (e.g. /en/messages.json)
  if (parts.length >= 2) {
    const parentDir = parts[parts.length - 2];
    if (LOCALE_CODE.test(parentDir)) return true;
  }

  // ② File is itself named like a locale code (e.g. en.json, zh-CN.json, pt_BR.json)
  const stem = filename.replace(/\.(json|yaml|yml)$/, '');
  if (LOCALE_CODE.test(stem)) return true;

  // ③ File is in a well-known i18n directory anywhere in the path (e.g. ui/src/translations/en.json)
  const i18nDirs = /\/(i18n|locales?|translations?|messages?|strings?|lang)\//;
  if (i18nDirs.test('/' + path + '/')) return true;

  // ④ File has a locale suffix (e.g. common.en.json, app.fr.yaml)
  const localeSuffix = /\.([a-z]{2}(?:[-_][A-Za-z]{2,4})?)\.(json|yaml|yml)$/;
  if (localeSuffix.test(filename)) return true;

  return false;
}

async function githubFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function githubRequest(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** List all files in a repo tree */
export async function getRepoTree(fullName: string, branch: string, token: string): Promise<{ path: string; sha: string; type: string }[]> {
  const data = await githubFetch(
    `https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    token,
  );
  return data.tree ?? [];
}

/** Fetch a single file's content (decoded from base64) */
export async function getFileContent(fullName: string, path: string, token: string, ref?: string): Promise<string> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const data = await githubFetch(
    `https://api.github.com/repos/${fullName}/contents/${encodeURIComponent(path)}${query}`,
    token,
  );
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return data.content ?? '';
}

/** Fetch all i18n JSON/YAML files from a repo */
export async function fetchI18nFiles(fullName: string, branch: string, token: string): Promise<GithubFile[]> {
  const tree = await getRepoTree(fullName, branch, token);
  const i18nEntries = tree.filter(f => f.type === 'blob' && isI18nFilePath(f.path));

  // Limit to 60 files to avoid rate limits
  const entries = i18nEntries.slice(0, 60);

  const files = await Promise.allSettled(
    entries.map(async e => ({
      path: e.path,
      sha: e.sha,
      content: await getFileContent(fullName, e.path, token, branch),
    }))
  );

  return files
    .filter((r): r is PromiseFulfilledResult<GithubFile> => r.status === 'fulfilled')
    .map(r => r.value);
}

/** Get repo metadata */
export async function getRepoInfo(fullName: string, token: string) {
  return githubFetch(`https://api.github.com/repos/${fullName}`, token);
}

/** Register a webhook on the repo */
export async function registerWebhook(
  fullName: string,
  token: string,
  webhookUrl: string,
  secret: string,
): Promise<number> {
  const data = await githubFetch(
    `https://api.github.com/repos/${fullName}/hooks`,
    token,
  ).catch(() => null);

  // Check if webhook already exists
  if (Array.isArray(data)) {
    const existing = (data as GithubWebhook[]).find(hook => hook.config?.url === webhookUrl);
    if (existing) return existing.id;
  }

  const res = await fetch(`https://api.github.com/repos/${fullName}/hooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['push', 'pull_request'],
      config: { url: webhookUrl, content_type: 'json', secret, insecure_ssl: '0' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to register webhook: ${res.status} ${body.slice(0, 200)}`);
  }

  const hook = await res.json();
  return hook.id;
}

interface GithubIssueComment {
  id: number;
  body?: string;
}

export async function createOrUpdatePullRequestComment(
  fullName: string,
  prNumber: number,
  token: string,
  body: string,
  marker = '<!-- lingopulse:pr-summary -->',
): Promise<void> {
  const comments = await githubRequest(
    `https://api.github.com/repos/${fullName}/issues/${prNumber}/comments?per_page=100`,
    token,
  ) as GithubIssueComment[];

  const existing = comments.find(comment => comment.body?.includes(marker));

  if (existing) {
    await githubRequest(
      `https://api.github.com/repos/${fullName}/issues/comments/${existing.id}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      },
    );
    return;
  }

  await githubRequest(
    `https://api.github.com/repos/${fullName}/issues/${prNumber}/comments`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ body }),
    },
  );
}

interface GithubRefResponse {
  object?: { sha?: string };
}

export async function createBranchFromBase(
  fullName: string,
  baseBranch: string,
  newBranch: string,
  token: string,
): Promise<void> {
  const baseRef = await githubRequest(
    `https://api.github.com/repos/${fullName}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
    token,
  ) as GithubRefResponse;

  const sha = baseRef.object?.sha;
  if (!sha) throw new Error(`Could not resolve base branch ${baseBranch}`);

  await githubRequest(
    `https://api.github.com/repos/${fullName}/git/refs`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha,
      }),
    },
  );
}

interface GithubContentResponse {
  sha?: string;
}

export async function upsertRepoFile(
  fullName: string,
  path: string,
  content: string,
  branch: string,
  message: string,
  token: string,
): Promise<void> {
  let existingSha: string | undefined;

  try {
    const existing = await githubRequest(
      `https://api.github.com/repos/${fullName}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
      token,
    ) as GithubContentResponse;
    existingSha = existing.sha;
  } catch (error: unknown) {
    const messageText = error instanceof Error ? error.message : '';
    if (!messageText.includes('404')) throw error;
  }

  await githubRequest(
    `https://api.github.com/repos/${fullName}/contents/${encodeURIComponent(path)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch,
        sha: existingSha,
      }),
    },
  );
}

interface GithubPullRequestResponse {
  html_url: string;
  number: number;
}

export async function createPullRequest(
  fullName: string,
  token: string,
  input: {
    title: string;
    head: string;
    base: string;
    body: string;
    draft?: boolean;
  },
): Promise<GithubPullRequestResponse> {
  return githubRequest(
    `https://api.github.com/repos/${fullName}/pulls`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body,
        draft: input.draft ?? true,
      }),
    },
  ) as Promise<GithubPullRequestResponse>;
}

export async function listPullRequests(
  fullName: string,
  token: string,
  state: 'open' | 'closed' | 'all' = 'open',
  perPage = 10,
): Promise<GithubPullRequest[]> {
  const data = await githubRequest(
    `https://api.github.com/repos/${fullName}/pulls?state=${state}&sort=updated&direction=desc&per_page=${perPage}`,
    token,
  );

  return Array.isArray(data) ? data as GithubPullRequest[] : [];
}

export async function listPullRequestFiles(
  fullName: string,
  prNumber: number,
  token: string,
): Promise<string[]> {
  const data = await githubRequest(
    `https://api.github.com/repos/${fullName}/pulls/${prNumber}/files?per_page=100`,
    token,
  );

  return Array.isArray(data)
    ? (data as GithubPullRequestFile[]).map(file => file.filename).filter(Boolean)
    : [];
}

/** Validate GitHub webhook signature */
export async function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Timing-safe compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
