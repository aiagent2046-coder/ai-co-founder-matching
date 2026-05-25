"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/app/discover', icon: '◈', label: 'Discover' },
  { href: '/app/matches',  icon: '♥', label: 'Матчи' },
  { href: '/app/chat',     icon: '◎', label: 'Чаты' },
  { href: '/app/agents',   icon: '⬡', label: 'Агенты' },
  { href: '/app/profile',  icon: '◉', label: 'Профиль' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div style={{display:'flex',height:'100vh',background:'#08090B',fontFamily:'"DM Sans",sans-serif',overflow:'hidden'}}>
      <aside style={{width:64,borderRight:'0.5px solid rgba(201,168,76,0.1)',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:20,paddingBottom:20,background:'#08090B',flexShrink:0,gap:4}}>
        <Link href="/" style={{width:36,height:36,background:'linear-gradient(135deg,#C9A84C,#E8CC7A)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Cormorant Garamond",serif',fontWeight:600,fontSize:16,color:'#08090B',textDecoration:'none',marginBottom:28}}>S</Link>
        {nav.map(({href,icon,label})=>{
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} title={label} style={{width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:active?'#C9A84C':'#3A3630',background:active?'rgba(201,168,76,0.08)':'transparent',border:active?'0.5px solid rgba(201,168,76,0.2)':'0.5px solid transparent',textDecoration:'none',transition:'all 0.2s'}}>
              {icon}
            </Link>
          );
        })}
      </aside>
      <main style={{flex:1,overflow:'auto'}}>{children}</main>
    </div>
  );
}
