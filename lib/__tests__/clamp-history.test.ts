import { describe, it, expect } from 'vitest';
import { clampHistory } from '../agents/roles';

type Msg = { role: 'user' | 'assistant'; content: string };

const u = (c: string): Msg => ({ role: 'user', content: c });
const a = (c: string): Msg => ({ role: 'assistant', content: c });

describe('clampHistory', () => {
  it('returns all messages when under the limit', () => {
    const msgs = [u('q1'), a('a1'), u('q2')];
    expect(clampHistory(msgs, 20)).toEqual(msgs);
  });

  it('keeps only the last `max` messages when over the limit', () => {
    // 6 сообщений (3 пары), лимит 4 → последние 4, окно начинается с user
    const msgs = [u('q1'), a('a1'), u('q2'), a('a2'), u('q3'), a('a3')];
    const out = clampHistory(msgs, 4);
    expect(out).toEqual([u('q2'), a('a2'), u('q3'), a('a3')]);
  });

  it('drops a leading assistant so the window starts with user', () => {
    // slice(-3) = [a1, q2, a2] — начинается с assistant → сдвиг → [q2, a2]
    const msgs = [u('q1'), a('a1'), u('q2'), a('a2')];
    const out = clampHistory(msgs, 3);
    expect(out).toEqual([u('q2'), a('a2')]);
  });

  it('always preserves the last (current) user message', () => {
    const msgs = [u('q1'), a('a1'), u('q2'), a('a2'), u('q3'), a('a3'), u('current')];
    const out = clampHistory(msgs, 4);
    expect(out[out.length - 1]).toEqual(u('current'));
  });

  it('handles empty input', () => {
    expect(clampHistory([], 20)).toEqual([]);
  });

  it('window never starts with assistant after clamping', () => {
    const msgs = [a('a0'), u('q1'), a('a1'), u('q2')];
    const out = clampHistory(msgs, 3);
    expect(out.length === 0 || out[0].role === 'user').toBe(true);
  });
});
