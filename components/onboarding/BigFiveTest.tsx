'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { BigFiveScores } from '@syndi/types';

// 10 questions adapted for startup founders
// Each maps to a Big Five trait; negative items marked with (R) for reverse scoring
const QUESTIONS = [
  { id: 'q1',  trait: 'openness',          label: 'Openness',          emoji: '🧠',
    text: 'Я постоянно ищу нестандартные решения и новые идеи, даже если есть проверенный путь.' },
  { id: 'q2',  trait: 'openness',          label: 'Openness',          emoji: '🧠',
    text: 'Мне интереснее экспериментировать и итерировать, чем следовать готовым фреймворкам.' },
  { id: 'q3',  trait: 'conscientiousness', label: 'Conscientiousness', emoji: '⚙️',
    text: 'Я довожу задачи до конца, даже когда они стали скучными или появились более интересные идеи.' },
  { id: 'q4',  trait: 'conscientiousness', label: 'Conscientiousness', emoji: '⚙️',
    text: 'У меня есть чёткая система приоритетов, и я ей следую даже под давлением.' },
  { id: 'q5',  trait: 'extraversion',      label: 'Extraversion',      emoji: '⚡',
    text: 'Нетворкинг, питчи и знакомства с новыми людьми дают мне энергию.' },
  { id: 'q6',  trait: 'extraversion',      label: 'Extraversion',      emoji: '⚡',
    text: 'Мне легко начать разговор с незнакомым инвестором или потенциальным партнёром.' },
  { id: 'q7',  trait: 'agreeableness',     label: 'Agreeableness',     emoji: '🤝',
    text: 'В конфликте я сначала стараюсь понять точку зрения другого, а потом отстаиваю свою.' },
  { id: 'q8',  trait: 'agreeableness',     label: 'Agreeableness',     emoji: '🤝',
    text: 'Мне важно, чтобы ко-фаундер и команда чувствовали себя услышанными.' },
  { id: 'q9',  trait: 'neuroticism',       label: 'Stability',         emoji: '🧘', reverse: true,
    text: 'Неопределённость и риск меня мотивируют, а не парализуют.' },
  { id: 'q10', trait: 'neuroticism',       label: 'Stability',         emoji: '🧘', reverse: true,
    text: 'Когда всё идёт не по плану, я сохраняю ясность мышления и двигаюсь дальше.' },
];

const TRAIT_INFO: Record<string, { label: string; color: string; desc: string }> = {
  openness:          { label: 'Открытость',        color: '#3B82F6', desc: 'Creativity & curiosity' },
  conscientiousness: { label: 'Добросовестность',  color: '#10B981', desc: 'Focus & discipline'     },
  extraversion:      { label: 'Экстраверсия',      color: '#F59E0B', desc: 'Energy & sociability'    },
  agreeableness:     { label: 'Доброжелательность',color: '#8B5CF6', desc: 'Team & empathy'          },
  neuroticism:       { label: 'Стабильность',       color: '#FF3D5A', desc: 'Resilience under stress' },
};

const SCALE_LABELS = ['Совсем не я', 'Скорее нет', 'Нейтрально', 'Скорее да', 'Точно я'];

type Answers = Record<string, number>; // q1..q10 → 1-5

function computeScores(answers: Answers): BigFiveScores {
  const traitScores: Record<string, number[]> = {
    openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [],
  };

  QUESTIONS.forEach(q => {
    const raw = answers[q.id] ?? 3;
    const val = q.reverse ? (6 - raw) : raw;
    traitScores[q.trait].push(val);
  });

  const avg = (arr: number[]) => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 20);

  return {
    openness:          avg(traitScores.openness),
    conscientiousness: avg(traitScores.conscientiousness),
    extraversion:      avg(traitScores.extraversion),
    agreeableness:     avg(traitScores.agreeableness),
    neuroticism:       avg(traitScores.neuroticism),
  };
}

export function BigFiveTest() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase]     = useState<'test' | 'results'>('test');
  const [scores, setScores]   = useState<BigFiveScores | null>(null);
  const [saving, setSaving]   = useState(false);

  const answered    = Object.keys(answers).length;
  const allAnswered = answered === QUESTIONS.length;
  const progress    = (answered / QUESTIONS.length) * 100;

  const setAnswer = (qId: string, val: number) =>
    setAnswers(prev => ({ ...prev, [qId]: val }));

  const handleSeeResults = () => {
    const s = computeScores(answers);
    setScores(s);
    setPhase('results');
  };

  const handleSave = async () => {
    if (!scores) return;
    setSaving(true);
    try {
      const { getAuthToken } = await import('@/lib/supabase');
      const token = await getAuthToken();
      await fetch('/api/onboarding/bigfive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ scores }),
      });
      router.push('/onboarding/avatar');
    } catch {
      setSaving(false);
    }
  };

  if (phase === 'results' && scores) {
    return <ResultsView scores={scores} onContinue={handleSave} saving={saving} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-text mb-2">Big Five тест</h1>
        <p className="text-muted text-sm">
          10 вопросов о себе. PersonalityAgent использует результаты для поиска совместимых ко-фаундеров.
        </p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted mb-2">
          <span>Отвечено: {answered} / {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-coral rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-6">
        {QUESTIONS.map((q, idx) => {
          const info = TRAIT_INFO[q.trait];
          const val  = answers[q.id];
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-bg2 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-2xl">{q.emoji}</span>
                  <span className="text-[9px] text-muted font-medium uppercase tracking-wide" style={{ color: info.color }}>
                    {info.label}
                  </span>
                </div>
                <p className="text-sm text-text leading-relaxed pt-1">{q.text}</p>
              </div>

              {/* 1–5 scale */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setAnswer(q.id, n)}
                      className={[
                        'flex-1 h-10 rounded-xl text-sm font-semibold transition-all duration-200',
                        val === n
                          ? 'text-white scale-[1.05]'
                          : 'bg-bg3 border border-white/10 text-muted hover:border-white/30 hover:text-text',
                      ].join(' ')}
                      style={val === n ? { background: info.color } : {}}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted px-1">
                  <span>{SCALE_LABELS[0]}</span>
                  <span>{SCALE_LABELS[4]}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={handleSeeResults}
        disabled={!allAnswered}
        className="w-full py-4 bg-coral text-white font-semibold rounded-xl hover:bg-coral/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        {allAnswered ? 'Посмотреть результаты →' : `Ответь на все вопросы (осталось ${QUESTIONS.length - answered})`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Results visualization
// ─────────────────────────────────────────────
function ResultsView({ scores, onContinue, saving }: {
  scores: BigFiveScores;
  onContinue: () => void;
  saving: boolean;
}) {
  const traits = Object.entries(scores) as [keyof BigFiveScores, number][];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8"
    >
      <div>
        <div className="text-coral text-sm font-semibold mb-2">✓ Тест завершён</div>
        <h1 className="font-display text-3xl font-bold text-text mb-2">Твой Big Five профиль</h1>
        <p className="text-muted text-sm">PersonalityAgent сохранит это и будет использовать для поиска совместимых фаундеров.</p>
      </div>

      {/* Trait bars */}
      <div className="bg-bg2 border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-5">
        {traits.map(([trait, val]) => {
          const info = TRAIT_INFO[trait];
          return (
            <div key={trait}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-text">{info.label}</span>
                  <span className="text-xs text-muted ml-2">{info.desc}</span>
                </div>
                <span className="text-lg font-bold font-ui" style={{ color: info.color }}>{val}</span>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: info.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Personality insight */}
      <PersonalityInsight scores={scores} />

      <button
        onClick={onContinue}
        disabled={saving}
        className="w-full py-4 bg-coral text-white font-semibold rounded-xl hover:bg-coral/90 disabled:opacity-50 transition-all"
      >
        {saving ? 'Сохранение...' : 'Создать AI-аватар →'}
      </button>
    </motion.div>
  );
}

function PersonalityInsight({ scores }: { scores: BigFiveScores }) {
  const top    = Object.entries(scores).sort(([,a],[,b]) => b - a).slice(0, 2);
  const labels = top.map(([t]) => TRAIT_INFO[t].label);

  return (
    <div className="bg-coral/8 border border-coral/20 rounded-2xl p-5">
      <div className="text-xs text-coral font-semibold uppercase tracking-widest mb-2">🤖 PersonalityAgent</div>
      <p className="text-sm text-text/80 leading-relaxed">
        Твои доминирующие черты — <strong className="text-text">{labels[0]}</strong> и{' '}
        <strong className="text-text">{labels[1]}</strong>. Такие фаундеры, как правило, сильны в{' '}
        {scores.openness > 70 ? 'генерации идей и' : 'систематическом'} построении продукта и хорошо работают с{' '}
        {scores.agreeableness > 65 ? 'командой и внешними партнёрами.' : 'техническими ко-фаундерами.'}
      </p>
    </div>
  );
}
