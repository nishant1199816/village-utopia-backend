// src/routes/booking.routes.js
import { Router } from 'express'
import {
  createOrder, verifyPayment, createOfflineBooking,
  myBookings, getBooking, cancelBooking,
} from '../controllers/booking.controller.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const router = Router()

router.post('/create-order',   optionalAuth, createOrder)
router.post('/verify-payment', optionalAuth, verifyPayment)
router.post('/offline',        optionalAuth, createOfflineBooking)
router.get('/my',              requireAuth,  myBookings)
router.get('/:id',             optionalAuth, getBooking)
router.post('/:id/cancel',     requireAuth,  cancelBooking)

export default router
