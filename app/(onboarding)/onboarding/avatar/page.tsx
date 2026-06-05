"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OceanRadar } from '@/components/charts/OceanRadar';
import { getSupabase, getAuthToken } from '@/lib/supabase';

export default function AvatarOnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [essence, setEssence] = useState<string | null>(null);

  useEffect(() => { (async () => {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await sb.from('founder_profiles').select('*').eq('user_id', user.id).single();
    setProfile(data);
    setLoading(false);
  })(); }, []);

  const generate = async () => {
    setGenerating(true);
    const token = await getAuthToken();
    const res = await fetch('/api/embedding/recompute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    const data = await res.json();
    setEssence(data.essence ?? null);
    setGenerating(false);
  };

  const finish = async () => {
    const token = await getAuthToken();
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    }).catch(()=>{});
    router.push('/app/discover');
  };

  if (loading) return <div style={{padding:48,color:'#9ca3af',textAlign:'center'}}>Загружаем профиль...</div>;

  return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'32px 24px'}}>
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#ff6b9d',boxShadow:'0 0 8px #ff6b9d',animation:'twinkle 2s infinite'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#ff6b9d',letterSpacing:'0.12em',textTransform:'uppercase'}}>Шаг 4 из 4 — Финал</span>
        </div>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:8}}>
          Активируй <span className="gradient-text-full">AI-двойника</span>
        </h1>
        <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.6}}>
          Сгенерируем семантический embedding твоего профиля. Это нужно чтобы алгоритм матчинга мог находить совместимых фаундеров.
        </p>
      </div>

      <div className="card" style={{padding:32,marginBottom:24,textAlign:'center'}}>
        <div style={{
          width:96,height:96,borderRadius:'50%',
          background:'linear-gradient(135deg, #00d4aa, #c77dff, #ff6b9d)',
          display:'flex',alignItems:'center',justifyContent:'center',
          margin:'0 auto 20px',
          fontFamily:'"Space Grotesk",sans-serif',
          fontWeight:700,fontSize:36,color:'#0a0e17',
          border:'3px solid #0a0e17',
          boxShadow:'0 0 32px rgba(0,212,170,0.4)',
          animation:'float 6s ease-in-out infinite'
        }}>{(profile?.name?.[0] ?? 'A').toUpperCase()}</div>

        <h2 className="font-display" style={{fontWeight:700,fontSize:22,marginBottom:4}}>{profile?.name ?? 'Founder'}</h2>
        <p style={{fontSize:13,color:'#9ca3af',marginBottom:24}}>{profile?.role} · {profile?.domain} · {profile?.location || 'не указано'}</p>

        {profile?.big_five && (
          <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
            <OceanRadar scores={profile.big_five} size={180} color="#c77dff"/>
          </div>
        )}

        {essence && (
          <div style={{
            textAlign:'left',padding:16,
            background:'rgba(0,212,170,0.06)',
            borderLeft:'2px solid #00d4aa',
            borderRadius:4,marginBottom:20
          }}>
            <div style={{fontSize:10,color:'#00d4aa',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8}}>
              ✓ Essence сгенерирован (1024d vector сохранён)
            </div>
            <p style={{fontSize:13,color:'#9ca3af',lineHeight:1.6,fontStyle:'italic'}}>{essence}</p>
          </div>
        )}

        {!essence ? (
          <button onClick={generate} disabled={generating} className="btn-primary btn-primary-lg" style={{width:'100%',justifyContent:'center'}}>
            {generating ? 'Генерируем embedding...' : '🧠 Сгенерировать AI-двойника'}
          </button>
        ) : (
          <button onClick={finish} className="btn-primary btn-primary-lg" style={{width:'100%',justifyContent:'center'}}>
            Войти в Syndi AI →
          </button>
        )}
      </div>
    </div>
  );
}
