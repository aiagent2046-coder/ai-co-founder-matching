// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'SyndiAI - AI Co-founder Matching';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a', // slate-900 (темная тема, как у нас в MVP)
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 40,
        }}
      >
        {/* Логотип / Название */}
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontWeight: '800',
            letterSpacing: '-0.05em',
            marginBottom: 24,
            background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', // blue to purple gradient
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          SyndiAI
        </div>

        {/* Подзаголовок */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            color: '#cbd5e1', // slate-300
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.4,
            marginBottom: 48,
          }}
        >
          Найди идеального кофаундера с помощью AI и психометрики Big Five.
          <br />
          <span style={{ color: '#94a3b8', fontSize: 28, marginTop: 8 }}>
            Stop guessing, start building.
          </span>
        </div>

        {/* Бейджи фич */}
        <div
          style={{
            display: 'flex',
            gap: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span style={{ fontSize: 24, fontWeight: '600' }}>Big Five Psychometrics</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            <span style={{ fontSize: 24, fontWeight: '600' }}>Multi-Agent AI</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
