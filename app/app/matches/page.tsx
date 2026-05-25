import Link from 'next/link';
import { MOCK_MATCHES } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function MatchesPage() {
  const matches = MOCK_MATCHES;

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-5 border-b border-white/[0.07] shrink-0">
        <h1 className="font-display text-2xl font-bold text-text">Матчи</h1>
        <p className="text-muted text-sm">{matches.length} активных совпадений</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <span className="text-5xl">🔍</span>
            <p className="text-muted text-center">Пока нет матчей.<br />Найди своего ко-фаундера в Discover!</p>
            <Link href="/app/discover" className="px-6 py-2.5 bg-coral text-white rounded-xl text-sm font-semibold hover:bg-coral/90 transition-colors">
              Перейти в Discover
            </Link>
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-3">
            {matches.map(match => {
              const f = match.profile;
              const initials = f.name.split(' ').map(w => w[0]).join('').slice(0, 2);
              const color = '#FF3D5A';

              return (
                <Link
                  key={match.id}
                  href={`/app/chat/${match.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-bg2 border border-white/[0.06] hover:border-coral/30 hover:bg-bg3 transition-all group"
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-base shrink-0"
                    style={{ background: `${color}20`, color, border: `1.5px solid ${color}40` }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-text text-sm">{f.name}</span>
                      <span className="text-xs text-coral font-semibold">{match.score}%</span>
                    </div>
                    <div className="text-xs text-muted truncate">{f.role} · {f.domain}</div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted">
                      {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true, locale: ru })}
                    </span>
                    <span className="text-xs text-coral opacity-0 group-hover:opacity-100 transition-opacity">
                      Открыть →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
