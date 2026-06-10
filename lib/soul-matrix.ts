// ============================================================
// «Матрица души» — внутренний движок альтернативного скоринга.
// Снаружи используется только soulCompat(). Подсистемы (MBTI,
// эннеаграмма, стихии, биоритмы) — детали реализации, в UI не выводятся.
// Позиция продукта: слой вовлечения, не валидированный предиктор.
// ============================================================

export type BigFive = {
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
};

export type SoulProfile = {
  big_five?: BigFive | null;
  behavioral_profile?: any;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
};

const n = (v: any, d = 50) =>
  typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100, v)) : d;

// ───────────────── MBTI (вывод из Big Five, порог 50) ─────────────────

export function toMBTI(bf?: BigFive | null): string {
  const E = n(bf?.extraversion) >= 50 ? 'E' : 'I';
  const N = n(bf?.openness) >= 50 ? 'N' : 'S';
  const F = n(bf?.agreeableness) >= 50 ? 'F' : 'T';
  const J = n(bf?.conscientiousness) >= 50 ? 'J' : 'P';
  return E + N + F + J; // например "INTJ" (буквы в порядке E/I, N/S, T/F, J/P)
}

// Совместимость: общее восприятие (N/S) важнее всего,
// энергия (E/I) и ритм (J/P) лучше комплементарные, ценности решений (T/F) — общие.
export function mbtiCompat(a: string, b: string): number {
  let score = 10;
  score += a[1] === b[1] ? 35 : 0;  // N/S: общая картина мира
  score += a[0] !== b[0] ? 20 : 10; // E/I: баланс энергии
  score += a[3] !== b[3] ? 15 : 10; // J/P: структура + гибкость
  score += a[2] === b[2] ? 20 : 10; // T/F: общий стиль решений
  return score; // диапазон 40..100
}

// ───────────────── Эннеаграмма (эвристика из Big Five + values) ─────────────────

export function toEnneagram(bf?: BigFive | null, behavioral?: any): { type: number; wing: number } {
  const O = n(bf?.openness), C = n(bf?.conscientiousness), E = n(bf?.extraversion);
  const A = n(bf?.agreeableness), N = n(bf?.neuroticism);
  const honesty = n(behavioral?.honesty_humility);
  const ach = n(behavioral?.values?.achievement_power);

  const s: Record<number, number> = {
    1: 0.6 * C + 0.4 * honesty,          // Перфекционист
    2: 0.6 * A + 0.4 * E,                // Помощник
    3: 0.5 * ach + 0.3 * E + 0.2 * C,    // Достигатель
    4: 0.5 * O + 0.5 * N,                // Индивидуалист
    5: 0.5 * O + 0.5 * (100 - E),        // Исследователь
    6: 0.5 * N + 0.5 * C,                // Лоялист
    7: 0.5 * E + 0.5 * O,                // Энтузиаст
    8: 0.4 * (100 - A) + 0.3 * E + 0.3 * ach, // Челленджер
    9: 0.5 * A + 0.5 * (100 - N),        // Миротворец
  };
  const type = Number(Object.entries(s).sort((x, y) => y[1] - x[1])[0][0]);
  const left = type === 1 ? 9 : type - 1;
  const right = type === 9 ? 1 : type + 1;
  const wing = s[left] >= s[right] ? left : right;
  return { type, wing };
}

// Линии гексады (1-4-2-8-5-7-1) и триады (3-6-9) — «созвучные» пары.
const HEXAD: Record<number, number[]> = {
  1: [4, 7], 2: [4, 8], 3: [6, 9], 4: [1, 2], 5: [7, 8],
  6: [3, 9], 7: [1, 5], 8: [2, 5], 9: [3, 6],
};
const CENTER = (t: number) => (t === 8 || t === 9 || t === 1) ? 'gut' : t <= 4 ? 'heart' : 'head';

export function enneaCompat(a: number, b: number): number {
  if (a === b) return 60;                       // понимание, но общие слепые зоны
  if (HEXAD[a]?.includes(b)) return 85;          // линия связи — глубокое созвучие
  const adjacent = Math.abs(a - b) === 1 || Math.abs(a - b) === 8;
  if (adjacent) return 72;                       // соседи-крылья
  return CENTER(a) !== CENTER(b) ? 65 : 55;      // разные центры дополняют
}

// ───────────────── Стихии (4 класса вместо 22×22 арканов) ─────────────────

export type Element = 'fire' | 'water' | 'air' | 'earth';

export function toElement(bf?: BigFive | null, behavioral?: any): Element {
  const O = n(bf?.openness), C = n(bf?.conscientiousness), E = n(bf?.extraversion);
  const A = n(bf?.agreeableness), N = n(bf?.neuroticism);
  const ach = n(behavioral?.values?.achievement_power);
  const scores: Record<Element, number> = {
    fire:  0.5 * E + 0.5 * ach,
    water: 0.5 * A + 0.5 * N,
    air:   0.6 * O + 0.4 * E,
    earth: 0.7 * C + 0.3 * (100 - N),
  };
  return Object.entries(scores).sort((x, y) => y[1] - x[1])[0][0] as Element;
}

export const ELEMENT_COMPAT: Record<Element, Record<Element, number>> = {
  fire:  { fire: 70, air: 85, water: 50, earth: 60 },
  air:   { fire: 85, air: 70, water: 60, earth: 55 },
  water: { fire: 50, air: 60, water: 75, earth: 85 },
  earth: { fire: 60, air: 55, water: 85, earth: 75 },
};

// ───────────────── Биоритмы (классические 23/28/33, нужна полная дата) ─────────────────

function birthDate(p: SoulProfile): Date | null {
  if (!p.birth_year || !p.birth_month || !p.birth_day) return null;
  return new Date(p.birth_year, p.birth_month - 1, p.birth_day);
}

export function biorhythmSync(
  a: SoulProfile, b: SoulProfile, today = new Date()
): { physical: number; emotional: number; intellectual: number; avg: number } | null {
  const da = birthDate(a), db = birthDate(b);
  if (!da || !db) return null;
  const days = (d: Date) => Math.floor((today.getTime() - d.getTime()) / 86400000);
  const ta = days(da), tb = days(db);
  const sync = (period: number) => {
    const va = Math.sin((2 * Math.PI * ta) / period);
    const vb = Math.sin((2 * Math.PI * tb) / period);
    return Math.round((1 - Math.abs(va - vb) / 2) * 100);
  };
  const physical = sync(23), emotional = sync(28), intellectual = sync(33);
  return { physical, emotional, intellectual, avg: Math.round((physical + emotional + intellectual) / 3) };
}

// ───────────────── Композит ─────────────────

export type SoulCompatResult = {
  score: number;            // 0..100
  level: string;            // «Глубокий резонанс» | «Созвучие» | ...
  phrase: string;           // короткая человеческая строка
  components: { mbti: number; enneagram: number; element: number; biorhythm: number | null };
};

export function soulCompat(a: SoulProfile, b: SoulProfile, today = new Date()): SoulCompatResult {
  const mbti = mbtiCompat(toMBTI(a.big_five), toMBTI(b.big_five));
  const ennea = enneaCompat(
    toEnneagram(a.big_five, a.behavioral_profile).type,
    toEnneagram(b.big_five, b.behavioral_profile).type,
  );
  const element = ELEMENT_COMPAT[toElement(a.big_five, a.behavioral_profile)][toElement(b.big_five, b.behavioral_profile)];
  const bio = biorhythmSync(a, b, today);

  const score = Math.round(
    bio
      ? 0.30 * mbti + 0.30 * ennea + 0.20 * element + 0.20 * bio.avg
      : 0.375 * mbti + 0.375 * ennea + 0.25 * element // перенормировка без биоритмов
  );

  const level =
    score >= 80 ? 'Глубокий резонанс' :
    score >= 65 ? 'Созвучие' :
    score >= 50 ? 'Нейтральный фон' : 'Разные волны';

  const comp: [string, number][] = [['mbti', mbti], ['ennea', ennea], ['element', element]];
  if (bio) comp.push(['bio', bio.avg]);
  const strongest = comp.sort((x, y) => y[1] - x[1])[0][0];
  const DETAIL: Record<string, string> = {
    mbti: 'схожее восприятие мира',
    ennea: 'взаимодополняющие внутренние мотивации',
    element: 'ваши стихии усиливают друг друга',
    bio: 'сегодня ваши ритмы синхронны',
  };

  return {
    score, level, phrase: DETAIL[strongest],
    components: { mbti, enneagram: ennea, element, biorhythm: bio ? bio.avg : null },
  };
}
