"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import posthog from 'posthog-js';

const ICONS = {
  discover: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  matches: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  avatar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  agents: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

const nav = [
  { href: '/app/discover', label: 'Поиск',    icon: ICONS.discover },
  { href: '/app/matches',  label: 'Матчи',    icon: ICONS.matches  },
  { href: '/app/chat',     label: 'Сообщения',icon: ICONS.chat     },
  { href: '/app/avatar',   label: 'Мой аватар',icon: ICONS.avatar   },
  { href: '/app/agents',   label: 'Агенты',   icon: ICONS.agents   },
  { href: '/app/profile',  label: 'Профиль',  icon: ICONS.profile  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Гард приватной зоны: нет сессии → на логин.
  useEffect(() => {
    let active = true;
    getSupabase().auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace('/login');
      } else {
        try {
          const u = data.session.user;
          posthog.identify(u.id, { email: u.email });
        } catch {}
        setChecking(false);
      }
    });
    return () => { active = false; };
  }, [router]);

  const logout = async () => {
    try { posthog.reset(); } catch {}
    await getSupabase().auth.signOut();
    router.push('/');
  };

  if (checking) return null;

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',position:'relative'}}>
      <aside style={{
        width:220, flexShrink:0,
        background:'rgba(17,24,39,0.6)',
        backdropFilter:'blur(16px)',
        borderRight:'1px solid #374151',
        display:'flex',flexDirection:'column',
        padding:'20px 16px',
        position:'relative',zIndex:10
      }}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',marginBottom:36,padding:'4px 12px'}}>
          <div style={{
            width:32,height:32,borderRadius:8,
            background:'linear-gradient(135deg,#00d4aa,#2ec4b6)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:18,color:'#0a0e17',
            boxShadow:'0 0 16px rgba(0,212,170,0.3)'
          }}>✦</div>
          <span className="font-display gradient-text" style={{fontWeight:700,fontSize:18}}>Syndi AI</span>
        </Link>

        <nav style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
          {nav.map(n => {
            const active = path?.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'10px 14px',borderRadius:8,
                color: active ? '#00d4aa' : '#9ca3af',
                background: active ? 'rgba(0,212,170,0.08)' : 'transparent',
                borderLeft: active ? '3px solid #00d4aa' : '3px solid transparent',
                fontSize:14,fontWeight:500,
                textDecoration:'none',
                transition:'all 0.2s'
              }}>
                {n.icon}
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <button onClick={logout} style={{
          display:'flex',alignItems:'center',gap:12,
          padding:'10px 14px',borderRadius:8,
          color:'#6b7280',background:'transparent',border:'none',
          fontSize:13,fontWeight:500,cursor:'pointer',
          fontFamily:'"Inter",sans-serif',
          marginTop:12
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Выйти
        </button>
      </aside>

      <main style={{flex:1,overflow:'auto',position:'relative',zIndex:5}}>
        {children}
      </main>
    </div>
  );
}
