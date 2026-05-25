'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const NAV = [
  { href: '/app/discover', icon: '⚡', label: 'Discover' },
  { href: '/app/matches',  icon: '🔥', label: 'Матчи'   },
  { href: '/app/chat',     icon: '💬', label: 'Чаты'    },
  { href: '/app/agents',   icon: '🤖', label: 'Агенты'  },
  { href: '/app/profile',  icon: '👤', label: 'Профиль' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-[72px] flex flex-col items-center py-6 gap-2 border-r border-white/[0.07] bg-bg2 shrink-0">
        {/* Logo mark */}
        <Link href="/app/discover" className="w-10 h-10 rounded-xl bg-coral flex items-center justify-center mb-4 text-white font-display font-bold text-lg hover:bg-coral/90 transition-colors">
          S
        </Link>

        {NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={clsx(
                'w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all group',
                active
                  ? 'bg-coral/15 text-coral'
                  : 'text-muted hover:text-text hover:bg-white/5',
              )}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[8px] font-medium opacity-70 group-hover:opacity-100">{label}</span>
            </Link>
          );
        })}

        {/* Spacer + agent pulse */}
        <div className="flex-1" />
        <AgentStatusDot />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function AgentStatusDot() {
  return (
    <div title="AI Agents online" className="w-8 h-8 rounded-full bg-bg3 border border-white/10 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot block" />
    </div>
  );
}
