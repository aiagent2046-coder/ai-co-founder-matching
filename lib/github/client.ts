// Тонкий read-only слой над GitHub REST API для engineer-агента.
// Все функции принимают уже расшифрованный токен пользователя.
// Лимиты защищают контекст модели и бюджет: большие файлы/деревья обрезаются.

const GH_API = 'https://api.github.com';

export const MAX_FILE_BYTES = 100_000;   // ~100 КБ на файл
export const MAX_TREE_ENTRIES = 300;     // максимум путей в дереве за раз
export const MAX_SEARCH_RESULTS = 20;    // максимум результатов поиска кода

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

async function gh(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${GH_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 401) throw new GitHubError(401, 'GitHub token invalid or expired');
  if (res.status === 403) throw new GitHubError(403, 'GitHub rate limit or access denied');
  if (res.status === 404) throw new GitHubError(404, 'Not found');
  if (!res.ok) throw new GitHubError(res.status, `GitHub API error ${res.status}`);
  return res.json();
}

export type RepoSummary = {
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
};

// Список репозиториев пользователя (по последнему обновлению).
export async function listRepos(token: string): Promise<RepoSummary[]> {
  const data = (await gh('/user/repos?per_page=50&sort=updated', token)) as any[];
  return data.map((r) => ({
    full_name: r.full_name,
    private: r.private,
    default_branch: r.default_branch,
    description: r.description ?? null,
  }));
}

export type TreeEntry = { path: string; type: string; size?: number };

// Дерево файлов репозитория (рекурсивно). Обрезается до MAX_TREE_ENTRIES.
export async function getTree(
  token: string,
  fullName: string,
  ref: string,
): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  const data = (await gh(
    `/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
  )) as any;
  const all: TreeEntry[] = (data.tree ?? []).map((t: any) => ({
    path: t.path,
    type: t.type,
    size: t.size,
  }));
  const entries = all.slice(0, MAX_TREE_ENTRIES);
  return { entries, truncated: all.length > MAX_TREE_ENTRIES || !!data.truncated };
}

// Содержимое файла. Возвращает текст; бинарники и слишком большие файлы — отказ.
export async function getFileContent(
  token: string,
  fullName: string,
  path: string,
  ref?: string,
): Promise<{ content: string; truncated: boolean }> {
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const data = (await gh(
    `/repos/${fullName}/contents/${path.split('/').map(encodeURIComponent).join('/')}${refQuery}`,
    token,
  )) as any;

  if (Array.isArray(data)) throw new GitHubError(400, 'Path is a directory, not a file');
  if (data.size > MAX_FILE_BYTES) {
    return { content: `[файл слишком большой: ${data.size} байт, лимит ${MAX_FILE_BYTES}]`, truncated: true };
  }
  if (data.encoding !== 'base64' || typeof data.content !== 'string') {
    throw new GitHubError(415, 'Unsupported file encoding');
  }

  const buf = Buffer.from(data.content, 'base64');
  // эвристика бинарника: NUL-байт в первых 8 КБ
  if (buf.subarray(0, 8192).includes(0)) {
    return { content: '[бинарный файл — содержимое не показано]', truncated: true };
  }
  return { content: buf.toString('utf8'), truncated: false };
}

export type SearchHit = { path: string; repo: string };

// Поиск кода в пределах одного репозитория. Обрезается до MAX_SEARCH_RESULTS.
export async function searchCode(
  token: string,
  fullName: string,
  query: string,
): Promise<SearchHit[]> {
  const q = encodeURIComponent(`${query} repo:${fullName}`);
  const data = (await gh(`/search/code?q=${q}&per_page=${MAX_SEARCH_RESULTS}`, token)) as any;
  return (data.items ?? []).slice(0, MAX_SEARCH_RESULTS).map((i: any) => ({
    path: i.path,
    repo: i.repository?.full_name ?? fullName,
  }));
}
