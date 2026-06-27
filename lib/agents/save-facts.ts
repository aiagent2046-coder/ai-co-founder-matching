// Чистый парсер блока <save_facts>[...]</save_facts> из ответа агента (вариант B).
// Без внешних зависимостей — тестируется изолированно.
// Битый JSON — игнорируем блок, ответ отдаём как есть (без падения).

export function extractSaveFacts(text: string): { reply: string; facts: string[] } {
  const m = text.match(/<save_facts>([\s\S]*?)<\/save_facts>/i);
  if (!m) return { reply: text, facts: [] };
  const reply = text.replace(m[0], '').trim();
  let facts: string[] = [];
  try {
    const parsed = JSON.parse(m[1].trim());
    if (Array.isArray(parsed)) {
      facts = parsed
        .filter((x): x is string => typeof x === 'string')
        .map(s => s.trim())
        .filter(Boolean);
    }
  } catch {
    // битый JSON — просто не сохраняем
  }
  return { reply, facts };
}
