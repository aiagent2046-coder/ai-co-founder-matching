import { describe, it, expect } from 'vitest';
import { extractSaveFacts } from '../agents/save-facts';

describe('extractSaveFacts', () => {
  it('возвращает текст как есть, если блока нет', () => {
    const { reply, facts } = extractSaveFacts('Просто ответ без блока.');
    expect(reply).toBe('Просто ответ без блока.');
    expect(facts).toEqual([]);
  });

  it('извлекает факты и вырезает блок из ответа', () => {
    const input = 'Готовый план.\n<save_facts>["Юрисдикция — РФ", "Стадия pre-seed"]</save_facts>';
    const { reply, facts } = extractSaveFacts(input);
    expect(reply).toBe('Готовый план.');
    expect(facts).toEqual(['Юрисдикция — РФ', 'Стадия pre-seed']);
  });

  it('битый JSON — игнор блока, факты пустые, блок всё равно вырезан', () => {
    const input = 'Ответ.\n<save_facts>[не json</save_facts>';
    const { reply, facts } = extractSaveFacts(input);
    expect(reply).toBe('Ответ.');
    expect(facts).toEqual([]);
  });

  it('отбрасывает пустые и не-строковые элементы', () => {
    const input = 'X\n<save_facts>["ок", "", "  ", 42, null]</save_facts>';
    const { facts } = extractSaveFacts(input);
    expect(facts).toEqual(['ок']);
  });

  it('пустой массив фактов — блок вырезан, фактов нет', () => {
    const input = 'Текст.\n<save_facts>[]</save_facts>';
    const { reply, facts } = extractSaveFacts(input);
    expect(reply).toBe('Текст.');
    expect(facts).toEqual([]);
  });
});
