'use client';

import { useEffect, useRef, useState } from 'react';
import { useRealtimeChat }  from '@/hooks/useRealtimeChat';
import type { Message, FounderProfile } from '@syndi/types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  matchId:        string;
  matchedFounder: FounderProfile;
  currentUserId:  string;
  initialMessages: Message[];
  score:          number;
  onVideoCall:    () => void;
};

export function ChatWindow({
  matchId, matchedFounder, currentUserId, initialMessages, score, onVideoCall,
}: Props) {
  const { messages, sendMessage, isSending, isConnected } = useRealtimeChat(matchId, initialMessages);
  const [input, setInput]             = useState('');
  const [suggestion, setSuggestion]   = useState<string | null>(null);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await sendMessage(text);
    setSuggestion(null);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fetchSuggestion = async () => {
    setLoadingSugg(true);
    try {
      const res = await fetch('/api/chat/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, messages: messages.slice(-8) }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion);
    } catch {
      setSuggestion(null);
    } finally {
      setLoadingSugg(false);
    }
  };

  const color = '#FF3D5A';
  const initials = matchedFounder.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <header className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-display"
            style={{ background: `${color}20`, color, border: `1.5px solid ${color}50` }}
          >
            {initials}
          </div>
          <div>
            <div className="font-semibold text-text">{matchedFounder.name}</div>
            <div className="text-xs text-muted">{matchedFounder.role} · {matchedFounder.domain}</div>
          </div>
          <div className="ml-2 px-2.5 py-1 rounded-full bg-coral/10 border border-coral/30 text-coral text-xs font-semibold">
            {score}% match
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Realtime status */}
          <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-500' : 'text-muted'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse-dot' : 'bg-muted'}`} />
            {isConnected ? 'Live' : 'Connecting...'}
          </div>

          {/* AI suggestion button */}
          <button
            onClick={fetchSuggestion}
            disabled={loadingSugg}
            className="px-3 py-1.5 rounded-lg bg-bg3 border border-white/10 text-xs text-muted hover:border-coral/40 hover:text-coral transition-colors"
          >
            {loadingSugg ? '...' : '🤖 AI подсказка'}
          </button>

          {/* Video call */}
          <button
            onClick={onVideoCall}
            className="px-3 py-1.5 rounded-lg bg-coral text-white text-xs font-semibold hover:bg-coral/90 transition-colors"
          >
            📹 Видео
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            founderColor={color}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── AI suggestion banner ── */}
      <AnimatePresence>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-6 mb-2 px-4 py-3 rounded-xl bg-coral/8 border border-coral/25 flex items-start gap-3"
          >
            <span className="text-coral shrink-0">🤖</span>
            <div className="flex-1 text-sm text-text/80">{suggestion}</div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setInput(suggestion); setSuggestion(null); }}
                className="text-xs text-coral hover:text-coral/70 transition-colors"
              >
                Использовать
              </button>
              <button onClick={() => setSuggestion(null)} className="text-xs text-muted hover:text-text transition-colors">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать сообщение... (Enter — отправить)"
            rows={1}
            className="flex-1 bg-bg3 border border-white/10 rounded-xl px-4 py-3 text-sm text-text placeholder-muted resize-none focus:outline-none focus:border-coral/40 transition-colors"
            style={{ minHeight: 48, maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="w-12 h-12 rounded-xl bg-coral text-white flex items-center justify-center shrink-0 hover:bg-coral/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isSending ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Message bubble
// ─────────────────────────────────────────────
function ChatBubble({ message, isOwn, founderColor }: {
  message: Message;
  isOwn: boolean;
  founderColor: string;
}) {
  const isAI = message.type === 'ai_suggestion';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="text-center text-xs text-muted py-2">
        {message.content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[72%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {isAI && (
          <span className="text-[10px] text-coral flex items-center gap-1">🤖 ChatAgent</span>
        )}
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={
            isOwn
              ? { background: '#FF3D5A', color: '#fff', borderBottomRightRadius: 6 }
              : isAI
              ? { background: 'rgba(255,61,90,0.1)', color: '#F0EDE8', border: '1px solid rgba(255,61,90,0.25)', borderBottomLeftRadius: 6 }
              : { background: '#1A1D26', color: '#F0EDE8', borderBottomLeftRadius: 6 }
          }
        >
          {message.content}
        </div>
        <span className="text-[10px] text-muted px-1">
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ru })}
        </span>
      </div>
    </motion.div>
  );
}
