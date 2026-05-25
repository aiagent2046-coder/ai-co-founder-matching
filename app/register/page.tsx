'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleRegister = async () => {
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setLoading(true); setError('');
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({ email, password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding/profile` }
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
  };

  if (done) return (
    <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">📬</div>
        <h2 className="text-2xl font-bold text-white mb-3" style={{fontFamily:'serif'}}>Проверь почту</h2>
        <p className="text-gray-400 text-sm mb-6">Отправили письмо на <strong className="text-white">{email}</strong>. Перейди по ссылке чтобы подтвердить аккаунт.</p>
        <Link href="/login" className="text-[#FF3D5A] hover:underline text-sm">← Войти</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-[#FF3D5A] flex items-center justify-center font-bold text-white text-xl mx-auto mb-4" style={{fontFamily:'serif'}}>S</div>
          <h1 className="text-3xl font-bold text-white" style={{fontFamily:'serif'}}>Создать аккаунт</h1>
          <p className="text-gray-500 mt-2 text-sm">Бесплатно · Без карты</p>
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
              type="password" placeholder="минимум 6 символов"
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="bg-[#1A1D26] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF3D5A]/50"/>
          </div>
          <button onClick={handleRegister} disabled={loading}
            className="w-full py-3 bg-[#FF3D5A] text-white font-semibold rounded-xl hover:bg-[#FF3D5A]/90 disabled:opacity-50 transition-colors mt-2">
            {loading ? 'Создаём...' : 'Создать аккаунт →'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-2">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-[#FF3D5A] hover:underline">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
