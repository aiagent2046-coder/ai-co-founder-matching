"use client";
import { useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true); setError('');
    const { error: e } = await getSupabase().auth.signInWithPassword({ email, password });
    if (e) { setError(e.message); setLoading(false); return; }
    router.push('/app/discover');
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '0.5px solid rgba(201,168,76,0.15)',
    color: '#F5EFE0', fontSize: 14,
    fontFamily: '"DM Sans",sans-serif', fontWeight: 300, outline: 'none',
  } as const;

  return (
    <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#08090B',fontFamily:'"DM Sans",sans-serif'}}>
      <div style={{position:'absolute',top:'10%',right:'15%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,0.04) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{width:420,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none'}}>
            <div style={{width:40,height:40,background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Cormorant Garamond",serif',fontWeight:600,fontSize:20,color:'#08090B'}}>S</div>
            <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,fontWeight:400,color:'#F5EFE0'}}>Syndi<span style={{color:'#C9A84C'}}>AI</span></span>
          </Link>
        </div>
        <div style={{border:'0.5px solid rgba(201,168,76,0.15)',background:'#0D0E12',padding:48}}>
          <h1 style={{fontFamily:'"Cormorant Garamond",serif',fontSize:36,fontWeight:300,color:'#F5EFE0',marginBottom:8}}>Добро пожаловать</h1>
          <p style={{fontSize:13,fontWeight:300,color:'#5A5448',marginBottom:32}}>Войди в свой аккаунт SyndiAI</p>
          {error && <div style={{padding:'12px 16px',background:'rgba(220,38,38,0.08)',border:'0.5px solid rgba(220,38,38,0.25)',color:'#F87171',fontSize:13,marginBottom:24}}>{error}</div>}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:10,color:'#C9A84C',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="founder@startup.com" style={inputStyle} onKeyDown={e=>{if(e.key==='Enter')handleSubmit()}}/>
          </div>
          <div style={{marginBottom:32}}>
            <label style={{display:'block',fontSize:10,color:'#C9A84C',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Пароль</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} onKeyDown={e=>{if(e.key==='Enter')handleSubmit()}}/>
          </div>
          <button onClick={handleSubmit} disabled={loading} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',color:'#08090B',fontSize:12,fontWeight:500,letterSpacing:'0.1em',textTransform:'uppercase',border:'none',cursor:'pointer',fontFamily:'"DM Sans",sans-serif',opacity:loading?0.7:1}}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </div>
        <div style={{textAlign:'center',marginTop:24}}>
          <span style={{fontSize:13,fontWeight:300,color:'#5A5448'}}>Нет аккаунта? </span>
          <Link href="/register" style={{fontSize:13,fontWeight:400,color:'#C9A84C',textDecoration:'none'}}>Создать →</Link>
        </div>
      </div>
    </div>
  );
}
