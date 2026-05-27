"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/supabase';

const COLORS = ['#00d4aa', '#c77dff', '#ff6b9d', '#ff9f1c'];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function formatTimeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '1м';
  if (mins < 60) return `${mins}м`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч`;
  const days = Math.floor(hrs / 24);
  return `${days}д`;
}

type Match = {
  match_id: string;
  peer_user_id: string | null;
  peer_name: string;
  peer_role: string;
  peer_domain: string;
  peer_avatar_text: string;
  last_message: string | null;
  last_message_at: string | null;
  has_ai_reply: boolean;
  score: number;
  created_at: string;
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch('/api/matches/list', {
          headers: { Authorization: `Bearer ${token ?? ''}` },
        });
        const data = await res.json();
        setMatches(data.matches ?? []);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div style={{
          width: 48, height: 48, border: '2px solid #374151',
          borderTopColor: '#00d4aa', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div style={{ padding: '32px 48px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="font-display" style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.01em', marginBottom: 4 }}>
            Твои <span className="gradient-text">матчи</span>
          </h1>
        </div>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 500, margin: '40px auto' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(199,125,255,0.08)', border: '1px solid rgba(199,125,255,0.3)',
            margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c77dff" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
            </svg>
          </div>
          <h3 className="font-display" style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>У тебя пока нет матчей</h3>
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
            Свайпай вправо в Поиске чтобы найти партнёра
          </p>
          <Link href="/app/discover" className="btn-primary">Найти партнёра →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 48px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-0.01em', marginBottom: 4 }}>
          Твои <span className="gradient-text">матчи</span>
        </h1>
        <p style={{ fontSize: 14, color: '#9ca3af' }}>{matches.length} взаимных лайков</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 20 }}>
        {matches.map((m, i) => {
          const color = colorFor(m.peer_name);
          const rgb = color === '#00d4aa' ? '0,212,170' : color === '#c77dff' ? '199,125,255' : color === '#ff6b9d' ? '255,107,157' : '255,159,28';
          const timeLabel = formatTimeAgo(m.last_message_at) ?? formatTimeAgo(m.created_at);
          const lastMsg = m.last_message ?? 'Начните беседу';

          return (
            <Link key={m.match_id} href={`/app/chat/${m.match_id}`} className="card animate-fade-up" style={{
              animationDelay: `${i * 0.05}s`, padding: 20, textDecoration: 'none', color: 'inherit',
              display: 'flex', alignItems: 'center', gap: 16,
              position: 'relative'
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px rgba(${rgb},0.12)`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#374151'; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: 22, color: '#0a0e17',
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 16px rgba(${rgb},0.3)`
                }}>{m.peer_avatar_text}</div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>{m.peer_name}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{timeLabel}</span>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  {m.peer_role}{m.peer_domain ? ` · ${m.peer_domain}` : ''}
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {m.has_ai_reply && m.last_message ? (
                    <span style={{ fontSize: 11, color: '#c77dff', fontWeight: 600, flexShrink: 0 }}>🤖 AI</span>
                  ) : null}
                  <span>{lastMsg}</span>
                </div>
              </div>

              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <div className="font-display gradient-text" style={{ fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{m.score}%</div>
                <div style={{ fontSize: 9, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>match</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
