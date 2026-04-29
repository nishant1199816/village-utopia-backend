// src/controllers/auth.controller.js
import bcrypt  from 'bcryptjs'
import jwt     from 'jsonwebtoken'
import prisma  from '../config/db.js'

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// POST /api/auth/register
export async function register(req, res, next) {
  try {
    const { name, email, phone, password } = req.body
    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: 'All fields are required' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    })

    res.status(201).json({ token: signToken(user), user })
  } catch (e) { next(e) }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const { passwordHash: _, ...safeUser } = user
    res.json({ token: signToken(user), user: safeUser })
  } catch (e) { next(e) }
}

// GET /api/auth/me
export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (e) { next(e) }
}
