// Appointment persistence in localStorage, with the seed as the starting point.
// Kept tiny and synchronous: the dataset is small and there's no backend in this demo.
import { seedAppointments } from '@/data/seed'
import type { Appointment } from './types'

export const STORAGE_KEY = 'slotwise.appointments.v1'

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

/** Loads saved appointments, or seeds (and saves) a fresh demo set when nothing is stored yet. */
export function loadAppointments(): Appointment[] {
  if (!canUseStorage()) return seedAppointments()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Appointment[]
    }
  } catch {
    // Corrupt or blocked storage: fall through to a fresh seed.
  }
  const seeded = seedAppointments()
  saveAppointments(seeded)
  return seeded
}

export function saveAppointments(appointments: Appointment[]): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments))
  } catch {
    // Quota exceeded or private mode: the in-memory state still works for this session.
  }
}

/** Throws away saved data and returns a fresh seed anchored to today. */
export function resetAppointments(): Appointment[] {
  const seeded = seedAppointments()
  saveAppointments(seeded)
  return seeded
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
