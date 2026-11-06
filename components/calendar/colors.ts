import type { Provider } from '@/lib/types'

// One accent per provider, read from the CSS variables in globals.css so both themes work.
export const ACCENT_VARS: Record<Provider['accent'], { solid: string; soft: string }> = {
  teal: { solid: 'var(--accent-teal)', soft: 'var(--accent-teal-soft)' },
  violet: { solid: 'var(--accent-violet)', soft: 'var(--accent-violet-soft)' },
  amber: { solid: 'var(--accent-amber)', soft: 'var(--accent-amber-soft)' },
}

export const ACCENT_CLASSES: Record<Provider['accent'], string> = {
  teal: 'bg-accent-teal',
  violet: 'bg-accent-violet',
  amber: 'bg-accent-amber',
}
