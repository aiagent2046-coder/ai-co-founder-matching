"use client";

export function FeatureCard({ accent, num, title, desc, delay }: {
  accent: string;
  num: string;
  title: string;
  desc: string;
  delay: number;
}) {
  const rgb = accent==='#00d4aa'?'0,212,170':accent==='#c77dff'?'199,125,255':'255,107,157';
  return (
    <div className="card animate-fade-up" style={{animationDelay:`${delay}s`}}
      onMouseEnter={(e)=>{
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = accent;
        el.style.boxShadow = `0 4px 32px rgba(${rgb},0.12)`;
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e)=>{
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#374151';
        el.style.boxShadow = '';
        el.style.transform = '';
      }}>
      <div style={{
        width:56,height:56,borderRadius:12,
        background:`rgba(${rgb},0.08)`,
        border:`1px solid rgba(${rgb},0.3)`,
        display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20
      }}>
        <div className="font-display" style={{fontWeight:700,fontSize:24,color:accent}}>{num}</div>
      </div>
      <div className="font-display" style={{fontWeight:700,fontSize:20,marginBottom:10}}>{title}</div>
      <p style={{fontSize:15,color:'#9ca3af',lineHeight:1.6}}>{desc}</p>
    </div>
  );
}
