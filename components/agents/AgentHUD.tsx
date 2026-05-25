'use client';

import { useState, useEffect } from 'react';
import type { AgentName } from '@syndi/types';

const AGENTS: { name: AgentName; icon: string; desc: string }[] = [
  { name: 'MatchAgent',       icon: '⚡', desc: 'Вычисляет совместимость' },
  { name: 'PersonalityAgent', icon: '🧬', desc: 'Анализирует Big Five'    },
  { name: 'ChatAgent',        icon: '💬', desc: 'Помогает в общении'       },
  { name: 'AvatarAgent',      icon: '🎭', desc: 'Генерирует аватар'        },
  { name: 'InsightAgent',     icon: '💡', desc: 'Стратегические инсайты'   },
];

const LOG_MSGS = [
  'Analysing personality vectors...',
  'Computing compatibility matrix...',
  'Fetching semantic embeddings...',
  'Running Big Five inference...',
  'Scoring founder pair #7...',
  'Match confidence: 94%',
  'Generating insight report...',
  'Avatar prompt ready',
  'Chat suggestion queued',
  'Skill gap analysis complete',
];

export function AgentHUD() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [log, setLog]             = useState<string[]>(['System online...']);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % AGENTS.length), 1800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setLog(prev => [...prev.slice(-6), LOG_MSGS[i % LOG_MSGS.length]]);
      i++;
    }, 2100);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="p-5 flex flex-col gap-5 h-full">
      <div>
        <div className="text-[10px] text-coral font-semibold uppercase tracking-widest mb-3">AI Agents</div>

        <div className="flex flex-col gap-1">
          {AGENTS.map((a, i) => {
            const isActive = activeIdx === i;
            return (
              <div
                key={a.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300"
                style={{ background: isActive ? 'rgba(255,61,90,0.08)' : 'transparent', opacity: isActive ? 1 : 0.4 }}
              >
                <span className="text-base">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-text truncate">{a.name}</div>
                  <div className="text-[10px] text-muted truncate">{a.desc}</div>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live log */}
      <div className="flex-1 flex flex-col">
        <div className="text-[10px] text-muted/60 uppercase tracking-widest mb-2">Live log</div>
        <div className="flex-1 bg-black/30 rounded-xl p-3 font-mono text-[10px] flex flex-col-reverse gap-1 overflow-hidden border border-white/5">
          {[...log].reverse().map((msg, i) => (
            <div
              key={i}
              className="transition-all"
              style={{ color: i === 0 ? '#FF3D5A' : `rgba(107,114,128,${0.9 - i * 0.12})` }}
            >
              {i === 0 && '▶ '}{msg}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {[['2,400', 'Фаундеров'], ['340', 'Команд'], ['94%', 'Точность'], ['48h', 'До матча']].map(([v, l]) => (
          <div key={l} className="bg-bg3 rounded-xl p-3 border border-white/5">
            <div className="font-display text-lg font-bold text-text">{v}</div>
            <div className="text-[10px] text-muted">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
