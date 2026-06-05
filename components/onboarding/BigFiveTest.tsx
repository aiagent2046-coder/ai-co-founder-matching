"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { OceanRadar } from '@/components/charts/OceanRadar';

const QUESTIONS = [
  // Открытость
  { id:'q1',  trait:'openness',          text:'Я постоянно ищу нестандартные решения и новые идеи, даже если есть проверенный путь.' },
  { id:'q2',  trait:'openness',          text:'Мне интереснее экспериментировать и итерировать, чем следовать готовым фреймворкам.' },
  { id:'q3',  trait:'openness',          text:'Меня привлекают задачи в областях, где я пока мало что понимаю.' },
  { id:'q4',  trait:'openness',          text:'Я люблю переосмысливать привычные подходы, даже когда они работают.' },
  { id:'q5',  trait:'openness', reverse:true, text:'Я предпочитаю проверенные методы рискованным экспериментам с неизвестным исходом.' },
  // Добросовестность
  { id:'q6',  trait:'conscientiousness', text:'Я довожу задачи до конца, даже когда они стали скучными или появились более интересные идеи.' },
  { id:'q7',  trait:'conscientiousness', text:'У меня есть чёткая система приоритетов, и я ей следую даже под давлением.' },
  { id:'q8',  trait:'conscientiousness', text:'Я планирую ключевые шаги заранее, а не разбираюсь по ходу дела.' },
  { id:'q9',  trait:'conscientiousness', text:'Я держу слово по срокам, даже если ради этого приходится жертвовать комфортом.' },
  { id:'q10', trait:'conscientiousness', reverse:true, text:'Я часто откладываю важные дела на последний момент.' },
  // Экстраверсия
  { id:'q11', trait:'extraversion',      text:'Нетворкинг, питчи и знакомства с новыми людьми дают мне энергию.' },
  { id:'q12', trait:'extraversion',      text:'Мне легко начать разговор с незнакомым инвестором или потенциальным партнёром.' },
  { id:'q13', trait:'extraversion',      text:'Я охотно беру на себя роль того, кто публично представляет команду.' },
  { id:'q14', trait:'extraversion', reverse:true, text:'После активного общения мне нужно много времени наедине, чтобы восстановиться.' },
  { id:'q15', trait:'extraversion', reverse:true, text:'Я работаю продуктивнее в одиночестве, чем в постоянном взаимодействии с людьми.' },
  // Доброжелательность
  { id:'q16', trait:'agreeableness',     text:'В конфликте я сначала стараюсь понять точку зрения другого, а потом отстаиваю свою.' },
  { id:'q17', trait:'agreeableness',     text:'Мне важно, чтобы ко-фаундер и команда чувствовали себя услышанными.' },
  { id:'q18', trait:'agreeableness',     text:'Я готов доверять партнёрам и делегировать без жёсткого контроля.' },
  { id:'q19', trait:'agreeableness',     text:'Ради сохранения отношений в команде я иногда уступаю в спорных вопросах.' },
  { id:'q20', trait:'agreeableness', reverse:true, text:'В переговорах я ставлю свой интерес выше комфорта другой стороны.' },
  // Стабильность (нейротизм, reverse)
  { id:'q21', trait:'neuroticism', reverse:true, text:'Неопределённость и риск меня мотивируют, а не парализуют.' },
  { id:'q22', trait:'neuroticism', reverse:true, text:'Когда всё идёт не по плану, я сохраняю ясность мышления и двигаюсь дальше.' },
  { id:'q23', trait:'neuroticism', reverse:true, text:'Под давлением жёстких дедлайнов я остаюсь спокойным и собранным.' },
  { id:'q24', trait:'neuroticism', reverse:true, text:'Критику и отказы я воспринимаю спокойно, без долгих переживаний.' },
  { id:'q25', trait:'neuroticism', reverse:true, text:'Я быстро восстанавливаюсь после неудач и не застреваю в них.' },
];

const TRAITS: Record<string, { label: string; color: string; desc: string }> = {
  openness:          { label:'Открытость',        color:'#00d4aa', desc:'Креативность, любопытство' },
  conscientiousness: { label:'Добросовестность',  color:'#c77dff', desc:'Фокус, дисциплина'         },
  extraversion:      { label:'Экстраверсия',      color:'#ff9f1c', desc:'Энергия, общительность'    },
  agreeableness:     { label:'Доброжелательность',color:'#ff6b9d', desc:'Команда, эмпатия'          },
  neuroticism:       { label:'Стабильность',      color:'#00d4aa', desc:'Устойчивость под давлением'},
};

type Scores = { openness:number; conscientiousness:number; extraversion:number; agreeableness:number; neuroticism:number };

function computeScores(answers: Record<string, number>): Scores {
  const buckets: Record<string, number[]> = { openness:[], conscientiousness:[], extraversion:[], agreeableness:[], neuroticism:[] };
  QUESTIONS.forEach(q => {
    const raw = answers[q.id] ?? 3;
    const val = q.reverse ? (6 - raw) : raw;
    buckets[q.trait].push(val);
  });
  const avg = (arr: number[]) => Math.round((arr.reduce((a,b)=>a+b,0) / arr.length) * 20);
  return {
    openness: avg(buckets.openness),
    conscientiousness: avg(buckets.conscientiousness),
    extraversion: avg(buckets.extraversion),
    agreeableness: avg(buckets.agreeableness),
    neuroticism: avg(buckets.neuroticism),
  };
}

export function BigFiveTest() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string,number>>({});
  const [phase, setPhase] = useState<'test'|'results'>('test');
  const [scores, setScores] = useState<Scores | null>(null);
  const [saving, setSaving] = useState(false);

  const answered = Object.keys(answers).length;
  const allDone = answered === QUESTIONS.length;
  const progress = (answered / QUESTIONS.length) * 100;

  const seeResults = () => {
    const s = computeScores(answers);
    setScores(s);
    setPhase('results');
  };

  const save = async () => {
    if (!scores) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      await fetch('/api/onboarding/bigfive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ scores }),
      });
      router.push('/onboarding/behavioral');
    } catch {
      setSaving(false);
    }
  };

  if (phase === 'results' && scores) {
    return <Results scores={scores} onSave={save} saving={saving} />;
  }

  return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'32px 24px'}}>
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#c77dff',boxShadow:'0 0 8px #c77dff',animation:'twinkle 2s infinite'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#c77dff',letterSpacing:'0.12em',textTransform:'uppercase'}}>Шаг 2 из 4</span>
        </div>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:8}}>
          <span className="gradient-text">Big Five</span> тест
        </h1>
        <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.6}}>
          25 вопросов. AvatarAgent использует результат чтобы говорить твоим голосом и находить совместимых фаундеров.
        </p>
      </div>

      <div style={{marginBottom:28}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#6b7280',marginBottom:8,letterSpacing:'0.04em',textTransform:'uppercase'}}>
          <span>Отвечено: {answered} / {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{height:3,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
          <div style={{
            width:`${progress}%`,height:'100%',
            background:'linear-gradient(90deg, #00d4aa, #c77dff)',
            transition:'width 0.4s cubic-bezier(0.16,1,0.3,1)'
          }}/>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:32}}>
        {QUESTIONS.map((q, idx) => {
          const t = TRAITS[q.trait];
          const v = answers[q.id];
          return (
            <div key={q.id} className="card animate-fade-up" style={{animationDelay:`${idx*0.03}s`,padding:20}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:14}}>
                <span style={{
                  fontSize:10,fontWeight:600,
                  padding:'4px 10px',borderRadius:9999,
                  color:t.color,
                  background:`${t.color}14`,
                  border:`1px solid ${t.color}40`,
                  letterSpacing:'0.04em',textTransform:'uppercase',
                  flexShrink:0
                }}>{t.label}</span>
                <p style={{fontSize:14,color:'#f9fafb',lineHeight:1.6,flex:1}}>{q.text}</p>
              </div>

              <div style={{display:'flex',gap:6,marginBottom:6}}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={()=>setAnswers(a=>({...a,[q.id]:n}))} style={{
                    flex:1, height:40, borderRadius:8,
                    border: v === n ? 'none' : '1px solid #374151',
                    background: v === n ? `linear-gradient(135deg, ${t.color}, ${t.color}aa)` : '#1f2937',
                    color: v === n ? '#0a0e17' : '#9ca3af',
                    fontWeight:600,fontSize:14,cursor:'pointer',
                    fontFamily:'"Inter",sans-serif',
                    transition:'all 0.2s',
                    boxShadow: v === n ? `0 0 16px ${t.color}40` : 'none',
                  }}>{n}</button>
                ))}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#6b7280'}}>
                <span>Совсем не я</span>
                <span>Точно я</span>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={seeResults} disabled={!allDone} className="btn-primary" style={{
        width:'100%',padding:'16px',justifyContent:'center',fontSize:14,letterSpacing:'0.04em',
        opacity: allDone ? 1 : 0.4
      }}>
        {allDone ? 'Посмотреть результаты →' : `Ответь на все (осталось ${QUESTIONS.length - answered})`}
      </button>
    </div>
  );
}

function Results({ scores, onSave, saving }: { scores: Scores; onSave: ()=>void; saving: boolean }) {
  const traits = Object.entries(scores) as [keyof Scores, number][];
  const top = [...traits].sort(([,a],[,b]) => b - a).slice(0, 2);

  return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'32px 24px'}} className="animate-fade-up">
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#00d4aa',boxShadow:'0 0 8px #00d4aa'}}/>
          <span style={{fontSize:11,fontWeight:600,color:'#00d4aa',letterSpacing:'0.12em',textTransform:'uppercase'}}>Тест завершён</span>
        </div>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:8}}>
          Твой <span className="gradient-text">OCEAN</span> профиль
        </h1>
        <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.6}}>
          Доминируют: <strong style={{color:'#f9fafb'}}>{TRAITS[top[0][0]].label}</strong> и <strong style={{color:'#f9fafb'}}>{TRAITS[top[1][0]].label}</strong>
        </p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 240px',gap:32,alignItems:'flex-start',marginBottom:32}}>
        <div className="card" style={{padding:24,display:'flex',flexDirection:'column',gap:18}}>
          {traits.map(([k, v]) => {
            const t = TRAITS[k];
            return (
              <div key={k}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#f9fafb'}}>{t.label}</div>
                    <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{t.desc}</div>
                  </div>
                  <span className="font-display" style={{fontWeight:700,fontSize:20,color:t.color}}>{v}</span>
                </div>
                <div style={{height:4,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
                  <div style={{
                    width:`${v}%`,height:'100%',
                    background:`linear-gradient(90deg, ${t.color}, ${t.color}88)`,
                    transition:'width 0.8s cubic-bezier(0.34,1.56,0.64,1)'
                  }}/>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card" style={{padding:20,position:'sticky',top:24}}>
          <div style={{fontSize:10,color:'#c77dff',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:12,textAlign:'center'}}>OCEAN Radar</div>
          <OceanRadar scores={scores} size={200} color="#c77dff"/>
        </div>
      </div>

      <button onClick={onSave} disabled={saving} className="btn-primary" style={{
        width:'100%',padding:'16px',justifyContent:'center',fontSize:14,letterSpacing:'0.04em'
      }}>
        {saving ? 'Сохраняем...' : 'Создать AI-аватар →'}
      </button>
    </div>
  );
}
