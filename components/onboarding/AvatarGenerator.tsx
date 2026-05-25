'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentName } from '@syndi/types';

type Phase = 'idle' | 'prompting' | 'generating' | 'done' | 'error';

const AGENT_STEPS: { agent: AgentName; label: string; duration: number }[] = [
  { agent: 'PersonalityAgent', label: 'Читает твой Big Five профиль...',     duration: 1200 },
  { agent: 'AvatarAgent',      label: 'Строит визуальный промпт...',         duration: 1800 },
  { agent: 'AvatarAgent',      label: 'Отправляет в Replicate Flux...',      duration: 1000 },
  { agent: 'AvatarAgent',      label: 'Генерирует изображение...',           duration: 4000 },
];

type Props = {
  profileName:   string;
  profileRole:   string;
  profileDomain: string;
};

export function AvatarGenerator({ profileName, profileRole, profileDomain }: Props) {
  const router = useRouter();
  const [phase, setPhase]         = useState<Phase>('idle');
  const [stepIdx, setStepIdx]     = useState(-1);
  const [prompt, setPrompt]       = useState('');
  const [imageUrl, setImageUrl]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [finishing, setFinishing] = useState(false);

  const runGeneration = async () => {
    setPhase('prompting');
    setStepIdx(0);

    // Simulate step progression
    let delay = 0;
    AGENT_STEPS.forEach((step, i) => {
      delay += i > 0 ? AGENT_STEPS[i - 1].duration : 0;
      setTimeout(() => setStepIdx(i), delay);
    });

    try {
      const { getAuthToken } = await import('@/lib/supabase');
      const token = await getAuthToken();
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ name: profileName, role: profileRole, domain: profileDomain }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      setPrompt(data.prompt);

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setPhase('done');
      } else if (data.predictionId) {
        // Replicate prediction — poll
        await pollPrediction(data.predictionId);
      } else {
        // Claude сгенерировал промпт, но Replicate не настроен — показываем SVG аватар
        setPrompt(data.prompt ?? '');
        setPhase('done');
      }
    } catch (e) {
      setErrorMsg(String(e));
      setPhase('error');
    }
  };

  const pollPrediction = async (predictionId: string) => {
    setPhase('generating');
    const MAX = 30;
    for (let i = 0; i < MAX; i++) {
      await sleep(2000);
      try {
        const res  = await fetch(`/api/avatar/status?id=${predictionId}`);
        const data = await res.json();
        if (data.status === 'succeeded' && data.imageUrl) {
          setImageUrl(data.imageUrl);
          setPhase('done');
          return;
        }
        if (data.status === 'failed') throw new Error('Replicate generation failed');
      } catch {
        continue;
      }
    }
    throw new Error('Timeout waiting for image generation');
  };

  const handleFinish = async () => {
    setFinishing(true);
    const { getAuthToken } = await import('@/lib/supabase');
    const token = await getAuthToken();
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    router.push('/app/discover');
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-text mb-2">Твой AI-аватар</h1>
        <p className="text-muted text-sm">
          AvatarAgent создаст уникальный визуальный образ на основе твоего профиля и Big Five.
          Аватар будет представлять тебя на платформе.
        </p>
      </div>

      {/* Profile summary card */}
      <div className="bg-bg2 border border-white/[0.07] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-coral/15 border border-coral/30 flex items-center justify-center">
          <span className="font-display text-xl font-bold text-coral">
            {profileName.split(' ').map(w => w[0]).join('').slice(0,2)}
          </span>
        </div>
        <div>
          <div className="font-semibold text-text">{profileName}</div>
          <div className="text-sm text-muted">{profileRole} · {profileDomain}</div>
        </div>
        <div className="ml-auto px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-medium">
          ✓ Big Five готов
        </div>
      </div>

      {/* Main area */}
      <AnimatePresence mode="wait">

        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-8">
            <div className="w-40 h-40 rounded-3xl bg-bg3 border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">🎭</span>
              <span className="text-xs text-muted">Аватар появится здесь</span>
            </div>
            <div className="text-center max-w-xs">
              <p className="text-sm text-muted mb-1">Генерация занимает ~10 секунд</p>
              <p className="text-xs text-muted/60">Используется Flux Schnell через Replicate API</p>
            </div>
            <button
              onClick={runGeneration}
              className="px-8 py-4 bg-coral text-white font-semibold rounded-xl hover:bg-coral/90 transition-colors text-base"
            >
              🤖 Сгенерировать AI-аватар
            </button>
          </motion.div>
        )}

        {(phase === 'prompting' || phase === 'generating') && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-6 py-4">

            {/* Agent steps */}
            <div className="bg-bg2 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
              <div className="text-xs text-coral font-semibold uppercase tracking-widest mb-1">AI Agents в работе</div>
              {AGENT_STEPS.map((step, i) => {
                const done    = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={i} className={`flex items-center gap-3 transition-opacity ${i > stepIdx + 1 ? 'opacity-25' : 'opacity-100'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${
                      done    ? 'bg-green-500/20 text-green-500' :
                      current ? 'bg-coral/20 text-coral' :
                                'bg-white/5 text-muted'
                    }`}>
                      {done ? '✓' : current ? '●' : '○'}
                    </div>
                    <span className={`text-sm ${current ? 'text-text' : done ? 'text-muted' : 'text-muted/50'}`}>
                      {step.label}
                    </span>
                    {current && (
                      <span className="ml-auto flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1 h-1 rounded-full bg-coral animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Spinner placeholder */}
            <div className="flex items-center justify-center py-6">
              <div className="w-20 h-20 rounded-2xl bg-bg3 border border-white/10 flex items-center justify-center">
                <motion.span
                  className="text-3xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  ✦
                </motion.span>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6">

            <div className="flex flex-col items-center gap-4">
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="AI Avatar"
                    className="w-48 h-48 rounded-3xl object-cover border-2 border-coral/40 shadow-[0_0_40px_rgba(255,61,90,0.2)]"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-lg">AI</div>
                </div>
              ) : (
                <FallbackAvatar name={profileName} />
              )}

              <div className="text-center">
                <div className="font-semibold text-text mb-1">{profileName}</div>
                <div className="text-sm text-muted">{profileRole} · {profileDomain}</div>
              </div>
            </div>

            {/* Prompt preview */}
            {prompt && (
              <div className="bg-bg3 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] text-muted uppercase tracking-widest mb-2">Промпт AvatarAgent</div>
                <p className="text-xs text-muted/70 leading-relaxed line-clamp-3">{prompt}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('idle'); setImageUrl(null); }}
                className="flex-1 py-3 border border-white/10 text-muted text-sm rounded-xl hover:border-white/30 transition-colors"
              >
                Перегенерировать
              </button>
              <button
                onClick={handleFinish}
                disabled={finishing}
                className="flex-1 py-3 bg-coral text-white text-sm font-semibold rounded-xl hover:bg-coral/90 disabled:opacity-50 transition-colors"
              >
                {finishing ? 'Загружаем...' : 'Готово — Начать →'}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-coral text-sm">{errorMsg || 'Ошибка генерации'}</p>
            <p className="text-muted text-xs">Replicate API ключ может быть не настроен. Используй дефолтный аватар.</p>
            <div className="flex gap-3">
              <button onClick={() => setPhase('idle')} className="px-6 py-2.5 border border-white/10 text-muted text-sm rounded-xl hover:border-white/30 transition-colors">
                Попробовать снова
              </button>
              <button onClick={handleFinish} disabled={finishing}
                className="px-6 py-2.5 bg-coral text-white text-sm font-semibold rounded-xl hover:bg-coral/90 transition-colors">
                {finishing ? '...' : 'Пропустить →'}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function FallbackAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="relative">
      <div className="w-48 h-48 rounded-3xl bg-coral/15 border-2 border-coral/40 flex items-center justify-center shadow-[0_0_40px_rgba(255,61,90,0.15)]">
        <span className="font-display text-6xl font-bold text-coral">{initials}</span>
      </div>
      <div className="absolute -bottom-2 -right-2 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-lg">AI</div>
    </div>
  );
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
