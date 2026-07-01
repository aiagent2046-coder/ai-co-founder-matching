"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/supabase';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.matchId as string;

  const [url, setUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    let active = true;
    (async () => {
      try {
        const authToken = await getAuthToken();
        const res = await fetch('/api/video/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken ?? ''}` },
          body: JSON.stringify({ matchId }),
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.error ?? 'Не удалось создать комнату');
          return;
        }
        setUrl(data.url);
        setToken(data.token);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [matchId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{
          width: 48, height: 48, border: '2px solid #374151',
          borderTopColor: '#00d4aa', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (error || !url || !token) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 16 }}>
        <div style={{ color: '#ff9f1c', fontSize: 14 }}>{error ?? 'Нет данных для подключения'}</div>
        <Link href={`/app/chat/${matchId}`} className="btn-primary">Назад в чат</Link>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh' }} data-lk-theme="default">
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect={true}
        video={true}
        audio={true}
        style={{ height: '100%' }}
        onDisconnected={() => router.push(`/app/chat/${matchId}`)}
        onError={(e) => setError(e.message)}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
