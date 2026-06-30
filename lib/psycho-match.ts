// ============================================================
// Psycho-Match v2 — расширенные факторы скоринга (путь Р3).
// Чистые функции, каждая возвращает 0..1. Деградация на нейтральные
// значения при отсутствии данных (не ломает выдачу).
// Спека: docs/psycho-match-v2-spec.md
// ============================================================

// 0..100 с дефолтом (clamp + защита от не-чисел)
const n = (v: any, d = 50): number =>
  typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100, v)) : d;

// похожесть по оси 0..100 → 0..1
const sim = (a: number, b: number): number => 1 - Math.abs(a - b) / 100;

// колоколообразная комплементарность: пик на разнице `peak` (доля 0..1)
const bell = (a: number, b: number, peak: number, sigma = 0.25): number => {
  const d = Math.abs(a - b) / 100;
  return Math.exp(-Math.pow(d - peak, 2) / (2 * sigma * sigma));
};

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// ───────────────── HEXACO ─────────────────

export type HexacoDomains = { H?: number; E?: number; X?: number; A?: number; C?: number; O?: number };
export type HexacoFacets = { fairness?: number; diligence?: number; flexibility?: number };
export type Hexaco = { domains?: HexacoDomains | null; facets?: HexacoFacets | null };

export const HEXACO_WEIGHTS = { H: 0.30, C: 0.20, A: 0.15, X: 0.15, O: 0.10, E: 0.10 };

// Совместимость HEXACO двух профилей → 0..1.
// H/C/A/O/E — похожесть; X — лёгкая комплементарность; A с anti-двойной-клинч штрафом.
// Фасеты — модификатор.
export function hexacoCompat(a?: Hexaco | null, b?: Hexaco | null): number {
  if (!a?.domains || !b?.domains) return 0.5; // нет данных — нейтрально
  const da = a.domains, db = b.domains;

  const H = sim(n(da.H), n(db.H));
  const C = sim(n(da.C), n(db.C));
  const O = sim(n(da.O), n(db.O));
  const E = sim(n(da.E), n(db.E));
  const X = bell(n(da.X), n(db.X), 0.30); // один драйвит, другой держит фокус

  // A: похожесть, но штраф если оба очень низкие (двойной клинч)
  let A = sim(n(da.A), n(db.A));
  const bothLowA = n(da.A) < 30 && n(db.A) < 30;

  let score =
    HEXACO_WEIGHTS.H * H +
    HEXACO_WEIGHTS.C * C +
    HEXACO_WEIGHTS.A * A +
    HEXACO_WEIGHTS.X * X +
    HEXACO_WEIGHTS.O * O +
    HEXACO_WEIGHTS.E * E;

  // ── модификаторы по фасетам ──
  const fa = a.facets ?? {}, fb = b.facets ?? {};
  // высокая fairness обоих → бонус доверия
  if (n(fa.fairness, 0) >= 70 && n(fb.fairness, 0) >= 70) score += 0.05;
  // низкая diligence любого → штраф рабочей надёжности
  if (n(fa.diligence, 100) < 30 || n(fb.diligence, 100) < 30) score -= 0.05;
  // высокая flexibility хотя бы одного гасит A-penalty
  const flexRescue = n(fa.flexibility, 0) >= 60 || n(fb.flexibility, 0) >= 60;
  if (bothLowA && !flexRescue) score -= 0.08;

  return clamp01(score);
}

// ───────────────── Time-zone fit ─────────────────

// Текущий UTC-офсет IANA-зоны в часах (учитывает DST на момент вызова).
// Возвращает null, если зона невалидна/неизвестна.
export function tzOffsetHours(tz: string | null | undefined, at: Date = new Date()): number | null {
  if (!tz) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(at);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value; // напр. "GMT+3", "GMT-05:30"
    if (!name) return null;
    const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return name === 'GMT' ? 0 : null;
    const sign = m[1] === '-' ? -1 : 1;
    const h = parseInt(m[2], 10);
    const min = m[3] ? parseInt(m[3], 10) : 0;
    return sign * (h + min / 60);
  } catch {
    return null; // невалидная зона
  }
}

// Overlap рабочих часов (окно 9ч). diff=0 → 1.0; diff>=9 → 0.0.
// Нет зоны у кого-то → нейтрально 0.5.
const WORK_WINDOW_HOURS = 9;
export function tzFit(tzA: string | null | undefined, tzB: string | null | undefined, at: Date = new Date()): number {
  const oa = tzOffsetHours(tzA, at);
  const ob = tzOffsetHours(tzB, at);
  if (oa === null || ob === null) return 0.5;
  let diff = Math.abs(oa - ob);
  if (diff > 12) diff = 24 - diff; // кратчайшая дуга
  const overlap = Math.max(0, WORK_WINDOW_HOURS - diff);
  return clamp01(overlap / WORK_WINDOW_HOURS);
}

// ───────────────── Work-style complementarity ─────────────────

export type WorkStyle = { pace?: number; structure?: number; communication?: number; risk?: number };

export const WORKSTYLE_WEIGHTS = { pace: 0.30, structure: 0.25, communication: 0.25, risk: 0.20 };

// Совместимость стилей работы → 0..1.
// pace/communication — похожесть; structure — комплементарность; risk — умеренная похожесть.
export function workStyleCompat(a?: WorkStyle | null, b?: WorkStyle | null): number {
  if (!a || !b) return 0.5; // нет данных — нейтрально
  const pace = sim(n(a.pace), n(b.pace));
  const structure = bell(n(a.structure), n(b.structure), 0.35); // один структурирует, другой драйвит
  const communication = sim(n(a.communication), n(b.communication));
  const risk = bell(n(a.risk), n(b.risk), 0.20); // небольшой разрыв полезен, большой — конфликт

  const score =
    WORKSTYLE_WEIGHTS.pace * pace +
    WORKSTYLE_WEIGHTS.structure * structure +
    WORKSTYLE_WEIGHTS.communication * communication +
    WORKSTYLE_WEIGHTS.risk * risk;

  return clamp01(score);
}

// ───────────────── Веса итоговой формулы v2 ─────────────────

export const PSYCHO_V2_WEIGHTS = {
  similarity: 0.35,
  ocean: 0.20,
  hexaco: 0.15,
  workStyle: 0.15,
  tz: 0.15,
};
