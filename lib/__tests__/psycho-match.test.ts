import { describe, it, expect } from 'vitest';
import {
  hexacoCompat, tzOffsetHours, tzFit, workStyleCompat,
  PSYCHO_V2_WEIGHTS, HEXACO_WEIGHTS, WORKSTYLE_WEIGHTS,
} from '../psycho-match';

const HX = (d: Record<string, number>, f?: Record<string, number>) =>
  ({ domains: d, facets: f ?? {} });

describe('hexacoCompat', () => {
  it('нет данных → нейтрально 0.5', () => {
    expect(hexacoCompat(null, null)).toBe(0.5);
    expect(hexacoCompat({ domains: { H: 50 } }, null)).toBe(0.5);
  });
  it('диапазон 0..1', () => {
    const a = HX({ H: 90, E: 10, X: 80, A: 20, C: 95, O: 70 });
    const b = HX({ H: 30, E: 90, X: 20, A: 90, C: 10, O: 30 });
    const s = hexacoCompat(a, b);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
  it('симметрична', () => {
    const a = HX({ H: 70, E: 40, X: 60, A: 55, C: 80, O: 75 });
    const b = HX({ H: 50, E: 60, X: 30, A: 65, C: 60, O: 50 });
    expect(hexacoCompat(a, b)).toBeCloseTo(hexacoCompat(b, a), 10);
  });
  it('идентичные профили — высокий скор (близость по похожим осям)', () => {
    const a = HX({ H: 70, E: 50, X: 50, A: 70, C: 80, O: 60 });
    // X идентичен → bell на 0 разнице ниже пика 0.3, но похожие оси = 1.0
    expect(hexacoCompat(a, a)).toBeGreaterThan(0.7);
  });
  it('двойной низкий A без flexibility → штраф', () => {
    const lowA = HX({ H: 50, E: 50, X: 50, A: 20, C: 50, O: 50 });
    const lowAflex = HX({ H: 50, E: 50, X: 50, A: 20, C: 50, O: 50 }, { flexibility: 80 });
    expect(hexacoCompat(lowAflex, lowAflex)).toBeGreaterThan(hexacoCompat(lowA, lowA));
  });
  it('высокая обоюдная fairness даёт бонус', () => {
    const base = HX({ H: 60, E: 50, X: 50, A: 60, C: 60, O: 50 });
    const fair = HX({ H: 60, E: 50, X: 50, A: 60, C: 60, O: 50 }, { fairness: 85 });
    expect(hexacoCompat(fair, fair)).toBeGreaterThan(hexacoCompat(base, base));
  });
  it('веса доменов суммируются в 1.0', () => {
    const sum = Object.values(HEXACO_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe('tzOffsetHours', () => {
  it('UTC → 0', () => expect(tzOffsetHours('UTC')).toBe(0));
  it('Europe/Moscow → +3 (без DST с 2014)', () => expect(tzOffsetHours('Europe/Moscow')).toBe(3));
  it('невалидная зона → null', () => expect(tzOffsetHours('Not/AZone')).toBeNull());
  it('пусто → null', () => {
    expect(tzOffsetHours(null)).toBeNull();
    expect(tzOffsetHours(undefined)).toBeNull();
    expect(tzOffsetHours('')).toBeNull();
  });
  it('дробный офсет (Asia/Kolkata +5:30)', () => {
    expect(tzOffsetHours('Asia/Kolkata')).toBeCloseTo(5.5, 5);
  });
});

describe('tzFit', () => {
  it('одинаковая зона → 1.0', () => {
    expect(tzFit('Europe/Moscow', 'Europe/Moscow')).toBe(1);
  });
  it('нет зоны у одного → нейтрально 0.5', () => {
    expect(tzFit('Europe/Moscow', null)).toBe(0.5);
    expect(tzFit(null, null)).toBe(0.5);
  });
  it('разница 3ч → overlap 6/9', () => {
    // Moscow +3, London +0/+1 (DST). Берём фиксированные офсеты через зимнюю дату.
    const winter = new Date('2026-01-15T12:00:00Z');
    const f = tzFit('Europe/Moscow', 'Europe/London', winter); // diff=3
    expect(f).toBeCloseTo(6 / 9, 5);
  });
  it('диапазон 0..1 и симметрия', () => {
    const zones = ['UTC', 'Europe/Moscow', 'America/New_York', 'Asia/Tokyo'];
    for (const a of zones) for (const b of zones) {
      const f = tzFit(a, b);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
      expect(f).toBeCloseTo(tzFit(b, a), 10);
    }
  });
  it('очень далёкие зоны (diff>=9) → 0', () => {
    const winter = new Date('2026-01-15T12:00:00Z');
    // Moscow +3, Los_Angeles -8 → diff=11 > 9 → overlap 0
    expect(tzFit('Europe/Moscow', 'America/Los_Angeles', winter)).toBe(0);
  });
});

describe('workStyleCompat', () => {
  it('нет данных → нейтрально 0.5', () => {
    expect(workStyleCompat(null, null)).toBe(0.5);
    expect(workStyleCompat({ pace: 50 }, null)).toBe(0.5);
  });
  it('диапазон 0..1 и симметрия', () => {
    const a = { pace: 80, structure: 30, communication: 70, risk: 60 };
    const b = { pace: 40, structure: 70, communication: 50, risk: 40 };
    const s = workStyleCompat(a, b);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
    expect(workStyleCompat(a, b)).toBeCloseTo(workStyleCompat(b, a), 10);
  });
  it('комплементарность structure: разрыв ~35% лучше нулевого', () => {
    const same = { pace: 50, structure: 50, communication: 50, risk: 50 };
    const compl = { pace: 50, structure: 85, communication: 50, risk: 50 };
    expect(workStyleCompat(same, compl)).toBeGreaterThan(workStyleCompat(same, same));
  });
  it('веса осей суммируются в 1.0', () => {
    const sum = Object.values(WORKSTYLE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe('PSYCHO_V2_WEIGHTS', () => {
  it('сумма весов формулы = 1.0', () => {
    const sum = Object.values(PSYCHO_V2_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});
