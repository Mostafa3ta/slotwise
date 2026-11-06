'use client'

import { addMinutes } from 'date-fns'
import { Moon, RotateCcw, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AppointmentCalendar } from '@/components/calendar/appointment-calendar'
import { ACCENT_CLASSES } from '@/components/calendar/colors'
import { BookingDialog, type BookingFormValues } from '@/components/booking/booking-dialog'
import { NextSlotPanel } from '@/components/booking/next-slot-panel'
import { Button } from '@/components/ui/button'
import { appointmentTypes, providers } from '@/data/seed'
import { validateBooking } from '@/lib/scheduling'
import { loadAppointments, newId, resetAppointments, saveAppointments } from '@/lib/storage'
import type { Appointment, AppointmentType, ProviderId } from '@/lib/types'
import { cn } from '@/lib/utils'

type DialogState =
  | { open: false }
  | { open: true; mode: 'create'; start: Date; providerId?: ProviderId; typeId?: AppointmentType['id'] }
  | { open: true; mode: 'edit'; appointment: Appointment }

// The one stateful component: owns the appointment list and wires calendar, dialog and finder together.
export function Scheduler() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<ProviderId | 'all'>('all')
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setAppointments(loadAppointments())
    setLoaded(true)
  }, [])

  const persist = useCallback((next: Appointment[]) => {
    setAppointments(next)
    saveAppointments(next)
  }, [])

  const editing = dialog.open && dialog.mode === 'edit' ? dialog.appointment : undefined
  const createDefaults = dialog.open && dialog.mode === 'create' ? dialog : undefined

  const handleSubmit = (values: BookingFormValues, editingId?: string): string | null => {
    const type = appointmentTypes.find((t) => t.id === values.typeId)
    if (!type) return 'Choose an appointment type.'
    const start = new Date(`${values.date}T${values.time}:00`)
    const error = validateBooking({ providerId: values.providerId as ProviderId, start, type, ignoreId: editingId }, providers, appointments)
    if (error) return error.message

    const record: Appointment = {
      id: editingId ?? newId(),
      providerId: values.providerId as ProviderId,
      typeId: type.id,
      patientName: values.patientName,
      start: start.toISOString(),
      end: addMinutes(start, type.durationMinutes).toISOString(),
      notes: values.notes || undefined,
    }
    persist(editingId ? appointments.map((a) => (a.id === editingId ? record : a)) : [...appointments, record])
    setDialog({ open: false })
    toast.success(editingId ? 'Appointment updated' : 'Appointment booked', { description: `${record.patientName} · ${values.date} ${values.time}` })
    return null
  }

  const handleDelete = (id: string) => {
    const gone = appointments.find((a) => a.id === id)
    persist(appointments.filter((a) => a.id !== id))
    setDialog({ open: false })
    toast('Appointment removed', { description: gone?.patientName })
  }

  // Drag or resize: same rules as the form. Resizing to a non-standard length is allowed (the type is kept).
  const handleMove = (id: string, start: Date, end: Date): boolean => {
    const current = appointments.find((a) => a.id === id)
    if (!current) return false
    const minutes = Math.round((end.getTime() - start.getTime()) / 60_000)
    const error = validateBooking({ providerId: current.providerId, start, type: { id: current.typeId, label: '', durationMinutes: minutes }, ignoreId: id }, providers, appointments)
    if (error) {
      toast.error("Can't move it there", { description: error.message })
      return false
    }
    persist(appointments.map((a) => (a.id === id ? { ...a, start: start.toISOString(), end: end.toISOString() } : a)))
    return true
  }

  const handleReset = () => {
    persist(resetAppointments())
    toast('Demo data reset')
  }

  const visibleCount = useMemo(() => appointments.filter((a) => filter === 'all' || a.providerId === filter).length, [appointments, filter])

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px] lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Slotwise</h1>
          <p className="text-sm text-muted-foreground">Clinic scheduling demo · click a free slot to book, drag to move, click an appointment to edit.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="size-4" aria-hidden /> Reset demo data</Button>
          <Button variant="outline" size="icon" aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            {resolvedTheme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          </Button>
        </div>
      </header>

      <section aria-label="Calendar" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by provider">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All providers</FilterChip>
          {providers.map((p) => (
            <FilterChip key={p.id} active={filter === p.id} onClick={() => setFilter(p.id)}>
              <span className={cn('size-2 rounded-full', ACCENT_CLASSES[p.accent])} aria-hidden /> {p.name}
            </FilterChip>
          ))}
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">{loaded ? `${visibleCount} appointments` : 'Loading…'}</span>
        </div>
        <div className="rounded-xl border bg-card p-2 shadow-sm sm:p-4">
          {loaded && (
            <AppointmentCalendar
              appointments={appointments}
              providers={providers}
              providerFilter={filter}
              onSelectSlot={(start) => setDialog({ open: true, mode: 'create', start, providerId: filter === 'all' ? undefined : filter })}
              onSelectAppointment={(id) => {
                const appointment = appointments.find((a) => a.id === id)
                if (appointment) setDialog({ open: true, mode: 'edit', appointment })
              }}
              onMove={handleMove}
            />
          )}
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <NextSlotPanel
          providers={providers}
          types={appointmentTypes}
          appointments={appointments}
          onBook={(providerId, typeId, start) => setDialog({ open: true, mode: 'create', start, providerId, typeId })}
        />
        <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
          <h2 className="mb-2 font-medium">Working hours</h2>
          <ul className="grid gap-1.5 text-muted-foreground">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', ACCENT_CLASSES[p.accent])} aria-hidden />
                <span className="text-foreground">{p.name}</span>
                <span className="ml-auto font-mono text-xs">{p.workingHours.start}–{p.workingHours.end}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Monday to Friday. Bookings can’t overlap, fall outside hours, or be in the past.</p>
        </div>
      </aside>

      <BookingDialog
        open={dialog.open}
        onOpenChange={(open) => { if (!open) setDialog({ open: false }) }}
        providers={providers}
        types={appointmentTypes}
        editing={editing}
        initialStart={createDefaults?.start}
        initialProviderId={createDefaults?.providerId}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}
