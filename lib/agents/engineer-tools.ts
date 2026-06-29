// Tool-use для engineer-агента: read-only доступ к GitHub-репозиториям владельца.
// Определения инструментов (схема для Anthropic) + исполнение поверх lib/github.
//
// БЕЗОПАСНОСТЬ: все инструменты строго read-only. Токен берётся по userId —
// агент одного пользователя НИКОГДА не видит репозитории другого. Содержимое
// файлов возвращается агенту как ДАННЫЕ; system-промпт предписывает трактовать
// их как данные, не как инструкции (prompt-injection).

import {
  listRepos, getTree, getFileContent, searchCode, GitHubError,
} from '@/lib/github/client';

export const MAX_TOOL_ITERATIONS = 8; // потолок шагов tool-use за один запрос

// Схема инструментов в формате Anthropic tools.
export const ENGINEER_TOOLS = [
  {
    name: 'list_repos',
    description: 'Список репозиториев пользователя на GitHub (до 50, по дате обновления). Используй, чтобы узнать, какие проекты доступны.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_tree',
    description: 'Дерево файлов репозитория (рекурсивно, обрезается). Используй, чтобы понять структуру проекта перед чтением файлов.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Полное имя репозитория, напр. "owner/name"' },
        ref: { type: 'string', description: 'Ветка/коммит. Если не указано — ветка по умолчанию.' },
      },
      required: ['repo'],
    },
  },
  {
    name: 'read_file',
    description: 'Прочитать содержимое одного файла из репозитория. Большие/бинарные файлы не возвращаются.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Полное имя репозитория "owner/name"' },
        path: { type: 'string', description: 'Путь к файлу от корня репозитория' },
        ref: { type: 'string', description: 'Ветка/коммит (опционально)' },
      },
      required: ['repo', 'path'],
    },
  },
  {
    name: 'search_code',
    description: 'Поиск по коду в пределах одного репозитория. Возвращает пути совпавших файлов.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Полное имя репозитория "owner/name"' },
        query: { type: 'string', description: 'Поисковый запрос (ключевые слова/идентификаторы)' },
      },
      required: ['repo', 'query'],
    },
  },
] as const;

export type ToolUse = { id: string; name: string; input: Record<string, unknown> };
export type ToolResult = { tool_use_id: string; content: string; is_error?: boolean };

// Исполнить один tool_use. Возвращает строковый результат (или текст ошибки,
// помеченный is_error — модель сможет среагировать, а не падать).
export async function runEngineerTool(token: string, tu: ToolUse): Promise<ToolResult> {
  const fail = (msg: string): ToolResult => ({ tool_use_id: tu.id, content: msg, is_error: true });
  const ok = (data: unknown): ToolResult => ({
    tool_use_id: tu.id,
    content: typeof data === 'string' ? data : JSON.stringify(data),
  });

  try {
    switch (tu.name) {
      case 'list_repos':
        return ok(await listRepos(token));
      case 'list_tree': {
        const repo = String(tu.input.repo ?? '');
        const ref = tu.input.ref ? String(tu.input.ref) : 'HEAD';
        if (!repo) return fail('repo обязателен');
        return ok(await getTree(token, repo, ref));
      }
      case 'read_file': {
        const repo = String(tu.input.repo ?? '');
        const path = String(tu.input.path ?? '');
        const ref = tu.input.ref ? String(tu.input.ref) : undefined;
        if (!repo || !path) return fail('repo и path обязательны');
        return ok(await getFileContent(token, repo, path, ref));
      }
      case 'search_code': {
        const repo = String(tu.input.repo ?? '');
        const query = String(tu.input.query ?? '');
        if (!repo || !query) return fail('repo и query обязательны');
        return ok(await searchCode(token, repo, query));
      }
      default:
        return fail(`Неизвестный инструмент: ${tu.name}`);
    }
  } catch (e) {
    if (e instanceof GitHubError) return fail(`GitHub ошибка ${e.status}: ${e.message}`);
    return fail(`Ошибка инструмента: ${e instanceof Error ? e.message : String(e)}`);
  }
}

type AnthropicMessage = { role: 'user' | 'assistant'; content: unknown };

// Прогон tool-use цикла: не-стрим вызовы Anthropic с инструментами GitHub,
// пока модель не вернёт финальный текст (stop_reason !== 'tool_use') или не
// упрёмся в MAX_TOOL_ITERATIONS. Возвращает итоговый текст ответа.
// callClaude — инъекция вызова API (тестируемость + переиспользование fetchWithTimeout).
export async function runEngineerWithTools(args: {
  token: string;
  system: string;
  messages: AnthropicMessage[];
  callClaude: (body: Record<string, unknown>) => Promise<any>;
  // Опциональная тихая диагностика (только сервер-логи, не в текст ответа).
  onMeta?: (m: { stop_reason: string; iter: number; len: number; via: 'loop' | 'fallback' }) => void;
}): Promise<string> {
  const { token, system, messages, callClaude, onMeta } = args;
  const convo: AnthropicMessage[] = [...messages];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const data = await callClaude({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384, // финальный анализ часто возвращается именно отсюда (stop≠tool_use)
      system,
      tools: ENGINEER_TOOLS,
      messages: convo,
    });

    const blocks: any[] = data?.content ?? [];
    const textOut = blocks.filter(b => b.type === 'text').map(b => b.text).join('');

    if (data?.stop_reason !== 'tool_use') {
      onMeta?.({ stop_reason: String(data?.stop_reason), iter: i, len: textOut.length, via: 'loop' });
      return textOut; // финальный ответ
    }

    // Есть запросы инструментов — исполняем все и продолжаем диалог.
    const toolUses: ToolUse[] = blocks
      .filter(b => b.type === 'tool_use')
      .map(b => ({ id: b.id, name: b.name, input: b.input ?? {} }));

    convo.push({ role: 'assistant', content: blocks });

    const results = await Promise.all(toolUses.map(tu => runEngineerTool(token, tu)));
    convo.push({
      role: 'user',
      content: results.map(r => ({
        type: 'tool_result',
        tool_use_id: r.tool_use_id,
        content: r.content,
        ...(r.is_error ? { is_error: true } : {}),
      })),
    });
  }

  // Превышен лимит итераций — последний вызов без инструментов, чтобы выжать текст.
  const finalData = await callClaude({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16384, // финальный развёрнутый анализ — больше места
    system,
    messages: convo,
  });
  const finalText: string = (finalData?.content ?? [])
    .filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  onMeta?.({ stop_reason: String(finalData?.stop_reason), iter: MAX_TOOL_ITERATIONS, len: finalText.length, via: 'fallback' });
  return finalText || 'Не удалось завершить анализ за отведённое число шагов. Уточни запрос.';
}
