import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Stars } from '@/components/brand/Stars';
import { FeatureCard } from '@/components/marketing/FeatureCard';

export default function HomePage() {
  return (
    <div style={{minHeight:'100vh',position:'relative'}}>
      <Stars count={20} />

      {/* NAV */}
      <nav style={{
        position:'sticky', top:0, zIndex:50,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 48px',
        background:'rgba(10,14,23,0.85)',
        backdropFilter:'blur(16px)',
        borderBottom:'1px solid #374151'
      }}>
        <Logo />
        <div style={{display:'flex',gap:32}}>
          {['Главная','Как работает','Цены','Сообщество'].map((l,i) => (
            <span key={l} style={{
              fontSize:14, fontWeight:500,
              color: i===0 ? '#00d4aa' : '#9ca3af',
              cursor:'pointer', position:'relative'
            }}>{l}</span>
          ))}
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <Link href="/login" className="btn-ghost" style={{padding:'8px 18px',fontSize:14}}>Войти</Link>
          <Link href="/register" className="btn-primary" style={{padding:'10px 22px',fontSize:14}}>Начать</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        position:'relative', zIndex:1,
        padding:'80px 48px 120px',
        display:'flex', alignItems:'center',
        minHeight:'calc(100vh - 65px)',
        gap:64
      }}>
        <div style={{flex:1, maxWidth:600}}>
          <div className="animate-fade-up delay-1" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'6px 14px', borderRadius:9999,
            background:'rgba(0,212,170,0.08)',
            border:'1px solid rgba(0,212,170,0.25)',
            marginBottom:28
          }}>
            <span style={{
              width:6, height:6, borderRadius:'50%',
              background:'#00d4aa', boxShadow:'0 0 8px #00d4aa',
              animation:'twinkle 2s ease-in-out infinite'
            }}/>
            <span style={{fontSize:12,fontWeight:500,color:'#00d4aa',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              AI-Native · OCEAN Psychometrics
            </span>
          </div>

          <h1 className="animate-fade-up delay-2 font-display" style={{
            fontWeight:700, fontSize:56, lineHeight:1.05,
            letterSpacing:'-0.02em', marginBottom:24
          }}>
            Найди сооснователя,<br/>
            <span className="gradient-text-full">который дополняет тебя</span>
          </h1>

          <p className="animate-fade-up delay-3" style={{
            fontSize:18, fontWeight:400, lineHeight:1.6,
            color:'#9ca3af', maxWidth:500, marginBottom:36
          }}>
            AI-платформа для подбора идеальных стартап-команд. Психометрическая совместимость по модели OCEAN, живые цифровые аватары, мгновенные знакомства.
          </p>

          <div className="animate-fade-up delay-4" style={{display:'flex',gap:16,alignItems:'center',marginBottom:56}}>
            <Link href="/register" className="btn-primary btn-primary-lg">
              Начать подбор
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <button className="btn-ghost" style={{padding:'16px 28px',fontSize:16}}>Узнать больше</button>
          </div>

          <div className="animate-fade-up delay-5" style={{display:'flex',gap:40}}>
            {[['2,847','Фаундеров'],['247','Команды собраны'],['94%','Точность match']].map(([n,l])=>(
              <div key={l}>
                <div className="font-display gradient-text" style={{fontWeight:700,fontSize:28}}>{n}</div>
                <div style={{fontSize:12,fontWeight:500,color:'#6b7280',letterSpacing:'0.06em',textTransform:'uppercase',marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — floating avatars */}
        <div className="animate-fade-in delay-3" style={{flex:1,position:'relative',minHeight:500}}>
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
            <line x1="50%" y1="35%" x2="78%" y2="20%" stroke="rgba(0,212,170,0.4)" strokeWidth="1" strokeDasharray="4 4" fill="none"/>
            <line x1="50%" y1="35%" x2="22%" y2="55%" stroke="rgba(199,125,255,0.4)" strokeWidth="1" strokeDasharray="4 4" fill="none"/>
            <line x1="50%" y1="35%" x2="65%" y2="75%" stroke="rgba(255,107,157,0.4)" strokeWidth="1" strokeDasharray="4 4" fill="none"/>
            <line x1="22%" y1="55%" x2="78%" y2="20%" stroke="rgba(0,212,170,0.3)" strokeWidth="1" strokeDasharray="2 6" fill="none"/>
          </svg>

          {/* You orb */}
          <div style={{
            position:'absolute', top:'30%', left:'42%',
            width:120, height:120, borderRadius:'50%',
            background:'linear-gradient(135deg, #00d4aa, #2ec4b6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'"Space Grotesk",sans-serif',
            fontWeight:700, fontSize:24, color:'#0a0e17',
            border:'2px solid #00d4aa',
            boxShadow:'0 0 40px rgba(0,212,170,0.5)',
            animation:'float 6s ease-in-out infinite'
          }}>YOU</div>

          {/* Other orbs */}
          {[
            {top:'14%',right:'18%',sz:80,fs:22,c1:'#c77dff',c2:'#9333ea',ring:'#c77dff',glow:'rgba(199,125,255,0.4)',label:'AC',anim:'float-r 5s ease-in-out 0.5s infinite'},
            {top:'52%',left:'14%',sz:80,fs:22,c1:'#ff6b9d',c2:'#ec4899',ring:'#ff6b9d',glow:'rgba(255,107,157,0.4)',label:'MK',anim:'float 7s ease-in-out 1s infinite'},
            {top:'72%',left:'58%',sz:56,fs:14,c1:'#ff9f1c',c2:'#f59e0b',ring:'#ff9f1c',glow:'rgba(255,159,28,0.4)',label:'SK',anim:'float-r 4s ease-in-out 1.5s infinite'},
            {top:'8%',left:'18%',sz:56,fs:14,c1:'#00d4aa',c2:'#2ec4b6',ring:'#00d4aa',glow:'rgba(0,212,170,0.3)',label:'JL',anim:'float 5s ease-in-out 2s infinite'},
            {top:'80%',right:'8%',sz:56,fs:14,c1:'#c77dff',c2:'#9333ea',ring:'#c77dff',glow:'rgba(199,125,255,0.3)',label:'RP',anim:'float-r 6s ease-in-out 0.8s infinite'},
          ].map((o,i)=>(
            <div key={i} style={{
              position:'absolute', ...o,
              width:o.sz, height:o.sz, borderRadius:'50%',
              background:`linear-gradient(135deg, ${o.c1}, ${o.c2})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'"Space Grotesk",sans-serif',
              fontWeight:700, fontSize:o.fs, color:'#0a0e17',
              border:`2px solid ${o.ring}`,
              boxShadow:`0 0 40px ${o.glow}`,
              animation:o.anim
            } as any}>{o.label}</div>
          ))}

          {/* Matching indicator */}
          <div style={{
            position:'absolute', top:0, right:0,
            background:'#1f2937', border:'1px solid #00d4aa',
            borderRadius:8, padding:'10px 14px',
            display:'flex', alignItems:'center', gap:8,
            boxShadow:'0 0 24px rgba(0,212,170,0.2)'
          }}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#00d4aa',boxShadow:'0 0 8px #00d4aa',animation:'twinkle 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:11,fontWeight:600,color:'#00d4aa',letterSpacing:'0.06em'}}>MATCHING ACTIVE</span>
          </div>

          {/* Score box */}
          <div style={{
            position:'absolute', bottom:'8%', right:'4%',
            background:'#1f2937', border:'1px solid #374151',
            borderRadius:12, padding:14, width:180
          }}>
            <div style={{fontSize:10,color:'#6b7280',letterSpacing:'0.1em',marginBottom:8,textTransform:'uppercase'}}>Совместимость</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:8}}>
              <span className="font-display" style={{fontWeight:700,fontSize:28,color:'#00d4aa'}}>94</span>
              <span style={{fontSize:14,color:'#9ca3af'}}>%</span>
            </div>
            <div style={{height:3,background:'#374151',borderRadius:9999,overflow:'hidden'}}>
              <div style={{width:'94%',height:'100%',background:'linear-gradient(90deg,#00d4aa,#c77dff)'}}/>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{position:'relative',zIndex:1,padding:'80px 48px'}}>
        <div style={{fontSize:12,fontWeight:500,color:'#00d4aa',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:12}}>Возможности</div>
        <h2 className="font-display" style={{fontWeight:700,fontSize:40,lineHeight:1.1,letterSpacing:'-0.01em',marginBottom:48}}>
          Три инструмента,<br/><span className="gradient-text">одна цель</span>
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
          {[
            {accent:'#00d4aa',num:'01',title:'OCEAN Анализ',desc:'15 адаптивных вопросов раскрывают твой психометрический портрет по пяти осям личности.'},
            {accent:'#c77dff',num:'02',title:'Живой AI-аватар',desc:'Твой цифровой двойник представляет тебя в чатах и встречах — общается, фильтрует, отбирает.'},
            {accent:'#ff6b9d',num:'03',title:'Алгоритм дополнения',desc:'Не ищем похожих — ищем тех, кто закрывает твои слабые стороны и усиливает сильные.'},
          ].map((f,i)=>(
            <FeatureCard key={f.title} accent={f.accent} num={f.num} title={f.title} desc={f.desc} delay={0.1+i*0.15} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{position:'relative',zIndex:1,padding:'80px 48px'}}>
        <div style={{fontSize:12,fontWeight:500,color:'#00d4aa',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:12}}>Как это работает</div>
        <h2 className="font-display" style={{fontWeight:700,fontSize:40,lineHeight:1.1,letterSpacing:'-0.01em',marginBottom:56}}>
          От профиля<br/><span className="gradient-text">до команды за 4 шага</span>
        </h2>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',position:'relative',padding:'0 24px'}}>
          <div style={{position:'absolute',top:28,left:'8%',right:'8%',height:1,background:'linear-gradient(90deg, transparent, #00d4aa 30%, #c77dff 70%, transparent)',opacity:0.5,zIndex:1}}/>

          {[
            ['01','Создай профиль','15 вопросов OCEAN раскрывают характер'],
            ['02','AI-аватар','Цифровой двойник готов знакомиться'],
            ['03','Алгоритм матчинга','Найдёт тех, кто тебя дополняет'],
            ['04','Знакомство','Чат, видео, совместная работа'],
          ].map(([n,t,d],i)=>(
            <div key={n} style={{flex:1,textAlign:'center',position:'relative',padding:'0 16px',zIndex:2}}>
              <div style={{
                width:56,height:56,borderRadius:'50%',
                background: i<2 ? 'linear-gradient(135deg, #00d4aa, #2ec4b6)' : 'rgba(0,212,170,0.08)',
                border: i<2 ? 'none' : '1px solid rgba(0,212,170,0.4)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:20,
                color: i<2 ? '#0a0e17' : '#00d4aa',
                margin:'0 auto 16px',
                boxShadow: i<2 ? '0 0 24px rgba(0,212,170,0.4)' : 'none'
              }}>{n}</div>
              <div className="font-display" style={{fontWeight:700,fontSize:16,marginBottom:6}}>{t}</div>
              <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.5}}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-around',
        padding:'32px 48px',
        background:'rgba(31,41,55,0.4)',
        borderTop:'1px solid #374151',
        borderBottom:'1px solid #374151',
        margin:'32px 0 0',
        position:'relative',zIndex:1
      }}>
        <div style={{textAlign:'center'}}>
          <div className="font-display gradient-text" style={{fontWeight:700,fontSize:32}}>247</div>
          <div style={{fontSize:13,color:'#9ca3af',letterSpacing:'0.04em'}}>Команд собрано</div>
        </div>
        <div style={{fontSize:13,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.1em'}}>Featured in</div>
        {['Y Combinator','Techstars','500 Global'].map(p=>(
          <div key={p} className="font-display" style={{fontWeight:700,fontSize:18,color:'#6b7280'}}>{p}</div>
        ))}
      </div>

      {/* CTA */}
      <section style={{position:'relative',zIndex:1,padding:'80px 48px'}}>
        <div style={{
          background:'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(199,125,255,0.08)), #1f2937',
          border:'1px solid rgba(0,212,170,0.3)',
          borderRadius:16, padding:64, textAlign:'center',
          position:'relative', overflow:'hidden'
        }}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at center, rgba(0,212,170,0.1) 0%, transparent 70%)',pointerEvents:'none'}}/>
          <h2 className="font-display" style={{fontWeight:700,fontSize:40,lineHeight:1.1,marginBottom:16,position:'relative',zIndex:1}}>
            Твоя команда мечты<br/><span className="gradient-text-full">уже ждёт тебя</span>
          </h2>
          <p style={{fontSize:16,color:'#9ca3af',marginBottom:32,position:'relative',zIndex:1}}>
            Присоединяйся к 2,800+ фаундерам которые ищут именно тебя
          </p>
          <Link href="/register" className="btn-primary btn-primary-lg" style={{position:'relative',zIndex:1}}>
            Начать бесплатно
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding:'40px 48px',
        borderTop:'1px solid #374151',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        position:'relative',zIndex:1
      }}>
        <Logo size="sm" />
        <div style={{display:'flex',gap:28}}>
          {['Privacy','Terms','Документация','Контакты'].map(l=>(
            <span key={l} style={{fontSize:14,color:'#6b7280',cursor:'pointer'}}>{l}</span>
          ))}
        </div>
        <span style={{fontSize:13,color:'#6b7280'}}>© 2025 Syndi AI · v0.4</span>
      </footer>
    </div>
  );
}
