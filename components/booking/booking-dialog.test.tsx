import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { appointmentTypes, providers } from '@/data/seed'
import { BookingDialog } from './booking-dialog'

const base = {
  open: true,
  onOpenChange: vi.fn(),
  providers,
  types: appointmentTypes,
  initialStart: new Date(2026, 10, 11, 10, 0),
}

describe('BookingDialog', () => {
  it('pre-fills date and time from the selected slot', () => {
    render(<BookingDialog {...base} onSubmit={() => null} />)
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-11')
    expect(screen.getByLabelText('Start time')).toHaveValue('10:00')
    expect(screen.getByRole('heading', { name: 'New appointment' })).toBeInTheDocument()
  })

  it('shows a validation message when the patient name is missing', async () => {
    const onSubmit = vi.fn(() => null)
    render(<BookingDialog {...base} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(await screen.findByText(/enter the patient/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the form values and shows an error the parent returns', async () => {
    const onSubmit = vi.fn(() => 'Overlaps with another appointment.')
    render(<BookingDialog {...base} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Patient'), 'Nour Adel')
    await userEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ patientName: 'Nour Adel', date: '2026-11-11', time: '10:00' }), undefined)
    expect(await screen.findByRole('alert')).toHaveTextContent('Overlaps with another appointment.')
  })

  it('switches to edit mode with the appointment’s values and a delete button', () => {
    const editing = { id: 'a1', providerId: 'dr-khalil' as const, typeId: 'procedure' as const, patientName: 'Karim Fathy', start: new Date(2026, 10, 12, 14, 0).toISOString(), end: new Date(2026, 10, 12, 15, 0).toISOString() }
    render(<BookingDialog {...base} editing={editing} onSubmit={() => null} onDelete={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Edit appointment' })).toBeInTheDocument()
    expect(screen.getByLabelText('Patient')).toHaveValue('Karim Fathy')
    expect(screen.getByLabelText('Start time')).toHaveValue('14:00')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})
