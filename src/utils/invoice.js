// src/utils/invoice.js
// Generates a booking confirmation PDF using pdf-lib
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const GREEN  = rgb(0.18, 0.29, 0.20)  // forest-mid #2D4A32
const GOLD   = rgb(0.79, 0.66, 0.43)  // #C9A96E
const GRAY   = rgb(0.47, 0.45, 0.40)
const BLACK  = rgb(0.11, 0.10, 0.09)
const WHITE  = rgb(1, 1, 1)
const LIGHT  = rgb(0.98, 0.96, 0.90)  // cream

export async function generateInvoicePDF(booking, room) {
  const doc     = await PDFDocument.create()
  const page    = doc.addPage([595, 842])  // A4
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const { width, height } = page.getSize()

  const checkinStr  = new Date(booking.checkIn).toLocaleDateString('en-IN',  { day: '2-digit', month: 'short', year: 'numeric' })
  const checkoutStr = new Date(booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const createdStr  = new Date(booking.createdAt).toLocaleDateString('en-IN',{ day: '2-digit', month: 'short', year: 'numeric' })

  // ── Header bar ──
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: GREEN })
  page.drawText('Village Utopia Cottages', { x: 40, y: height - 42, font: bold, size: 22, color: WHITE })
  page.drawText('Goa, India  ·  stay@villageutopia.in  ·  +91 98765 43210',
    { x: 40, y: height - 64, font: regular, size: 9, color: rgb(0.8, 0.9, 0.8) })
  page.drawText('BOOKING CONFIRMATION', { x: 40, y: height - 86, font: bold, size: 10, color: GOLD })

  // ── Booking ref box ──
  page.drawRectangle({ x: 380, y: height - 95, width: 175, height: 50, color: GOLD })
  page.drawText('Booking Ref', { x: 392, y: height - 58, font: bold, size: 8, color: GREEN })
  page.drawText(booking.bookingRef, { x: 392, y: height - 72, font: bold, size: 13, color: GREEN })

  // ── Guest info ──
  let y = height - 140
  page.drawText('GUEST DETAILS', { x: 40, y, font: bold, size: 9, color: GRAY })
  y -= 20
  ;[
    ['Name',    booking.guestName],
    ['Email',   booking.guestEmail],
    ['Phone',   booking.guestPhone],
    ['Booked',  createdStr],
  ].forEach(([label, value]) => {
    page.drawText(label + ':',  { x: 40,  y, font: bold,    size: 10, color: GRAY })
    page.drawText(value || '—', { x: 130, y, font: regular, size: 10, color: BLACK })
    y -= 18
  })

  // ── Stay details ──
  y -= 10
  page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 1, color: GOLD })
  y -= 20
  page.drawText('STAY DETAILS', { x: 40, y, font: bold, size: 9, color: GRAY })
  y -= 20
  ;[
    ['Room / Cottage', room.name],
    ['Type',           room.type === 'ROOM' ? 'Classic Room' : 'Forest Cottage'],
    ['Check-in',       checkinStr],
    ['Check-out',      checkoutStr],
    ['Nights',         String(booking.nights)],
    ['Guests',         String(booking.guests)],
  ].forEach(([label, value]) => {
    page.drawText(label + ':', { x: 40,  y, font: bold,    size: 10, color: GRAY })
    page.drawText(value,       { x: 200, y, font: regular, size: 10, color: BLACK })
    y -= 18
  })

  if (booking.specialRequests) {
    page.drawText('Special requests:', { x: 40, y, font: bold, size: 10, color: GRAY })
    page.drawText(booking.specialRequests, { x: 200, y, font: regular, size: 10, color: BLACK })
    y -= 18
  }

  // ── Cost breakdown ──
  y -= 14
  page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 1, color: GOLD })
  y -= 20
  page.drawText('COST BREAKDOWN', { x: 40, y, font: bold, size: 9, color: GRAY })
  y -= 20

  const addAmount = (label, amount, isBold = false) => {
    page.drawText(label, {
      x: 40, y, font: isBold ? bold : regular, size: 10, color: isBold ? BLACK : GRAY
    })
    page.drawText(`₹${amount.toLocaleString('en-IN')}`, {
      x: width - 80, y, font: isBold ? bold : regular, size: 10,
      color: isBold ? BLACK : GRAY
    })
    y -= 18
  }

  addAmount(`Room (₹${room.price.toLocaleString()} × ${booking.nights} nights)`, booking.roomCost)

  const addons = booking.addons || []
  if (addons.length > 0) {
    addons.forEach(a => addAmount(`  + ${a.label || a}`, a.price || 0))
  }

  y -= 4
  page.drawRectangle({ x: 40, y, width: width - 80, height: 1, color: GRAY })
  y -= 18
  addAmount('Total Amount', booking.totalAmount, true)

  // Payment status
  const paid    = booking.payment?.status === 'PAID'
  const paidAmt = booking.payment?.amount || 0
  const due     = booking.totalAmount - paidAmt

  page.drawText('Paid Now:', { x: 40, y, font: bold, size: 10, color: GRAY })
  page.drawText(`₹${paidAmt.toLocaleString('en-IN')}`, { x: width - 80, y, font: bold, size: 10, color: rgb(0.1, 0.55, 0.2) })
  y -= 18

  if (due > 0) {
    page.drawText('Balance due on arrival:', { x: 40, y, font: regular, size: 10, color: GRAY })
    page.drawText(`₹${due.toLocaleString('en-IN')}`, { x: width - 80, y, font: bold, size: 10, color: rgb(0.7, 0.35, 0.1) })
    y -= 18
  }

  // ── Status badge ──
  y -= 10
  const statusColor = booking.status === 'CONFIRMED' ? rgb(0.1, 0.55, 0.2) : GOLD
  page.drawRectangle({ x: 40, y: y - 8, width: 100, height: 22, color: statusColor, borderRadius: 4 })
  page.drawText(booking.status, { x: 50, y: y, font: bold, size: 10, color: WHITE })

  // ── Policies note ──
  y -= 60
  page.drawRectangle({ x: 40, y: y - 30, width: width - 80, height: 50, color: LIGHT })
  page.drawText('Policies:', { x: 50, y, font: bold, size: 9, color: GRAY })
  page.drawText('Free cancellation up to 48 hrs before check-in · Check-in: 12PM · Check-out: 11AM',
    { x: 50, y: y - 15, font: regular, size: 8, color: GRAY })

  // ── Footer ──
  page.drawRectangle({ x: 0, y: 0, width, height: 36, color: GREEN })
  page.drawText('Thank you for choosing Village Utopia Cottages · villageutopia.in',
    { x: 40, y: 12, font: regular, size: 9, color: rgb(0.7, 0.85, 0.7) })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
