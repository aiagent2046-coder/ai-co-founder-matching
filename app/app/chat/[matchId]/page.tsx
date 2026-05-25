'use client';

import { ChatWindow } from '@/components/chat/ChatWindow';
import { MOCK_MATCHES, MOCK_MESSAGES } from '@/lib/mock-data';
import { useRouter, useParams } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const match = MOCK_MATCHES.find(m => m.id === matchId);
  if (!match) {
    router.push('/app/matches');
    return null;
  }

  const messages = MOCK_MESSAGES.filter(m => m.matchId === matchId);

  return (
    <div className="h-full flex flex-col">
      <ChatWindow
        matchId={matchId}
        matchedFounder={match.profile}
        currentUserId="me"
        initialMessages={messages}
        score={match.score}
        onVideoCall={() => router.push(`/app/video/${matchId}`)}
      />
    </div>
  );
}
