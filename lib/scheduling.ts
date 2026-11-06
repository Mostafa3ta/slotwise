// Pure scheduling rules. No React, no storage, so every rule is unit-testable on its own.
import { addMinutes, isBefore, isWeekend, set } from 'date-fns'
import type { Appointment, AppointmentType, Provider } from './types'

export interface Interval {
  start: Date
  end: Date
}

/** True when two half-open intervals [start, end) share any time. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end
}

/** The existing appointment (excluding `ignoreId`) that the interval would collide with, if any. */
export function findConflict(
  interval: Interval,
  providerId: Provider['id'],
  appointments: Appointment[],
  ignoreId?: string,
): Appointment | undefined {
  return appointments.find(
    (a) =>
      a.providerId === providerId &&
      a.id !== ignoreId &&
      overlaps(interval, { start: new Date(a.start), end: new Date(a.end) }),
  )
}

/** Parses "HH:mm" onto the given day. */
export function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  return set(day, { hours: h, minutes: m, seconds: 0, milliseconds: 0 })
}

/** True when the whole interval sits inside the provider's working hours on a weekday. */
export function isWithinWorkingHours(interval: Interval, provider: Provider): boolean {
  if (isWeekend(interval.start)) return false
  const open = atTime(interval.start, provider.workingHours.start)
  const close = atTime(interval.start, provider.workingHours.end)
  return interval.start >= open && interval.end <= close
}

export type ValidationError =
  | { code: 'past'; message: string }
  | { code: 'outside-hours'; message: string }
  | { code: 'conflict'; message: string; conflict: Appointment }

/** Every rule a booking must pass. Returns the first failure, or null when the booking is valid. */
export function validateBooking(
  input: { providerId: Provider['id']; start: Date; type: AppointmentType; ignoreId?: string },
  providers: Provider[],
  appointments: Appointment[],
  now: Date = new Date(),
): ValidationError | null {
  const provider = providers.find((p) => p.id === input.providerId)
  if (!provider) throw new Error(`Unknown provider: ${input.providerId}`)
  const interval = { start: input.start, end: addMinutes(input.start, input.type.durationMinutes) }

  if (isBefore(interval.start, now)) {
    return { code: 'past', message: 'That time has already passed.' }
  }
  if (!isWithinWorkingHours(interval, provider)) {
    return {
      code: 'outside-hours',
      message: `${provider.name} works ${provider.workingHours.start} to ${provider.workingHours.end}, Monday to Friday.`,
    }
  }
  const conflict = findConflict(interval, provider.id, appointments, input.ignoreId)
  if (conflict) {
    return { code: 'conflict', message: `Overlaps with ${conflict.patientName}'s appointment.`, conflict }
  }
  return null
}

/**
 * Earliest slot (on a 15-minute grid) that fits the appointment type within working hours,
 * starting from `from`, searching up to `daysAhead` days. Returns null if nothing is free.
 */
export function findNextAvailable(
  providerId: Provider['id'],
  type: AppointmentType,
  providers: Provider[],
  appointments: Appointment[],
  from: Date = new Date(),
  daysAhead = 7,
): Date | null {
  const provider = providers.find((p) => p.id === providerId)
  if (!provider) return null

  // Start from the next 15-minute boundary after `from`.
  const first = new Date(from)
  first.setSeconds(0, 0)
  first.setMinutes(Math.ceil(first.getMinutes() / 15) * 15)

  for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + dayOffset)
    if (isWeekend(day)) continue
    const open = atTime(day, provider.workingHours.start)
    const close = atTime(day, provider.workingHours.end)
    let candidate = dayOffset === 0 && first > open ? first : open

    while (addMinutes(candidate, type.durationMinutes) <= close) {
      const interval = { start: candidate, end: addMinutes(candidate, type.durationMinutes) }
      const conflict = findConflict(interval, provider.id, appointments)
      if (!conflict) return candidate
      // Jump to the end of the conflicting appointment, snapped up to the 15-minute grid.
      const next = new Date(conflict.end)
      next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0)
      candidate = next > candidate ? next : addMinutes(candidate, 15)
    }
  }
  return null
}
