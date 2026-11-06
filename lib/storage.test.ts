import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, loadAppointments, resetAppointments, saveAppointments } from './storage'
import type { Appointment } from './types'

const one: Appointment = {
  id: 'x1',
  providerId: 'dr-amin',
  typeId: 'consultation',
  patientName: 'Stored Patient',
  start: '2026-11-11T09:00:00.000Z',
  end: '2026-11-11T09:30:00.000Z',
}

describe('storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('seeds demo data when nothing is stored, and saves it', () => {
    const loaded = loadAppointments()
    expect(loaded.length).toBeGreaterThan(10)
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('round-trips saved appointments', () => {
    saveAppointments([one])
    expect(loadAppointments()).toEqual([one])
  })

  it('falls back to seed data when storage is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadAppointments().length).toBeGreaterThan(10)
  })

  it('reset replaces saved data with a fresh seed', () => {
    saveAppointments([one])
    const fresh = resetAppointments()
    expect(fresh.find((a) => a.id === 'x1')).toBeUndefined()
    expect(loadAppointments()).toEqual(fresh)
  })
})
