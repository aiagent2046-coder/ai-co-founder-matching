"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import posthog from 'posthog-js';

type Intent = 'has_idea' | 'looking_to_join' | 'flexible';

const OPTIONS: { key: Intent; emoji: string; title: string; desc: string }[] = [
  {
    key: 'has_idea',
    emoji: '💡',
    title: 'У меня есть идея',
    desc: 'Ищу сооснователя для своего стартапа',
  },
  {
    key: 'looking_to_join',
    emoji: '🚀',
    title: 'Готов присоединиться',
    desc: 'Хочу влиться в перспективный проект со своими навыками',
  },
  {
    key: 'flexible',
    emoji: '🔄',
    title: 'Открыт обоим вариантам',
    desc: 'Решу с правильным человеком',
  },
];

export default function IntentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preload existing intent
  useEffect(() => { (async () => {
    // Префилл через свой backend (cookie-сессия), а не прямым browser → supabase.co.
    const resp = await fetch('/api/profile');
    if (!resp.ok) return;
    const { profile } = await resp.json();
    if (profile?.intent) setSelected(profile.intent as Intent);
  })(); }, []);

  const submit = async () => {
    if (!selected) { setError('Выбери один из вариантов'); return; }
    setLoading(true); setError('');
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/onboarding/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ intent: selected }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Ошибка сохранения');
        setLoading(false);
        return;
      }
      try { posthog.capture('onboarding_intent_set', { intent: selected }); } catch {}
      router.push('/onboarding/profile');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'32px 24px'}}>
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#00d4aa',boxShadow:'0 0 8px #00d4aa'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#00d4aa',letterSpacing:'0.12em',textTransform:'uppercase'}}>Шаг 1 из 6</span>
        </div>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:8}}>
          Что ты <span className="gradient-text">предлагаешь</span>?
        </h1>
        <p style={{fontSize:15,color:'#9ca3af',lineHeight:1.6}}>
          Это поможет подобрать тебе действительно подходящих людей.
        </p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:32}}>
        {OPTIONS.map(opt => {
          const active = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              style={{
                display:'flex',alignItems:'center',gap:18,
                padding:'20px 24px',
                background: active ? 'rgba(0,212,170,0.08)' : 'rgba(17,24,39,0.4)',
                border: active ? '2px solid #00d4aa' : '2px solid #374151',
                borderRadius:14,
                cursor:'pointer',
                textAlign:'left',
                transition:'all 0.15s',
              }}
            >
              <div style={{fontSize:40,flexShrink:0}}>{opt.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:18,fontWeight:600,marginBottom:4,color: active ? '#00d4aa' : '#f3f4f6'}}>
                  {opt.title}
                </div>
                <div style={{fontSize:13,color:'#9ca3af',lineHeight:1.5}}>
                  {opt.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <div style={{color:'#ef4444',fontSize:13,marginBottom:16}}>{error}</div>}

      <button
        onClick={submit}
        disabled={!selected || loading}
        className="btn-primary"
        style={{width:'100%',padding:'14px',fontSize:15,opacity: (!selected || loading) ? 0.5 : 1}}
      >
        {loading ? 'Сохраняю...' : 'Продолжить →'}
      </button>
    </div>
  );
}
