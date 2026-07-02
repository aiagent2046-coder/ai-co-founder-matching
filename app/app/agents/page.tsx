'use client';

import { useState, useRef, useEffect } from 'react';
import { getAuthToken } from '@/lib/supabase';
import { AGENT_ROLES, type AgentId } from '@/lib/agents/roles';

type Msg = { role: 'user' | 'assistant'; content: string };
type Fact = { id: string; content: string; created_by: string | null; created_at: string | null };

// Р1c: блок <save_facts>[...]</save_facts> — служебный (сервер сохраняет факты
// из полного буфера). При отображении его прячем, в т.ч. незакрытый хвост,
// который может прийти во время стрима.
function stripSaveFacts(text: string): string {
  return text
    .replace(/<save_facts>[\s\S]*?<\/save_facts>/gi, '')
    .replace(/<save_facts>[\s\S]*$/i, '')
    .trimEnd();
}

export default function AgentsPage() {
  const [activeId, setActiveId] = useState<AgentId | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Р5: статус подключения GitHub (только для engineer). null = ещё не загружали.
  const [githubConn, setGithubConn] = useState<{ connected: boolean; github_login: string | null } | null>(null);
  const [githubBusy, setGithubBusy] = useState(false);
  // Р3: память проекта (agent_context) — раскрывающаяся панель с фактами.
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [memLoading, setMemLoading] = useState(false);
  const [memBusy, setMemBusy] = useState(false); // идёт запись (save/delete)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = AGENT_ROLES.find(r => r.id === activeId) ?? null;

  // Р5: читаем статус подключения GitHub. Роуты github-подсистемы на cookie-сессии
  // (getServerUser), поэтому без Bearer — cookie уходят автоматически (same-origin).
  async function refreshGithubConn() {
    try {
      const res = await fetch('/api/github/connection', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setGithubConn({ connected: !!data.connected, github_login: data.github_login ?? null });
      }
    } catch {
      // не блокируем чат, если статус не удалось получить
    }
  }

  // Р5: после возврата из OAuth callback (?github=connected|error) обновляем статус
  // и чистим query, чтобы не повторять при перезагрузке.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gh = params.get('github');
    if (!gh) return;
    if (gh === 'error') setError('Не удалось подключить GitHub. Попробуй ещё раз.');
    void refreshGithubConn();
    params.delete('github');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function openAgent(id: AgentId) {
    setActiveId(id);
    setMessages([]);
    setInput('');
    setError(null);
    // Р5: статус GitHub нужен только engineer-агенту.
    if (id === 'engineer') void refreshGithubConn();
    else setGithubConn(null);
    // 1a: подгружаем историю диалога этого агента (переживает закрытие чата).
    setLoadingHistory(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/agents/history?agentId=${id}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) setMessages(data.messages);
      }
    } catch {
      // не блокируем чат, если историю не удалось загрузить
    } finally {
      setLoadingHistory(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || !active || sending) return;
    setError(null);
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ agentId: active.id, messages: next }),
      });

      const contentType = res.headers.get('content-type') ?? '';

      // Р4: ответ на «запомни: …» приходит как JSON (не стрим). Различаем по Content-Type.
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Ошибка запроса');
          return;
        }
        setMessages([...next, { role: 'assistant', content: data.reply ?? '' }]);
        return;
      }

      // Ошибка до начала потока тоже может прийти как JSON; если нет тела — общий текст.
      if (!res.ok || !res.body) {
        let msg = 'Ошибка запроса';
        try { msg = (await res.json()).error ?? msg; } catch { /* не JSON */ }
        setError(msg);
        return;
      }

      // Р1c/Р2b: читаем простой текстовый поток и дописываем ответ ассистента.
      setMessages([...next, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: 'assistant', content: acc }]);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    } finally {
      setSending(false);
    }
  }

  // Р5: старт OAuth-флоу — просто переход на серверный роут (он сделает redirect на GitHub).
  function connectGithub() {
    window.location.href = '/api/github/connect';
  }

  // Р5: отключить GitHub — удаляем запись с токеном.
  async function disconnectGithub() {
    if (githubBusy) return;
    if (!window.confirm('Отключить GitHub? Агент потеряет доступ к твоим репозиториям.')) return;
    setGithubBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/github/connection', { method: 'DELETE', credentials: 'same-origin' });
      if (!res.ok) {
        let msg = 'Не удалось отключить GitHub';
        try { msg = (await res.json()).error ?? msg; } catch { /* не JSON */ }
        setError(msg);
        return;
      }
      setGithubConn({ connected: false, github_login: null });
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    } finally {
      setGithubBusy(false);
    }
  }

  // Очистка истории диалога текущего агента (agent_messages). Память проекта не трогаем.
  async function clearHistory() {
    if (!active || sending) return;
    if (!window.confirm(`Очистить историю диалога с ${active.name}? Это необратимо.`)) return;
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/agents/history?agentId=${active.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        let msg = 'Не удалось очистить историю';
        try { msg = (await res.json()).error ?? msg; } catch { /* не JSON */ }
        setError(msg);
        return;
      }
      setMessages([]);
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    }
  }

  // Р3: открыть/обновить панель памяти проекта — грузим список фактов.
  async function openMemory() {
    setMemoryOpen(true);
    setMemLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/agents/context', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        let msg = 'Не удалось загрузить память';
        try { msg = (await res.json()).error ?? msg; } catch { /* не JSON */ }
        setError(msg);
        return;
      }
      const data = await res.json();
      setFacts(Array.isArray(data.facts) ? data.facts : []);
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    } finally {
      setMemLoading(false);
    }
  }

  // Р3: сохранить отредактированный факт (PATCH).
  async function saveFact(id: string) {
    const content = editText.trim();
    if (!content || memBusy) return;
    setMemBusy(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/agents/context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ id, content }),
      });
      if (!res.ok) {
        let msg = 'Не удалось сохранить факт';
        try { msg = (await res.json()).error ?? msg; } catch { /* не JSON */ }
        setError(msg);
        return;
      }
      setFacts(prev => prev.map(f => (f.id === id ? { ...f, content } : f)));
      setEditingId(null);
      setEditText('');
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    } finally {
      setMemBusy(false);
    }
  }

  // Р3: удалить один факт (DELETE ?id).
  async function deleteFact(id: string) {
    if (memBusy) return;
    if (!window.confirm('Удалить этот факт? Это необратимо.')) return;
    setMemBusy(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/agents/context?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        let msg = 'Не удалось удалить факт';
        try { msg = (await res.json()).error ?? msg; } catch { /* не JSON */ }
        setError(msg);
        return;
      }
      setFacts(prev => prev.filter(f => f.id !== id));
      if (editingId === id) { setEditingId(null); setEditText(''); }
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    } finally {
      setMemBusy(false);
    }
  }

  // Очистка всей памяти проекта (agent_context) — факты, общие для всех агентов.
  async function clearMemory() {
    if (memBusy) return;
    if (!window.confirm('Очистить память проекта? Будут удалены все сохранённые факты о стартапе (общие для всех агентов). Это необратимо.')) return;
    setMemBusy(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/agents/context', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        let msg = 'Не удалось очистить память';
        try { msg = (await res.json()).error ?? msg; } catch { /* не JSON */ }
        setError(msg);
        return;
      }
      setFacts([]);
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    } finally {
      setMemBusy(false);
    }
  }

  // --- Grid of agents ---
  if (!active) {
    return (
      <div style={{ padding: '32px', maxWidth: 920, margin: '0 auto' }}>
        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 28, marginBottom: 6 }}>Агенты</h1>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 28 }}>
          Команда AI-ассистентов твоего проекта. Каждый специализируется на своей задаче и понимает контекст проекта.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
          {AGENT_ROLES.map(r => (
            <button key={r.id} onClick={() => openAgent(r.id)} className="card animate-fade-up"
              style={{
                textAlign: 'left', cursor: 'pointer', padding: 20,
                background: '#111827', border: '1px solid #374151', borderRadius: 14,
                display: 'flex', flexDirection: 'column', gap: 8, transition: 'all 0.2s',
              }}>
              <div style={{ fontSize: 32 }}>{r.emoji}</div>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 16, color: '#f9fafb' }}>{r.name}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.4 }}>{r.tagline}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Chat with selected agent ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '16px 32px', borderBottom: '1px solid #374151',
        background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => setActiveId(null)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>←</button>
        <div style={{ fontSize: 28 }}>{active.emoji}</div>
        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>{active.name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{active.tagline}</div>
        </div>
        {/* Р5: подключение GitHub — только для engineer-агента. */}
        {active.id === 'engineer' && (
          githubConn?.connected ? (
            <button onClick={disconnectGithub} disabled={githubBusy}
              title={`GitHub подключён: ${githubConn.github_login ?? ''}. Нажми, чтобы отключить.`}
              style={{ color: '#34d399', background: 'none', border: '1px solid #065f46', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              GitHub: {githubConn.github_login ?? 'подключён'}
            </button>
          ) : (
            <button onClick={connectGithub} disabled={githubBusy}
              title="Подключить GitHub, чтобы агент мог читать и анализировать твои репозитории"
              style={{ color: '#9ca3af', background: 'none', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '6px 10px' }}>
              Подключить GitHub
            </button>
          )
        )}
        <button onClick={clearHistory} title="Очистить историю диалога с этим агентом"
          style={{ color: '#9ca3af', background: 'none', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '6px 10px' }}>
          Очистить диалог
        </button>
        <button onClick={openMemory} title="Посмотреть и отредактировать факты о проекте (общие для всех агентов)"
          style={{ color: '#9ca3af', background: 'none', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '6px 10px' }}>
          Память проекта
        </button>
      </div>

      {/* Р3: панель памяти проекта — inline-редактирование и удаление отдельных фактов. */}
      {memoryOpen && (
        <div style={{ borderBottom: '1px solid #374151', background: '#111827', padding: '16px 32px', maxHeight: '46vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb', flex: 1 }}>
              Память проекта <span style={{ color: '#6b7280', fontWeight: 400 }}>— факты, общие для всех агентов</span>
            </div>
            {facts.length > 0 && (
              <button onClick={clearMemory} disabled={memBusy} title="Удалить все факты"
                style={{ color: '#f87171', background: 'none', border: '1px solid #7f1d1d', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
                Очистить всё
              </button>
            )}
            <button onClick={() => { setMemoryOpen(false); setEditingId(null); setEditText(''); }}
              style={{ color: '#9ca3af', background: 'none', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
              Закрыть
            </button>
          </div>

          {memLoading && (
            <div style={{ color: '#6b7280', fontSize: 13, padding: '16px 0' }}>Загружаю память…</div>
          )}
          {!memLoading && facts.length === 0 && (
            <div style={{ color: '#6b7280', fontSize: 13, padding: '16px 0', lineHeight: 1.6 }}>
              Пока пусто. Напиши агенту «запомни: …» — и факт появится здесь.
            </div>
          )}
          {!memLoading && facts.map(f => (
            <div key={f.id} style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 10, padding: 12, marginBottom: 8 }}>
              {editingId === f.id ? (
                <>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} maxLength={500} rows={3}
                    style={{ width: '100%', background: '#0a0e17', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <button onClick={() => saveFact(f.id)} disabled={memBusy || !editText.trim()}
                      style={{ color: '#0a0e17', background: '#00d4aa', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '6px 12px', fontWeight: 600 }}>
                      Сохранить
                    </button>
                    <button onClick={() => { setEditingId(null); setEditText(''); }} disabled={memBusy}
                      style={{ color: '#9ca3af', background: 'none', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '6px 12px' }}>
                      Отмена
                    </button>
                    <span style={{ color: '#4b5563', fontSize: 11, marginLeft: 'auto' }}>{editText.length}/500</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: '#e5e7eb', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{f.content}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <button onClick={() => { setEditingId(f.id); setEditText(f.content); }} disabled={memBusy}
                      style={{ color: '#9ca3af', background: 'none', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
                      Изменить
                    </button>
                    <button onClick={() => deleteFact(f.id)} disabled={memBusy}
                      style={{ color: '#f87171', background: 'none', border: '1px solid #7f1d1d', borderRadius: 8, cursor: 'pointer', fontSize: 12, padding: '5px 10px' }}>
                      Удалить
                    </button>
                    {f.created_by && <span style={{ color: '#4b5563', fontSize: 11, marginLeft: 'auto' }}>{f.created_by}</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loadingHistory && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '40px 0' }}>
            Загружаю историю…
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '40px 0', lineHeight: 1.6 }}>
            Задай вопрос — {active.name} ответит с учётом контекста твоего проекта
            <br />
            <span style={{ fontSize: 12, color: '#4b5563' }}>
              Подсказка: «запомни: …» сохранит факт о стартапе для всех агентов
            </span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="animate-fade-up" style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: m.role === 'user' ? 'linear-gradient(135deg,#00d4aa,#2ec4b6)' : '#1f2937',
              color: m.role === 'user' ? '#0a0e17' : '#f9fafb',
              border: m.role === 'assistant' ? '1px solid #374151' : 'none',
              fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
            }}>{m.role === 'assistant' ? stripSaveFacts(m.content) : m.content}</div>
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', color: '#6b7280', fontSize: 13, padding: '4px 8px' }}>
            <span style={{ animation: 'twinkle 1s infinite' }}>{active.name} думает...</span>
          </div>
        )}
        {error && (
          <div style={{ alignSelf: 'center', color: '#f87171', fontSize: 12, padding: '8px 0' }}>{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 16, borderTop: '1px solid #374151',
        background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(16px)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Написать ${active.name}...`}
          className="field-input" style={{ flex: 1 }} disabled={sending} />
        <button onClick={send} disabled={!input.trim() || sending} className="btn-primary" style={{ padding: '10px 20px' }}>
          Отправить
        </button>
      </div>
    </div>
  );
}
