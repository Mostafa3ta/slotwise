'use client'

import { format } from 'date-fns'
import { CalendarSearch } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { findNextAvailable } from '@/lib/scheduling'
import type { Appointment, AppointmentType, Provider, ProviderId } from '@/lib/types'

interface NextSlotPanelProps {
  providers: Provider[]
  types: AppointmentType[]
  appointments: Appointment[]
  onBook: (providerId: ProviderId, typeId: AppointmentType['id'], start: Date) => void
}

// "Find the earliest free slot" — the feature a receptionist uses most. Pure logic lives in lib/scheduling.
export function NextSlotPanel({ providers, types, appointments, onBook }: NextSlotPanelProps) {
  const [providerId, setProviderId] = useState<ProviderId>(providers[0].id)
  const [typeId, setTypeId] = useState<AppointmentType['id']>(types[0].id)
  const [result, setResult] = useState<Date | null | undefined>(undefined)

  const type = types.find((t) => t.id === typeId) ?? types[0]

  const search = () => setResult(findNextAvailable(providerId, type, providers, appointments))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><CalendarSearch className="size-4 text-primary" aria-hidden /> Next available</CardTitle>
        <CardDescription>Earliest free slot in the next 7 working days.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ns-provider">Provider</Label>
          <Select value={providerId} onValueChange={(v) => { setProviderId(v as ProviderId); setResult(undefined) }}>
            <SelectTrigger id="ns-provider"><SelectValue /></SelectTrigger>
            <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ns-type">Type</Label>
          <Select value={typeId} onValueChange={(v) => { setTypeId(v as AppointmentType['id']); setResult(undefined) }}>
            <SelectTrigger id="ns-type"><SelectValue /></SelectTrigger>
            <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} · {t.durationMinutes} min</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" onClick={search}>Find slot</Button>

        {result === null && <p role="status" className="text-sm text-muted-foreground">Nothing free in the next 7 days.</p>}
        {result && (
          <div role="status" className="rounded-lg border bg-accent/60 p-3 text-sm">
            <p className="font-medium">{format(result, 'EEEE d MMMM')}</p>
            <p className="text-muted-foreground">{format(result, 'HH:mm')} to {format(new Date(result.getTime() + type.durationMinutes * 60_000), 'HH:mm')}</p>
            <Button type="button" size="sm" className="mt-2" onClick={() => onBook(providerId, typeId, result)}>Book this slot</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
