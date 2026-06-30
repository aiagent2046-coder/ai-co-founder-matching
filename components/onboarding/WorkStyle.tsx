"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import posthog from 'posthog-js';

// Psycho-Match v2 (Р3) — шаг онбординга: time_zone + work_style + hexaco.
// Слайдеры 0..100 с человеческими полюсами; под капотом — числа для /api/onboarding/workstyle.

type SliderDef = {
  key: string;
  left: string;   // полюс 0
  right: string;  // полюс 100
  hint: string;   // короткое пояснение оси
};

const WORK_STYLE: { color: string; items: SliderDef[] } = {
  color: '#00d4aa',
  items: [
    { key: 'pace',          left: 'Методично, без спешки', right: 'Спринтер, быстрый темп',  hint: 'Темп работы' },
    { key: 'structure',     left: 'Хаос и импровизация',   right: 'Чёткий процесс',          hint: 'Структура' },
    { key: 'communication', left: 'Асинхронно, текстом',    right: 'Созвоны, синхронно',      hint: 'Коммуникация' },
    { key: 'risk',          left: 'Осторожно, взвешенно',   right: 'Рискованно, ва-банк',     hint: 'Отношение к риску' },
  ],
};

const HEXACO_DOMAINS: { color: string; items: SliderDef[] } = {
  color: '#c77dff',
  items: [
    { key: 'H', left: 'Прагматичность',        right: 'Честность и скромность',  hint: 'Honesty-Humility' },
    { key: 'E', left: 'Эмоц. устойчивость',    right: 'Чувствительность',        hint: 'Emotionality' },
    { key: 'X', left: 'Сдержанность',          right: 'Экстраверсия',            hint: 'eXtraversion' },
    { key: 'A', left: 'Принципиальность',      right: 'Сговорчивость',           hint: 'Agreeableness' },
    { key: 'C', left: 'Спонтанность',          right: 'Добросовестность',        hint: 'Conscientiousness' },
    { key: 'O', left: 'Традиционность',        right: 'Открытость новому',       hint: 'Openness' },
  ],
};

const HEXACO_FACETS: { color: string; items: SliderDef[] } = {
  color: '#ff9f1c',
  items: [
    { key: 'fairness',    left: 'Гибкая этика',      right: 'Бескомпромиссная честность', hint: 'Справедливость' },
    { key: 'diligence',   left: 'Расслабленность',   right: 'Высокая дисциплина',         hint: 'Усердие' },
    { key: 'flexibility', left: 'Принципиальность',  right: 'Готовность уступать',        hint: 'Гибкость' },
  ],
};

const DEFAULT = 50;

function Slider({
  def, value, color, onChange,
}: { def: SliderDef; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{def.hint}</span>
        <span style={{ fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <input
        type="range" min={0} max={100} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
        <span style={{ maxWidth: '45%' }}>{def.left}</span>
        <span style={{ maxWidth: '45%', textAlign: 'right' }}>{def.right}</span>
      </div>
    </div>
  );
}

// Текстовая интерпретация значения 0..100: к какому полюсу ближе.
function poleLabel(def: SliderDef, v: number): string {
  if (v >= 60) return def.right;
  if (v <= 40) return def.left;
  return 'баланс';
}

function PreviewGroup({
  title, color, items, values,
}: { title: string; color: string; items: SliderDef[]; values: Record<string, number> }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(def => {
          const v = values[def.key];
          return (
            <div key={def.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 130 }}>{def.hint}</span>
              <div style={{ flex: 1, height: 4, background: '#374151', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ width: `${v}%`, height: '100%', background: color, transition: 'width 0.2s' }} />
              </div>
              <span style={{ fontSize: 12, color: '#d1d5db', minWidth: 150, textAlign: 'right' }}>
                {poleLabel(def, v)} · {v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkStyle() {
  const router = useRouter();
  const [tz, setTz] = useState('');
  const [tzDetected, setTzDetected] = useState('');
  const [work, setWork] = useState<Record<string, number>>(
    Object.fromEntries(WORK_STYLE.items.map(i => [i.key, DEFAULT])),
  );
  const [domains, setDomains] = useState<Record<string, number>>(
    Object.fromEntries(HEXACO_DOMAINS.items.map(i => [i.key, DEFAULT])),
  );
  const [facets, setFacets] = useState<Record<string, number>>(
    Object.fromEntries(HEXACO_FACETS.items.map(i => [i.key, DEFAULT])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Автодетект часового пояса из браузера (подсказка) + подтверждение пользователем.
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) { setTzDetected(detected); setTz(prev => prev || detected); }
    } catch { /* оставляем пустым — пользователь введёт вручную */ }
  }, []);

  // Предзаполнение из профиля: если шаг уже проходили — подставляем сохранённое.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/profile');
        if (!resp.ok) return;
        const { profile } = await resp.json();
        if (cancelled || !profile) return;
        if (typeof profile.time_zone === 'string' && profile.time_zone) setTz(profile.time_zone);
        const ws = profile.work_style;
        if (ws && typeof ws === 'object') {
          setWork(s => ({
            ...s,
            ...Object.fromEntries(WORK_STYLE.items
              .filter(i => typeof ws[i.key] === 'number')
              .map(i => [i.key, ws[i.key]])),
          }));
        }
        const hx = profile.hexaco;
        if (hx?.domains && typeof hx.domains === 'object') {
          setDomains(s => ({
            ...s,
            ...Object.fromEntries(HEXACO_DOMAINS.items
              .filter(i => typeof hx.domains[i.key] === 'number')
              .map(i => [i.key, hx.domains[i.key]])),
          }));
        }
        if (hx?.facets && typeof hx.facets === 'object') {
          setFacets(s => ({
            ...s,
            ...Object.fromEntries(HEXACO_FACETS.items
              .filter(i => typeof hx.facets[i.key] === 'number')
              .map(i => [i.key, hx.facets[i.key]])),
          }));
        }
      } catch { /* нет профиля / сеть — остаёмся на дефолтах */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const token = await getAuthToken();
      const resp = await fetch('/api/onboarding/workstyle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({
          time_zone: tz.trim() || undefined,
          work_style: {
            pace: work.pace, structure: work.structure,
            communication: work.communication, risk: work.risk,
          },
          hexaco: {
            domains: { H: domains.H, E: domains.E, X: domains.X, A: domains.A, C: domains.C, O: domains.O },
            facets: { fairness: facets.fairness, diligence: facets.diligence, flexibility: facets.flexibility },
          },
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${resp.status}`);
      }
      try {
        posthog.capture('workstyle_completed', { time_zone: tz.trim() || null });
      } catch {}
      router.push('/onboarding/avatar');
    } catch (e: any) {
      setError(e?.message || String(e));
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 8px #00d4aa' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#00d4aa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Шаг 5 из 6</span>
        </div>
        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.01em', marginBottom: 8 }}>
          <span className="gradient-text">Стиль работы</span> и ритм
        </h1>
        <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
          Часовой пояс, рабочий темп и черты характера. Помогают подобрать ко-фаундера, с которым совпадёте по ритму и ценностям.
        </p>
      </div>

      {/* Часовой пояс */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 9999,
            color: '#00d4aa', background: '#00d4aa14', border: '1px solid #00d4aa40',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>Часовой пояс</span>
          {tzDetected && (
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              определён автоматически: {tzDetected}
            </span>
          )}
        </div>
        <input
          className="field-input"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          placeholder="Europe/Moscow"
        />
        <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.5 }}>
          Можно поправить, если определилось неверно. Формат IANA, например Europe/Moscow или America/New_York.
        </p>
      </div>

      {/* Стиль работы */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: WORK_STYLE.color, marginBottom: 16 }}>Как ты работаешь</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {WORK_STYLE.items.map(def => (
            <Slider key={def.key} def={def} color={WORK_STYLE.color}
              value={work[def.key]} onChange={(v) => setWork(s => ({ ...s, [def.key]: v }))} />
          ))}
        </div>
      </div>

      {/* HEXACO домены */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: HEXACO_DOMAINS.color, marginBottom: 16 }}>Черты характера</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {HEXACO_DOMAINS.items.map(def => (
            <Slider key={def.key} def={def} color={HEXACO_DOMAINS.color}
              value={domains[def.key]} onChange={(v) => setDomains(s => ({ ...s, [def.key]: v }))} />
          ))}
        </div>
      </div>

      {/* HEXACO фасеты */}
      <div className="card" style={{ padding: 20, marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: HEXACO_FACETS.color, marginBottom: 16 }}>Ключевые акценты</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {HEXACO_FACETS.items.map(def => (
            <Slider key={def.key} def={def} color={HEXACO_FACETS.color}
              value={facets[def.key]} onChange={(v) => setFacets(s => ({ ...s, [def.key]: v }))} />
          ))}
        </div>
      </div>

      {/* Превью профиля перед сохранением */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f9fafb', marginBottom: 4 }}>Твой профиль</h2>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Как это запишется. Поправь слайдеры выше, если что-то не так.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Часовой пояс:</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: tz.trim() ? '#00d4aa' : '#ff9f1c' }}>
            {tz.trim() || 'не указан'}
          </span>
        </div>
        <PreviewGroup title="Как ты работаешь" color={WORK_STYLE.color} items={WORK_STYLE.items} values={work} />
        <PreviewGroup title="Черты характера" color={HEXACO_DOMAINS.color} items={HEXACO_DOMAINS.items} values={domains} />
        <PreviewGroup title="Ключевые акценты" color={HEXACO_FACETS.color} items={HEXACO_FACETS.items} values={facets} />
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 8, background: '#7f1d1d40', color: '#fca5a5', fontSize: 13 }}>
          Ошибка сохранения: {error}
        </div>
      )}

      <button onClick={submit} disabled={saving} className="btn-primary" style={{
        width: '100%', padding: '16px', justifyContent: 'center', fontSize: 14, letterSpacing: '0.04em',
        opacity: saving ? 0.4 : 1,
      }}>
        {saving ? 'Сохраняем...' : 'Дальше → создать аватар'}
      </button>
    </div>
  );
}
