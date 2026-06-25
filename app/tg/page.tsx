"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData: string;
        themeParams?: Record<string, string>;
        colorScheme?: 'light' | 'dark';
      };
    };
  }
}

type Phase = 'init' | 'auth' | 'done' | 'no-tg';

export default function TelegramEntryPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('init');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tryAuth = async () => {
      if (cancelled) return;
      const tg = window.Telegram?.WebApp;
      if (!tg) { setPhase('no-tg'); return; }
      tg.ready();
      tg.expand();
      if (!tg.initData) { setPhase('no-tg'); return; }
      setPhase('auth');
      try {
        const resp = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          throw new Error(errBody?.error || `HTTP ${resp.status}`);
        }
        // cookie-сессия уже выставлена сервером в /api/auth/telegram — клиентский setSession не нужен.
        if (cancelled) return;
        setPhase('done');
        router.replace('/onboarding/intent');
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }
    };

    // SDK может ещё не загрузиться к моменту useEffect — поллим пару секунд.
    if (window.Telegram?.WebApp) {
      tryAuth();
    } else {
      intervalId = setInterval(() => {
        if (window.Telegram?.WebApp) {
          if (intervalId) { clearInterval(intervalId); intervalId = null; }
          tryAuth();
        }
      }, 50);
      timeoutId = setTimeout(() => {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        if (!cancelled && !window.Telegram?.WebApp) setPhase('no-tg');
      }, 3000);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: '#0a0e17', color: '#f9fafb',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          {phase === 'init' && <div>Запускаем…</div>}
          {phase === 'auth' && <div>Авторизация через Telegram…</div>}
          {phase === 'done' && <div>Готово, перенаправляем…</div>}
          {phase === 'no-tg' && (
            <div>
              <h2 style={{ marginBottom: 12, fontWeight: 700 }}>Открой в Telegram</h2>
              <p style={{ color: '#9ca3af', lineHeight: 1.5, fontSize: 14 }}>
                Эта страница работает внутри Telegram. Открой бота <strong>@Syndifaunder_bot</strong> и нажми меню-кнопку.
              </p>
            </div>
          )}
          {error && (
            <div style={{ marginTop: 16, color: '#ef4444', fontSize: 13 }}>
              Ошибка: {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
