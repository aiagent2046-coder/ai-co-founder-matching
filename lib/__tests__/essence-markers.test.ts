import { describe, it, expect } from 'vitest';
import { psychoMarkers } from '@/lib/avatar/essence';

describe('psychoMarkers', () => {
  it('возвращает пустой массив, если психополей нет', () => {
    expect(psychoMarkers({ name: 'X' })).toEqual([]);
  });

  it('раскладывает work_style по порогам <40 / 40-60 / >60', () => {
    const out = psychoMarkers({
      work_style: { pace: 80, structure: 20, communication: 50, risk: 90 },
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('быстрый темп');
    expect(out[0]).toContain('гибкость и импровизация');
    expect(out[0]).toContain('смешанная коммуникация');
    expect(out[0]).toContain('высокая толерантность к риску');
  });

  it('пропускает поля с null/undefined, не выдумывая данные', () => {
    const out = psychoMarkers({
      work_style: { pace: 80, structure: null, communication: undefined, risk: 10 },
    });
    expect(out[0]).toContain('быстрый темп');
    expect(out[0]).toContain('осторожность к риску');
    expect(out[0]).not.toContain('структур');
  });

  it('даёт высокий полюс HEXACO только при score > 60', () => {
    const hi = psychoMarkers({ hexaco: { domains: { H: 90, E: 50, X: 50, A: 50, C: 50, O: 50 } } });
    expect(hi[0]).toContain('честность и скромность');
    const mid = psychoMarkers({ hexaco: { domains: { H: 55, E: 50, X: 50, A: 50, C: 50, O: 50 } } });
    // H=55 в среднем диапазоне → нет маркера H, но другие домены тоже средние → массив пуст
    expect(mid).toEqual([]);
  });

  it('маппит conflict.primary_style на русский', () => {
    const out = psychoMarkers({ behavioral_profile: { conflict: { primary_style: 'collaborating' } } });
    expect(out).toContain('в конфликте: сотрудничество');
  });

  it('добавляет часовой пояс как есть', () => {
    const out = psychoMarkers({ time_zone: 'Europe/Moscow' });
    expect(out).toContain('часовой пояс: Europe/Moscow');
  });
});
