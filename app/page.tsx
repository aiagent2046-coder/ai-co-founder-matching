import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{fontFamily:'"DM Sans",sans-serif',background:'#08090B',color:'#F5EFE0',minHeight:'100vh',overflow:'hidden',position:'relative'}}>

      {/* Ambient glow */}
      <div style={{position:'fixed',top:'-20%',right:'-10%',width:'800px',height:'800px',borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,0.05) 0%,transparent 70%)',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'fixed',bottom:'-10%',left:'-5%',width:'600px',height:'600px',borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,0.03) 0%,transparent 70%)',pointerEvents:'none',zIndex:0}}/>

      {/* NAV */}
      <nav style={{position:'sticky',top:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'24px 48px',borderBottom:'0.5px solid rgba(201,168,76,0.12)',background:'rgba(8,9,11,0.85)',backdropFilter:'blur(24px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Cormorant Garamond",serif',fontWeight:600,fontSize:18,color:'#08090B'}}>S</div>
          <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:22,fontWeight:400,letterSpacing:'0.02em'}}>Syndi<span style={{color:'#C9A84C'}}>AI</span></span>
        </div>
        <div style={{display:'flex',gap:36}}>
          {['Платформа','Агенты','Кейсы','Цены'].map(l=>(
            <span key={l} style={{fontSize:12,fontWeight:400,color:'#5A5448',letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer'}}>{l}</span>
          ))}
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <Link href="/login" style={{padding:'8px 20px',border:'0.5px solid rgba(201,168,76,0.3)',color:'#C9A84C',fontSize:12,fontWeight:400,letterSpacing:'0.06em',textDecoration:'none',transition:'all 0.3s'}}>Войти</Link>
          <Link href="/register" style={{padding:'8px 24px',background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',color:'#08090B',fontSize:12,fontWeight:500,letterSpacing:'0.06em',textDecoration:'none'}}>Начать</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'100px 48px 120px',minHeight:'calc(100vh - 89px)',gap:48}}>
        <div style={{flex:1,maxWidth:580}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'6px 16px',border:'0.5px solid rgba(201,168,76,0.25)',background:'rgba(201,168,76,0.05)',marginBottom:36}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C',animation:'shimmer 2s ease-in-out infinite',display:'block'}}/>
            <span style={{fontSize:10,color:'#C9A84C',letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:400}}>AI-Powered · 2,400+ фаундеров</span>
          </div>

          <h1 style={{fontFamily:'"Cormorant Garamond",serif',fontSize:80,fontWeight:300,lineHeight:1.0,letterSpacing:'-0.02em',marginBottom:32}}>
            Найди<br/>
            <em style={{fontStyle:'italic',color:'#C9A84C'}}>ко-фаундера</em><br/>
            за 48 часов
          </h1>

          <p style={{fontSize:16,fontWeight:300,lineHeight:1.85,color:'#5A5448',maxWidth:440,marginBottom:52,letterSpacing:'0.01em'}}>
            Мультиагентный AI анализирует личность, цели и стек. Твой цифровой двойник начинает знакомства пока ты строишь продукт.
          </p>

          <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:64}}>
            <Link href="/register" style={{padding:'14px 40px',background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',color:'#08090B',fontSize:12,fontWeight:500,letterSpacing:'0.1em',textTransform:'uppercase',textDecoration:'none',display:'inline-block'}}>
              Создать профиль
            </Link>
            <span style={{fontSize:14,fontWeight:300,color:'#5A5448',cursor:'pointer',letterSpacing:'0.04em'}}>Смотреть демо →</span>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:0}}>
            {[['2,400+','Фаундеров'],['340+','Команд'],['$12M+','Привлечено']].map(([n,l],i)=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:0}}>
                {i>0 && <div style={{width:'0.5px',height:36,background:'rgba(201,168,76,0.15)',margin:'0 28px'}}/>}
                <div>
                  <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:36,fontWeight:400,color:'#F5EFE0',lineHeight:1}}>{n}</div>
                  <div style={{fontSize:10,fontWeight:400,color:'#3A3630',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:4}}>{l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card stack preview */}
        <div style={{flex:1,display:'flex',justifyContent:'center',alignItems:'center',position:'relative',minHeight:520}}>
          {/* Back cards */}
          {[{i:0.92,r:1,b:0.4,y:24},{i:0.96,r:-1,b:0.6,y:12}].map(({i,r,b,y},idx)=>(
            <div key={idx} style={{position:'absolute',top:0,left:'50%',transform:`translateX(-50%) translateY(${y}px) scale(${i}) rotate(${r}deg)`,width:300,height:440,background:'#0D0E12',border:'0.5px solid rgba(201,168,76,0.1)',filter:`brightness(${b})`}}/>
          ))}
          {/* Main card */}
          <div style={{position:'relative',width:300,height:440,background:'#0D0E12',border:'0.5px solid rgba(201,168,76,0.2)',display:'flex',flexDirection:'column',zIndex:3}}>
            <div style={{position:'absolute',top:16,right:16,border:'0.5px solid rgba(201,168,76,0.4)',background:'rgba(8,9,11,0.95)',padding:'8px 12px',textAlign:'center'}}>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:20,fontWeight:400,color:'#C9A84C',lineHeight:1}}>94%</div>
              <div style={{fontSize:8,color:'#3A3630',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:2}}>match</div>
            </div>
            <div style={{padding:'28px 24px',flex:1}}>
              <div style={{width:72,height:72,background:'rgba(201,168,76,0.08)',border:'0.5px solid rgba(201,168,76,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Cormorant Garamond",serif',fontSize:26,fontWeight:300,color:'#C9A84C',marginBottom:6}}>AC</div>
              <div style={{fontSize:9,color:'#C9A84C',letterSpacing:'0.1em',border:'0.5px solid rgba(201,168,76,0.25)',background:'rgba(201,168,76,0.05)',padding:'2px 8px',display:'inline-block',marginBottom:16}}>AI AVATAR</div>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:22,fontWeight:400,color:'#F5EFE0',marginBottom:4}}>Alex Chen</div>
              <div style={{fontSize:11,fontWeight:300,color:'#5A5448',letterSpacing:'0.04em',marginBottom:16}}>CTO · AI/ML · San Francisco</div>
              <div style={{display:'inline-block',padding:'4px 12px',border:'0.5px solid rgba(201,168,76,0.25)',fontSize:10,color:'#C9A84C',letterSpacing:'0.06em',marginBottom:16}}>AI / ML</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['Python','ML','System Design','Go'].map(s=>(
                  <span key={s} style={{padding:'3px 8px',border:'0.5px solid rgba(255,255,255,0.06)',fontSize:9,color:'#3A3630',letterSpacing:'0.04em'}}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{height:'0.5px',background:'rgba(201,168,76,0.1)',margin:'0 24px'}}/>
            <div style={{padding:'16px 24px',display:'flex',gap:12,justifyContent:'center'}}>
              <div style={{width:48,height:48,border:'0.5px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'#3A3630',cursor:'pointer'}}>✕</div>
              <div style={{width:48,height:48,border:'0.5px solid rgba(201,168,76,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'#C9A84C',cursor:'pointer'}}>♥</div>
            </div>
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div style={{height:'0.5px',background:'rgba(201,168,76,0.1)',margin:'0 48px'}}/>

      {/* FEATURES */}
      <section style={{position:'relative',zIndex:1,padding:'80px 48px'}}>
        <div style={{fontSize:10,color:'#C9A84C',letterSpacing:'0.16em',textTransform:'uppercase',marginBottom:16}}>Технология</div>
        <h2 style={{fontFamily:'"Cormorant Garamond",serif',fontSize:56,fontWeight:300,lineHeight:1.1,marginBottom:56}}>
          Пять агентов,<br/><em style={{fontStyle:'italic',color:'#C9A84C'}}>одна цель</em>
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          {[
            ['01','Мультиагентный AI','5 агентов анализируют совместимость по 40+ параметрам в реальном времени.'],
            ['02','Big Five профиль','Научный тест личности строит портрет и предсказывает качество партнёрства.'],
            ['03','AI-аватар','Цифровой двойник общается и фильтрует кандидатов пока ты строишь продукт.'],
            ['04','Видео-встречи','Встроенные сессии с AI-транскрипцией и резюме после каждой встречи.'],
          ].map(([n,t,d],i)=>(
            <div key={n} style={{padding:'32px',border:'0.5px solid rgba(201,168,76,0.08)',borderRight:i<3?'none':'0.5px solid rgba(201,168,76,0.08)',borderBottom:'none',borderTop:'0.5px solid rgba(201,168,76,0.08)'}}>
              <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:52,fontWeight:300,color:'rgba(201,168,76,0.12)',display:'block',marginBottom:16,lineHeight:1}}>{n}</span>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:400,color:'#F5EFE0',marginBottom:10}}>{t}</div>
              <p style={{fontSize:13,fontWeight:300,lineHeight:1.75,color:'#5A5448'}}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'80px 48px',position:'relative',zIndex:1}}>
        <div style={{border:'0.5px solid rgba(201,168,76,0.15)',background:'#0D0E12',padding:'80px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:48,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',width:600,height:200,background:'radial-gradient(ellipse,rgba(201,168,76,0.04) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <h2 style={{fontFamily:'"Cormorant Garamond",serif',fontSize:52,fontWeight:300,lineHeight:1.1,marginBottom:16}}>
              Твоя команда мечты<br/><em style={{fontStyle:'italic',color:'#C9A84C'}}>уже здесь</em>
            </h2>
            <p style={{fontSize:14,fontWeight:300,color:'#5A5448'}}>Присоединяйся к 2,400+ фаундерам которые ищут именно тебя</p>
          </div>
          <Link href="/register" style={{position:'relative',zIndex:1,padding:'16px 48px',background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',color:'#08090B',fontSize:12,fontWeight:500,letterSpacing:'0.1em',textTransform:'uppercase',textDecoration:'none',flexShrink:0}}>
            Начать бесплатно →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{padding:'28px 48px',borderTop:'0.5px solid rgba(201,168,76,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Cormorant Garamond",serif',fontWeight:600,fontSize:14,color:'#08090B'}}>S</div>
          <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:400}}>Syndi<span style={{color:'#C9A84C'}}>AI</span></span>
        </div>
        <div style={{display:'flex',gap:24}}>
          {['Privacy','Terms','Contact','GitHub'].map(l=>(
            <span key={l} style={{fontSize:11,color:'#3A3630',letterSpacing:'0.06em',cursor:'pointer'}}>{l}</span>
          ))}
        </div>
        <span style={{fontSize:11,color:'#3A3630',fontWeight:300}}>© 2025 SyndiAI · Built with Claude</span>
      </footer>

      <style>{`
        @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:1}}
        a:hover{opacity:0.85}
      `}</style>
    </div>
  );
}
