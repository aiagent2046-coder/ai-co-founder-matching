import { FounderProfile } from '@syndi/types';
import { clsx } from 'clsx';

const DOMAIN_COLORS: Record<string, string> = {
  'AI/ML':     '#FF3D5A',
  'FinTech':   '#3B82F6',
  'HealthTech':'#10B981',
  'EdTech':    '#F59E0B',
  'B2B SaaS':  '#8B5CF6',
  'Consumer':  '#EC4899',
  'Web3':      '#06B6D4',
  'Other':     '#6B7280',
};

const STAGE_LABELS: Record<string, string> = {
  idea: 'Идея', mvp: 'MVP', seed: 'Seed', series_a: 'Series A', growth: 'Growth',
};

type Props = {
  founder: FounderProfile;
  score?: number;  // compatibility score 0-100, optional
  compact?: boolean;
};

export function FounderCard({ founder, score, compact }: Props) {
  const color  = DOMAIN_COLORS[founder.domain] ?? '#6B7280';
  const initials = founder.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={clsx(
      'w-full h-full rounded-[22px] bg-bg2 border border-white/[0.07] flex flex-col',
      'select-none overflow-hidden',
      !compact && 'shadow-[0_32px_80px_rgba(0,0,0,0.55)]',
    )}>
      {/* Header strip */}
      <div className="relative h-24 shrink-0" style={{ background: `${color}18` }}>
        {/* Score badge */}
        {score !== undefined && (
          <div
            className="absolute top-3 right-3 rounded-xl px-2.5 py-1.5 flex flex-col items-center border-2 bg-bg"
            style={{ borderColor: color }}
          >
            <span className="text-lg font-bold font-ui leading-none" style={{ color }}>{score}%</span>
            <span className="text-[9px] text-muted">match</span>
          </div>
        )}
        {/* Stage pill */}
        <div className="absolute bottom-3 left-4 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-[11px] text-muted font-medium">{STAGE_LABELS[founder.stage]}</span>
        </div>
      </div>

      {/* Avatar — overlaps header */}
      <div className="relative px-5 -mt-8 flex items-end gap-3 mb-3">
        <div
          className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, borderColor: `${color}60` }}
        >
          <span className="font-display text-2xl font-bold" style={{ color }}>{initials}</span>
        </div>
        <div className="pb-1">
          <div className="font-display text-lg font-bold text-text leading-tight">{founder.name}</div>
          <div className="text-[12px] text-muted">{founder.role} · {founder.location}</div>
        </div>
      </div>

      {/* Domain tag */}
      <div className="px-5 mb-3">
        <span
          className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold"
          style={{ background: `${color}20`, color }}
        >
          {founder.domain}
        </span>
      </div>

      {/* Bio */}
      <p className="px-5 text-[13px] text-muted leading-relaxed line-clamp-3 flex-1">
        {founder.bio}
      </p>

      {/* Skills */}
      <div className="px-5 py-3 flex flex-wrap gap-1.5">
        {founder.skills.slice(0, 4).map(s => (
          <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-muted">
            {s}
          </span>
        ))}
      </div>

      {/* Big Five mini chart */}
      {founder.bigFive && (
        <div className="px-5 pb-4">
          <div className="text-[10px] text-muted/60 mb-2 uppercase tracking-widest">Big Five</div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(founder.bigFive).map(([key, val]) => (
              <BigFiveBar key={key} label={key} value={val} color={color} />
            ))}
          </div>
        </div>
      )}

      {/* Looking for */}
      <div className="px-5 pb-4 border-t border-white/[0.05] pt-3">
        <div className="text-[10px] text-muted/60 uppercase tracking-widest mb-1.5">Ищет</div>
        <div className="flex gap-1.5 flex-wrap">
          {founder.lookingFor.map(r => (
            <span key={r} className="px-2.5 py-1 rounded-lg border text-[11px]" style={{ borderColor: `${color}50`, color }}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BigFiveBar({ label, value, color }: { label: string; value: number; color: string }) {
  const LABELS: Record<string, string> = {
    openness: 'Open', conscientiousness: 'Consc', extraversion: 'Extra',
    agreeableness: 'Agree', neuroticism: 'Neuro',
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted w-10 shrink-0">{LABELS[label]}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[10px] text-muted/60 w-6 text-right">{value}</span>
    </div>
  );
}
