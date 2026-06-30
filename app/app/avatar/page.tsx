"use client";
import { useEffect, useState } from 'react';
import { OceanRadar } from '@/components/charts/OceanRadar';
import { getAuthToken } from '@/lib/supabase';

type Identity = {
  name: string; role: string; domain: string; bio: string; location: string; stage: string;
  skills: string[];
  big_five: any;
  can_teach: string[];
  want_to_learn: string[];
  looking_for: string[];
  not_looking_for: string[];
  goals: { timeline: string; commitment: string; seeking: string[] };
  autonomy_level: number;
  // Psycho-Match v2 (read-only в этой студии; редактируются в онбординге).
  time_zone?: string | null;
  work_style?: { pace?: number; structure?: number; communication?: number; risk?: number } | null;
  hexaco?: { domains?: Record<string, number> | null; facets?: Record<string, number> | null } | null;
};

const EMPTY: Identity = {
  name: '', role: '', domain: '', bio: '', location: '', stage: 'idea',
  skills: [], big_five: null,
  can_teach: [], want_to_learn: [], looking_for: [], not_looking_for: [],
  goals: { timeline: '3-months', commitment: 'full-time', seeking: ['co-founder'] },
  autonomy_level: 1,
};

export default function AvatarStudio() {
  const [id, setId] = useState<Identity>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [embeddingInfo, setEmbeddingInfo] = useState<{essence?: string; dim?: number} | null>(null);
  const [tab, setTab] = useState<'identity' | 'capabilities' | 'filters' | 'test'>('identity');

  useEffect(() => { load(); }, []);

  const load = async () => {
    // Профиль через свой backend (cookie-сессия), а не прямым browser → supabase.co.
    const resp = await fetch('/api/profile');
    if (!resp.ok) { setLoading(false); return; }
    const { profile: data } = await resp.json();
    if (data) setId({ ...EMPTY, ...data });
    setLoading(false);
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    const token = await getAuthToken();
    await fetch('/api/avatar/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify(id),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const recompute = async () => {
    setRecomputing(true);
    setEmbeddingInfo(null);
    const token = await getAuthToken();
    const res = await fetch('/api/embedding/recompute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    const data = await res.json();
    setEmbeddingInfo(data);
    setRecomputing(false);
  };

  if (loading) return <div style={{padding:48,color:'#9ca3af'}}>Загружаем аватар...</div>;

  return (
    <div style={{padding:'32px 48px',maxWidth:1200,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:32}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#c77dff',boxShadow:'0 0 8px #c77dff',animation:'twinkle 2s infinite'}}/>
            <span style={{fontSize:11,fontWeight:600,color:'#c77dff',letterSpacing:'0.12em',textTransform:'uppercase'}}>Avatar Studio</span>
          </div>
          <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:4}}>
            Твой <span className="gradient-text-full">цифровой двойник</span>
          </h1>
          <p style={{fontSize:14,color:'#9ca3af'}}>Аватар представляет тебя в платформе. Чем точнее знание — тем лучше match.</p>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button onClick={recompute} disabled={recomputing} className="btn-ghost">
            {recomputing ? 'Считаем embedding...' : '🧠 Recompute embedding'}
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Autonomy level */}
      <div className="card" style={{padding:20,marginBottom:24,borderColor:'rgba(199,125,255,0.2)'}}>
        <div style={{fontSize:11,color:'#c77dff',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:12}}>Уровень автономии</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[
            {l:1,t:'Suggestions',d:'Аватар предлагает ответы, ты решаешь'},
            {l:2,t:'First touch',d:'Аватар отвечает на первое сообщение'},
            {l:3,t:'Auto-screen',d:'Аватар ведёт первую беседу целиком'},
          ].map(o => {
            const active = id.autonomy_level === o.l;
            return (
              <div key={o.l} onClick={()=>setId({...id, autonomy_level: o.l})}
                style={{
                  padding:16,borderRadius:8,cursor:'pointer',transition:'all 0.2s',
                  background: active ? 'rgba(199,125,255,0.08)' : 'transparent',
                  border: active ? '1px solid #c77dff' : '1px solid #374151',
                }}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span className="font-display" style={{fontWeight:700,fontSize:14,color:active?'#c77dff':'#6b7280'}}>L{o.l}</span>
                  <span className="font-display" style={{fontWeight:700,fontSize:14,color:active?'#f9fafb':'#9ca3af'}}>{o.t}</span>
                </div>
                <div style={{fontSize:12,color:'#9ca3af',lineHeight:1.5}}>{o.d}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:24,borderBottom:'1px solid #374151'}}>
        {[
          ['identity','Идентичность'],
          ['capabilities','Способности'],
          ['filters','Фильтры'],
          ['test','Тестовый разговор'],
        ].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k as any)} style={{
            padding:'12px 20px',background:'transparent',border:'none',cursor:'pointer',
            color: tab===k ? '#00d4aa' : '#9ca3af',
            borderBottom: tab===k ? '2px solid #00d4aa' : '2px solid transparent',
            fontSize:14,fontWeight:500,
            fontFamily:'"Inter",sans-serif',
            transition:'all 0.2s',marginBottom:-1
          }}>{l}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'identity' && <IdentityTab id={id} setId={setId} />}
      {tab === 'capabilities' && <CapabilitiesTab id={id} setId={setId} />}
      {tab === 'filters' && <FiltersTab id={id} setId={setId} />}
      {tab === 'test' && <TestConversationTab />}
    </div>
  );
}

// ── Identity tab ──────────────────────────────
function IdentityTab({ id, setId }: any) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:32}}>
      <div>
        <Field label="Имя"><Input value={id.name} onChange={(v: string)=>setId({...id,name:v})}/></Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <Field label="Роль"><Input value={id.role} onChange={(v: string)=>setId({...id,role:v})}/></Field>
          <Field label="Домен"><Input value={id.domain} onChange={(v: string)=>setId({...id,domain:v})}/></Field>
        </div>
        <Field label="О себе (bio)">
          <Textarea value={id.bio} onChange={(v: string)=>setId({...id,bio:v})} rows={4} placeholder="Краткая история — кто ты, что строишь, опыт"/>
        </Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <Field label="Локация"><Input value={id.location} onChange={(v: string)=>setId({...id,location:v})} placeholder="Berlin / Remote"/></Field>
          <Field label="Стадия">
            <Select value={id.stage} onChange={(v: string)=>setId({...id,stage:v})}
              options={[['idea','Idea'],['mvp','MVP'],['seed','Seed'],['growth','Growth']]}/>
          </Field>
        </div>
        <Field label="Навыки">
          <TagInput value={id.skills} onChange={(v: string[])=>setId({...id,skills:v})} placeholder="Добавь навык + Enter"/>
        </Field>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:24,height:'fit-content',position:'sticky',top:32}}>
        <div className="card" style={{padding:24}}>
        <div style={{fontSize:11,color:'#c77dff',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16}}>OCEAN Profile</div>
        {id.big_five ? (
          <OceanRadar scores={id.big_five} size={240} color="#c77dff"/>
        ) : (
          <div style={{textAlign:'center',padding:'40px 0',color:'#6b7280',fontSize:13}}>
            OCEAN профиль не построен.<br/>Пройди <a href="/onboarding/big-five" style={{color:'#00d4aa'}}>Big Five тест</a>.
          </div>
        )}
        </div>
        <PsychoProfileCard id={id} />
      </div>
    </div>
  );
}

// ── Психопрофиль (Psycho-Match v2): work_style + HEXACO + tz ──────────
// Чисто презентация. Подписи полюсов совпадают с шагом онбординга WorkStyle.tsx.
const WS_POLES: { key: string; hint: string; left: string; right: string }[] = [
  { key: 'pace',          hint: 'Темп',          left: 'Методично',   right: 'Спринтер' },
  { key: 'structure',     hint: 'Структура',     left: 'Импровизация', right: 'Чёткий процесс' },
  { key: 'communication', hint: 'Коммуникация', left: 'Асинхронно',  right: 'Созвоны' },
  { key: 'risk',          hint: 'Риск',          left: 'Осторожно',   right: 'Ва-банк' },
];
const HX_POLES: { key: string; hint: string; left: string; right: string }[] = [
  { key: 'H', hint: 'Honesty',         left: 'Прагматичность', right: 'Честность' },
  { key: 'E', hint: 'Emotionality',    left: 'Устойчивость',   right: 'Чувствительность' },
  { key: 'X', hint: 'eXtraversion',    left: 'Сдержанность',   right: 'Экстраверсия' },
  { key: 'A', hint: 'Agreeableness',   left: 'Принципиальность', right: 'Сговорчивость' },
  { key: 'C', hint: 'Conscientious.',  left: 'Спонтанность',   right: 'Добросовестность' },
  { key: 'O', hint: 'Openness',        left: 'Традиционность', right: 'Открытость' },
];

function PoleBar({ hint, left, right, value, color }: { hint: string; left: string; right: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  const pole = v >= 60 ? right : v <= 40 ? left : 'баланс';
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4}}>
        <span style={{fontSize:11,color:'#9ca3af'}}>{hint}</span>
        <span style={{fontSize:11,color:'#d1d5db',fontWeight:500}}>{pole} · {v}</span>
      </div>
      <div style={{height:4,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
        <div style={{width:`${v}%`,height:'100%',background:color,transition:'width 0.2s'}}/>
      </div>
    </div>
  );
}

function PsychoProfileCard({ id }: { id: Identity }) {
  const ws = id.work_style;
  const hx = id.hexaco?.domains;
  const hasWs = !!ws && WS_POLES.some(p => typeof (ws as any)[p.key] === 'number');
  const hasHx = !!hx && HX_POLES.some(p => typeof (hx as any)[p.key] === 'number');
  const hasTz = typeof id.time_zone === 'string' && !!id.time_zone;
  const hasAny = hasWs || hasHx || hasTz;

  return (
    <div className="card" style={{padding:24}}>
      <div style={{fontSize:11,color:'#00d4aa',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16}}>Психопрофиль</div>
      {!hasAny ? (
        <div style={{textAlign:'center',padding:'24px 0',color:'#6b7280',fontSize:13}}>
          Не заполнен.<br/>Пройди шаг <a href="/onboarding/workstyle" style={{color:'#00d4aa'}}>Стиль работы</a>.
        </div>
      ) : (
        <>
          {hasTz && (
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <span style={{fontSize:11,color:'#9ca3af'}}>Часовой пояс:</span>
              <span style={{fontSize:12,fontWeight:600,color:'#00d4aa'}}>{id.time_zone}</span>
            </div>
          )}
          {hasWs && (
            <div style={{marginBottom:hasHx?18:0}}>
              <div style={{fontSize:10,fontWeight:600,color:'#00d4aa',letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:8}}>Стиль работы</div>
              {WS_POLES.filter(p => typeof (ws as any)[p.key] === 'number')
                .map(p => <PoleBar key={p.key} hint={p.hint} left={p.left} right={p.right} value={(ws as any)[p.key]} color="#00d4aa"/>)}
            </div>
          )}
          {hasHx && (
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'#c77dff',letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:8}}>Черты характера</div>
              {HX_POLES.filter(p => typeof (hx as any)[p.key] === 'number')
                .map(p => <PoleBar key={p.key} hint={p.hint} left={p.left} right={p.right} value={(hx as any)[p.key]} color="#c77dff"/>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Capabilities tab ──────────────────────────────
function CapabilitiesTab({ id, setId }: any) {
  return (
    <div style={{maxWidth:680}}>
      <Field label="Чему могу научить партнёра">
        <TagInput value={id.can_teach} onChange={(v: string[])=>setId({...id,can_teach:v})} placeholder="React, fundraising, B2B sales..."/>
        <Hint>Это то, что ты сильно знаешь и хочешь передать.</Hint>
      </Field>

      <Field label="Чему хочу научиться">
        <TagInput value={id.want_to_learn} onChange={(v: string[])=>setId({...id,want_to_learn:v})} placeholder="ML Ops, design systems..."/>
        <Hint>Аватар найдёт партнёров с этими сильными сторонами.</Hint>
      </Field>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:24}}>
        <Field label="Таймлайн">
          <Select value={id.goals.timeline} onChange={(v: string)=>setId({...id,goals:{...id.goals,timeline:v}})}
            options={[['now','Сейчас'],['3-months','3 месяца'],['6-months','6 месяцев'],['exploring','Изучаю']]}/>
        </Field>
        <Field label="Commitment">
          <Select value={id.goals.commitment} onChange={(v: string)=>setId({...id,goals:{...id.goals,commitment:v}})}
            options={[['full-time','Full-time'],['part-time','Part-time'],['advisory','Advisory']]}/>
        </Field>
      </div>
    </div>
  );
}

// ── Filters tab ──────────────────────────────
function FiltersTab({ id, setId }: any) {
  return (
    <div style={{maxWidth:680}}>
      <Field label="Я ИЩУ">
        <TagInput value={id.looking_for} onChange={(v: string[])=>setId({...id,looking_for:v})} placeholder="Технический сооснователь, ML опыт, fluent English"/>
        <Hint>Hard критерии. Аватар будет приоритизировать таких партнёров.</Hint>
      </Field>

      <Field label="Я НЕ ИЩУ">
        <TagInput value={id.not_looking_for} onChange={(v: string[])=>setId({...id,not_looking_for:v})} placeholder="advisors, remote only, без опыта в стартапах"/>
        <Hint>Аватар вежливо отклонит такие профили на screening этапе.</Hint>
      </Field>
    </div>
  );
}

// ── Test conversation tab ──────────────────────────────
function TestConversationTab() {
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState<Array<{ role: 'user' | 'avatar'; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'suggest'|'autoreply'>('suggest');

  const reset = () => setHistory([]);

  const send = async () => {
    if (!msg.trim()) return;
    const text = msg;
    setMsg('');
    setHistory(h => [...h, { role: 'user', text }]);
    setLoading(true);

    const token = await getAuthToken();
    const res = await fetch('/api/avatar/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({
        messages: [...history.map(h => ({ senderId: h.role==='user' ? 'other' : 'me', content: h.text })),
                   { senderId: 'other', content: text }],
        mode,
      }),
    });
    const data = await res.json();
    setHistory(h => [...h, { role: 'avatar', text: data.suggestion ?? data.error ?? '...' }]);
    setLoading(false);
  };

  return (
    <div style={{maxWidth:680}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{fontSize:13,color:'#9ca3af',lineHeight:1.6,maxWidth:480}}>
          Поговори со своим аватаром как незнакомый фаундер. Проверь стиль и тон — это то, как партнёры будут видеть тебя.
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{display:'flex',background:'#1f2937',border:'1px solid #374151',borderRadius:8,padding:4,gap:4}}>
            {(['suggest','autoreply'] as const).map(m => (
              <button key={m} onClick={()=>setMode(m)} style={{
                padding:'6px 12px',borderRadius:6,
                background: mode===m ? 'linear-gradient(135deg,#c77dff,#9333ea)' : 'transparent',
                color: mode===m ? '#fff' : '#9ca3af',
                border:'none',cursor:'pointer',
                fontSize:11,fontWeight:600,
                fontFamily:'"Inter",sans-serif',
              }}>{m === 'suggest' ? 'Suggest (L1)' : 'Auto-reply (L2)'}</button>
            ))}
          </div>
          <button onClick={reset} className="btn-ghost" style={{padding:'8px 14px',fontSize:12}}>Очистить</button>
        </div>
      </div>

      <div className="card" style={{padding:0,minHeight:320,display:'flex',flexDirection:'column'}}>
        <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',gap:12,maxHeight:400,overflow:'auto'}}>
          {history.length === 0 && (
            <div style={{color:'#6b7280',fontSize:13,textAlign:'center',padding:'40px 0'}}>
              Напиши первое сообщение — аватар ответит как ты
            </div>
          )}
          {history.map((h,i) => (
            <div key={i} style={{
              alignSelf: h.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: 12,
              background: h.role === 'user' ? 'linear-gradient(135deg,#00d4aa,#2ec4b6)' : '#374151',
              color: h.role === 'user' ? '#0a0e17' : '#f9fafb',
              fontSize: 13,
              lineHeight: 1.5,
            }}>{h.text}</div>
          ))}
          {loading && (
            <div style={{alignSelf:'flex-start',color:'#6b7280',fontSize:13}}>
              Аватар печатает<span style={{animation:'typing-bounce 1.4s infinite',display:'inline-block'}}>.</span><span style={{animation:'typing-bounce 1.4s 0.2s infinite',display:'inline-block'}}>.</span><span style={{animation:'typing-bounce 1.4s 0.4s infinite',display:'inline-block'}}>.</span>
            </div>
          )}
        </div>
        <div style={{padding:16,borderTop:'1px solid #374151',display:'flex',gap:8}}>
          <input value={msg} onChange={e=>setMsg(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')send()}}
            placeholder="Расскажи о себе и своём проекте..."
            className="field-input" style={{flex:1}}/>
          <button onClick={send} disabled={loading || !msg.trim()} className="btn-primary">
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable components ──────────────────────────────
function Field({ label, children }: any) {
  return (
    <div style={{marginBottom:20}}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
function Hint({ children }: any) {
  return <div style={{fontSize:11,color:'#6b7280',marginTop:6,lineHeight:1.5}}>{children}</div>;
}
function Input({ value, onChange, placeholder }: any) {
  return <input className="field-input" value={value ?? ''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>;
}
function Textarea({ value, onChange, rows = 3, placeholder }: any) {
  return <textarea className="field-input" rows={rows} value={value ?? ''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{resize:'vertical',fontFamily:'"Inter",sans-serif'}}/>;
}
function Select({ value, onChange, options }: { value: string; onChange: (v:string)=>void; options: [string,string][] }) {
  return (
    <select className="field-input" value={value} onChange={e=>onChange(e.target.value)} style={{cursor:'pointer'}}>
      {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v:string[])=>void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  };
  const remove = (i: number) => onChange(value.filter((_,idx) => idx !== i));
  return (
    <div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
        {value.map((t,i) => (
          <span key={i} style={{
            display:'inline-flex',alignItems:'center',gap:6,
            padding:'4px 10px',borderRadius:9999,
            background:'rgba(0,212,170,0.08)',border:'1px solid rgba(0,212,170,0.3)',
            color:'#00d4aa',fontSize:12,fontWeight:500
          }}>
            {t}
            <span onClick={()=>remove(i)} style={{cursor:'pointer',opacity:0.6}}>✕</span>
          </span>
        ))}
      </div>
      <input className="field-input" value={input} onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}
        placeholder={placeholder}/>
    </div>
  );
}
