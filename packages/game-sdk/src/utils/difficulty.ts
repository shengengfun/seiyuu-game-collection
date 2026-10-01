import type { TFunction } from 'i18next';
import type { LucideIcon } from 'lucide-react';
import { Flame, Gamepad2, GraduationCap, Music, Star, Crown, Guitar, Theater } from 'lucide-react';

export function difficultyLabel(t: TFunction, key: string): string {
  return t(`difficulty.${key}`, { defaultValue: key });
}

export function difficultyDescription(t: TFunction, key: string): string {
  return t(`difficulty.${key}Description`, { defaultValue: '' });
}

const DIFFICULTY_ICONS: Record<string, LucideIcon> = {
  beginner: GraduationCap,
  easy: Gamepad2,
  normal: Flame,
  lovelive: Star,
  idolmaster: Music,
  umamusume: Crown,
  bangdream: Guitar,
  revuestarlight: Theater,
};

export function difficultyIcon(key: string): LucideIcon {
  return DIFFICULTY_ICONS[key] ?? Gamepad2;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'var(--primary)',
  easy: 'var(--success)',
  normal: 'var(--accent)',
  lovelive: '#e8739a',
  idolmaster: '#e8643c',
  umamusume: '#3c8de8',
  bangdream: '#7c5ce8',
  revuestarlight: '#e8a83c',
};

export function difficultyColor(key: string): string {
  return DIFFICULTY_COLORS[key] ?? 'var(--primary)';
}
