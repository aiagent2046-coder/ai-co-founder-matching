import { describe, it, expect } from 'vitest';
import {
  toMBTI, mbtiCompat, toEnneagram, enneaCompat,
  toElement, ELEMENT_COMPAT, biorhythmSync, soulCompat,
} from '../soul-matrix';

const HI = { openness: 90, conscientiousness: 90, extraversion: 90, agreeableness: 90, neuroticism: 90 };
const LO = { openness: 10, conscientiousness: 10, extraversion: 10, agreeableness: 10, neuroticism: 10 };

describe('toMBTI', () => {
  it('все высокие → ENFJ', () => expect(toMBTI(HI)).toBe('ENFJ'));
  it('все низкие → ISTP', () => expect(toMBTI(LO)).toBe('ISTP'));
  it('null → дефолты 50 → ENFJ (порог включительно)', () => expect(toMBTI(null)).toBe('ENFJ'));
});

describe('mbtiCompat', () => {
  it('диапазон 40..100', () => {
    const types = ['ENFJ', 'ISTP', 'INTJ', 'ESFP'];
    for (const a of types) for (const b of types) {
      const s = mbtiCompat(a, b);
      expect(s).toBeGreaterThanOrEqual(40);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
  it('симметрична', () => {
    expect(mbtiCompat('INTJ', 'ESFP')).toBe(mbtiCompat('ESFP', 'INTJ'));
  });
});

describe('toEnneagram', () => {
  it('тип в диапазоне 1..9, крыло соседнее', () => {
    const { type, wing } = toEnneagram(HI, { honesty_humility: 70, values: { achievement_power: 80 } });
    expect(type).toBeGreaterThanOrEqual(1);
    expect(type).toBeLessThanOrEqual(9);
    const diff = Math.abs(type - wing);
    expect(diff === 1 || diff === 8).toBe(true);
  });
});

describe('enneaCompat', () => {
  it('одинаковые типы = 60', () => expect(enneaCompat(5, 5)).toBe(60));
  it('линия гексады = 85 и симметрична', () => {
    expect(enneaCompat(1, 4)).toBe(85);
    expect(enneaCompat(4, 1)).toBe(85);
  });
  it('симметрична на всех парах', () => {
    for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) {
      expect(enneaCompat(a, b)).toBe(enneaCompat(b, a));
    }
  });
});

describe('elements', () => {
  it('toElement детерминирован и валиден', () => {
    expect(['fire', 'water', 'air', 'earth']).toContain(toElement(HI, {}));
  });
  it('таблица симметрична', () => {
    const els = ['fire', 'water', 'air', 'earth'] as const;
    for (const a of els) for (const b of els) {
      expect(ELEMENT_COMPAT[a][b]).toBe(ELEMENT_COMPAT[b][a]);
    }
  });
});

describe('biorhythmSync', () => {
  const today = new Date(2026, 5, 10);
  it('одинаковая дата рождения → 100 по всем циклам', () => {
    const p = { birth_year: 1990, birth_month: 3, birth_day: 15 };
    const r = biorhythmSync(p, { ...p }, today)!;
    expect(r.physical).toBe(100);
    expect(r.emotional).toBe(100);
    expect(r.intellectual).toBe(100);
  });
  it('без года → null', () => {
    expect(biorhythmSync(
      { birth_month: 3, birth_day: 15 },
      { birth_year: 1990, birth_month: 3, birth_day: 15 },
      today,
    )).toBeNull();
  });
});

describe('soulCompat', () => {
  const A = { big_five: HI, behavioral_profile: { honesty_humility: 70, values: { achievement_power: 60 } }, birth_year: 1990, birth_month: 3, birth_day: 15 };
  const B = { big_five: LO, behavioral_profile: { honesty_humility: 40, values: { achievement_power: 30 } }, birth_year: 1992, birth_month: 7, birth_day: 2 };
  it('score в 0..100, детерминирован', () => {
    const t = new Date(2026, 5, 10);
    const r1 = soulCompat(A, B, t), r2 = soulCompat(A, B, t);
    expect(r1.score).toBe(r2.score);
    expect(r1.score).toBeGreaterThanOrEqual(0);
    expect(r1.score).toBeLessThanOrEqual(100);
    expect(r1.level).toBeTruthy();
    expect(r1.phrase).toBeTruthy();
  });
  it('без дат рождения biorhythm = null, score всё равно считается', () => {
    const r = soulCompat({ big_five: HI }, { big_five: LO });
    expect(r.components.biorhythm).toBeNull();
    expect(r.score).toBeGreaterThan(0);
  });
});
