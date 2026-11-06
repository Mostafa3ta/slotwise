'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Appointment, AppointmentType, Provider } from '@/lib/types'

const schema = z.object({
  patientName: z.string().trim().min(2, 'Enter the patient’s name (at least 2 characters).').max(80, 'Keep the name under 80 characters.'),
  providerId: z.string().min(1, 'Choose a provider.'),
  typeId: z.string().min(1, 'Choose an appointment type.'),
  date: z.string().min(1, 'Choose a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.'),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters.').optional(),
})
export type BookingFormValues = z.infer<typeof schema>

export interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: Provider[]
  types: AppointmentType[]
  /** Existing appointment when editing; otherwise a proposed start for a new booking. */
  editing?: Appointment
  initialStart?: Date
  initialProviderId?: Provider['id']
  /** Returns an error message to show under the form, or null when saved. */
  onSubmit: (values: BookingFormValues, editingId?: string) => string | null
  onDelete?: (id: string) => void
  /** Server-side style error (overlap, hours) set by the parent after validation. */
  conflictMessage?: string | null
}

export function BookingDialog({ open, onOpenChange, providers, types, editing, initialStart, initialProviderId, onSubmit, onDelete, conflictMessage }: BookingDialogProps) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(editing, initialStart, initialProviderId, providers[0]?.id ?? ''),
  })
  const { register, handleSubmit, setValue, watch, reset, setError, formState: { errors, isSubmitting } } = form

  // Re-seed the form every time the dialog opens for a different appointment or slot.
  useEffect(() => {
    if (open) reset(defaults(editing, initialStart, initialProviderId, providers[0]?.id ?? ''))
  }, [open, editing, initialStart, initialProviderId, providers, reset])

  useEffect(() => {
    if (conflictMessage) setError('root', { message: conflictMessage })
  }, [conflictMessage, setError])

  const submit = (values: BookingFormValues) => {
    const error = onSubmit(values, editing?.id)
    if (error) setError('root', { message: error })
  }

  const providerId = watch('providerId')
  const typeId = watch('typeId')
  const type = types.find((t) => t.id === typeId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(submit)} noValidate>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit appointment' : 'New appointment'}</DialogTitle>
            <DialogDescription>
              {type ? `${type.label}, ${type.durationMinutes} minutes.` : 'Choose a type to set the duration.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="patientName">Patient</Label>
              <Input id="patientName" autoComplete="off" placeholder="Full name" aria-invalid={!!errors.patientName} {...register('patientName')} />
              <FieldError message={errors.patientName?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="providerId">Provider</Label>
                <Select value={providerId} onValueChange={(v) => setValue('providerId', v, { shouldValidate: true })}>
                  <SelectTrigger id="providerId" aria-invalid={!!errors.providerId}><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError message={errors.providerId?.message} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="typeId">Type</Label>
                <Select value={typeId} onValueChange={(v) => setValue('typeId', v, { shouldValidate: true })}>
                  <SelectTrigger id="typeId" aria-invalid={!!errors.typeId}><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} · {t.durationMinutes} min</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError message={errors.typeId?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" aria-invalid={!!errors.date} {...register('date')} />
                <FieldError message={errors.date?.message} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="time">Start time</Label>
                <Input id="time" type="time" step={900} aria-invalid={!!errors.time} {...register('time')} />
                <FieldError message={errors.time?.message} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="notes" rows={2} placeholder="Reason for visit, reminders…" {...register('notes')} />
              <FieldError message={errors.notes?.message} />
            </div>

            {errors.root?.message && (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {editing && onDelete ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(editing.id)}>
                Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editing ? 'Save changes' : 'Book appointment'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null
}

function defaults(editing: Appointment | undefined, initialStart: Date | undefined, initialProviderId: string | undefined, fallbackProvider: string): BookingFormValues {
  const start = editing ? new Date(editing.start) : initialStart ?? new Date()
  return {
    patientName: editing?.patientName ?? '',
    providerId: editing?.providerId ?? initialProviderId ?? fallbackProvider,
    typeId: editing?.typeId ?? 'consultation',
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    notes: editing?.notes ?? '',
  }
}
