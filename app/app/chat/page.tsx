"use client";
import Link from 'next/link';

const CONVERSATIONS = [
  { id:'m1', name:'Alex Chen',  role:'CTO · AI/ML',   last:'Привет! Видел твой стек...',                time:'2м',  unread:2, color:'#00d4aa', avatar:'AC' },
  { id:'m2', name:'Mira Khan',  role:'CEO · FinTech', last:'Готова созвониться завтра в 15:00',         time:'1ч',  unread:0, color:'#c77dff', avatar:'MK' },
  { id:'m3', name:'Sam Karpov', role:'CPO · SaaS',    last:'Спасибо за фидбек по дизайну',              time:'3ч',  unread:0, color:'#ff6b9d', avatar:'SK' },
];

export default function ChatListPage() {
  return (
    <div style={{padding:'32px 48px'}}>
      <div style={{marginBottom:32}}>
        <h1 className="font-display" style={{fontWeight:700,fontSize:32,letterSpacing:'-0.01em',marginBottom:4}}>
          <span className="gradient-text">Сообщения</span>
        </h1>
        <p style={{fontSize:14,color:'#9ca3af'}}>{CONVERSATIONS.length} активных диалогов</p>
      </div>

      <div style={{maxWidth:720,display:'flex',flexDirection:'column',gap:8}}>
        {CONVERSATIONS.map((c, i) => (
          <Link key={c.id} href={`/app/chat/${c.id}`} className="card animate-fade-up" style={{
            animationDelay:`${i*0.05}s`,
            padding:16,textDecoration:'none',color:'inherit',
            display:'flex',alignItems:'center',gap:16
          }}>
            <div style={{
              width:48,height:48,borderRadius:'50%',
              background:`linear-gradient(135deg, ${c.color}, ${c.color}cc)`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:18,color:'#0a0e17',
              border:`2px solid ${c.color}`,
              flexShrink:0
            }}>{c.avatar}</div>

            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}>
                <span className="font-display" style={{fontWeight:700,fontSize:15}}>{c.name}</span>
                <span style={{fontSize:11,color:'#6b7280'}}>{c.time}</span>
              </div>
              <div style={{fontSize:12,color:'#6b7280',marginBottom:4}}>{c.role}</div>
              <div style={{fontSize:13,color: c.unread > 0 ? '#f9fafb' : '#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.last}</div>
            </div>

            {c.unread > 0 && (
              <div style={{
                minWidth:20,height:20,borderRadius:9999,padding:'0 6px',
                background:'#ff6b9d',color:'#fff',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:11,fontWeight:600
              }}>{c.unread}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
