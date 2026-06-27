'use client';

import { useState, useRef, useEffect } from 'react';
import { getAuthToken } from '@/lib/supabase';
import { AGENT_ROLES, type AgentId } from '@/lib/agents/roles';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AgentsPage() {
  const [activeId, setActiveId] = useState<AgentId | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = AGENT_ROLES.find(r => r.id === activeId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  function openAgent(id: AgentId) {
    setActiveId(id);
    setMessages([]);
    setInput('');
    setError(null);
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Ошибка запроса');
        return;
      }
      setMessages([...next, { role: 'assistant', content: data.reply ?? '' }]);
    } catch (e: any) {
      setError(e?.message ?? 'Сетевая ошибка');
    } finally {
      setSending(false);
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
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '40px 0' }}>
            Задай вопрос — {active.name} ответит с учётом контекста твоего проекта
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
            }}>{m.content}</div>
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
