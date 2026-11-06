import { expect, test, type Page } from '@playwright/test'

// Drives the real app: seeded calendar, a new booking, a rejected overlap, the next-slot finder.
// localStorage is cleared first so every run starts from the same seed.

async function fresh(page: Page) {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Slotwise' })).toBeVisible()
  await expect(page.locator('.fc-event').first()).toBeVisible()
}

test('shows the seeded calendar with provider filters', async ({ page }) => {
  await fresh(page)
  const count = await page.locator('.fc-event').count()
  expect(count).toBeGreaterThan(3)
  await page.getByRole('button', { name: /Dr\. Omar Khalil/ }).click()
  await expect(page.getByText(/\d+ appointments/)).toBeVisible()
  const filtered = await page.locator('.fc-event').count()
  expect(filtered).toBeLessThan(count)
})

test('books a new appointment from the next-slot finder', async ({ page }) => {
  await fresh(page)
  await page.getByRole('button', { name: 'Find slot' }).click()
  await page.getByRole('button', { name: 'Book this slot' }).click()
  await expect(page.getByRole('heading', { name: 'New appointment' })).toBeVisible()
  await page.getByLabel('Patient').fill('Playwright Patient')
  await page.getByRole('button', { name: 'Book appointment' }).click()
  await expect(page.getByText('Appointment booked')).toBeVisible()
  // The booking persists: reload and it's still there.
  await page.reload()
  await expect(page.locator('.fc-event', { hasText: 'Playwright Patient' }).first()).toBeAttached()
})

test('rejects an overlapping booking with a clear message', async ({ page }) => {
  await fresh(page)
  // Open an existing seeded appointment to read its provider, date and time, then try to double-book it.
  await page.locator('.fc-event').first().click()
  await expect(page.getByRole('heading', { name: 'Edit appointment' })).toBeVisible()
  const date = await page.getByLabel('Date').inputValue()
  const time = await page.getByLabel('Start time').inputValue()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Find slot' }).click()
  await page.getByRole('button', { name: 'Book this slot' }).click()
  await page.getByLabel('Patient').fill('Double Booking')
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Start time').fill(time)
  await page.getByRole('button', { name: 'Book appointment' }).click()
  await expect(page.getByRole('alert')).toContainText(/overlaps|already passed|works/i)
})

test('no page scrolls sideways', async ({ page }) => {
  await fresh(page)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
