"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/supabase';
import posthog from 'posthog-js';

type Msg = { id: string; role: 'me' | 'them' | 'avatar'; text: string; time: string };

type PeerInfo = {
  name: string;
  role: string;
  domain: string;
  avatar_text: string;
  score: number;
};

const COLORS = ['#00d4aa', '#c77dff', '#ff6b9d', '#ff9f1c'];
const COLOR_MAP: Record<string, string> = {};

function colorFor(name: string): string {
  if (COLOR_MAP[name]) return COLOR_MAP[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const c = COLORS[h % COLORS.length];
  COLOR_MAP[name] = c;
  return c;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const params = useParams();
  const matchId = params?.matchId as string;

  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

      const [myFounderId, setMyFounderId] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let channel: any = null;

    (async () => {
      try {
        setLoading(true);
        const token = await getAuthToken();
        const headers = { Authorization: `Bearer ${token ?? ''}` };

        // Загрузить peer info
        const mlRes = await fetch('/api/matches/list', { headers });
        const mlData = await mlRes.json();
        const match = (mlData.matches ?? []).find((m: any) => m.match_id === matchId);
        if (match) {
          setPeer({
            name: match.peer_name,
            role: match.peer_role,
            domain: match.peer_domain,
            avatar_text: match.peer_avatar_text,
            score: match.score,
          });
        } else {
          setPeer({ name: 'Unknown', role: '—', domain: '', avatar_text: '?', score: 0 });
        }

        // Загрузить сообщения
        const msgRes = await fetch(`/api/messages?matchId=${matchId}`, { headers });
        const msgData = await msgRes.json();
        if (msgRes.ok) {
          const msgs: Msg[] = (msgData.messages ?? []).map((m: any) => ({
            id: m.id,
            role: m.is_me ? 'me' : 'them',
            text: m.content,
            time: formatTime(m.created_at),
          }));
          setMessages(msgs);
          setMyFounderId(msgData.myFounderId); // Сохраняем ID профиля
        } else {
          setError(msgData.error ?? 'Failed to load messages');
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }

      // Подписка на Realtime (вместо polling)
      const supabase = getSupabase();
      channel = supabase
        .channel(`public:messages:match_id=eq.${matchId}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, 
          (payload: any) => {
            const newMsg = payload.new;
            setMessages((prev) => {
              // Защита от дублей (если пришло свое же оптимистичное сообщение)
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                role: newMsg.sender_id === myFounderId ? 'me' : 'them',
                text: newMsg.content,
                time: formatTime(newMsg.created_at)
              }];
            });
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) {
        getSupabase().removeChannel(channel);
      }
    };
  }, [matchId, myFounderId]);

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setSuggestion(null);

    // Optimistic update
    const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    const optimisticId = 'opt-' + Date.now();
    setMessages(m => [...m, { id: optimisticId, role: 'me', text, time }]);

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ matchId, content: text }),
      });
      const data = await res.json();
      if (res.ok) {
        try { posthog.capture('message_sent', { match_id: matchId, length: text.length }); } catch {}
        // Заменить оптимистичное сообщение на реальное
        setMessages(m => m.map(msg =>
          msg.id === optimisticId
            ? { ...msg, id: data.message.id, time: formatTime(data.message.created_at) }
            : msg
        ));
      }
    } catch {
      // оставляем оптимистичное
    }
  };

  const askAvatar = async () => {
    setSuggesting(true);
    setSuggestion(null);
    const token = await getAuthToken();
    const res = await fetch('/api/avatar/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({
        messages: messages.map(m => ({
          senderId: m.role === 'me' ? 'self' : 'other',
          content: m.text,
        })),
        mode: 'suggest',
      }),
    });
    const data = await res.json();
    setSuggestion(data.suggestion ?? data.error ?? 'Не получилось получить ответ');
    setSuggesting(false);
  };

  const peerName = peer?.name ?? 'Unknown';
  const peerRole = peer?.role ?? '—';
  const peerDomain = peer?.domain ?? '';
  const peerScore = peer?.score ?? 0;
  const peerAvatar = peer?.avatar_text ?? '?';
  const color = colorFor(peerName);
  const rgb = color === '#00d4aa' ? '0,212,170' :
              color === '#c77dff' ? '199,125,255' :
              color === '#ff6b9d' ? '255,107,157' : '255,159,28';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{
          width: 48, height: 48, border: '2px solid #374151',
          borderTopColor: '#00d4aa', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 16 }}>
        <div style={{ color: '#ff9f1c', fontSize: 14 }}>{error}</div>
        <Link href="/app/chat" className="btn-primary">Назад к чатам</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '16px 32px',
        borderBottom: '1px solid #374151',
        background: 'rgba(17,24,39,0.6)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10
      }}>
        <Link href="/app/chat" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 20 }}>←</Link>

        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0e17',
          border: `2px solid ${color}`,
          boxShadow: `0 0 16px rgba(${rgb},0.3)`
        }}>{peerAvatar}</div>

        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{peerName}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{peerRole}{peerDomain ? ` · ${peerDomain}` : ''}</div>
        </div>

        <div style={{
          padding: '4px 12px', borderRadius: 9999,
          background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.3)',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#00d4aa',
            boxShadow: '0 0 8px #00d4aa', animation: 'twinkle 2s infinite'
          }} />
          <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#00d4aa' }}>{peerScore}%</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '40px 0' }}>
            Начни беседу — спроси о проекте или поделись своим
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className="animate-fade-up" style={{
            alignSelf: m.role === 'me' ? 'flex-end' : 'flex-start',
            maxWidth: '70%',
            display: 'flex', flexDirection: 'column', gap: 4
          }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: m.role === 'me'
                ? 'linear-gradient(135deg,#00d4aa,#2ec4b6)'
                : '#1f2937',
              color: m.role === 'me' ? '#0a0e17' : '#f9fafb',
              border: m.role === 'them' ? '1px solid #374151' : 'none',
              fontSize: 13, lineHeight: 1.5,
            }}>{m.text}</div>
            <div style={{
              fontSize: 10, color: '#6b7280',
              alignSelf: m.role === 'me' ? 'flex-end' : 'flex-start',
              padding: '0 4px'
            }}>{m.time}</div>
          </div>
        ))}

        {/* AI suggestion preview */}
        {suggestion && (
          <div className="animate-fade-up" style={{
            alignSelf: 'flex-end', maxWidth: '80%',
            border: '1px solid rgba(199,125,255,0.4)',
            background: 'rgba(199,125,255,0.06)',
            borderRadius: 12, padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c77dff" strokeWidth="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></svg>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#c77dff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI suggestion</span>
            </div>
            <div style={{ fontSize: 13, color: '#f9fafb', lineHeight: 1.5, marginBottom: 12 }}>{suggestion}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                try { posthog.capture('avatar_suggestion_used', { match_id: matchId }); } catch {}
                setInput(suggestion); setSuggestion(null);
              }} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                Использовать
              </button>
              <button onClick={() => setSuggestion(null)} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                Отклонить
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 16, borderTop: '1px solid #374151',
        background: 'rgba(17,24,39,0.6)',
        backdropFilter: 'blur(16px)',
        display: 'flex', gap: 8, alignItems: 'center'
      }}>
        <button onClick={askAvatar} disabled={suggesting} title="AI подсказка от моего аватара"
          style={{
            width: 40, height: 40, borderRadius: 8,
            background: suggesting ? 'rgba(199,125,255,0.2)' : 'rgba(199,125,255,0.08)',
            border: '1px solid rgba(199,125,255,0.3)',
            color: '#c77dff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0
          }}>
          {suggesting ? (
            <span style={{ animation: 'twinkle 1s infinite' }}>...</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></svg>
          )}
        </button>

        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Написать сообщение..."
          className="field-input" style={{ flex: 1 }} />

        <button onClick={send} disabled={!input.trim()} className="btn-primary" style={{ padding: '10px 20px' }}>
          Отправить
        </button>
      </div>
    </div>
  );
}
