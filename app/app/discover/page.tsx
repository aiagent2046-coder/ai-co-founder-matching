"use client";
import { useState } from 'react';
import { OceanRadar } from '@/components/charts/OceanRadar';

const MOCK = [
  { id:'f1', name:'Alex Chen',    role:'CTO',      stage:'MVP',    domain:'AI / ML',   location:'San Francisco', match:94, bio:'Ex-Google ML eng. Building autonomous agents.',         skills:['Python','PyTorch','System Design','Go'],     ocean:{openness:88,conscientiousness:72,extraversion:55,agreeableness:68,neuroticism:32}, avatar:'AC', color:'#00d4aa' },
  { id:'f2', name:'Mira Khan',    role:'CEO',      stage:'Seed',   domain:'FinTech',   location:'London',         match:87, bio:'Ex-Stripe. Solving cross-border payments for SMBs.',      skills:['Strategy','Sales','Fundraising'],            ocean:{openness:75,conscientiousness:90,extraversion:82,agreeableness:71,neuroticism:28}, avatar:'MK', color:'#c77dff' },
  { id:'f3', name:'Sam Karpov',   role:'CPO',      stage:'Idea',   domain:'SaaS',      location:'Berlin',         match:81, bio:'Former Notion PM. Obsessed with productivity tools.',    skills:['Product','UX','Analytics'],                  ocean:{openness:92,conscientiousness:78,extraversion:64,agreeableness:75,neuroticism:38}, avatar:'SK', color:'#ff6b9d' },
  { id:'f4', name:'Jenna Lee',    role:'Designer', stage:'MVP',    domain:'Consumer',  location:'New York',       match:76, bio:'Award-winning brand designer. Built 5 D2C brands.',      skills:['Brand','UI','Motion'],                       ocean:{openness:95,conscientiousness:65,extraversion:88,agreeableness:82,neuroticism:42}, avatar:'JL', color:'#ff9f1c' },
  { id:'f5', name:'Ravi Patel',   role:'BD',       stage:'Growth', domain:'B2B',       location:'Singapore',      match:72, bio:'Built 4 sales orgs from 0 to $10M ARR.',                 skills:['Sales','Partnerships','GTM'],                ocean:{openness:70,conscientiousness:85,extraversion:91,agreeableness:79,neuroticism:25}, avatar:'RP', color:'#00d4aa' },
  { id:'f6', name:'Priya Nair',   role:'CEO',      stage:'Seed',   domain:'EdTech',    location:'Bangalore',      match:69, bio:'Ex-Khan Academy. AI-tutors that actually teach.',         skills:['Strategy','Education','AI'],                 ocean:{openness:84,conscientiousness:88,extraversion:73,agreeableness:86,neuroticism:31}, avatar:'PR', color:'#c77dff' },
];

type Mode = 'grid' | 'swipe';

export default function DiscoverPage() {
  const [mode, setMode] = useState<Mode>('grid');
  const [idx, setIdx]   = useState(0);

  const swipe = (action: 'like' | 'pass') => {
    setIdx(i => i + 1);
  };

  const currentSwipe = MOCK[idx];

  return (
    <div style={{padding:'32px 48px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}>
        <div>
          <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:4}}>
            Найди <span className="gradient-text">своего</span>
          </h1>
          <p style={{fontSize:14,color:'#9ca3af'}}>{MOCK.length} фаундеров ждут тебя</p>
        </div>

        {/* Mode toggle */}
        <div style={{display:'flex',background:'#1f2937',border:'1px solid #374151',borderRadius:8,padding:4,gap:4}}>
          {(['grid','swipe'] as Mode[]).map(m => (
            <button key={m} onClick={()=>setMode(m)} style={{
              padding:'8px 16px',borderRadius:6,
              background: mode===m ? 'linear-gradient(135deg,#00d4aa,#2ec4b6)' : 'transparent',
              color: mode===m ? '#0a0e17' : '#9ca3af',
              border:'none',cursor:'pointer',
              fontSize:13,fontWeight:600,
              fontFamily:'"Inter",sans-serif',
              transition:'all 0.2s',
              display:'flex',alignItems:'center',gap:6
            }}>
              {m === 'grid' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>
              )}
              {m === 'grid' ? 'Сетка' : 'Свайп'}
            </button>
          ))}
        </div>
      </div>

      {/* GRID MODE */}
      {mode === 'grid' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20}}>
          {MOCK.map((f, i) => (
            <FounderCard key={f.id} founder={f} delay={i*0.05} />
          ))}
        </div>
      )}

      {/* SWIPE MODE */}
      {mode === 'swipe' && (
        <div style={{display:'flex',justifyContent:'center',alignItems:'flex-start',padding:'40px 0'}}>
          {currentSwipe ? (
            <div style={{width:380}}>
              <FounderCard founder={currentSwipe} expanded />
              <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:24}}>
                <button onClick={()=>swipe('pass')} style={{
                  width:64,height:64,borderRadius:'50%',
                  background:'rgba(31,41,55,0.8)',
                  border:'1px solid #374151',
                  color:'#9ca3af',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'all 0.2s'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
                <button onClick={()=>swipe('like')} style={{
                  width:64,height:64,borderRadius:'50%',
                  background:'linear-gradient(135deg,#ff6b9d,#ec4899)',
                  border:'none',
                  color:'#fff',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:'0 0 24px rgba(255,107,157,0.4)',
                  transition:'all 0.2s'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
                </button>
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'80px 0'}}>
              <div style={{
                width:96,height:96,borderRadius:'50%',
                background:'rgba(0,212,170,0.08)',
                border:'1px solid rgba(0,212,170,0.3)',
                margin:'0 auto 24px',
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
              </div>
              <h3 className="font-display" style={{fontWeight:700,fontSize:24,marginBottom:8}}>Все просмотрены!</h3>
              <p style={{color:'#9ca3af',fontSize:14,marginBottom:24}}>Новые фаундеры появятся завтра</p>
              <button onClick={()=>setIdx(0)} className="btn-ghost">Сбросить (dev)</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FounderCard({ founder, delay=0, expanded=false }: any) {
  const f = founder;
  const matchColor = f.match >= 90 ? '#00d4aa' : f.match >= 70 ? '#ff9f1c' : '#9ca3af';
  const rgb = f.color === '#00d4aa' ? '0,212,170' : f.color === '#c77dff' ? '199,125,255' : f.color === '#ff6b9d' ? '255,107,157' : '255,159,28';

  return (
    <div className="card animate-fade-up" style={{
      animationDelay:`${delay}s`,
      padding:0,overflow:'hidden',
      position:'relative'
    }}
      onMouseEnter={(e)=>{(e.currentTarget as HTMLElement).style.borderColor=f.color;(e.currentTarget as HTMLElement).style.boxShadow=`0 4px 32px rgba(${rgb},0.12)`;(e.currentTarget as HTMLElement).style.transform='translateY(-4px)'}}
      onMouseLeave={(e)=>{(e.currentTarget as HTMLElement).style.borderColor='#374151';(e.currentTarget as HTMLElement).style.boxShadow='';(e.currentTarget as HTMLElement).style.transform=''}}
    >
      {/* Top: avatar + match */}
      <div style={{padding:'24px 24px 16px',position:'relative'}}>
        <div style={{
          position:'absolute',top:24,right:24,
          background:'#0a0e17',border:`1px solid ${matchColor}`,
          borderRadius:9999,padding:'6px 12px',
          display:'flex',alignItems:'center',gap:6
        }}>
          <span style={{width:6,height:6,borderRadius:'50%',background:matchColor,boxShadow:`0 0 8px ${matchColor}`,animation:'twinkle 2s infinite'}}/>
          <span className="font-display" style={{fontWeight:700,fontSize:14,color:matchColor}}>{f.match}%</span>
        </div>

        <div style={{
          width:80,height:80,borderRadius:'50%',
          background:`linear-gradient(135deg, ${f.color}, ${f.color}cc)`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'"Space Grotesk",sans-serif',
          fontWeight:700,fontSize:24,color:'#0a0e17',
          border:`2px solid ${f.color}`,
          boxShadow:`0 0 24px rgba(${rgb},0.4)`,
          marginBottom:16
        }}>{f.avatar}</div>

        <div className="font-display" style={{fontWeight:700,fontSize:20,marginBottom:4}}>{f.name}</div>
        <div style={{fontSize:13,color:'#9ca3af',marginBottom:12}}>
          {f.role} · {f.domain} · <span style={{color:'#6b7280'}}>{f.location}</span>
        </div>

        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          <span className="badge badge-teal">{f.stage}</span>
          <span className="badge badge-purple">{f.domain}</span>
        </div>

        {expanded && (
          <p style={{fontSize:13,color:'#9ca3af',lineHeight:1.6,marginBottom:16}}>{f.bio}</p>
        )}

        {/* Skills */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          {f.skills.slice(0, expanded ? 99 : 3).map((s:string)=>(
            <span key={s} style={{
              fontSize:11,padding:'3px 10px',borderRadius:9999,
              background:'rgba(255,255,255,0.04)',border:'1px solid #374151',color:'#9ca3af'
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{height:1,background:'#374151',margin:'0 24px'}}/>

      {/* OCEAN radar */}
      <div style={{padding:'20px 24px 24px',display:'flex',alignItems:'center',gap:20}}>
        <OceanRadar scores={f.ocean} size={120} color={f.color} />
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:'#6b7280',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>OCEAN profile</div>
          {[
            ['O', f.ocean.openness],
            ['C', f.ocean.conscientiousness],
            ['E', f.ocean.extraversion],
            ['A', f.ocean.agreeableness],
            ['N', f.ocean.neuroticism],
          ].map(([k,v]:any)=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:600,color:'#6b7280',width:10}}>{k}</span>
              <div style={{flex:1,height:3,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
                <div style={{width:`${v}%`,height:'100%',background:`linear-gradient(90deg, ${f.color}, ${f.color}aa)`}}/>
              </div>
              <span style={{fontSize:10,color:'#9ca3af',width:24,textAlign:'right'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
