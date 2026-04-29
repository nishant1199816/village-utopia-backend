// src/controllers/rooms.controller.js
import prisma     from '../config/db.js'
import { parseDate, getDateRange } from '../utils/helpers.js'

// GET /api/rooms  ?type=ROOM|COTTAGE&checkin=&checkout=&guests=
export async function listRooms(req, res, next) {
  try {
    const { type, checkin, checkout, guests } = req.query

    const where = { active: true }
    if (type) where.type = type.toUpperCase()
    if (guests) where.capacity = { gte: parseInt(guests) }

    let rooms = await prisma.room.findMany({
      where,
      orderBy: { price: 'asc' },
    })

    // Filter out rooms with conflicting bookings if dates provided
    if (checkin && checkout) {
      const inDate  = parseDate(checkin)
      const outDate = parseDate(checkout)
      const bookedDates = await prisma.availability.findMany({
        where: {
          date:    { gte: inDate, lt: outDate },
          isBooked: true,
        },
        select: { roomId: true },
      })
      const bookedRoomIds = new Set(bookedDates.map(b => b.roomId))
      rooms = rooms.filter(r => !bookedRoomIds.has(r.id))
    }

    res.json({ rooms, count: rooms.length })
  } catch (e) { next(e) }
}

// GET /api/rooms/:slug
export async function getRoom(req, res, next) {
  try {
    const room = await prisma.room.findUnique({
      where: { slug: req.params.slug, active: true },
    })
    if (!room) return res.status(404).json({ error: 'Room not found' })
    res.json({ room })
  } catch (e) { next(e) }
}

// GET /api/rooms/:id/availability?checkin=&checkout=
export async function checkAvailability(req, res, next) {
  try {
    const { id }  = req.params
    const { checkin, checkout } = req.query

    if (!checkin || !checkout)
      return res.status(400).json({ error: 'checkin and checkout are required' })

    const inDate  = parseDate(checkin)
    const outDate = parseDate(checkout)

    if (outDate <= inDate)
      return res.status(400).json({ error: 'checkout must be after checkin' })

    const blocked = await prisma.availability.findMany({
      where: {
        roomId:   id,
        date:     { gte: inDate, lt: outDate },
        isBooked: true,
      },
    })

    const available = blocked.length === 0
    res.json({ available, blockedDates: blocked.map(b => b.date) })
  } catch (e) { next(e) }
}

// GET /api/rooms/:id/blocked-months?year=&month=
// Returns all booked dates for a calendar month (for frontend calendar)
export async function getBlockedDates(req, res, next) {
  try {
    const { id }          = req.params
    const { year, month } = req.query

    const y  = parseInt(year  || new Date().getFullYear())
    const m  = parseInt(month || new Date().getMonth() + 1)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end   = new Date(Date.UTC(y, m,     1))

    const blocked = await prisma.availability.findMany({
      where: { roomId: id, date: { gte: start, lt: end }, isBooked: true },
      select: { date: true },
    })

    res.json({ blockedDates: blocked.map(b => b.date.toISOString().split('T')[0]) })
  } catch (e) { next(e) }
}
