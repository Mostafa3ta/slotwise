// Domain types for Slotwise. Dates are ISO strings so they survive localStorage round-trips.

export type ProviderId = 'dr-amin' | 'dr-khalil' | 'dr-nour'

export interface Provider {
  id: ProviderId
  name: string
  specialty: string
  /** Tailwind-friendly accent key; see components/calendar/colors.ts */
  accent: 'teal' | 'violet' | 'amber'
  /** Working hours as 24h "HH:mm", Monday to Friday. */
  workingHours: { start: string; end: string }
}

export type AppointmentTypeId = 'consultation' | 'follow-up' | 'procedure'

export interface AppointmentType {
  id: AppointmentTypeId
  label: string
  /** Fixed duration in minutes. */
  durationMinutes: number
}

export interface Appointment {
  id: string
  providerId: ProviderId
  typeId: AppointmentTypeId
  patientName: string
  /** ISO 8601 */
  start: string
  /** ISO 8601, always start + type duration */
  end: string
  notes?: string
}

/** A proposed booking, before it has an id or a computed end. */
export interface BookingInput {
  providerId: ProviderId
  typeId: AppointmentTypeId
  patientName: string
  start: Date
  notes?: string
}
