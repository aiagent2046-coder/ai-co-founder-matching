"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Logo } from '@/components/brand/Logo';
import { Stars } from '@/components/brand/Stars';
import posthog from 'posthog-js';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setLoading(true); setError('');
    const { data, error: e } = await getSupabase().auth.signUp({ email, password });
    if (e) { setError(e.message); setLoading(false); return; }
    // PostHog: связываем анонимные события с юзером + фиксируем регистрацию
    if (data.user) {
      try {
        posthog.identify(data.user.id, { email });
        posthog.capture('signup', { method: 'email' });
      } catch {}
    }
    // Подтверждение почты выключено → Supabase сразу вернёт session → в онбординг.
    // Включено → session нет → показываем экран "Проверь почту".
    if (data.session) { router.push('/onboarding/intent'); return; }
    setDone(true);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative'}}>
      <Stars count={15} />
      <div style={{width:420,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:40}}><Logo size="lg" /></div>

        <div className="card animate-fade-up" style={{padding:40,borderColor:'rgba(199,125,255,0.2)'}}>
          {done ? (
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{
                width:64,height:64,borderRadius:'50%',
                background:'rgba(0,212,170,0.1)',
                border:'1px solid rgba(0,212,170,0.4)',
                margin:'0 auto 24px',
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 className="font-display" style={{fontWeight:700,fontSize:24,marginBottom:12}}>Проверь почту</h2>
              <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.7}}>
                Мы отправили письмо на <span style={{color:'#00d4aa'}}>{email}</span>.<br/>
                Подтверди адрес чтобы войти.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display" style={{fontWeight:700,fontSize:32,marginBottom:8}}>
                <span className="gradient-text">Начни путь</span>
              </h1>
              <p style={{fontSize:14,color:'#9ca3af',marginBottom:32}}>Создай аккаунт Syndi AI</p>

              {error && (
                <div style={{padding:'12px 16px',background:'rgba(230,57,70,0.1)',border:'1px solid rgba(230,57,70,0.3)',borderRadius:8,color:'#fca5a5',fontSize:13,marginBottom:24}}>
                  {error}
                </div>
              )}

              <div style={{marginBottom:20}}>
                <label className="field-label">Email</label>
                <input type="email" className="field-input" placeholder="founder@startup.com"
                  value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')submit()}}/>
              </div>

              <div style={{marginBottom:28}}>
                <label className="field-label">Пароль</label>
                <input type="password" className="field-input" placeholder="Минимум 6 символов"
                  value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')submit()}}/>
              </div>

              <button className="btn-primary" style={{width:'100%',padding:14,justifyContent:'center',fontSize:14,letterSpacing:'0.04em'}}
                onClick={submit} disabled={loading}>
                {loading ? 'Создаём...' : 'Создать аккаунт'}
              </button>
            </>
          )}
        </div>

        {!done && (
          <div style={{textAlign:'center',marginTop:24,fontSize:14,color:'#9ca3af'}}>
            Уже есть аккаунт? <Link href="/login" style={{color:'#00d4aa',textDecoration:'none',fontWeight:500}}>Войти →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
