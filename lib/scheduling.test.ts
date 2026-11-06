import { describe, expect, it } from 'vitest'
import { appointmentTypes, providers } from '@/data/seed'
import type { Appointment } from './types'
import { findConflict, findNextAvailable, isWithinWorkingHours, overlaps, validateBooking } from './scheduling'

// A fixed Wednesday so tests never depend on the real clock.
const WED = new Date(2026, 10, 11) // 11 Nov 2026
const at = (h: number, m = 0, day = WED) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
const amin = providers[0] // 09:00-17:00
const consultation = appointmentTypes[0] // 30 min
const procedure = appointmentTypes[2] // 60 min

const booking = (start: Date, minutes: number, id = 'a1', providerId = amin.id): Appointment => ({
  id,
  providerId,
  typeId: 'consultation',
  patientName: 'Test Patient',
  start: start.toISOString(),
  end: new Date(start.getTime() + minutes * 60_000).toISOString(),
})

describe('overlaps', () => {
  it('detects a partial overlap', () => {
    expect(overlaps({ start: at(9), end: at(10) }, { start: at(9, 30), end: at(10, 30) })).toBe(true)
  })
  it('detects containment', () => {
    expect(overlaps({ start: at(9), end: at(12) }, { start: at(10), end: at(11) })).toBe(true)
  })
  it('treats back-to-back intervals as not overlapping', () => {
    expect(overlaps({ start: at(9), end: at(10) }, { start: at(10), end: at(11) })).toBe(false)
  })
})

describe('findConflict', () => {
  const existing = [booking(at(10), 30)]
  it('ignores other providers', () => {
    expect(findConflict({ start: at(10), end: at(10, 30) }, providers[1].id, existing)).toBeUndefined()
  })
  it('ignores the appointment being edited', () => {
    expect(findConflict({ start: at(10), end: at(10, 30) }, amin.id, existing, 'a1')).toBeUndefined()
  })
  it('returns the colliding appointment', () => {
    expect(findConflict({ start: at(10, 15), end: at(10, 45) }, amin.id, existing)?.id).toBe('a1')
  })
})

describe('isWithinWorkingHours', () => {
  it('accepts a slot inside hours', () => {
    expect(isWithinWorkingHours({ start: at(9), end: at(9, 30) }, amin)).toBe(true)
  })
  it('rejects a slot that ends after closing', () => {
    expect(isWithinWorkingHours({ start: at(16, 45), end: at(17, 15) }, amin)).toBe(false)
  })
  it('rejects weekends', () => {
    const sat = new Date(2026, 10, 14)
    expect(isWithinWorkingHours({ start: at(10, 0, sat), end: at(10, 30, sat) }, amin)).toBe(false)
  })
})

describe('validateBooking', () => {
  const now = at(8)
  it('rejects the past', () => {
    expect(validateBooking({ providerId: amin.id, start: at(7), type: consultation }, providers, [], now)?.code).toBe('past')
  })
  it('rejects outside working hours', () => {
    expect(validateBooking({ providerId: amin.id, start: at(17), type: consultation }, providers, [], now)?.code).toBe('outside-hours')
  })
  it('rejects a conflict and names the other patient', () => {
    const err = validateBooking({ providerId: amin.id, start: at(10), type: consultation }, providers, [booking(at(10), 30)], now)
    expect(err?.code).toBe('conflict')
    expect(err?.message).toContain('Test Patient')
  })
  it('accepts a valid booking', () => {
    expect(validateBooking({ providerId: amin.id, start: at(11), type: consultation }, providers, [booking(at(10), 30)], now)).toBeNull()
  })
})

describe('findNextAvailable', () => {
  it('returns opening time on an empty day', () => {
    expect(findNextAvailable(amin.id, consultation, providers, [], at(6))).toEqual(at(9))
  })
  it('skips past the first booking', () => {
    const next = findNextAvailable(amin.id, consultation, providers, [booking(at(9), 30)], at(6))
    expect(next).toEqual(at(9, 30))
  })
  it('snaps to the 15-minute grid after an odd-length booking', () => {
    const next = findNextAvailable(amin.id, consultation, providers, [booking(at(9), 20)], at(6))
    expect(next).toEqual(at(9, 30))
  })
  it('needs room for the full duration before closing', () => {
    // Busy until 16:15; a 60-minute procedure can't fit before 17:00, so it moves to the next day.
    const busy = [booking(at(9), 435)] // 09:00-16:15
    const next = findNextAvailable(amin.id, procedure, providers, busy, at(6))
    expect(next).toEqual(at(9, 0, new Date(2026, 10, 12)))
  })
  it('skips weekends', () => {
    const fri = new Date(2026, 10, 13)
    const busyAllFriday = [booking(at(9, 0, fri), 480)]
    const next = findNextAvailable(amin.id, consultation, providers, busyAllFriday, at(6, 0, fri))
    expect(next).toEqual(at(9, 0, new Date(2026, 10, 16))) // Monday
  })
  it('returns null when nothing is free in range', () => {
    const everyDay = Array.from({ length: 10 }, (_, i) => booking(at(9, 0, new Date(2026, 10, 11 + i)), 480, `b${i}`))
    expect(findNextAvailable(amin.id, consultation, providers, everyDay, at(6), 5)).toBeNull()
  })
})
