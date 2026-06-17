"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { n: 1, label: 'Intent',    path: '/onboarding/intent' },
  { n: 2, label: 'Профиль',   path: '/onboarding/profile' },
  { n: 3, label: 'Big Five',  path: '/onboarding/big-five' },
  { n: 4, label: 'Behavioral',path: '/onboarding/behavioral' },
  { n: 5, label: 'Аватар',    path: '/onboarding/avatar' },
];

function currentStep(p: string) {
  if (p.includes('intent'))     return 1;
  if (p.includes('profile'))    return 2;
  if (p.includes('big-five'))   return 3;
  if (p.includes('behavioral')) return 4;
  if (p.includes('avatar'))     return 5;
  return 1;
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '';
  const cur = currentStep(path);

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',position:'relative'}}>
      <header style={{
        padding:'16px 48px',
        borderBottom:'1px solid #374151',
        background:'rgba(10,14,23,0.85)',
        backdropFilter:'blur(16px)',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        position:'sticky',top:0,zIndex:10
      }}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
          <div style={{
            width:32,height:32,borderRadius:8,
            background:'linear-gradient(135deg,#00d4aa,#2ec4b6)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:18,color:'#0a0e17',
            boxShadow:'0 0 16px rgba(0,212,170,0.3)'
          }}>✦</div>
          <span className="font-display gradient-text" style={{fontWeight:700,fontSize:18}}>Syndi AI</span>
        </Link>

        <nav style={{display:'flex',alignItems:'center',gap:8, flexWrap:'wrap'}}>
          {STEPS.map((step, i) => {
            const done   = step.n < cur;
            const active = step.n === cur;
            const color  = done ? '#00d4aa' : active ? '#c77dff' : '#6b7280';
            return (
              <div key={step.n} style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:'"Space Grotesk",sans-serif',
                    fontSize:12,fontWeight:700,
                    background: done ? 'linear-gradient(135deg,#00d4aa,#2ec4b6)' : active ? 'rgba(199,125,255,0.15)' : 'transparent',
                    border: active ? '1px solid #c77dff' : done ? 'none' : '1px solid #374151',
                    color: done ? '#0a0e17' : color,
                    boxShadow: active ? '0 0 12px rgba(199,125,255,0.4)' : 'none',
                    transition:'all 0.3s'
                  }}>
                    {done ? '✓' : step.n}
                  </div>
                  <span style={{
                    fontSize:13, fontWeight:500, color,
                    transition:'color 0.3s'
                  }}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    width:24, height:1,
                    background: done ? '#00d4aa' : '#374151',
                    margin:'0 8px',
                    transition:'background 0.3s'
                  }}/>
                )}
              </div>
            );
          })}
        </nav>
      </header>

      <main style={{flex:1,position:'relative',zIndex:1}}>
        {children}
      </main>
    </div>
  );
}