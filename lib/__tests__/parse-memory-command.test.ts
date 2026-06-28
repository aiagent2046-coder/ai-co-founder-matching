import { describe, it, expect } from 'vitest';
import { parseMemoryCommand } from '../agents/save-facts';

describe('parseMemoryCommand', () => {
  it('распознаёт форму с двоеточием и извлекает факт', () => {
    expect(parseMemoryCommand('запомни: рынок — РФ')).toEqual({ kind: 'fact', fact: 'рынок — РФ' });
  });

  it('распознаёт форму без двоеточия и извлекает факт', () => {
    expect(parseMemoryCommand('Запомни рынок РФ')).toEqual({ kind: 'fact', fact: 'рынок РФ' });
  });

  it('распознаёт английскую команду remember', () => {
    expect(parseMemoryCommand('remember: market is RU')).toEqual({ kind: 'fact', fact: 'market is RU' });
  });

  it('нечувствительна к регистру', () => {
    expect(parseMemoryCommand('ЗАПОМНИ: stage — MVP')).toEqual({ kind: 'fact', fact: 'stage — MVP' });
  });

  it('«запомни контекст нашей беседы» → needs_clarification (НЕ факт)', () => {
    expect(parseMemoryCommand('Запомни контекст нашей беседы')).toEqual({ kind: 'needs_clarification' });
  });

  it('«remember our conversation» → needs_clarification', () => {
    expect(parseMemoryCommand('remember our conversation')).toEqual({ kind: 'needs_clarification' });
  });

  it('пустой факт после префикса → needs_clarification', () => {
    expect(parseMemoryCommand('запомни')).toEqual({ kind: 'needs_clarification' });
    expect(parseMemoryCommand('запомни:')).toEqual({ kind: 'needs_clarification' });
  });

  it('не команда → null', () => {
    expect(parseMemoryCommand('расскажи про рынок')).toBeNull();
    expect(parseMemoryCommand('')).toBeNull();
    expect(parseMemoryCommand(null)).toBeNull();
    expect(parseMemoryCommand(undefined)).toBeNull();
  });

  it('похожие слова не считаются командой', () => {
    expect(parseMemoryCommand('запомните факт')).toBeNull();
    expect(parseMemoryCommand('запомнил вчера')).toBeNull();
  });

  it('обрезает лишние пробелы вокруг факта', () => {
    expect(parseMemoryCommand('  запомни:    юрлицо — ООО  ')).toEqual({ kind: 'fact', fact: 'юрлицо — ООО' });
  });
});
