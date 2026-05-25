"use client";
import { OceanRadar } from '@/components/charts/OceanRadar';

export default function ProfilePage() {
  const scores = { openness:82, conscientiousness:75, extraversion:68, agreeableness:71, neuroticism:35 };

  return (
    <div style={{padding:0}}>
      {/* Banner */}
      <div style={{
        height:200, position:'relative',
        background:'linear-gradient(135deg, rgba(0,212,170,0.3), rgba(199,125,255,0.3), rgba(255,107,157,0.3))',
        borderBottom:'1px solid #374151'
      }}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, transparent 0%, #0a0e17 100%)',pointerEvents:'none'}}/>
      </div>

      {/* Profile content */}
      <div style={{padding:'0 48px 48px',position:'relative'}}>
        {/* Avatar (overlapping banner) */}
        <div style={{
          width:128,height:128,borderRadius:'50%',
          background:'linear-gradient(135deg, #00d4aa, #2ec4b6)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:40,color:'#0a0e17',
          border:'4px solid #0a0e17',
          boxShadow:'0 0 32px rgba(0,212,170,0.4)',
          marginTop:-64, marginBottom:20,position:'relative',zIndex:1
        }}>YOU</div>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:32,flexWrap:'wrap',gap:16}}>
          <div>
            <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:4}}>Anatoly Don</h1>
            <p style={{fontSize:15,color:'#9ca3af',marginBottom:12}}>CEO · AI / ML · Berlin</p>
            <div style={{display:'flex',gap:8}}>
              <span className="badge badge-teal">MVP Stage</span>
              <span className="badge badge-purple">Active</span>
            </div>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button className="btn-ghost">Редактировать</button>
            <button className="btn-primary">Поделиться профилем</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:32}}>
          {/* Left column */}
          <div>
            <section style={{marginBottom:32}}>
              <div className="font-display" style={{fontWeight:700,fontSize:18,marginBottom:12}}>О себе</div>
              <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.7}}>
                Серийный фаундер. Строю AI-продукты для B2B. Ex-Anthropic. Сейчас работаю над Syndi AI — платформой, которая использует мультиагентный AI для подбора идеальных команд через психометрию и поведенческий анализ.
              </p>
            </section>

            <section style={{marginBottom:32}}>
              <div className="font-display" style={{fontWeight:700,fontSize:18,marginBottom:12}}>Навыки</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {['Python','TypeScript','React','Next.js','LLM Ops','Strategy','Product','Fundraising'].map(s=>(
                  <span key={s} style={{
                    padding:'6px 14px',borderRadius:9999,
                    background:'rgba(255,255,255,0.04)',border:'1px solid #374151',
                    fontSize:13,color:'#9ca3af'
                  }}>{s}</span>
                ))}
              </div>
            </section>

            <section>
              <div className="font-display" style={{fontWeight:700,fontSize:18,marginBottom:12}}>Ищу</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {['CTO','Designer','BD'].map(s=>(
                  <span key={s} className="badge badge-pink">{s}</span>
                ))}
              </div>
            </section>
          </div>

          {/* Right column — OCEAN */}
          <div className="card" style={{padding:24,height:'fit-content',position:'sticky',top:32}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#c77dff',boxShadow:'0 0 8px #c77dff'}}/>
              <span style={{fontSize:11,fontWeight:600,color:'#c77dff',letterSpacing:'0.1em',textTransform:'uppercase'}}>OCEAN Profile</span>
            </div>

            <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
              <OceanRadar scores={scores} size={240} color="#c77dff" />
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[
                ['Openness',scores.openness],
                ['Conscientiousness',scores.conscientiousness],
                ['Extraversion',scores.extraversion],
                ['Agreeableness',scores.agreeableness],
                ['Neuroticism',scores.neuroticism],
              ].map(([t,v]:any)=>(
                <div key={t}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:12,color:'#9ca3af'}}>{t}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'#f9fafb'}}>{v}</span>
                  </div>
                  <div style={{height:4,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
                    <div style={{width:`${v}%`,height:'100%',background:'linear-gradient(90deg,#00d4aa,#c77dff)'}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
