'use client'

import type { DateSelectArg, EventClickArg, EventContentArg, EventDropArg, EventInput } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type EventResizeDoneArg } from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useEffect, useMemo, useRef, useState } from 'react'
import { demoAnchor } from '@/data/seed'
import { ACCENT_VARS } from './colors'
import type { Appointment, Provider, ProviderId } from '@/lib/types'

export interface AppointmentCalendarProps {
  appointments: Appointment[]
  providers: Provider[]
  /** When set, only this provider's appointments and working hours are shown. */
  providerFilter: ProviderId | 'all'
  onSelectSlot: (start: Date) => void
  onSelectAppointment: (id: string) => void
  /** Called after a drag or resize; return false to revert the change. */
  onMove: (id: string, start: Date, end: Date) => boolean
}

// Wraps FullCalendar behind one component so the rest of the app never touches its API directly.
export function AppointmentCalendar({ appointments, providers, providerFilter, onSelectSlot, onSelectAppointment, onMove }: AppointmentCalendarProps) {
  const byId = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers])
  const initialDate = useMemo(() => demoAnchor(), [])
  // Phones get the day view: a five-column week is unreadable under ~640px.
  const [isNarrow, setIsNarrow] = useState(false)
  const calendarRef = useRef<FullCalendar>(null)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    const want = isNarrow ? 'timeGridDay' : 'timeGridWeek'
    if (api.view.type !== want && api.view.type !== 'dayGridMonth') api.changeView(want)
  }, [isNarrow])

  const events = useMemo<EventInput[]>(
    () =>
      appointments
        .filter((a) => providerFilter === 'all' || a.providerId === providerFilter)
        .map((a) => {
          const provider = byId.get(a.providerId)
          const accent = provider ? ACCENT_VARS[provider.accent] : ACCENT_VARS.teal
          return {
            id: a.id,
            title: a.patientName,
            start: a.start,
            end: a.end,
            backgroundColor: accent.soft,
            borderColor: accent.solid,
            textColor: 'var(--foreground)',
            extendedProps: { providerName: provider?.name ?? '', typeId: a.typeId },
          }
        }),
    [appointments, providerFilter, byId],
  )

  // Working hours shade the grid; with "all" selected, use the widest span across providers.
  const businessHours = useMemo(() => {
    const list = providerFilter === 'all' ? providers : providers.filter((p) => p.id === providerFilter)
    return list.map((p) => ({ daysOfWeek: [1, 2, 3, 4, 5], startTime: p.workingHours.start, endTime: p.workingHours.end }))
  }, [providers, providerFilter])

  const handleSelect = (arg: DateSelectArg) => {
    arg.view.calendar.unselect()
    onSelectSlot(arg.start)
  }
  const handleEventClick = (arg: EventClickArg) => onSelectAppointment(arg.event.id)
  const handleChange = (arg: EventDropArg | EventResizeDoneArg) => {
    const { id, start, end } = arg.event
    if (!start || !end || !onMove(id, start, end)) arg.revert()
  }

  return (
    <div className="slotwise-calendar">
      <FullCalendar
        ref={calendarRef}
        initialDate={initialDate}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={isNarrow ? { left: 'prev,next', center: 'title', right: 'timeGridDay,dayGridMonth' } : { left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth' }}
        titleFormat={isNarrow ? { month: 'short', day: 'numeric', year: 'numeric' } : undefined}
        buttonText={{ today: 'Today', day: 'Day', week: 'Week', month: 'Month' }}
        height="auto"
        firstDay={1}
        weekends={false}
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        slotDuration="00:15:00"
        slotLabelInterval="01:00"
        allDaySlot={false}
        nowIndicator
        slotEventOverlap={false}
        businessHours={businessHours}
        selectable
        selectMirror
        selectConstraint="businessHours"
        select={handleSelect}
        events={events}
        eventClick={handleEventClick}
        editable
        eventDurationEditable
        eventDrop={handleChange}
        eventResize={handleChange}
        eventContent={renderEvent}
        dayMaxEvents={3}
      />
    </div>
  )
}

function renderEvent(arg: EventContentArg) {
  const { providerName } = arg.event.extendedProps as { providerName: string }
  return (
    <div className="flex h-full flex-col overflow-hidden px-1.5 py-0.5 text-xs leading-tight">
      <span className="truncate font-medium">{arg.event.title}</span>
      {arg.view.type !== 'dayGridMonth' && (
        <span className="truncate opacity-75">
          {arg.timeText}
          {providerName && ` · ${providerName}`}
        </span>
      )}
    </div>
  )
}
