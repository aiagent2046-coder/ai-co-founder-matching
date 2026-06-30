// Калибровочный прогон Psycho-Match v2 (НЕ регрессионный тест — разовый анализ).
// Запуск: npm run calibrate  (использует vitest.calib.config.ts — include только *.calib.ts)
// Расширение .calib.ts намеренно вне include основного vitest.config.ts — в регрессию (npm test) не попадает.
// Импортирует РЕАЛЬНЫЕ функции из lib/psycho-match.ts — формулы не дублируем.
import { describe, it, expect } from 'vitest';
import {
  hexacoCompat, workStyleCompat, tzFit, tzOffsetHours,
  PSYCHO_V2_WEIGHTS, WORKSTYLE_WEIGHTS, HEXACO_WEIGHTS,
  type WorkStyle, type Hexaco,
} from '../lib/psycho-match';

const pct = (x: number) => (x * 100).toFixed(1).padStart(5);
const at = new Date('2026-06-30T12:00:00Z'); // фиксируем момент — DST стабилен

// ── Итоговая base_v2 при заданных компонентах (similarity/ocean подставляем как сценарий) ──
function baseV2(similarity: number, ocean: number, hexaco: number, work: number, tz: number): number {
  return (
    similarity * PSYCHO_V2_WEIGHTS.similarity +
    ocean      * PSYCHO_V2_WEIGHTS.ocean +
    hexaco     * PSYCHO_V2_WEIGHTS.hexaco +
    work       * PSYCHO_V2_WEIGHTS.workStyle +
    tz         * PSYCHO_V2_WEIGHTS.tz
  );
}
// v1 без behavioral (текущая прод-формула при BEHAVIORAL_ENABLED=false)
const baseV1 = (similarity: number, ocean: number) => similarity * 0.6 + ocean * 0.4;

describe('Калибровка v2: веса', () => {
  it('сумма весов v2 = 1.0', () => {
    const s = Object.values(PSYCHO_V2_WEIGHTS).reduce((a, b) => a + b, 0);
    console.log('\n=== ВЕСА ===');
    console.log('PSYCHO_V2_WEIGHTS:', JSON.stringify(PSYCHO_V2_WEIGHTS), '→ сумма', s.toFixed(3));
    console.log('WORKSTYLE_WEIGHTS:', JSON.stringify(WORKSTYLE_WEIGHTS), '→ сумма', Object.values(WORKSTYLE_WEIGHTS).reduce((a,b)=>a+b,0).toFixed(3));
    console.log('HEXACO_WEIGHTS:', JSON.stringify(HEXACO_WEIGHTS), '→ сумма', Object.values(HEXACO_WEIGHTS).reduce((a,b)=>a+b,0).toFixed(3));
    expect(s).toBeCloseTo(1.0, 5);
  });
});

describe('Калибровка: workStyleCompat', () => {
  const cases: [string, WorkStyle, WorkStyle][] = [
    ['идентичные (все 50)',          { pace:50, structure:50, communication:50, risk:50 }, { pace:50, structure:50, communication:50, risk:50 }],
    ['идентичные (все 80)',          { pace:80, structure:80, communication:80, risk:80 }, { pace:80, structure:80, communication:80, risk:80 }],
    ['structure компл. (80↔20)',     { pace:50, structure:80, communication:50, risk:50 }, { pace:50, structure:20, communication:50, risk:50 }],
    ['structure идентичн. (80↔80)',  { pace:50, structure:80, communication:50, risk:50 }, { pace:50, structure:80, communication:50, risk:50 }],
    ['risk умер. разрыв (60↔40)',    { pace:50, structure:50, communication:50, risk:60 }, { pace:50, structure:50, communication:50, risk:40 }],
    ['pace полярный (90↔10)',        { pace:90, structure:50, communication:50, risk:50 }, { pace:10, structure:50, communication:50, risk:50 }],
    ['всё полярно',                  { pace:90, structure:90, communication:90, risk:90 }, { pace:10, structure:10, communication:10, risk:10 }],
  ];
  it('диапазон, симметрия, разумность', () => {
    console.log('\n=== workStyleCompat ===');
    for (const [name, a, b] of cases) {
      const ab = workStyleCompat(a, b);
      const ba = workStyleCompat(b, a);
      console.log(`${pct(ab)}%  ${name}`);
      expect(ab).toBeGreaterThanOrEqual(0);
      expect(ab).toBeLessThanOrEqual(1);
      expect(ab).toBeCloseTo(ba, 6); // симметрия
    }
    // structure-комплементарность должна давать выше, чем structure-идентичность
    const compl = workStyleCompat({pace:50,structure:80,communication:50,risk:50},{pace:50,structure:20,communication:50,risk:50});
    const ident = workStyleCompat({pace:50,structure:80,communication:50,risk:50},{pace:50,structure:80,communication:50,risk:50});
    console.log(`structure: компл ${pct(compl)}% vs идент ${pct(ident)}% → компл должно быть выше`);
    expect(compl).toBeGreaterThan(ident);
  });
  it('деградация на нейтраль при отсутствии данных', () => {
    expect(workStyleCompat(null, {pace:50,structure:50,communication:50,risk:50})).toBe(0.5);
    expect(workStyleCompat(undefined, undefined)).toBe(0.5);
  });
});

describe('Калибровка: hexacoCompat', () => {
  const mid = { H:50,E:50,X:50,A:50,C:50,O:50 };
  const cases: [string, Hexaco, Hexaco][] = [
    ['идентичные средние',           { domains: mid }, { domains: mid }],
    ['оба низкий A (клинч)',         { domains: {...mid, A:20} }, { domains: {...mid, A:20} }],
    ['оба низкий A + flex-rescue',   { domains: {...mid, A:20}, facets:{flexibility:70} }, { domains: {...mid, A:20} }],
    ['оба высокий fairness',         { domains: mid, facets:{fairness:80} }, { domains: mid, facets:{fairness:80} }],
    ['низкая diligence у одного',    { domains: mid, facets:{diligence:20} }, { domains: mid }],
    ['X компл. (80↔40)',            { domains: {...mid, X:80} }, { domains: {...mid, X:40} }],
    ['H полярный (90↔10)',          { domains: {...mid, H:90} }, { domains: {...mid, H:10} }],
  ];
  it('диапазон, симметрия, эффект штрафов/бонусов', () => {
    console.log('\n=== hexacoCompat ===');
    for (const [name, a, b] of cases) {
      const ab = hexacoCompat(a, b);
      const ba = hexacoCompat(b, a);
      console.log(`${pct(ab)}%  ${name}`);
      expect(ab).toBeGreaterThanOrEqual(0);
      expect(ab).toBeLessThanOrEqual(1);
      expect(ab).toBeCloseTo(ba, 6);
    }
    // клинч (оба низкий A) должен быть НИЖЕ идентичных средних
    const clinch = hexacoCompat({domains:{...mid,A:20}}, {domains:{...mid,A:20}});
    const identMid = hexacoCompat({domains:mid}, {domains:mid});
    const rescue = hexacoCompat({domains:{...mid,A:20},facets:{flexibility:70}}, {domains:{...mid,A:20}});
    console.log(`A-клинч: штраф ${pct(clinch)}% < идент ${pct(identMid)}%; flex-rescue ${pct(rescue)}% должен быть выше клинча`);
    expect(clinch).toBeLessThan(identMid);
    expect(rescue).toBeGreaterThan(clinch);
  });
  it('деградация на нейтраль', () => {
    expect(hexacoCompat(null, {domains:mid})).toBe(0.5);
    expect(hexacoCompat({domains:null}, {domains:mid})).toBe(0.5);
  });
});

describe('Калибровка: tzFit', () => {
  const pairs: [string, string, string][] = [
    ['та же зона', 'Europe/Moscow', 'Europe/Moscow'],
    ['MSK ↔ London (+3)', 'Europe/Moscow', 'Europe/London'],
    ['MSK ↔ Berlin (+2)', 'Europe/Moscow', 'Europe/Berlin'],
    ['MSK ↔ NYC', 'Europe/Moscow', 'America/New_York'],
    ['NYC ↔ Tokyo', 'America/New_York', 'Asia/Tokyo'],
    ['London ↔ Sydney', 'Europe/London', 'Australia/Sydney'],
  ];
  it('диапазон, симметрия, монотонность по разнице', () => {
    console.log('\n=== tzFit (окно 9ч) ===');
    for (const [name, a, b] of pairs) {
      const ab = tzFit(a, b, at);
      const oa = tzOffsetHours(a, at), ob = tzOffsetHours(b, at);
      console.log(`${pct(ab)}%  ${name}  [offset ${oa} vs ${ob}]`);
      expect(ab).toBeGreaterThanOrEqual(0);
      expect(ab).toBeLessThanOrEqual(1);
      expect(ab).toBeCloseTo(tzFit(b, a, at), 6);
    }
    expect(tzFit('Europe/Moscow','Europe/Moscow',at)).toBe(1);
    expect(tzFit('Europe/Moscow','Europe/London',at)).toBeGreaterThan(tzFit('Europe/Moscow','America/New_York',at));
  });
  it('деградация при отсутствии зоны', () => {
    expect(tzFit(null, 'Europe/Moscow', at)).toBe(0.5);
    expect(tzFit('Europe/Moscow', undefined, at)).toBe(0.5);
  });
});

describe('Калибровка: эффект на итоговую base (v1 vs v2)', () => {
  it('сценарий А — НЕТ v2-данных (текущий прод: 106/108 профилей)', () => {
    // hexaco/work/tz деградируют на 0.5
    console.log('\n=== base_v1 vs base_v2 ПРИ ОТСУТСТВИИ v2-данных (деградация 0.5) ===');
    console.log('sim   ocean | base_v1 | base_v2 | Δ');
    for (const sim of [0.3, 0.5, 0.7, 0.9]) {
      for (const ocean of [0.3, 0.6, 0.9]) {
        const v1 = baseV1(sim, ocean);
        const v2 = baseV2(sim, ocean, 0.5, 0.5, 0.5);
        console.log(`${pct(sim)} ${pct(ocean)} | ${pct(v1)} | ${pct(v2)} | ${((v2-v1)*100).toFixed(1)}`);
      }
    }
    // При отсутствии данных v2 поджимает разброс: высокий sim проигрывает (вес 0.6→0.35),
    // добавляется константа 0.225. Проверяем именно это искажение.
    const v1hi = baseV1(0.9, 0.6), v2hi = baseV2(0.9, 0.6, 0.5,0.5,0.5);
    const v1lo = baseV1(0.3, 0.6), v2lo = baseV2(0.3, 0.6, 0.5,0.5,0.5);
    console.log(`Разброс по similarity: v1 ${pct(v1hi-v1lo)}pp vs v2 ${pct(v2hi-v2lo)}pp (v2 сжимает)`);
    expect(v2hi - v2lo).toBeLessThan(v1hi - v1lo); // v2 сжимает влияние similarity
  });

  it('сценарий Б — ЕСТЬ v2-данные (целевое состояние)', () => {
    console.log('\n=== base_v2 КОГДА v2-сигналы реальны ===');
    console.log('Сильная психо-совместимость поднимает base, слабая — опускает:');
    const sim = 0.6, ocean = 0.6;
    const strong = baseV2(sim, ocean, 0.9, 0.9, 1.0);
    const neutral = baseV2(sim, ocean, 0.5, 0.5, 0.5);
    const weak = baseV2(sim, ocean, 0.2, 0.2, 0.0);
    console.log(`сильная ${pct(strong)}% | нейтраль ${pct(neutral)}% | слабая ${pct(weak)}%`);
    console.log(`размах психо-сигнала при фикс sim/ocean: ${((strong-weak)*100).toFixed(1)}pp`);
    expect(strong).toBeGreaterThan(neutral);
    expect(neutral).toBeGreaterThan(weak);
    // максимум вклада psycho = (0.15+0.15+0.15) = 0.45 от диапазона
    expect(strong - weak).toBeLessThanOrEqual(0.45 + 1e-9);
  });
});
