import { SwipeStack } from '@/components/founders/SwipeStack';
import { AgentHUD } from '@/components/agents/AgentHUD';
import { MOCK_FOUNDERS } from '@/lib/mock-data';

const SCORES: Record<string, number> = {
  f1: 94, f2: 89, f3: 87, f4: 92, f5: 83,
};

export default function DiscoverPage() {
  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <header className="px-8 py-5 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">Discover</h1>
            <p className="text-muted text-sm">{MOCK_FOUNDERS.length} фаундеров ждут тебя</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-coral/10 border border-coral/25">
            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot block" />
            <span className="text-coral text-xs font-medium">MatchAgent активен</span>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <SwipeStack founders={MOCK_FOUNDERS} scores={SCORES} />
        </div>
      </div>
      <aside className="w-72 border-l border-white/[0.07] shrink-0 overflow-y-auto">
        <AgentHUD />
      </aside>
    </div>
  );
}
