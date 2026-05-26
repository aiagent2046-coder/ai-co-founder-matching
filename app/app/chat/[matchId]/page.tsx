"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/supabase';

type Msg = { id: string; role: 'me' | 'them' | 'avatar'; text: string; time: string };

const MOCK_MATCHES: Record<string, any> = {
  m1: { name: 'Alex Chen',  role: 'CTO · AI/ML',   match: 94, color: '#00d4aa', avatar: 'AC' },
  m2: { name: 'Mira Khan',  role: 'CEO · FinTech', match: 87, color: '#c77dff', avatar: 'MK' },
  m3: { name: 'Sam Karpov', role: 'CPO · SaaS',    match: 81, color: '#ff6b9d', avatar: 'SK' },
};

const SEED: Record<string, Msg[]> = {
  m1: [
    { id:'1', role:'them', text:'Привет! Видел твой профиль, интересный стек. Что строишь сейчас?', time:'14:30' },
  ],
  m2: [
    { id:'1', role:'them', text:'Привет! Расскажи про свой опыт в финтехе?', time:'13:15' },
  ],
};

export default function ChatPage() {
  const params = useParams();
  const matchId = params?.matchId as string;
  const peer = MOCK_MATCHES[matchId] ?? { name: 'Unknown', role: '—', match: 0, color: '#9ca3af', avatar: '?' };
  const rgb = peer.color === '#00d4aa' ? '0,212,170' : peer.color === '#c77dff' ? '199,125,255' : '255,107,157';

  const [messages, setMessages] = useState<Msg[]>(SEED[matchId] ?? []);
  const [input, setInput] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    setMessages(m => [...m, { id: Date.now().toString(), role: 'me', text: input, time }]);
    setInput('');
    setSuggestion(null);
  };

  const askAvatar = async () => {
    setSuggesting(true); setSuggestion(null);
    const token = await getAuthToken();
    const res = await fetch('/api/avatar/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({
        messages: messages.map(m => ({
          senderId: m.role === 'me' ? 'self' : 'other',
          content: m.text,
        })),
        mode: 'suggest',
      }),
    });
    const data = await res.json();
    setSuggestion(data.suggestion ?? data.error ?? 'Не получилось получить ответ');
    setSuggesting(false);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh'}}>
      {/* Header */}
      <div style={{
        padding:'16px 32px',
        borderBottom:'1px solid #374151',
        background:'rgba(17,24,39,0.6)',
        backdropFilter:'blur(16px)',
        display:'flex',alignItems:'center',gap:16,position:'sticky',top:0,zIndex:10
      }}>
        <Link href="/app/chat" style={{color:'#9ca3af',textDecoration:'none',fontSize:20}}>←</Link>

        <div style={{
          width:44,height:44,borderRadius:'50%',
          background:`linear-gradient(135deg, ${peer.color}, ${peer.color}cc)`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'"Space Grotesk",sans-serif',fontWeight:700,fontSize:16,color:'#0a0e17',
          border:`2px solid ${peer.color}`,
          boxShadow:`0 0 16px rgba(${rgb},0.3)`
        }}>{peer.avatar}</div>

        <div style={{flex:1}}>
          <div className="font-display" style={{fontWeight:700,fontSize:16,marginBottom:2}}>{peer.name}</div>
          <div style={{fontSize:12,color:'#9ca3af'}}>{peer.role}</div>
        </div>

        <div style={{
          padding:'4px 12px',borderRadius:9999,
          background:'rgba(0,212,170,0.08)',border:'1px solid rgba(0,212,170,0.3)',
          display:'flex',alignItems:'center',gap:6
        }}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#00d4aa',boxShadow:'0 0 8px #00d4aa',animation:'twinkle 2s infinite'}}/>
          <span className="font-display" style={{fontSize:13,fontWeight:700,color:'#00d4aa'}}>{peer.match}%</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflow:'auto',padding:'24px 32px',display:'flex',flexDirection:'column',gap:12}}>
        {messages.length === 0 && (
          <div style={{textAlign:'center',color:'#6b7280',fontSize:13,padding:'40px 0'}}>
            Начни беседу — спроси о проекте или поделись своим
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className="animate-fade-up" style={{
            alignSelf: m.role === 'me' ? 'flex-end' : 'flex-start',
            maxWidth: '70%',
            display:'flex',flexDirection:'column',gap:4
          }}>
            <div style={{
              padding:'10px 14px',
              borderRadius:12,
              background: m.role === 'me'
                ? 'linear-gradient(135deg,#00d4aa,#2ec4b6)'
                : '#1f2937',
              color: m.role === 'me' ? '#0a0e17' : '#f9fafb',
              border: m.role === 'them' ? '1px solid #374151' : 'none',
              fontSize:13,lineHeight:1.5,
            }}>{m.text}</div>
            <div style={{
              fontSize:10,color:'#6b7280',
              alignSelf: m.role === 'me' ? 'flex-end' : 'flex-start',
              padding:'0 4px'
            }}>{m.time}</div>
          </div>
        ))}

        {/* AI suggestion preview */}
        {suggestion && (
          <div className="animate-fade-up" style={{
            alignSelf:'flex-end',maxWidth:'80%',
            border:'1px solid rgba(199,125,255,0.4)',
            background:'rgba(199,125,255,0.06)',
            borderRadius:12,padding:'12px 14px'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c77dff" strokeWidth="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
              <span style={{fontSize:10,fontWeight:600,color:'#c77dff',letterSpacing:'0.08em',textTransform:'uppercase'}}>AI suggestion</span>
            </div>
            <div style={{fontSize:13,color:'#f9fafb',lineHeight:1.5,marginBottom:12}}>{suggestion}</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setInput(suggestion);setSuggestion(null);}} className="btn-primary" style={{padding:'6px 14px',fontSize:12}}>
                Использовать
              </button>
              <button onClick={()=>setSuggestion(null)} className="btn-ghost" style={{padding:'6px 14px',fontSize:12}}>
                Отклонить
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{
        padding:16,borderTop:'1px solid #374151',
        background:'rgba(17,24,39,0.6)',
        backdropFilter:'blur(16px)',
        display:'flex',gap:8,alignItems:'center'
      }}>
        <button onClick={askAvatar} disabled={suggesting} title="AI подсказка от моего аватара"
          style={{
            width:40,height:40,borderRadius:8,
            background: suggesting ? 'rgba(199,125,255,0.2)' : 'rgba(199,125,255,0.08)',
            border:'1px solid rgba(199,125,255,0.3)',
            color:'#c77dff',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            transition:'all 0.2s', flexShrink:0
          }}>
          {suggesting ? (
            <span style={{animation:'twinkle 1s infinite'}}>...</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          )}
        </button>

        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault();send();}}}
          placeholder="Написать сообщение..."
          className="field-input" style={{flex:1}}/>

        <button onClick={send} disabled={!input.trim()} className="btn-primary" style={{padding:'10px 20px'}}>
          Отправить
        </button>
      </div>
    </div>
  );
}
