import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight:'100vh', background:'#0A0C10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:24, fontFamily:'sans-serif' }}>
      <div style={{ width:64, height:64, borderRadius:16, background:'#FF3D5A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:'bold', color:'#fff' }}>S</div>
      <h1 style={{ fontSize:56, fontWeight:900, color:'#F0EDE8', margin:0, textAlign:'center' }}>
        Syndi<span style={{color:'#FF3D5A'}}>AI</span>
      </h1>
      <p style={{ color:'#6B7280', fontSize:18, margin:0 }}>Найди ко-фаундера за 48 часов</p>
      <div style={{ display:'flex', gap:12 }}>
        <Link href="/register" style={{ padding:'14px 32px', background:'#FF3D5A', color:'#fff', borderRadius:12, textDecoration:'none', fontWeight:600, fontSize:16 }}>
          Начать →
        </Link>
        <Link href="/login" style={{ padding:'14px 32px', border:'1px solid rgba(255,255,255,0.1)', color:'#9CA3AF', borderRadius:12, textDecoration:'none', fontSize:16 }}>
          Войти
        </Link>
      </div>
    </div>
  );
}
