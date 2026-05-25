"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { Logo } from '@/components/brand/Logo';
import { Stars } from '@/components/brand/Stars';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = async () => {
    setLoading(true); setError('');
    const { error: e } = await getSupabase().auth.signInWithPassword({ email, password });
    if (e) { setError(e.message); setLoading(false); return; }
    router.push('/app/discover');
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative'}}>
      <Stars count={15} />
      <div style={{width:420,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:40}}><Logo size="lg" /></div>

        <div className="card animate-fade-up" style={{padding:40,borderColor:'rgba(0,212,170,0.2)'}}>
          <h1 className="font-display" style={{fontWeight:700,fontSize:32,marginBottom:8}}>
            <span className="gradient-text">Добро пожаловать</span>
          </h1>
          <p style={{fontSize:14,color:'#9ca3af',marginBottom:32}}>Войди в свой Syndi AI аккаунт</p>

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
            <input type="password" className="field-input" placeholder="••••••••"
              value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')submit()}}/>
          </div>

          <button className="btn-primary" style={{width:'100%',padding:14,justifyContent:'center',fontSize:14,letterSpacing:'0.04em'}}
            onClick={submit} disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </div>

        <div style={{textAlign:'center',marginTop:24,fontSize:14,color:'#9ca3af'}}>
          Нет аккаунта? <Link href="/register" style={{color:'#00d4aa',textDecoration:'none',fontWeight:500}}>Создать →</Link>
        </div>
      </div>
    </div>
  );
}
