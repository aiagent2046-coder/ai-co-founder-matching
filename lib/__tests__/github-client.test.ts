import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  listRepos, getTree, getFileContent, searchCode,
  GitHubError, MAX_TREE_ENTRIES, MAX_FILE_BYTES,
} from '../github/client';

const TOKEN = 'gho_test';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => { vi.restoreAllMocks(); });

describe('github client — error mapping', () => {
  it('maps 401 to GitHubError', async () => {
    vi.stubGlobal('fetch', mockFetch(401, {}));
    await expect(listRepos(TOKEN)).rejects.toMatchObject({ status: 401 });
  });
  it('maps 403 (rate limit) to GitHubError', async () => {
    vi.stubGlobal('fetch', mockFetch(403, {}));
    await expect(listRepos(TOKEN)).rejects.toBeInstanceOf(GitHubError);
  });
  it('maps 404 to GitHubError', async () => {
    vi.stubGlobal('fetch', mockFetch(404, {}));
    await expect(getTree(TOKEN, 'a/b', 'main')).rejects.toMatchObject({ status: 404 });
  });
});

describe('listRepos', () => {
  it('maps repo summary fields', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [
      { full_name: 'me/x', private: true, default_branch: 'main', description: 'd' },
    ]));
    const repos = await listRepos(TOKEN);
    expect(repos).toEqual([{ full_name: 'me/x', private: true, default_branch: 'main', description: 'd' }]);
  });
});

describe('getTree', () => {
  it('truncates to MAX_TREE_ENTRIES and flags truncated', async () => {
    const tree = Array.from({ length: MAX_TREE_ENTRIES + 50 }, (_, i) => ({
      path: `f${i}.ts`, type: 'blob', size: 10,
    }));
    vi.stubGlobal('fetch', mockFetch(200, { tree, truncated: false }));
    const res = await getTree(TOKEN, 'a/b', 'main');
    expect(res.entries).toHaveLength(MAX_TREE_ENTRIES);
    expect(res.truncated).toBe(true);
  });
});

describe('getFileContent', () => {
  it('decodes base64 text', async () => {
    const text = 'hello world';
    vi.stubGlobal('fetch', mockFetch(200, {
      size: text.length, encoding: 'base64',
      content: Buffer.from(text).toString('base64'),
    }));
    const res = await getFileContent(TOKEN, 'a/b', 'README.md');
    expect(res.content).toBe(text);
    expect(res.truncated).toBe(false);
  });

  it('refuses files over MAX_FILE_BYTES', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { size: MAX_FILE_BYTES + 1, encoding: 'base64', content: '' }));
    const res = await getFileContent(TOKEN, 'a/b', 'big.bin');
    expect(res.truncated).toBe(true);
    expect(res.content).toContain('слишком большой');
  });

  it('detects binary via NUL byte', async () => {
    const bin = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    vi.stubGlobal('fetch', mockFetch(200, {
      size: bin.length, encoding: 'base64', content: bin.toString('base64'),
    }));
    const res = await getFileContent(TOKEN, 'a/b', 'img.png');
    expect(res.truncated).toBe(true);
    expect(res.content).toContain('бинарный');
  });

  it('rejects a directory path', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [{ name: 'a' }, { name: 'b' }]));
    await expect(getFileContent(TOKEN, 'a/b', 'src')).rejects.toMatchObject({ status: 400 });
  });
});

describe('searchCode', () => {
  it('maps hits and scopes query to repo', async () => {
    const spy = mockFetch(200, { items: [{ path: 'src/x.ts', repository: { full_name: 'a/b' } }] });
    vi.stubGlobal('fetch', spy);
    const hits = await searchCode(TOKEN, 'a/b', 'useEffect');
    expect(hits).toEqual([{ path: 'src/x.ts', repo: 'a/b' }]);
    const calledUrl = (spy.mock.calls[0] as any)[0] as string;
    expect(calledUrl).toContain('repo%3Aa%2Fb');
  });
});
