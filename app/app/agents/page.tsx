"use client";
import { useState, useEffect } from 'react';

const AGENTS = [
  { name:'MatchAgent',       desc:'Вычисляет совместимость по OCEAN + скиллам',  color:'#00d4aa', activity:'Scoring founder pair #847...' },
  { name:'PersonalityAgent', desc:'Анализирует Big Five профили',                color:'#c77dff', activity:'Computing trait similarity...' },
  { name:'ChatAgent',        desc:'Помогает в общении и suggesting replies',     color:'#ff6b9d', activity:'Generating reply for m2...' },
  { name:'AvatarAgent',      desc:'Генерирует AI-аватары через Claude + Flux',   color:'#ff9f1c', activity:'Rendering portrait...' },
  { name:'InsightAgent',     desc:'Стратегические инсайты о партнёрстве',        color:'#00d4aa', activity:'Analyzing skill complementarity...' },
];

const LOGS = [
  '[Match] Computing compatibility matrix for cohort 4',
  '[Personality] Big Five inference complete: ⏱ 1.2s',
  '[Chat] Suggested reply queued for m1',
  '[Avatar] Prompt ready, sending to Flux Schnell',
  '[Insight] Skill gap analysis: 3 dimensions',
  '[Match] Score: 94% (high openness alignment)',
  '[Chat] AI: detected positive sentiment',
  '[Personality] Profile #2841 indexed in semantic store',
];

export default function AgentsPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const iv = setInterval(() => setActiveIdx(i => (i+1) % AGENTS.length), 1800);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setLogs(prev => [LOGS[Math.floor(Math.random()*LOGS.length)], ...prev].slice(0, 12));
    }, 1400);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{padding:'32px 48px'}}>
      <div style={{marginBottom:32}}>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:4}}>
          AI <span className="gradient-text">Агенты</span>
        </h1>
        <p style={{fontSize:14,color:'#9ca3af'}}>5 агентов работают на тебя 24/7</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:24}}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {AGENTS.map((a, i) => {
            const active = i === activeIdx;
            const rgb = a.color === '#00d4aa' ? '0,212,170' : a.color === '#c77dff' ? '199,125,255' : a.color === '#ff6b9d' ? '255,107,157' : '255,159,28';
            return (
              <div key={a.name} className="card" style={{
                padding:20,
                borderColor: active ? a.color : '#374151',
                boxShadow: active ? `0 0 24px rgba(${rgb},0.12)` : '',
                transition:'all 0.4s',
                display:'flex',alignItems:'center',gap:16
              }}>
                <div style={{
                  width:48,height:48,borderRadius:12,
                  background:`rgba(${rgb},0.1)`,
                  border:`1px solid rgba(${rgb},0.3)`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  flexShrink:0
                }}>
                  <div style={{
                    width:10,height:10,borderRadius:'50%',
                    background:a.color,
                    boxShadow: active ? `0 0 12px ${a.color}` : '',
                    animation: active ? 'twinkle 1.2s infinite' : 'none'
                  }}/>
                </div>
                <div style={{flex:1}}>
                  <div className="font-display" style={{fontWeight:700,fontSize:16,marginBottom:2,color: active ? a.color : '#f9fafb'}}>{a.name}</div>
                  <div style={{fontSize:13,color:'#9ca3af'}}>{a.desc}</div>
                </div>
                {active && (
                  <div style={{fontSize:11,color:a.color,fontFamily:'"Space Grotesk",monospace',animation:'fade-in 0.4s'}}>
                    {a.activity}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live log */}
        <div className="card" style={{padding:20,height:'fit-content',position:'sticky',top:32}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#00d4aa',boxShadow:'0 0 8px #00d4aa',animation:'twinkle 1.5s infinite'}}/>
            <span style={{fontSize:11,fontWeight:600,color:'#00d4aa',letterSpacing:'0.1em',textTransform:'uppercase'}}>Live Log</span>
          </div>
          <div style={{fontFamily:'"Space Grotesk",monospace',fontSize:11,display:'flex',flexDirection:'column',gap:8,maxHeight:400,overflow:'auto'}}>
            {logs.map((l, i) => (
              <div key={i} style={{
                color: i===0 ? '#00d4aa' : i<3 ? '#9ca3af' : '#6b7280',
                opacity: i===0 ? 1 : 1 - i*0.06,
                animation: i===0 ? 'fade-in 0.4s' : 'none'
              }}>{l}</div>
            ))}
            {logs.length === 0 && (
              <div style={{color:'#6b7280'}}>Initializing agents...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
