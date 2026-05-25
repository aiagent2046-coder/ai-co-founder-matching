import { AvatarGenerator } from '@/components/onboarding/AvatarGenerator';

export default async function AvatarPage() {
  // Используем дефолтные значения — профиль загружается в компоненте
  return <AvatarGenerator profileName="Founder" profileRole="CEO" profileDomain="AI/ML" />;
}
