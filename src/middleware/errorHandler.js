// src/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message)
  const status = err.status || 500
  res.status(status).json({
    error:   err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` })
}
