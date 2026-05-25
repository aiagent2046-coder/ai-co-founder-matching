'use client';

import { useState, useCallback } from 'react';
import {
  motion, useMotionValue, useTransform,
  AnimatePresence, type PanInfo,
} from 'framer-motion';
import { FounderProfile } from '@syndi/types';
import { FounderCard } from './FounderCard';
import { useRouter } from 'next/navigation';

type Props = {
  founders: FounderProfile[];
  scores: Record<string, number>;  // founderId → score
};

export function SwipeStack({ founders, scores }: Props) {
  const [deck, setDeck]           = useState(founders);
  const [swiped, setSwiped]       = useState<string[]>([]);
  const [matchedWith, setMatched] = useState<FounderProfile | null>(null);
  const [isLoading, setLoading]   = useState(false);
  const router = useRouter();

  const doSwipe = useCallback(async (founderId: string, action: 'like' | 'pass') => {
    if (isLoading) return;
    setSwiped(prev => [...prev, founderId]);

    if (action === 'like') {
      setLoading(true);
      try {
        const { getAuthToken } = await import('@/lib/supabase');
      const token = await getAuthToken();
      const res = await fetch('/api/swipe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token ?? ''}`,
          },
          body: JSON.stringify({ targetFounderId: founderId, action }),
        });
        const data = await res.json();
        if (data.matched) {
          setMatched(founders.find(f => f.id === founderId) ?? null);
        }
      } catch {
        // silent fail — swipe still registers locally
      } finally {
        setLoading(false);
      }
    } else {
      // pass — fire-and-forget
      fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFounderId: founderId, action }),
      }).catch(() => {});
    }

    setDeck(prev => prev.filter(f => f.id !== founderId));
  }, [isLoading, founders]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">

      {/* ── Card stack ── */}
      <div className="relative w-[340px] h-[520px]">
        <AnimatePresence>
          {deck.length === 0 ? (
            <EmptyState onReset={() => setDeck(founders)} />
          ) : (
            deck.slice(0, 3).map((founder, i) => (
              <SwipeCard
                key={founder.id}
                founder={founder}
                score={scores[founder.id]}
                stackIndex={i}
                onSwipe={doSwipe}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* ── Action buttons ── */}
      {deck.length > 0 && (
        <div className="flex items-center gap-6">
          <ActionBtn
            onClick={() => doSwipe(deck[0].id, 'pass')}
            label="✕"
            variant="pass"
            title="Pass"
          />
          <ActionBtn
            onClick={() => doSwipe(deck[0].id, 'like')}
            label="♥"
            variant="like"
            title="Like"
          />
        </div>
      )}

      {/* ── Deck counter ── */}
      {deck.length > 0 && (
        <p className="text-xs text-muted">{deck.length} founder{deck.length !== 1 ? 's' : ''} в очереди</p>
      )}

      {/* ── Match overlay ── */}
      <AnimatePresence>
        {matchedWith && (
          <MatchOverlay
            founder={matchedWith}
            score={scores[matchedWith.id]}
            onChat={() => {
              setMatched(null);
              router.push('/app/matches');
            }}
            onClose={() => setMatched(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SwipeCard
// ─────────────────────────────────────────────
function SwipeCard({
  founder, score, stackIndex, onSwipe,
}: {
  founder: FounderProfile;
  score: number;
  stackIndex: number;
  onSwipe: (id: string, action: 'like' | 'pass') => void;
}) {
  const x        = useMotionValue(0);
  const rotate   = useTransform(x, [-220, 220], [-18, 18]);
  const exitX    = useMotionValue(0);

  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, 0], [1, 0]);

  const isTop = stackIndex === 0;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isTop) return;
    if (info.offset.x > 110)  onSwipe(founder.id, 'like');
    else if (info.offset.x < -110) onSwipe(founder.id, 'pass');
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        x:       isTop ? x : 0,
        rotate:  isTop ? rotate : stackIndex % 2 === 0 ? 1 : -0.5,
        zIndex:  10 - stackIndex,
        y:       stackIndex * 14,
        scale:   1 - stackIndex * 0.045,
        filter:  stackIndex > 0 ? 'brightness(0.6)' : 'none',
        originX: 0.5,
        originY: 1,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      exit={{
        x: exitX.get() > 0 ? 400 : -400,
        opacity: 0,
        transition: { duration: 0.3 },
      }}
      animate={{
        scale: 1 - stackIndex * 0.045,
        y: stackIndex * 14,
      }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <FounderCard founder={founder} score={score} />

      {/* Swipe labels (only on top card) */}
      {isTop && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-8 right-8 border-2 border-green-500 text-green-500 px-4 py-1.5 rounded-xl font-bold text-base rotate-[-12deg] pointer-events-none"
          >
            MATCH!
          </motion.div>
          <motion.div
            style={{ opacity: passOpacity }}
            className="absolute top-8 left-8 border-2 border-coral text-coral px-4 py-1.5 rounded-xl font-bold text-base rotate-[12deg] pointer-events-none"
          >
            PASS
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
//  Action button
// ─────────────────────────────────────────────
function ActionBtn({ onClick, label, variant, title }: {
  onClick: () => void;
  label: string;
  variant: 'like' | 'pass';
  title: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      className={
        variant === 'like'
          ? 'w-16 h-16 rounded-full bg-coral/15 border-2 border-coral/60 text-coral text-2xl flex items-center justify-center font-bold hover:bg-coral/25 transition-colors'
          : 'w-14 h-14 rounded-full bg-bg2 border border-white/10 text-muted text-xl flex items-center justify-center hover:border-white/30 hover:text-text transition-colors'
      }
    >
      {label}
    </motion.button>
  );
}

// ─────────────────────────────────────────────
//  Match overlay
// ─────────────────────────────────────────────
function MatchOverlay({ founder, score, onChat, onClose }: {
  founder: FounderProfile;
  score: number;
  onChat: () => void;
  onClose: () => void;
}) {
  const initials = founder.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-bg2 border border-white/10 rounded-3xl p-10 max-w-sm w-full mx-4 text-center shadow-2xl"
        initial={{ scale: 0.7, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Confetti-like decoration */}
        <div className="text-4xl mb-4">🎉</div>

        <h2 className="font-display text-3xl font-bold text-text mb-2">Это матч!</h2>
        <p className="text-muted text-sm mb-6">
          Вы и {founder.name} понравились друг другу
        </p>

        {/* Score ring */}
        <div className="w-24 h-24 rounded-full border-4 border-coral bg-coral/10 flex flex-col items-center justify-center mx-auto mb-6">
          <span className="text-coral text-2xl font-bold font-ui">{score}%</span>
          <span className="text-muted text-[10px]">совместимость</span>
        </div>

        <p className="text-muted text-sm mb-8">{founder.bio.slice(0, 80)}...</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-muted text-sm hover:border-white/30 transition-colors"
          >
            Продолжить
          </button>
          <button
            onClick={onChat}
            className="flex-1 py-3 rounded-xl bg-coral text-white text-sm font-semibold hover:bg-coral/90 transition-colors"
          >
            Написать →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <span className="text-5xl">🌟</span>
      <h3 className="font-display text-xl text-text">Все просмотрены!</h3>
      <p className="text-muted text-sm max-w-[200px]">Новые фаундеры появятся завтра. Или сброси стек для демо.</p>
      <button
        onClick={onReset}
        className="mt-2 px-6 py-2.5 rounded-xl border border-white/10 text-sm text-muted hover:border-coral/50 hover:text-coral transition-colors"
      >
        Сбросить (dev)
      </button>
    </motion.div>
  );
}
