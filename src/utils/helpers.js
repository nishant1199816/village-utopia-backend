// src/utils/helpers.js

/**
 * Generate booking reference like VU-2025-0042
 */
export async function generateBookingRef(prisma) {
  const year  = new Date().getFullYear()
  const count = await prisma.booking.count()
  return `VU-${year}-${String(count + 1).padStart(4, '0')}`
}

/**
 * Get all dates between checkIn and checkOut (exclusive of checkout)
 */
export function getDateRange(checkIn, checkOut) {
  const dates = []
  const cur   = new Date(checkIn)
  const end   = new Date(checkOut)
  while (cur < end) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

/**
 * Calculate nights between two dates
 */
export function calcNights(checkIn, checkOut) {
  const diff = new Date(checkOut) - new Date(checkIn)
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Parse a YYYY-MM-DD string into a Date at midnight UTC
 */
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
