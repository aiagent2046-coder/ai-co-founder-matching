import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 40 : 32;
  const text = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const icon = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  return (
    <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none'}}>
      <div style={{
        width:dim, height:dim,
        background:'linear-gradient(135deg, #00d4aa, #2ec4b6)',
        borderRadius:8,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'"Space Grotesk",sans-serif',
        fontWeight:700, color:'#0a0e17', fontSize:icon,
        boxShadow:'0 0 16px rgba(0,212,170,0.3)'
      }}>✦</div>
      <span style={{
        fontFamily:'"Space Grotesk",sans-serif',
        fontWeight:700, fontSize:text,
        background:'linear-gradient(135deg, #00d4aa, #c77dff)',
        WebkitBackgroundClip:'text', backgroundClip:'text',
        WebkitTextFillColor:'transparent'
      }}>Syndi AI</span>
    </Link>
  );
}
