// src/routes/rooms.routes.js
import { Router } from 'express'
import { listRooms, getRoom, checkAvailability, getBlockedDates } from '../controllers/rooms.controller.js'

const router = Router()
router.get('/',                       listRooms)
router.get('/:slug',                  getRoom)
router.get('/:id/availability',       checkAvailability)
router.get('/:id/blocked-dates',      getBlockedDates)
export default router
