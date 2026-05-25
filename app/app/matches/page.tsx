"use client";
import Link from 'next/link';
import { OceanRadar } from '@/components/charts/OceanRadar';

const MATCHES = [
  { id:'m1', name:'Alex Chen',  role:'CTO · AI/ML',   match:94, last:'Привет! Видел твой стек, интересно...', time:'2м',  unread:2, color:'#00d4aa', avatar:'AC', ocean:{openness:88,conscientiousness:72,extraversion:55,agreeableness:68,neuroticism:32} },
  { id:'m2', name:'Mira Khan',  role:'CEO · FinTech', match:87, last:'Готова созвониться завтра в 15:00',     time:'1ч',  unread:0, color:'#c77dff', avatar:'MK', ocean:{openness:75,conscientiousness:90,extraversion:82,agreeableness:71,neuroticism:28} },
  { id:'m3', name:'Sam Karpov', role:'CPO · SaaS',    match:81, last:'Спасибо за фидбек по дизайну',          time:'3ч',  unread:0, color:'#ff6b9d', avatar:'SK', ocean:{openness:92,conscientiousness:78,extraversion:64,agreeableness:75,neuroticism:38} },
  { id:'m4', name:'Jenna Lee',  role:'Designer',      match:76, last:'AI: предложение по совместному проекту', time:'1д',  unread:1, color:'#ff9f1c', avatar:'JL', ocean:{openness:95,conscientiousness:65,extraversion:88,agreeableness:82,neuroticism:42} },
];

export default function MatchesPage() {
  return (
    <div style={{padding:'32px 48px'}}>
      <div style={{marginBottom:32}}>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:4}}>
          Твои <span className="gradient-text">матчи</span>
        </h1>
        <p style={{fontSize:14,color:'#9ca3af'}}>{MATCHES.length} взаимных лайков</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:20}}>
        {MATCHES.map((m, i) => {
          const rgb = m.color === '#00d4aa' ? '0,212,170' : m.color === '#c77dff' ? '199,125,255' : m.color === '#ff6b9d' ? '255,107,157' : '255,159,28';
          return (
            <Link key={m.id} href={`/app/chat/${m.id}`} className="card animate-fade-up" style={{
              animationDelay:`${i*0.05}s`,padding:20,textDecoration:'none',color:'inherit',
              display:'flex',alignItems:'center',gap:16,
              position:'relative'
            }}
              onMouseEnter={(e)=>{(e.currentTarget as HTMLElement).style.borderColor=m.color;(e.currentTarget as HTMLElement).style.boxShadow=`0 4px 24px rgba(${rgb},0.12)`}}
              onMouseLeave={(e)=>{(e.currentTarget as HTMLElement).style.borderColor='#374151';(e.currentTarget as HTMLElement).style.boxShadow=''}}
            >
              <div style={{position:'relative',flexShrink:0}}>
                <div style={{
                  width:64,height:64,borderRadius:'50%',
                  background:`linear-gradient(135deg, ${m.color}, ${m.color}cc)`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:22,color:'#0a0e17',
                  border:`2px solid ${m.color}`,
                  boxShadow:`0 0 16px rgba(${rgb},0.3)`
                }}>{m.avatar}</div>
                {m.unread > 0 && (
                  <div style={{
                    position:'absolute',top:-4,right:-4,
                    minWidth:20,height:20,borderRadius:9999,padding:'0 6px',
                    background:'#ff6b9d',color:'#fff',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:11,fontWeight:600,border:'2px solid #1f2937'
                  }}>{m.unread}</div>
                )}
              </div>

              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <span className="font-display" style={{fontWeight:700,fontSize:16}}>{m.name}</span>
                  <span style={{fontSize:11,color:'#6b7280'}}>{m.time}</span>
                </div>
                <div style={{fontSize:12,color:'#9ca3af',marginBottom:6}}>{m.role}</div>
                <div style={{fontSize:13,color:'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.last}</div>
              </div>

              <div style={{flexShrink:0,textAlign:'center'}}>
                <div className="font-display gradient-text" style={{fontWeight:700,fontSize:20,lineHeight:1}}>{m.match}%</div>
                <div style={{fontSize:9,color:'#6b7280',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:2}}>match</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
