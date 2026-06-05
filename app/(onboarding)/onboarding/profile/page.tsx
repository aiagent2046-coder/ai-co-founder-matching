"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase, getAuthToken } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState('CEO');
  const [domain, setDomain] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [stage, setStage] = useState('idea');
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Прелоад существующего профиля
  useEffect(() => { (async () => {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from('founder_profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      setName(data.name ?? '');
      setRole(data.role ?? 'CEO');
      setDomain(data.domain ?? '');
      setBio(data.bio ?? '');
      setLocation(data.location ?? '');
      setStage(data.stage ?? 'idea');
      setSkills(data.skills ?? []);
    }
  })(); }, []);

  const addSkill = () => {
    const t = skillsInput.trim();
    if (t && !skills.includes(t)) setSkills([...skills, t]);
    setSkillsInput('');
  };

  const submit = async () => {
    if (!name.trim() || !role || !domain.trim()) {
      setError('Заполни имя, роль и домен');
      return;
    }
    setLoading(true); setError('');
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ name, role, domain, bio, location, stage, skills }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Ошибка сохранения');
        setLoading(false);
        return;
      }
      router.push('/onboarding/big-five');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth:640,margin:'0 auto',padding:'32px 24px'}}>
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#00d4aa',boxShadow:'0 0 8px #00d4aa',animation:'twinkle 2s infinite'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#00d4aa',letterSpacing:'0.12em',textTransform:'uppercase'}}>Шаг 1 из 4</span>
        </div>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:8}}>
          Расскажи о <span className="gradient-text">себе</span>
        </h1>
        <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.6}}>
          Базовые поля для твоего AI-двойника. Сможешь дополнить позже в Avatar Studio.
        </p>
      </div>

      {error && (
        <div style={{padding:'12px 16px',background:'rgba(230,57,70,0.1)',border:'1px solid rgba(230,57,70,0.3)',borderRadius:8,color:'#fca5a5',fontSize:13,marginBottom:20}}>
          {error}
        </div>
      )}

      <div className="card animate-fade-up" style={{padding:32,marginBottom:24}}>
        <div style={{marginBottom:20}}>
          <label className="field-label">Имя</label>
          <input className="field-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Don Jonson"/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
          <div>
            <label className="field-label">Роль</label>
            <select className="field-input" value={role} onChange={e=>setRole(e.target.value)} style={{cursor:'pointer'}}>
              <option value="CEO">CEO</option>
              <option value="CTO">CTO</option>
              <option value="CPO">CPO</option>
              <option value="Designer">Designer</option>
              <option value="BD">BD / Sales</option>
              <option value="Engineer">Engineer</option>
            </select>
          </div>
          <div>
            <label className="field-label">Домен</label>
            <input className="field-input" value={domain} onChange={e=>setDomain(e.target.value)} placeholder="AI / ML"/>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <label className="field-label">О себе</label>
          <textarea className="field-input" rows={4} value={bio} onChange={e=>setBio(e.target.value)}
            placeholder="Чем занимаешься, опыт, что строишь сейчас..."
            style={{resize:'vertical',fontFamily:'"Inter",sans-serif'}}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
          <div>
            <label className="field-label">Локация</label>
            <input className="field-input" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Berlin / Remote"/>
          </div>
          <div>
            <label className="field-label">Стадия</label>
            <select className="field-input" value={stage} onChange={e=>setStage(e.target.value)} style={{cursor:'pointer'}}>
              <option value="idea">Idea</option>
              <option value="mvp">MVP</option>
              <option value="seed">Seed</option>
              <option value="growth">Growth</option>
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Навыки</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
            {skills.map((s,i) => (
              <span key={i} style={{
                display:'inline-flex',alignItems:'center',gap:6,
                padding:'4px 10px',borderRadius:9999,
                background:'rgba(0,212,170,0.08)',border:'1px solid rgba(0,212,170,0.3)',
                color:'#00d4aa',fontSize:12,fontWeight:500
              }}>
                {s}
                <span onClick={()=>setSkills(skills.filter((_,idx)=>idx!==i))} style={{cursor:'pointer',opacity:0.6}}>✕</span>
              </span>
            ))}
          </div>
          <input className="field-input" value={skillsInput} onChange={e=>setSkillsInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addSkill();}}}
            placeholder="Добавь навык + Enter (например: Python, Strategy)"/>
        </div>
      </div>

      <button onClick={submit} disabled={loading} className="btn-primary" style={{
        width:'100%',padding:'16px',justifyContent:'center',fontSize:14,letterSpacing:'0.04em'
      }}>
        {loading ? 'Сохраняем...' : 'Дальше — Big Five тест →'}
      </button>
    </div>
  );
}
