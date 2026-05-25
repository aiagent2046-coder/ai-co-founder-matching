'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { StartupRole, StartupStage, Domain } from '@syndi/types';

const ROLES:   StartupRole[]  = ['CEO','CTO','CPO','CMO','CFO','Designer','BD','Other'];
const STAGES:  { v: StartupStage; l: string }[] = [
  { v:'idea', l:'Идея' }, { v:'mvp', l:'MVP' }, { v:'seed', l:'Seed' },
  { v:'series_a', l:'Series A' }, { v:'growth', l:'Growth' },
];
const DOMAINS: Domain[] = ['AI/ML','FinTech','HealthTech','EdTech','B2B SaaS','Consumer','Web3','Other'];

export function ProfileForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [form, setForm] = useState({
    name:       '',
    role:       'CEO' as StartupRole,
    bio:        '',
    stage:      'mvp' as StartupStage,
    domain:     'AI/ML' as Domain,
    location:   '',
    linkedinUrl:'',
    githubUrl:  '',
  });
  const [skills,     setSkills]     = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<StartupRole[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 8) {
      setSkills(p => [...p, s]);
      setSkillInput('');
    }
  };

  const onSkillKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  };

  const toggleRole = (r: StartupRole) =>
    setLookingFor(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const handleSubmit = async () => {
    if (!form.name || !form.bio || skills.length === 0 || lookingFor.length === 0) {
      setError('Заполни все обязательные поля');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { getAuthToken } = await import('@/lib/supabase');
      const token = await getAuthToken();
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ ...form, skills, lookingFor }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/onboarding/big-five');
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-text mb-2">Твой профиль</h1>
        <p className="text-muted text-sm">Это основа твоего AI-профиля. Будь честен — это помогает MatchAgent найти лучших партнёров.</p>
      </div>

      <div className="flex flex-col gap-5">

        {/* Name + Role */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Имя *">
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Alexey Petrov"
              className={inputCls}
            />
          </Field>
          <Field label="Твоя роль *">
            <select value={form.role} onChange={set('role')} className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>

        {/* Bio */}
        <Field label="О себе *" hint="Расскажи о опыте, достижениях и чём ты хочешь строить">
          <textarea
            value={form.bio}
            onChange={set('bio')}
            placeholder="Ex-Google PM. Строил AI-продукты в enterprise. Хочу создать..."
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </Field>

        {/* Stage + Domain */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Стадия проекта *">
            <select value={form.stage} onChange={set('stage')} className={inputCls}>
              {STAGES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </Field>
          <Field label="Домен *">
            <select value={form.domain} onChange={set('domain')} className={inputCls}>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        </div>

        {/* Location */}
        <Field label="Локация">
          <input value={form.location} onChange={set('location')} placeholder="Москва / Remote" className={inputCls} />
        </Field>

        {/* Skills tag input */}
        <Field label="Навыки * (до 8)" hint="Нажми Enter чтобы добавить">
          <div className={`${inputCls} min-h-[48px] flex flex-wrap gap-2 cursor-text`}
            onClick={() => document.getElementById('skill-input')?.focus()}>
            {skills.map(s => (
              <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-coral/15 text-coral text-xs font-medium">
                {s}
                <button type="button" onClick={() => setSkills(p => p.filter(x => x !== s))} className="hover:text-white">×</button>
              </span>
            ))}
            {skills.length < 8 && (
              <input
                id="skill-input"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={onSkillKey}
                onBlur={addSkill}
                placeholder={skills.length === 0 ? 'Python, React, Sales...' : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-text placeholder-muted outline-none"
              />
            )}
          </div>
        </Field>

        {/* Looking for */}
        <Field label="Ищу ко-фаундера с ролью *">
          <div className="flex flex-wrap gap-2">
            {ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={[
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  lookingFor.includes(r)
                    ? 'bg-coral/20 border-2 border-coral/60 text-coral'
                    : 'bg-bg3 border border-white/10 text-muted hover:border-white/30',
                ].join(' ')}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        {/* Socials */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="LinkedIn (необязательно)">
            <input value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/..." className={inputCls} />
          </Field>
          <Field label="GitHub (необязательно)">
            <input value={form.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/..." className={inputCls} />
          </Field>
        </div>

      </div>

      {error && <p className="text-coral text-sm bg-coral/10 border border-coral/25 rounded-xl px-4 py-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-4 bg-coral text-white font-semibold rounded-xl hover:bg-coral/90 disabled:opacity-50 transition-all text-base"
      >
        {saving ? 'Сохранение...' : 'Продолжить → Big Five тест'}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text/80">{label}</label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-bg3 border border-white/10 rounded-xl px-4 py-3 text-sm text-text placeholder-muted focus:outline-none focus:border-coral/50 transition-colors';
