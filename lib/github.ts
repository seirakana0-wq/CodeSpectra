// Fetches code from GitHub public API. No OAuth.
// Supports: repo root, specific PR, single file, directory, branch.

const GH_API = 'https://api.github.com';
const GH_RAW = 'https://raw.githubusercontent.com';

export type FetchKind = 'repo' | 'pr' | 'file' | 'dir' | 'unknown';

export interface ParsedUrl {
  kind: FetchKind;
  owner: string;
  repo: string;
  // pr
  prNumber?: number;
  // file / dir
  ref?: string;
  path?: string;
}

export interface FetchedCode {
  kind: FetchKind;
  url: string;
  title: string;
  files: Array<{ path: string; content: string; bytes: number }>;
  truncated: boolean;
  totalBytes: number;
  meta?: Record<string, any>;
}

const MAX_TOTAL_BYTES = 240_000;
const MAX_FILE_BYTES = 80_000;
const MAX_FILES = 25;

export function parseGithubUrl(input: string): ParsedUrl | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/.test(url.hostname)) return null;

  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length < 2) return null;
  const [owner, repo, ...rest] = parts;

  // Bare repo: github.com/owner/repo
  if (rest.length === 0) {
    return { kind: 'repo', owner, repo };
  }

  // PR: github.com/owner/repo/pull/123
  if (rest[0] === 'pull' && rest[1]) {
    const n = parseInt(rest[1], 10);
    if (!Number.isFinite(n)) return null;
    return { kind: 'pr', owner, repo, prNumber: n };
  }

  // File: github.com/owner/repo/blob/<ref>/<path>
  if (rest[0] === 'blob' && rest.length >= 3) {
    return {
      kind: 'file',
      owner,
      repo,
      ref: rest[1],
      path: rest.slice(2).join('/'),
    };
  }

  // Dir: github.com/owner/repo/tree/<ref>(/<path>)
  if (rest[0] === 'tree' && rest[1]) {
    return {
      kind: 'dir',
      owner,
      repo,
      ref: rest[1],
      path: rest.slice(2).join('/') || undefined,
    };
  }

  return { kind: 'repo', owner, repo };
}

function ghHeaders(): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'codereview-ai',
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function ghJson(path: string): Promise<any> {
  const r = await fetch(`${GH_API}${path}`, { headers: ghHeaders(), cache: 'no-store' });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`GitHub ${r.status}: ${body.slice(0, 200) || r.statusText}`);
  }
  return r.json();
}

async function ghRaw(owner: string, repo: string, ref: string, path: string): Promise<string> {
  const r = await fetch(`${GH_RAW}/${owner}/${repo}/${ref}/${path}`, {
    headers: { 'User-Agent': 'codereview-ai' },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`raw ${r.status}: ${path}`);
  return r.text();
}

const TEXT_EXT = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
  'c', 'cc', 'cpp', 'h', 'hpp',
  'cs', 'php', 'scala', 'lua', 'pl', 'sh', 'bash', 'zsh',
  'sql', 'yml', 'yaml', 'toml', 'json', 'xml', 'html', 'css', 'scss',
  'md', 'mdx', 'txt', 'env',
  'dockerfile', 'makefile',
]);

function isTextFile(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.endsWith('/dockerfile') || lower === 'dockerfile') return true;
  if (lower.endsWith('/makefile') || lower === 'makefile') return true;
  const ext = lower.split('.').pop() ?? '';
  return TEXT_EXT.has(ext);
}

function shouldSkipPath(path: string): boolean {
  const skip = [
    'node_modules/', '.next/', 'dist/', 'build/', '.git/',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'poetry.lock', 'Cargo.lock', 'Gemfile.lock',
    '.min.js', '.min.css', '.map',
  ];
  return skip.some(s => path.includes(s));
}

export async function fetchCode(parsed: ParsedUrl): Promise<FetchedCode> {
  switch (parsed.kind) {
    case 'pr':
      return fetchPr(parsed);
    case 'file':
      return fetchFile(parsed);
    case 'dir':
      return fetchTree(parsed);
    case 'repo':
      return fetchRepo(parsed);
    default:
      throw new Error(`unsupported url kind: ${parsed.kind}`);
  }
}

async function fetchPr(p: ParsedUrl): Promise<FetchedCode> {
  const pr = await ghJson(`/repos/${p.owner}/${p.repo}/pulls/${p.prNumber}`);
  const files = await ghJson(
    `/repos/${p.owner}/${p.repo}/pulls/${p.prNumber}/files?per_page=100`
  );
  const collected: Array<{ path: string; content: string; bytes: number }> = [];
  let total = 0;
  let truncated = false;
  for (const f of files) {
    if (collected.length >= MAX_FILES) {
      truncated = true; break;
    }
    if (!f.patch) continue; // binary or removed
    if (shouldSkipPath(f.filename)) continue;
    const bytes = Buffer.byteLength(f.patch, 'utf8');
    if (total + bytes > MAX_TOTAL_BYTES) { truncated = true; break; }
    collected.push({
      path: f.filename,
      content:
        `--- DIFF (${f.status}, +${f.additions} -${f.deletions}) ---\n` + f.patch,
      bytes,
    });
    total += bytes;
  }
  return {
    kind: 'pr',
    url: `https://github.com/${p.owner}/${p.repo}/pull/${p.prNumber}`,
    title: `PR #${p.prNumber}: ${pr.title}`,
    files: collected,
    truncated,
    totalBytes: total,
    meta: {
      author: pr.user?.login,
      base: pr.base?.ref,
      head: pr.head?.ref,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
      body: (pr.body ?? '').slice(0, 500),
    },
  };
}

async function fetchFile(p: ParsedUrl): Promise<FetchedCode> {
  if (!p.path || !p.ref) throw new Error('file path required');
  const content = await ghRaw(p.owner, p.repo, p.ref, p.path);
  const bytes = Buffer.byteLength(content, 'utf8');
  const truncated = bytes > MAX_FILE_BYTES;
  return {
    kind: 'file',
    url: `https://github.com/${p.owner}/${p.repo}/blob/${p.ref}/${p.path}`,
    title: `${p.owner}/${p.repo} :: ${p.path}`,
    files: [{ path: p.path, content: truncated ? content.slice(0, MAX_FILE_BYTES) : content, bytes }],
    truncated,
    totalBytes: bytes,
  };
}

async function fetchTree(p: ParsedUrl): Promise<FetchedCode> {
  const ref = p.ref ?? 'HEAD';
  const tree = await ghJson(`/repos/${p.owner}/${p.repo}/git/trees/${ref}?recursive=1`);
  const all: Array<{ path: string; size: number }> = (tree.tree ?? [])
    .filter((n: any) => n.type === 'blob' && isTextFile(n.path) && !shouldSkipPath(n.path))
    .filter((n: any) => !p.path || n.path.startsWith(p.path))
    .map((n: any) => ({ path: n.path, size: n.size ?? 0 }));

  // sort priority: code > config > docs
  all.sort((a, b) => {
    const score = (x: typeof a) => {
      if (/\.(ts|tsx|js|jsx|py|rs|go|java|rb|cpp|c|cs)$/.test(x.path)) return 0;
      if (/\.(yml|yaml|toml|json|env|dockerfile)$/i.test(x.path)) return 1;
      return 2;
    };
    return score(a) - score(b) || a.size - b.size;
  });

  const collected: Array<{ path: string; content: string; bytes: number }> = [];
  let total = 0;
  let truncated = all.length > MAX_FILES;
  for (const node of all) {
    if (collected.length >= MAX_FILES) { truncated = true; break; }
    if (node.size > MAX_FILE_BYTES) { truncated = true; continue; }
    if (total + node.size > MAX_TOTAL_BYTES) { truncated = true; break; }
    try {
      const content = await ghRaw(p.owner, p.repo, ref, node.path);
      const bytes = Buffer.byteLength(content, 'utf8');
      collected.push({ path: node.path, content, bytes });
      total += bytes;
    } catch {
      // skip unreadable
    }
  }

  return {
    kind: p.kind,
    url: `https://github.com/${p.owner}/${p.repo}/tree/${ref}${p.path ? '/' + p.path : ''}`,
    title: `${p.owner}/${p.repo}${p.path ? ' / ' + p.path : ''} @ ${ref}`,
    files: collected,
    truncated,
    totalBytes: total,
    meta: { totalCandidates: all.length },
  };
}

async function fetchRepo(p: ParsedUrl): Promise<FetchedCode> {
  const meta = await ghJson(`/repos/${p.owner}/${p.repo}`);
  const tree = await fetchTree({ ...p, kind: 'dir', ref: meta.default_branch });
  return {
    ...tree,
    kind: 'repo',
    url: `https://github.com/${p.owner}/${p.repo}`,
    title: `${p.owner}/${p.repo} @ ${meta.default_branch}`,
    meta: {
      ...tree.meta,
      stars: meta.stargazers_count,
      language: meta.language,
      description: meta.description,
      default_branch: meta.default_branch,
    },
  };
}
