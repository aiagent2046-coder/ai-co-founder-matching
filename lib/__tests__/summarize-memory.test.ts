import { describe, it, expect } from 'vitest';
import { buildSummarizePrompt, buildDialogBlock, MAX_SUMMARY_FACTS, extractSaveFacts } from '../agents/save-facts';

type Msg = { role: 'user' | 'assistant'; content: string };

describe('buildSummarizePrompt', () => {
  it('требует строгий формат <save_facts> и задаёт лимит', () => {
    const p = buildSummarizePrompt();
    expect(p).toContain('<save_facts>');
    expect(p).toContain(`Maximum ${MAX_SUMMARY_FACTS} facts`);
  });

  it('инструктирует не извлекать планы/мнения', () => {
    expect(buildSummarizePrompt()).toMatch(/Do NOT extract/i);
  });

  it('задаёт пустой блок при отсутствии фактов', () => {
    expect(buildSummarizePrompt()).toContain('<save_facts>[]</save_facts>');
  });

  it('принимает кастомный лимит', () => {
    expect(buildSummarizePrompt(3)).toContain('Maximum 3 facts');
  });
});

describe('buildDialogBlock', () => {
  it('оборачивает диалог в <dialog> и помечает роли', () => {
    const msgs: Msg[] = [
      { role: 'user', content: 'Рынок РФ' },
      { role: 'assistant', content: 'Понял' },
    ];
    const block = buildDialogBlock(msgs);
    expect(block).toContain('<dialog>');
    expect(block).toContain('</dialog>');
    expect(block).toContain('FOUNDER: Рынок РФ');
    expect(block).toContain('AGENT: Понял');
  });

  it('выкидывает пустые сообщения', () => {
    const msgs: Msg[] = [
      { role: 'user', content: '  ' },
      { role: 'user', content: 'Стадия MVP' },
    ];
    const block = buildDialogBlock(msgs);
    expect(block).toContain('FOUNDER: Стадия MVP');
    expect(block.match(/FOUNDER:/g)?.length).toBe(1);
  });

  it('обрезает слишком длинное сообщение', () => {
    const long = 'a'.repeat(600);
    const block = buildDialogBlock([{ role: 'user', content: long }], 100);
    expect(block).toContain('…');
    expect(block.length).toBeLessThan(600);
  });
});

describe('extractSaveFacts (используется выжимкой)', () => {
  it('парсит факты из ответа модели-выжимки', () => {
    const out = extractSaveFacts('<save_facts>["рынок — РФ", "стадия — MVP"]</save_facts>');
    expect(out.facts).toEqual(['рынок — РФ', 'стадия — MVP']);
  });

  it('пустой блок → нет фактов', () => {
    expect(extractSaveFacts('<save_facts>[]</save_facts>').facts).toEqual([]);
  });
});
