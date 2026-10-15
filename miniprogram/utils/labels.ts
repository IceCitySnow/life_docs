import type { Difficulty } from '../types/api';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '挑战',
};

export function difficultyLabel(value: Difficulty | string): string {
  return DIFFICULTY_LABELS[value as Difficulty] || value;
}

export function progressPercent(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return '0%';
  }
  return `${Math.min(100, Math.round(ratio * 100))}%`;
}
