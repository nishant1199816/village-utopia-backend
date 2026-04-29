// src/index.js
import 'dotenv/config'
import express    from 'express'
import cors       from 'cors'
import authRoutes    from './routes/auth.routes.js'
import roomsRoutes   from './routes/rooms.routes.js'
import bookingRoutes from './routes/booking.routes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app  = express()
const PORT = process.env.PORT || 3000

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
  ],
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'Village Utopia API',
    timestamp: new Date().toISOString(),
  })
})

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/rooms',    roomsRoutes)
app.use('/api/bookings', bookingRoutes)

// ── Error handling ──────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │   🌿 Village Utopia API                 │
  │   Running on http://localhost:${PORT}       │
  │   Env: ${process.env.NODE_ENV || 'development'}                   │
  └─────────────────────────────────────────┘
  `)
})

export default app
