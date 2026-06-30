"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import posthog from 'posthog-js';

type LikertItem = {
  id: string; type: 'likert'; block: 'honesty' | 'values';
  text: string; reverse?: boolean;
};
type ChoiceItem = {
  id: string; type: 'choice'; block: 'conflict' | 'projective';
  text: string; options: { value: string; label: string }[];
};
type Item = LikertItem | ChoiceItem;

const ITEMS: Item[] = [
  // Честность-Скромность (HEXACO-H, 3 пункта, Likert, q1 и q3 reverse)
  { id: 'q1', type: 'likert', block: 'honesty', reverse: true,
    text: 'Готов(а) приукрасить метрики стартапа перед инвестором, если это спасёт раунд.' },
  { id: 'q2', type: 'likert', block: 'honesty',
    text: 'Если в команде успех, я охотно признаю чужой вклад — даже если в реальности больше сделал(а) сам(а).' },
  { id: 'q3', type: 'likert', block: 'honesty', reverse: true,
    text: 'Получить долю больше моего реального вклада — нормально, главное чтобы проект жил.' },
  // Ценности (Schwartz, 3 пункта, Likert)
  { id: 'q4', type: 'likert', block: 'values',
    text: 'Финансовый успех — главное мерило, что мой проект работает.' },
  { id: 'q5', type: 'likert', block: 'values',
    text: 'Готов(а) работать за меньшее, если миссия реально меняет мир к лучшему.' },
  { id: 'q6', type: 'likert', block: 'values',
    text: 'Работаю эффективнее всего, когда дают свободу в способе решения, а не навязывают процесс.' },
  // Стиль конфликта (Thomas-Kilmann, 3 forced-choice)
  { id: 'q7', type: 'choice', block: 'conflict',
    text: 'Серьёзное разногласие с ко-фаундером — что делаешь чаще?',
    options: [
      { value: 'competing',     label: 'Настаиваю на своём, пока не докажу свою правоту' },
      { value: 'collaborating', label: 'Ищу решение, которое устроит обоих, даже если дольше' },
      { value: 'compromising',  label: 'Иду на компромисс: каждый что-то теряет, что-то получает' },
      { value: 'avoiding',      label: 'Откладываю разговор, пока эмоции не улягутся' },
    ] },
  { id: 'q8', type: 'choice', block: 'conflict',
    text: 'Партнёр взял задачу и сорвал дедлайн. Что сделаешь?',
    options: [
      { value: 'confront',     label: 'Прямо скажу, что недоволен, и потребую разобраться, почему' },
      { value: 'investigate',  label: 'Спрошу, что произошло, помогу понять, что мешает' },
      { value: 'redistribute', label: 'Переделим работу заново, чтобы успеть' },
      { value: 'absorb',       label: 'Сделаю задачу сам(а), это быстрее, чем разбираться' },
    ] },
  { id: 'q9', type: 'choice', block: 'conflict',
    text: 'Партнёр настаивает на стратегии, которая кажется тебе ошибочной.',
    options: [
      { value: 'parallel', label: 'Сделаю по-своему параллельно, потом покажу результат' },
      { value: 'debate',   label: 'Соберу данные и устрою серьёзное обсуждение' },
      { value: 'merge',    label: 'Найду способ совместить наши подходы' },
      { value: 'concede',  label: 'Уступлю — в этом он сильнее, не буду мешать' },
    ] },
  // Поведенческие (q2/q4/q7 из исходного списка)
  { id: 'q10', type: 'choice', block: 'projective',
    text: 'Что быстрее всего выводит тебя из равновесия в партнёре?',
    options: [
      { value: 'chaos',       label: 'Необязательность и хаос' },
      { value: 'cold',        label: 'Эмоциональная холодность и игнорирование' },
      { value: 'no_ambition', label: 'Отсутствие амбиций' },
      { value: 'overthink',   label: 'Постоянные сомнения и анализ вместо действий' },
    ] },
  { id: 'q11', type: 'choice', block: 'projective',
    text: 'Какую фразу ты чаще говоришь в трудной ситуации?',
    options: [
      { value: 'do',       label: 'Давайте просто сделаем, потом разберёмся' },
      { value: 'plan',     label: 'Давайте подумаем и составим план' },
      { value: 'talk',     label: 'Давайте поговорим с командой, чтобы все были в курсе' },
      { value: 'creative', label: 'Давайте поищем нестандартное решение' },
    ] },
  { id: 'q12', type: 'choice', block: 'projective',
    text: 'Как ты относишься к правилам и инструкциям?',
    options: [
      { value: 'lawgiver',  label: 'Обожаю их придумывать для других' },
      { value: 'flexible',  label: 'Соблюдаю, но если вижу абсурд — нарушаю' },
      { value: 'anarchist', label: 'Игнорирую, предпочитаю свою интуицию' },
      { value: 'executor',  label: 'Аккуратно следую, чтобы не было ошибок' },
    ] },
];

const BLOCKS: Record<string, { label: string; color: string }> = {
  honesty:    { label: 'Честность',        color: '#00d4aa' },
  values:     { label: 'Ценности',         color: '#c77dff' },
  conflict:   { label: 'Стиль конфликта',  color: '#ff9f1c' },
  projective: { label: 'Реакции',          color: '#ff6b9d' },
};

function getLabel(qid: string, val: string | number): string {
  const q = ITEMS.find(i => i.id === qid);
  if (!q || q.type !== 'choice') return '';
  return q.options.find(o => o.value === val)?.label ?? '';
}

function computeProfile(answers: Record<string, string | number>) {
  // Честность: q1 (rev), q2, q3 (rev) — Likert 1-5 → 0-100
  const h = [
    { v: Number(answers.q1 ?? 3), rev: true },
    { v: Number(answers.q2 ?? 3), rev: false },
    { v: Number(answers.q3 ?? 3), rev: true },
  ].map(x => x.rev ? 6 - x.v : x.v);
  const honesty_humility = Math.round((h.reduce((a,b)=>a+b,0) / h.length) * 20);

  // Ценности: каждый пункт — своя ось, Likert 1-5 → 0-100
  const values = {
    achievement_power: Math.round(Number(answers.q4 ?? 3) * 20),
    universalism:      Math.round(Number(answers.q5 ?? 3) * 20),
    self_direction:    Math.round(Number(answers.q6 ?? 3) * 20),
  };

  // Конфликт: q7 — enum (primary_style), q8/q9 — текст выбранной опции
  const conflict = {
    primary_style: (answers.q7 as 'competing'|'collaborating'|'compromising'|'avoiding') ?? 'collaborating',
    performance_response: getLabel('q8', answers.q8 ?? ''),
    strategy_response:    getLabel('q9', answers.q9 ?? ''),
  };

  // Проективные: текст выбранной опции
  const projective = {
    partner_irritants: getLabel('q10', answers.q10 ?? ''),
    decision_style:    getLabel('q11', answers.q11 ?? ''),
    rule_orientation:  getLabel('q12', answers.q12 ?? ''),
  };

  return { honesty_humility, values, conflict, projective };
}

export function BehavioralProfile() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = Object.keys(answers).length;
  const allDone = answered === ITEMS.length;
  const progress = (answered / ITEMS.length) * 100;

  const submit = async () => {
    if (!allDone) return;
    setSaving(true); setError(null);
    try {
      const profile = computeProfile(answers);
      const token = await getAuthToken();
      const resp = await fetch('/api/onboarding/behavioral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ behavioral_profile: profile }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${resp.status}`);
      }
      try {
        posthog.capture('behavioral_profile_completed', {
          conflict_style: profile.conflict.primary_style,
          honesty_humility: profile.honesty_humility,
        });
      } catch {}
      router.push('/onboarding/workstyle');
    } catch (e: any) {
      setError(e?.message || String(e));
      setSaving(false);
    }
  };

  return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'32px 24px'}}>
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#ff9f1c',boxShadow:'0 0 8px #ff9f1c'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#ff9f1c',letterSpacing:'0.12em',textTransform:'uppercase'}}>Шаг 4 из 6</span>
        </div>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:8}}>
          <span className="gradient-text">Поведенческий</span> слепок
        </h1>
        <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.6}}>
          12 вопросов про ценности, конфликты и партнёрство. Помогают подобрать ко-фаундера, с которым реально сработаешься.
        </p>
      </div>

      <div style={{marginBottom:28}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#6b7280',marginBottom:8,letterSpacing:'0.04em',textTransform:'uppercase'}}>
          <span>Отвечено: {answered} / {ITEMS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{height:3,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
          <div style={{
            width:`${progress}%`,height:'100%',
            background:'linear-gradient(90deg, #ff9f1c, #ff6b9d)',
            transition:'width 0.4s cubic-bezier(0.16,1,0.3,1)'
          }}/>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:32}}>
        {ITEMS.map((q, idx) => {
          const block = BLOCKS[q.block];
          const v = answers[q.id];
          return (
            <div key={q.id} className="card animate-fade-up" style={{animationDelay:`${idx*0.03}s`,padding:20}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:14}}>
                <span style={{
                  fontSize:10,fontWeight:600,
                  padding:'4px 10px',borderRadius:9999,
                  color:block.color,
                  background:`${block.color}14`,
                  border:`1px solid ${block.color}40`,
                  letterSpacing:'0.04em',textTransform:'uppercase',
                  flexShrink:0
                }}>{block.label}</span>
                <p style={{fontSize:14,color:'#f9fafb',lineHeight:1.6,flex:1}}>{q.text}</p>
              </div>

              {q.type === 'likert' ? (
                <>
                  <div style={{display:'flex',gap:6,marginBottom:6}}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={()=>setAnswers(a=>({...a,[q.id]:n}))} style={{
                        flex:1,height:40,borderRadius:8,
                        border: v === n ? 'none' : '1px solid #374151',
                        background: v === n ? `linear-gradient(135deg, ${block.color}, ${block.color}aa)` : '#1f2937',
                        color: v === n ? '#0a0e17' : '#9ca3af',
                        fontWeight:600,fontSize:14,cursor:'pointer',
                        fontFamily:'"Inter",sans-serif',
                        transition:'all 0.2s',
                        boxShadow: v === n ? `0 0 16px ${block.color}40` : 'none',
                      }}>{n}</button>
                    ))}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#6b7280'}}>
                    <span>Совсем не я</span>
                    <span>Точно я</span>
                  </div>
                </>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {q.options.map(opt => (
                    <button key={opt.value} onClick={()=>setAnswers(a=>({...a,[q.id]:opt.value}))} style={{
                      textAlign:'left',
                      padding:'12px 14px',borderRadius:8,
                      border: v === opt.value ? `1px solid ${block.color}` : '1px solid #374151',
                      background: v === opt.value ? `${block.color}14` : '#1f2937',
                      color: v === opt.value ? '#f9fafb' : '#d1d5db',
                      fontSize:13,lineHeight:1.5,cursor:'pointer',
                      fontFamily:'"Inter",sans-serif',
                      transition:'all 0.2s',
                      boxShadow: v === opt.value ? `0 0 12px ${block.color}30` : 'none',
                    }}>{opt.label}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{padding:12,marginBottom:16,borderRadius:8,background:'#7f1d1d40',color:'#fca5a5',fontSize:13}}>
          Ошибка сохранения: {error}
        </div>
      )}

      <button onClick={submit} disabled={!allDone || saving} className="btn-primary" style={{
        width:'100%',padding:'16px',justifyContent:'center',fontSize:14,letterSpacing:'0.04em',
        opacity: allDone && !saving ? 1 : 0.4
      }}>
        {saving ? 'Сохраняем...' : (allDone ? 'Дальше → стиль работы' : `Ответь на все (осталось ${ITEMS.length - answered})`)}
      </button>
    </div>
  );
}
