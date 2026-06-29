import { describe, it, expect, vi, afterEach } from 'vitest';
import { runEngineerWithTools, runEngineerTool, ENGINEER_TOOLS, MAX_TOOL_ITERATIONS } from '../agents/engineer-tools';

afterEach(() => { vi.restoreAllMocks(); });

describe('ENGINEER_TOOLS schema', () => {
  it('exposes exactly the read-only tools', () => {
    expect(ENGINEER_TOOLS.map(t => t.name).sort()).toEqual(
      ['list_repos', 'list_tree', 'read_file', 'search_code'],
    );
  });
});

describe('runEngineerTool', () => {
  it('returns is_error for unknown tool', async () => {
    const r = await runEngineerTool('tok', { id: '1', name: 'delete_repo', input: {} });
    expect(r.is_error).toBe(true);
    expect(r.content).toContain('Неизвестный инструмент');
  });
  it('validates required args', async () => {
    const r = await runEngineerTool('tok', { id: '1', name: 'read_file', input: { repo: 'a/b' } });
    expect(r.is_error).toBe(true);
  });
});

describe('runEngineerWithTools loop', () => {
  it('executes a tool then returns final text', async () => {
    // мок fetch для list_repos внутри runEngineerTool
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [],
    } as Response));

    let call = 0;
    const callClaude = vi.fn(async () => {
      call++;
      if (call === 1) {
        return {
          stop_reason: 'tool_use',
          content: [
            { type: 'text', text: 'Смотрю репозитории…' },
            { type: 'tool_use', id: 'tu1', name: 'list_repos', input: {} },
          ],
        };
      }
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Готово: 0 репо.' }] };
    });

    const out = await runEngineerWithTools({
      token: 'tok', system: 'sys',
      messages: [{ role: 'user', content: 'покажи репозитории' }],
      callClaude,
    });
    expect(out).toContain('Готово: 0 репо.'); // суффикс [debug:...] временно допускается
    expect(callClaude).toHaveBeenCalledTimes(2);
    // второй вызов должен содержать tool_result в истории
    const secondBody = (callClaude.mock.calls as any[])[1][0];
    const hasToolResult = JSON.stringify(secondBody.messages).includes('tool_result');
    expect(hasToolResult).toBe(true);
  });

  it('stops at MAX_TOOL_ITERATIONS and makes a final no-tools call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [],
    } as Response));

    // всегда просит инструмент → упираемся в лимит
    const callClaude = vi.fn(async () => ({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'x', name: 'list_repos', input: {} }],
    }));

    const out = await runEngineerWithTools({
      token: 'tok', system: 'sys',
      messages: [{ role: 'user', content: 'loop' }],
      callClaude,
    });
    // MAX итераций + 1 финальный вызов без tools
    expect(callClaude).toHaveBeenCalledTimes(MAX_TOOL_ITERATIONS + 1);
    expect(typeof out).toBe('string');
    // финальный вызов — без tools
    const lastBody = (callClaude.mock.calls as any[])[MAX_TOOL_ITERATIONS][0];
    expect(lastBody.tools).toBeUndefined();
  });
});
