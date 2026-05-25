import { createClient } from '@supabase/supabase-js';
import type { FounderProfile, Match, Message, VideoRoom } from '@syndi/types';

// ── Database schema types ─────────────────────
export type Database = {
  public: {
    Tables: {
      founder_profiles: { Row: FounderProfile; Insert: Omit<FounderProfile, 'id' | 'createdAt' | 'updatedAt'>; Update: Partial<FounderProfile> };
      matches:          { Row: Match;          Insert: Omit<Match, 'id' | 'createdAt'>;           Update: Partial<Match> };
      messages:         { Row: Message;        Insert: Omit<Message, 'id' | 'createdAt'>;         Update: Partial<Message> };
      video_rooms:      { Row: VideoRoom;      Insert: Omit<VideoRoom, 'id' | 'createdAt'>;       Update: Partial<VideoRoom> };
    };
  };
};

// ── Singleton client (browser) ────────────────
let _client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient(url: string, anonKey: string) {
  if (!_client) {
    _client = createClient<Database>(url, anonKey);
  }
  return _client;
}

// ── Server client (Next.js Server Components) ─
export function getSupabaseServerClient(url: string, serviceKey: string) {
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export { createClient };
