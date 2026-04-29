// src/controllers/booking.controller.js
import Razorpay  from 'razorpay'
import crypto    from 'crypto'
import prisma    from '../config/db.js'
import { generateBookingRef, getDateRange, calcNights, parseDate } from '../utils/helpers.js'
import { sendBookingConfirmation, sendCancellationEmail } from '../utils/email.js'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const ADDON_PRICES = {
  breakfast:  350,
  dinner:     550,
  pickup:     800,
  drop:       800,
  'extra-bed': 700,
}

// ─── POST /api/bookings/create-order ──────────────────────────
// Step 1: Validate, compute price, create Razorpay order, save pending booking
export async function createOrder(req, res, next) {
  try {
    const {
      roomId, checkin, checkout, guests,
      guestName, guestEmail, guestPhone, specialRequests,
      addons = [], paymentType = 'FULL',
    } = req.body

    // ── Validate ──
    if (!roomId || !checkin || !checkout || !guestName || !guestEmail || !guestPhone)
      return res.status(400).json({ error: 'Missing required fields' })

    const inDate  = parseDate(checkin)
    const outDate = parseDate(checkout)
    if (outDate <= inDate)
      return res.status(400).json({ error: 'checkout must be after checkin' })

    // ── Check room exists ──
    const room = await prisma.room.findUnique({ where: { id: roomId, active: true } })
    if (!room) return res.status(404).json({ error: 'Room not found' })

    // ── Check availability ──
    const dates   = getDateRange(inDate, outDate)
    const blocked = await prisma.availability.findMany({
      where: { roomId, date: { in: dates }, isBooked: true },
    })
    if (blocked.length > 0)
      return res.status(409).json({ error: 'Room is not available for selected dates' })

    // ── Calculate cost ──
    const nights    = calcNights(inDate, outDate)
    const roomCost  = room.price * nights
    const addonCost = addons.reduce((sum, id) => {
      const price = ADDON_PRICES[id] || 0
      const perNight = id === 'extra-bed' ? price * nights : price * guests * nights
      return sum + perNight
    }, 0)
    const totalAmount = roomCost + addonCost
    const amountToPay = paymentType === 'FULL'
      ? totalAmount
      : Math.round(totalAmount * 0.3)

    // ── Create Razorpay order ──
    const rzpOrder = await razorpay.orders.create({
      amount:   amountToPay * 100,   // paise
      currency: 'INR',
      receipt:  `vu_${Date.now()}`,
    })

    // ── Save booking as PENDING ──
    const bookingRef = await generateBookingRef(prisma)
    const booking = await prisma.booking.create({
      data: {
        bookingRef,
        roomId,
        userId: req.user?.id || null,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests: specialRequests || null,
        checkIn:  inDate,
        checkOut: outDate,
        nights,
        guests: parseInt(guests),
        roomCost,
        addonCost,
        totalAmount,
        addons,
        status:      'PENDING',
        paymentType: paymentType === 'FULL' ? 'FULL' : 'PARTIAL',
        payment: {
          create: {
            razorpayOrderId: rzpOrder.id,
            method:          'ONLINE',
            amount:          amountToPay,
            totalAmount,
            status:          'PENDING',
          },
        },
      },
      include: { payment: true },
    })

    res.json({
      bookingId:      booking.id,
      bookingRef:     booking.bookingRef,
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId:  process.env.RAZORPAY_KEY_ID,
      amount:         amountToPay,
      totalAmount,
      currency:       'INR',
    })
  } catch (e) { next(e) }
}

// ─── POST /api/bookings/verify-payment ────────────────────────
// Step 2: Called after Razorpay checkout success — verifies signature
export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body

    // ── Signature verification ──
    const body      = razorpay_order_id + '|' + razorpay_payment_id
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature)
      return res.status(400).json({ error: 'Payment verification failed' })

    // ── Get booking ──
    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { room: true },
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    // ── Block dates ──
    const dates = getDateRange(booking.checkIn, booking.checkOut)
    await prisma.availability.createMany({
      data: dates.map(date => ({
        roomId:    booking.roomId,
        date,
        isBooked:  true,
        bookingId: booking.id,
      })),
      skipDuplicates: true,
    })

    // ── Confirm booking + payment ──
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data:  { status: 'CONFIRMED' },
      }),
      prisma.payment.update({
        where: { bookingId },
        data:  {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status:            'PAID',
          paidAt:            new Date(),
        },
      }),
    ])

    // Send confirmation email with PDF invoice (non-blocking)
    const confirmedBooking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { room: true, payment: true },
    })
    sendBookingConfirmation(confirmedBooking, confirmedBooking.room).catch(err =>
      console.error('[EMAIL ERROR]', err.message)
    )

    res.json({
      success:    true,
      bookingRef: booking.bookingRef,
      message:    'Payment confirmed. Booking is confirmed!',
    })
  } catch (e) { next(e) }
}

// ─── POST /api/bookings/offline ───────────────────────────────
// For cash / bank transfer bookings (manually confirmed)
export async function createOfflineBooking(req, res, next) {
  try {
    const {
      roomId, checkin, checkout, guests,
      guestName, guestEmail, guestPhone, specialRequests,
      addons = [],
    } = req.body

    const inDate  = parseDate(checkin)
    const outDate = parseDate(checkout)
    const room    = await prisma.room.findUnique({ where: { id: roomId, active: true } })
    if (!room) return res.status(404).json({ error: 'Room not found' })

    const nights      = calcNights(inDate, outDate)
    const roomCost    = room.price * nights
    const addonCost   = addons.reduce((sum, id) => {
      const p = ADDON_PRICES[id] || 0
      return sum + (id === 'extra-bed' ? p * nights : p * parseInt(guests) * nights)
    }, 0)
    const totalAmount = roomCost + addonCost
    const bookingRef  = await generateBookingRef(prisma)

    const booking = await prisma.booking.create({
      data: {
        bookingRef,
        roomId,
        userId: req.user?.id || null,
        guestName, guestEmail, guestPhone,
        specialRequests: specialRequests || null,
        checkIn: inDate, checkOut: outDate,
        nights, guests: parseInt(guests),
        roomCost, addonCost, totalAmount,
        addons,
        status:      'CONFIRMED',
        paymentType: 'FULL',
        payment: {
          create: {
            method:      'OFFLINE',
            amount:      totalAmount,
            totalAmount,
            status:      'PENDING',   // pending until cash received
          },
        },
      },
    })

    // Block dates
    const dates = getDateRange(inDate, outDate)
    await prisma.availability.createMany({
      data: dates.map(date => ({ roomId, date, isBooked: true, bookingId: booking.id })),
      skipDuplicates: true,
    })

    res.status(201).json({ booking: { id: booking.id, bookingRef: booking.bookingRef, totalAmount } })
  } catch (e) { next(e) }
}

// ─── GET /api/bookings/my ─────────────────────────────────────
// Logged-in user's booking history
export async function myBookings(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      where:   { userId: req.user.id },
      include: { room: { select: { name: true, images: true, type: true } }, payment: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ bookings })
  } catch (e) { next(e) }
}

// ─── GET /api/bookings/:id ────────────────────────────────────
export async function getBooking(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({
      where:   { id: req.params.id },
      include: { room: true, payment: true },
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    // Only owner or admin can view
    if (booking.userId && booking.userId !== req.user?.id)
      return res.status(403).json({ error: 'Forbidden' })

    res.json({ booking })
  } catch (e) { next(e) }
}

// ─── POST /api/bookings/:id/cancel ───────────────────────────
export async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params
    const booking = await prisma.booking.findUnique({
      where: { id }, include: { payment: true }
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.userId !== req.user?.id)
      return res.status(403).json({ error: 'Forbidden' })
    if (booking.status === 'CANCELLED')
      return res.status(400).json({ error: 'Already cancelled' })

    // Free up availability
    await prisma.availability.deleteMany({ where: { bookingId: id } })

    await prisma.booking.update({
      where: { id },
      data:  { status: 'CANCELLED' },
    })

    sendCancellationEmail(booking).catch(err => console.error('[EMAIL ERROR]', err.message))

    res.json({ success: true, message: 'Booking cancelled. Refund policy applies.' })
  } catch (e) { next(e) }
}
