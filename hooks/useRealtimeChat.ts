'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { Message } from '@syndi/types';

export function useRealtimeChat(matchId: string, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isConnected, setConnected] = useState(false);
  const [isSending, setSending]     = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => {
            // deduplicate
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const sendMessage = useCallback(async (content: string, type: Message['type'] = 'text') => {
    if (!content.trim() || isSending) return;
    setSending(true);

    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    // Optimistic update
    const optimistic: Message = {
      id:        `opt-${Date.now()}`,
      matchId,
      senderId:  user.id,
      content,
      type,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ match_id: matchId, sender_id: user.id, content, type })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic with real
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data as Message : m));
    } catch {
      // Rollback optimistic
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }, [matchId, isSending]);

  return { messages, sendMessage, isSending, isConnected };
}
