import type { Appointment, AppointmentType, Provider } from '@/lib/types'

export const providers: Provider[] = [
  { id: 'dr-amin', name: 'Dr. Sara Amin', specialty: 'General practice', accent: 'teal', workingHours: { start: '09:00', end: '17:00' } },
  { id: 'dr-khalil', name: 'Dr. Omar Khalil', specialty: 'Dermatology', accent: 'violet', workingHours: { start: '10:00', end: '18:00' } },
  { id: 'dr-nour', name: 'Dr. Lina Nour', specialty: 'Physiotherapy', accent: 'amber', workingHours: { start: '08:00', end: '16:00' } },
]

export const appointmentTypes: AppointmentType[] = [
  { id: 'consultation', label: 'Consultation', durationMinutes: 30 },
  { id: 'follow-up', label: 'Follow-up', durationMinutes: 15 },
  { id: 'procedure', label: 'Procedure', durationMinutes: 60 },
]

const PATIENTS = [
  'Youssef Hassan', 'Mariam Adel', 'Karim Fathy', 'Nadia Saleh', 'Ahmed Tarek', 'Dina Mostafa',
  'Hana Farid', 'Mohamed Gamal', 'Salma Ehab', 'Ziad Nabil', 'Laila Samir', 'Omar Sherif',
]

// Bookings relative to "today" so the demo always has data in view:
// [dayOffset (0 = today, Mon-Fri only), hour, minute, provider index, type index]
const SLOTS: Array<[number, number, number, number, number]> = [
  [0, 9, 0, 0, 0], [0, 10, 0, 0, 2], [0, 11, 30, 1, 0], [0, 14, 0, 2, 1], [0, 15, 0, 0, 0],
  [1, 9, 30, 0, 1], [1, 10, 0, 1, 2], [1, 13, 0, 2, 0], [1, 16, 0, 1, 0],
  [2, 9, 0, 2, 2], [2, 11, 0, 0, 0], [2, 14, 30, 1, 1],
  [3, 10, 30, 0, 0], [3, 12, 0, 2, 0], [3, 15, 0, 1, 2],
  [4, 9, 0, 0, 2], [4, 11, 0, 1, 0], [4, 13, 30, 2, 1],
  [-1, 10, 0, 0, 0], [-1, 14, 0, 1, 0], [-2, 9, 30, 2, 2],
]

/** Returns the next weekday at or after `date` (Sat/Sun roll to Monday). */
function toWeekday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  if (day === 6) d.setDate(d.getDate() + 2)
  if (day === 0) d.setDate(d.getDate() + 1)
  return d
}

/** Seed appointments anchored to the given "today" (defaults to now), so the demo is never empty. */
export function seedAppointments(today: Date = new Date()): Appointment[] {
  const base = new Date(today)
  base.setHours(0, 0, 0, 0)
  return SLOTS.map(([dayOffset, hour, minute, p, t], i) => {
    const day = toWeekday(new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset))
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute)
    const type = appointmentTypes[t]
    const end = new Date(start.getTime() + type.durationMinutes * 60_000)
    return {
      id: `seed-${i + 1}`,
      providerId: providers[p].id,
      typeId: type.id,
      patientName: PATIENTS[i % PATIENTS.length],
      start: start.toISOString(),
      end: end.toISOString(),
    }
  })
}
