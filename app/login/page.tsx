'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true); setError('');
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/app/discover');
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-[#FF3D5A] flex items-center justify-center font-bold text-white text-xl mx-auto mb-4" style={{fontFamily:'serif'}}>S</div>
          <h1 className="text-3xl font-bold text-white" style={{fontFamily:'serif'}}>Войти в SyndiAI</h1>
          <p className="text-gray-500 mt-2 text-sm">Найди своего ко-фаундера</p>
        </div>
        <div className="bg-[#111318] border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="you@startup.com"
              className="bg-[#1A1D26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF3D5A]/50"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Пароль</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="bg-[#1A1D26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF3D5A]/50"/>
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-[#FF3D5A] text-white font-semibold rounded-xl hover:bg-[#FF3D5A]/90 disabled:opacity-50 transition-colors mt-2">
            {loading ? 'Входим...' : 'Войти →'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-2">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-[#FF3D5A] hover:underline">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
