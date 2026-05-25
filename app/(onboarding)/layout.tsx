'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { n: 1, label: 'Профиль',  path: '/onboarding/profile'  },
  { n: 2, label: 'Big Five', path: '/onboarding/big-five' },
  { n: 3, label: 'Аватар',   path: '/onboarding/avatar'   },
];

function getCurrentStep(pathname: string) {
  if (pathname.includes('big-five')) return 2;
  if (pathname.includes('avatar'))   return 3;
  return 1;
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current  = getCurrentStep(pathname);

  return (
    <div className="min-h-screen bg-[#0A0C10] flex flex-col">
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FF3D5A] flex items-center justify-center font-bold text-white text-lg">S</div>
          <span className="font-bold text-white">Syndi<span className="text-[#FF3D5A]">AI</span></span>
        </div>

        <nav className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const done   = step.n < current;
            const active = step.n === current;
            return (
              <div key={step.n} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    done   ? 'bg-[#FF3D5A] text-white' : '',
                    active ? 'bg-[#FF3D5A]/20 text-[#FF3D5A] border-2 border-[#FF3D5A]' : '',
                    !done && !active ? 'bg-white/5 text-gray-500 border border-white/10' : '',
                  ].join(' ')}>
                    {done ? '✓' : step.n}
                  </div>
                  <span className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${step.n < current ? 'bg-[#FF3D5A]/40' : 'bg-white/10'}`} />
                )}
              </div>
            );
          })}
        </nav>

        <div className="text-xs text-gray-500">Шаг {current} из {STEPS.length}</div>
      </header>

      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-[#FF3D5A] transition-all duration-500"
          style={{ width: `${((current - 1) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
