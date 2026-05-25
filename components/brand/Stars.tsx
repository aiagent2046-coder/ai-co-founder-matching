export function Stars({ count = 18 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => {
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    const colors = ['#00d4aa', '#00d4aa', '#00d4aa', '#c77dff', '#ff6b9d'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return { top, left, delay, color, id: i };
  });

  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}}>
      {stars.map(s => (
        <span key={s.id} style={{
          position:'absolute',
          top:`${s.top}%`, left:`${s.left}%`,
          width:2, height:2, borderRadius:'50%',
          background:s.color,
          animation:`twinkle 3s ease-in-out ${s.delay}s infinite`
        }}/>
      ))}
      {/* Shooting star */}
      <span style={{
        position:'absolute', top:'15%', left:'10%',
        width:80, height:1,
        background:'linear-gradient(90deg, transparent, #00d4aa, transparent)',
        animation:'shoot 4s ease-out 8s infinite'
      }}/>
    </div>
  );
}
