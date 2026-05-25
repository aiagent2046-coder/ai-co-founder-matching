'use client';
// The actual landing page component lives in syndi-landing.jsx (artifact)
// and will be moved here. This is the scaffold placeholder.

export function Landing() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16 }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:64, color:'#F0EDE8' }}>
        Syndi<span style={{ color:'#FF3D5A' }}>AI</span>
      </h1>
      <p style={{ color:'#6B7280', fontSize:18 }}>Landing page — copy syndi-landing.jsx here</p>
      <a href="/register" style={{ padding:'12px 28px', background:'#FF3D5A', borderRadius:8, color:'#fff', textDecoration:'none', fontWeight:600 }}>
        Начать →
      </a>
    </div>
  );
}
