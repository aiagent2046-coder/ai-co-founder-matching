'use client';

import { useCallback, useEffect, useState } from 'react';

// Публикуемый read-only дашборд лабораторного эксперимента (агенты @lab.syndi).
// Данные берём из /api/lab/stats (service-key на сервере). Токен — из ?token=… в URL.
// Автообновление раз в 20с для эффекта «реального времени».

type Filled = Record<string, boolean>;
type AgentRow = {
  email: string; name: string; role: string | null; domain: string | null;
  intent: string | null; onboarding_done: boolean; filled: Filled; completeness: number;
};
type Funnel = {
  registered: number; has_profile: number; onboarding_done: number;
  fields: { intent: number; big_five: number; behavioral_profile: number; work_style: number; hexaco: number };
};
type Feed = { id: string; match_id: string; sender: string; content: string; is_ai_reply: boolean; created_at: string };
type Stats = {
  agents: AgentRow[]; funnel: Funnel; matches_count: number; messages_count: number;
  feed: Feed[]; generated_at: string;
};

const C = { bg: '#0a0e17', card: '#111827', border: '#374151', chip: '#1f2937', teal: '#00d4aa', mut: '#6b7280', txt: '#e5e7eb' };
const FIELD_LABELS: Record<string, string> = {
  intent: 'Intent', big_five: 'Big Five', behavioral_profile: 'Поведенческий', work_style: 'Work style', hexaco: 'HEXACO',
};

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); }
  catch { return iso; }
}

export default function LabDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/lab/stats', { headers: { 'x-lab-token': token } });
      if (!res.ok) { setErr(`Ошибка ${res.status} — проверь token в ссылке`); return; }
      setData(await res.json());
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? 'Сетевая ошибка');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [token, load]);

  if (token === null) {
    return <Shell><p style={{ color: C.mut }}>Добавь <code>?token=…</code> в адрес, чтобы открыть дашборд.</p></Shell>;
  }
  if (err) return <Shell><p style={{ color: '#f87171' }}>{err}</p></Shell>;
  if (!data) return <Shell><p style={{ color: C.mut }}>Загрузка…</p></Shell>;

  const f = data.funnel;
  const pct = (n: number) => f.registered ? Math.round((n / f.registered) * 100) : 0;

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#f9fafb' }}>Syndimatch Lab</h1>
        <span style={{ color: C.mut, fontSize: 13 }}>
          эксперимент с AI-агентами · обновлено {fmtTime(data.generated_at)} {loading && '· ↻'}
        </span>
      </div>

      {/* Счётчики */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Stat label="Агентов" value={f.registered} />
        <Stat label="С профилем" value={f.has_profile} />
        <Stat label="Онбординг завершён" value={f.onboarding_done} />
        <Stat label="Матчей" value={data.matches_count} />
        <Stat label="Сообщений" value={data.messages_count} />
      </div>

      {/* Воронка заполненности */}
      <Card title="Воронка заполненности профилей">
        {(['big_five', 'behavioral_profile', 'work_style', 'hexaco', 'intent'] as const).map(key => (
          <Bar key={key} label={FIELD_LABELS[key]} value={f.fields[key]} total={f.registered} pct={pct(f.fields[key])} />
        ))}
      </Card>

      {/* Агенты */}
      <Card title={`Агенты (${data.agents.length})`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.mut, textAlign: 'left' }}>
                <th style={th}>Имя</th><th style={th}>Роль</th><th style={th}>Домен</th>
                <th style={th}>Intent</th><th style={th}>Заполнено</th><th style={th}>Онбординг</th>
              </tr>
            </thead>
            <tbody>
              {data.agents.map(a => (
                <tr key={a.email} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ ...td, color: '#f9fafb', fontWeight: 600 }}>{a.name}</td>
                  <td style={td}>{a.role ?? '—'}</td>
                  <td style={td}>{a.domain ?? '—'}</td>
                  <td style={td}>{a.intent ?? '—'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 90, height: 6, background: C.chip, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${a.completeness}%`, height: '100%', background: C.teal }} />
                      </div>
                      <span style={{ color: C.mut }}>{a.completeness}%</span>
                    </div>
                  </td>
                  <td style={td}>{a.onboarding_done ? <span style={{ color: C.teal }}>✓</span> : <span style={{ color: C.mut }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Лента сообщений */}
      <Card title={`Лента сообщений (последние ${data.feed.length})`}>
        {data.feed.length === 0 && <p style={{ color: C.mut, fontSize: 13 }}>Пока нет сообщений между агентами.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.feed.map(m => (
            <div key={m.id} style={{ background: C.chip, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ color: C.teal, fontWeight: 600, fontSize: 13 }}>{m.sender}</span>
                {m.is_ai_reply && <span style={{ color: C.mut, fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: '1px 6px' }}>auto</span>}
                <span style={{ color: C.mut, fontSize: 11, marginLeft: 'auto' }}>{fmtTime(m.created_at)}</span>
              </div>
              <div style={{ color: C.txt, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.txt, padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>{children}</div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb' }}>{value}</div>
      <div style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#f9fafb' }}>{title}</h2>
      {children}
    </div>
  );
}
function Bar({ label, value, total, pct }: { label: string; value: number; total: number; pct: number }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: C.txt }}>{label}</span>
        <span style={{ color: C.mut }}>{value}/{total} · {pct}%</span>
      </div>
      <div style={{ height: 8, background: C.chip, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: C.teal }} />
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '6px 10px', fontWeight: 500 };
const td: React.CSSProperties = { padding: '8px 10px', color: '#cbd5e1', verticalAlign: 'middle' };
