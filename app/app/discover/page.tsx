"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { OceanRadar } from '@/components/charts/OceanRadar';
import { getAuthToken } from '@/lib/supabase';
import posthog from 'posthog-js';

type Mode = 'grid' | 'swipe';
type Candidate = {
  user_id: string;
  name: string;
  role: string;
  domain: string;
  bio?: string;
  location?: string;
  stage?: string;
  skills?: string[];
  big_five?: any;
  match: number;
  ocean_score?: number;
  vector_score?: number;
  behavioral_score?: number;
  intent?: string | null;
  intent_compat?: number;
  soul_score?: number;
  soul_level?: string;
  soul_phrase?: string;
  behavioral_breakdown?: {
    score: number;
    honesty: number | null;
    conflict: { self: string; other: string; score: number } | null;
    red_flags: string[];
  };
};

const STYLE_RU: Record<string, string> = {
  competing: 'конкуренция',
  collaborating: 'сотрудничество',
  compromising: 'компромисс',
  avoiding: 'избегание',
};

const FLAG_MSG: Record<string, string> = {
  chaos_vs_do: 'Возможен конфликт: структура vs. быстрые решения',
  overthink_vs_plan: 'Возможен конфликт: действие vs. долгое планирование',
  low_ambition: 'Возможен дисбаланс по уровню амбиций',
};

const INTENT_LABEL: Record<string, { label: string; color: string }> = {
  has_idea:        { label: '💡 с идеей',      color: '#fbbf24' },
  looking_to_join: { label: '🚀 в команду',    color: '#00d4aa' },
  flexible:        { label: '🔄 гибко',        color: '#a78bfa' },
};

type Summary = { level: string; emoji: string; color: string; parts: string[] };

function buildSummary(c: Candidate): Summary {
  const match = c.match ?? 0;
  let level: string, emoji: string, color: string;
  if (match >= 75)      { level = 'Высокая совместимость'; emoji = '✨'; color = '#00d4aa'; }
  else if (match >= 60) { level = 'Хорошая совместимость'; emoji = '👍'; color = '#00d4aa'; }
  else if (match >= 45) { level = 'Средняя совместимость'; emoji = '🤔'; color = '#ff9f1c'; }
  else                  { level = 'Слабая совместимость';  emoji = '🌧'; color = '#6b7280'; }

  const parts: string[] = [];

  const v = c.vector_score ?? 50;
  if (v >= 75)      parts.push('близкие идеи');
  else if (v >= 55) parts.push('пересекающиеся направления');
  else              parts.push('разные направления');

  const o = c.ocean_score ?? 50;
  if (o >= 70)      parts.push('схожий темперамент');
  else if (o >= 50) parts.push('дополняющий темперамент');
  else              parts.push('контрастный темперамент');

  const cf = c.behavioral_breakdown?.conflict;
  if (cf && cf.score >= 75) {
    if (cf.self === cf.other) parts.push(`оба — ${STYLE_RU[cf.self] ?? cf.self}`);
    else parts.push('совместимые стили принятия решений');
  } else if (cf && cf.score < 50) {
    parts.push('разные стили принятия решений');
  }

  return { level, emoji, color, parts };
}

const COLORS = ['#00d4aa', '#c77dff', '#ff6b9d', '#ff9f1c'];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function initialsFor(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DiscoverPage() {
  const [mode, setMode] = useState<Mode>('grid');
  const [engine, setEngine] = useState<'psycho' | 'soul'>('psycho');
  const [idx, setIdx] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const swipe = async (action: 'like' | 'pass') => {
    const candidate = candidates[idx];
    if (!candidate) return;

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ to_user: candidate.user_id, action }),
      });
      if (res.ok) {
        const data = await res.json();
        try {
          posthog.capture('swipe', {
            action,
            candidate_user_id: candidate.user_id,
            vector_score: candidate.vector_score,
            ocean_score: candidate.ocean_score,
            behavioral_score: candidate.behavioral_score,
            engine: candidate.soul_level ? 'soul' : 'psycho',
            soul_score: candidate.soul_score,
            match: candidate.match,
          });
          if (data.mutual === true) {
            posthog.capture('mutual_match', { other_user_id: candidate.user_id });
          }
        } catch {}
        if (data.mutual === true) {
          window.alert('Mutual match! Найдён в Матчах.');
        }
      }
    } catch (e) {
      console.error('swipe error', e);
    }

    setIdx(i => i + 1);
  };

  useEffect(() => { setIdx(0); load(); }, [engine]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/discover/match${engine === 'soul' ? '?engine=soul' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Не удалось загрузить кандидатов');
        setCandidates([]);
      } else {
        setCandidates(data.candidates ?? []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{padding:'32px 48px'}}>
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {([['psycho', '🧬 Психометрика'], ['soul', '🌙 Матрица души']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setEngine(key)}
            style={{
              padding:'8px 18px',
              borderRadius:9999,
              fontSize:13,
              fontWeight:600,
              cursor:'pointer',
              transition:'all 0.15s',
              background: engine === key ? (key === 'soul' ? 'rgba(167,139,250,0.15)' : 'rgba(0,212,170,0.12)') : 'rgba(255,255,255,0.03)',
              border: engine === key ? `1px solid ${key === 'soul' ? '#a78bfa' : '#00d4aa'}` : '1px solid #374151',
              color: engine === key ? (key === 'soul' ? '#a78bfa' : '#00d4aa') : '#9ca3af',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}>
        <div>
          <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:4}}>
            Найди <span className="gradient-text">своего</span>
          </h1>
          <p style={{fontSize:14,color:'#9ca3af'}}>
            {loading ? 'Загружаем кандидатов...' : `${candidates.length} фаундеров ранжированы по совместимости`}
          </p>
        </div>

        <div style={{display:'flex',background:'#1f2937',border:'1px solid #374151',borderRadius:8,padding:4,gap:4}}>
          {(['grid','swipe'] as Mode[]).map(m => (
            <button key={m} onClick={()=>setMode(m)} style={{
              padding:'8px 16px',borderRadius:6,
              background: mode===m ? 'linear-gradient(135deg,#00d4aa,#2ec4b6)' : 'transparent',
              color: mode===m ? '#0a0e17' : '#9ca3af',
              border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
              fontFamily:'"Inter",sans-serif',transition:'all 0.2s',
              display:'flex',alignItems:'center',gap:6
            }}>
              {m === 'grid' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>
              )}
              {m === 'grid' ? 'Сетка' : 'Свайп'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{textAlign:'center',padding:'80px 0',color:'#6b7280',fontSize:14}}>
          <div style={{
            width:48,height:48,border:'2px solid #374151',borderTopColor:'#00d4aa',
            borderRadius:'50%',margin:'0 auto 16px',
            animation:'rotate-360 1s linear infinite'
          }}/>
          Считаем совместимость через AI-двойников...
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{padding:32,textAlign:'center',borderColor:'rgba(255,159,28,0.3)'}}>
          <div style={{fontSize:14,color:'#ff9f1c',marginBottom:12,fontWeight:500}}>{error}</div>
          <Link href="/app/avatar" className="btn-primary" style={{marginTop:8}}>
            Открыть Avatar Studio →
          </Link>
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div className="card" style={{padding:48,textAlign:'center'}}>
          <div style={{
            width:80,height:80,borderRadius:'50%',
            background:'rgba(199,125,255,0.08)',border:'1px solid rgba(199,125,255,0.3)',
            margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c77dff" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <h3 className="font-display" style={{fontWeight:700,fontSize:22,marginBottom:8}}>Пока ты здесь один</h3>
          <p style={{color:'#9ca3af',fontSize:14,maxWidth:480,margin:'0 auto'}}>
            Других фаундеров с заполненными профилями пока нет. Расскажи о Syndi AI друзьям — пусть пройдут онбординг и сгенерируют свой embedding.
          </p>
        </div>
      )}

      {!loading && !error && candidates.length > 0 && mode === 'grid' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20}}>
          {candidates.map((c, i) => (
            <FounderCard key={c.user_id} c={c} delay={i*0.05} />
          ))}
        </div>
      )}

      {!loading && !error && mode === 'swipe' && (
        <div style={{display:'flex',justifyContent:'center',alignItems:'flex-start',padding:'40px 0'}}>
          {candidates[idx] ? (
            <div style={{width:380}}>
              <FounderCard c={candidates[idx]} expanded />
              <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:24}}>
                <button onClick={()=>swipe('pass')} style={{
                  width:64,height:64,borderRadius:'50%',
                  background:'rgba(31,41,55,0.8)',border:'1px solid #374151',color:'#9ca3af',
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
                <button onClick={()=>swipe('like')} style={{
                  width:64,height:64,borderRadius:'50%',
                  background:'linear-gradient(135deg,#ff6b9d,#ec4899)',border:'none',color:'#fff',
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:'0 0 24px rgba(255,107,157,0.4)'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
                </button>
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'80px 0'}}>
              <h3 className="font-display" style={{fontWeight:700,fontSize:22,marginBottom:8}}>Все просмотрены</h3>
              <button onClick={()=>setIdx(0)} className="btn-ghost">Начать заново</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FounderCard({ c, delay = 0, expanded = false }: { c: Candidate; delay?: number; expanded?: boolean }) {
  const color = colorFor(c.name ?? '?');
  const avatar = initialsFor(c.name ?? '?');
  const rgb = color === '#00d4aa' ? '0,212,170' :
              color === '#c77dff' ? '199,125,255' :
              color === '#ff6b9d' ? '255,107,157' : '255,159,28';
  const matchColor = c.match >= 90 ? '#00d4aa' : c.match >= 70 ? '#ff9f1c' : '#9ca3af';
  const ocean = c.big_five ?? { openness:50,conscientiousness:50,extraversion:50,agreeableness:50,neuroticism:50 };

  return (
    <div className="card animate-fade-up" style={{
      animationDelay:`${delay}s`,padding:0,overflow:'hidden',position:'relative'
    }}
      onMouseEnter={(e)=>{
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = color;
        el.style.boxShadow = `0 4px 32px rgba(${rgb},0.12)`;
        el.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e)=>{
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#374151';
        el.style.boxShadow = '';
        el.style.transform = '';
      }}
    >
      <div style={{padding:'24px 24px 16px',position:'relative'}}>
        <div style={{
          position:'absolute',top:24,right:24,
          background:'#0a0e17',border:`1px solid ${matchColor}`,
          borderRadius:9999,padding:'6px 12px',
          display:'flex',alignItems:'center',gap:6
        }}>
          <span style={{width:6,height:6,borderRadius:'50%',background:matchColor,boxShadow:`0 0 8px ${matchColor}`,animation:'twinkle 2s infinite'}}/>
          <span className="font-display" style={{fontWeight:700,fontSize:14,color:matchColor}}>{c.match}%</span>
        </div>

        <div style={{
          width:80,height:80,borderRadius:'50%',
          background:`linear-gradient(135deg, ${color}, ${color}cc)`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:24,color:'#0a0e17',
          border:`2px solid ${color}`,boxShadow:`0 0 24px rgba(${rgb},0.4)`,
          marginBottom:16
        }}>{avatar}</div>

        <div className="font-display" style={{fontWeight:700,fontSize:20,marginBottom:4}}>{c.name || 'Anonymous'}</div>
        <div style={{fontSize:13,color:'#9ca3af',marginBottom:12}}>
          {c.role || '—'} {c.domain ? `· ${c.domain}` : ''} {c.location ? <span style={{color:'#6b7280'}}>· {c.location}</span> : null}
        </div>

        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          {c.stage && <span className="badge badge-teal">{c.stage}</span>}
          {c.domain && <span className="badge badge-purple">{c.domain}</span>}
          {c.intent && INTENT_LABEL[c.intent] && (
            <span style={{
              fontSize:11,padding:'3px 10px',borderRadius:9999,
              background:'rgba(255,255,255,0.04)',
              border:`1px solid ${INTENT_LABEL[c.intent].color}66`,
              color: INTENT_LABEL[c.intent].color
            }}>
              {INTENT_LABEL[c.intent].label}
            </span>
          )}
        </div>

        {(c.behavioral_breakdown?.red_flags?.length ?? 0) > 0 && (
          <div style={{
            fontSize:11,padding:'8px 12px',marginBottom:12,borderRadius:8,
            background:'rgba(255,159,28,0.08)',border:'1px solid rgba(255,159,28,0.3)',
            color:'#ff9f1c',display:'flex',alignItems:'flex-start',gap:6,lineHeight:1.4
          }}>
            <span style={{flexShrink:0}}>⚠</span>
            <span>{FLAG_MSG[c.behavioral_breakdown!.red_flags[0]] ?? 'Возможны различия в подходах'}</span>
          </div>
        )}

        {expanded && c.bio && (
          <p style={{fontSize:13,color:'#9ca3af',lineHeight:1.6,marginBottom:16}}>{c.bio}</p>
        )}

        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          {(c.skills ?? []).slice(0, expanded ? 99 : 3).map(s => (
            <span key={s} style={{
              fontSize:11,padding:'3px 10px',borderRadius:9999,
              background:'rgba(255,255,255,0.04)',border:'1px solid #374151',color:'#9ca3af'
            }}>{s}</span>
          ))}
        </div>

        {(() => {
          if (c.soul_level) {
            const sc = c.soul_score ?? 0;
            const soulColor = sc >= 80 ? '#a78bfa' : sc >= 65 ? '#00d4aa' : sc >= 50 ? '#ff9f1c' : '#6b7280';
            return (
              <div style={{marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:soulColor,marginBottom:4}}>
                  <span>🌙</span>
                  <span>{c.soul_level}</span>
                </div>
                {c.soul_phrase && (
                  <div style={{fontSize:12,color:'#9ca3af',lineHeight:1.4}}>{c.soul_phrase}</div>
                )}
              </div>
            );
          }
          const sum = buildSummary(c);
          const dbgLines: string[] = [];
          if (c.vector_score !== undefined) dbgLines.push(`semantic: ${c.vector_score}/100`);
          if (c.ocean_score !== undefined) dbgLines.push(`ocean: ${c.ocean_score}/100`);
          const b = c.behavioral_breakdown;
          if (b) {
            if (b.honesty !== null) dbgLines.push(`honesty close: ${b.honesty}/100`);
            if (b.conflict) dbgLines.push(`conflict: ${STYLE_RU[b.conflict.self] ?? b.conflict.self} × ${STYLE_RU[b.conflict.other] ?? b.conflict.other} = ${b.conflict.score}/100`);
            dbgLines.push(b.red_flags.length === 0 ? 'red flags: нет' : `red flags: ${b.red_flags.join(', ')}`);
          }
          const tip = dbgLines.length > 0 ? dbgLines.join('\n') : undefined;
          return (
            <div title={tip} style={{marginBottom:12,cursor:tip?'help':'default'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:sum.color,marginBottom:4}}>
                <span>{sum.emoji}</span>
                <span>{sum.level}</span>
              </div>
              {sum.parts.length > 0 && (
                <div style={{fontSize:12,color:'#9ca3af',lineHeight:1.4}}>
                  {sum.parts.join(', ')}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <div style={{height:1,background:'#374151',margin:'0 24px'}}/>

      <div style={{padding:'20px 24px 24px',display:'flex',alignItems:'center',gap:20}}>
        <OceanRadar scores={ocean} size={120} color={color} />
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:'#6b7280',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>OCEAN profile</div>
          {[
            ['O', ocean.openness],
            ['C', ocean.conscientiousness],
            ['E', ocean.extraversion],
            ['A', ocean.agreeableness],
            ['N', ocean.neuroticism],
          ].map(([k,v]:any)=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:600,color:'#6b7280',width:10}}>{k}</span>
              <div style={{flex:1,height:3,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
                <div style={{width:`${v}%`,height:'100%',background:`linear-gradient(90deg, ${color}, ${color}aa)`}}/>
              </div>
              <span style={{fontSize:10,color:'#9ca3af',width:24,textAlign:'right'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
