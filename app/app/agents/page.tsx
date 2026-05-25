import { AgentHUD } from '@/components/agents/AgentHUD';

export default function AgentsPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-5 border-b border-white/[0.07] shrink-0">
        <h1 className="text-2xl font-bold text-white" style={{fontFamily:'serif'}}>AI Агенты</h1>
        <p className="text-gray-500 text-sm">Мониторинг мультиагентной системы</p>
      </header>
      <div className="flex-1 overflow-y-auto max-w-sm">
        <AgentHUD />
      </div>
    </div>
  );
}
