import type { Request, Response, NextFunction } from 'express'

const KNOWN_CODES = new Set([
  'EMAIL_ALREADY_EXISTS',
  'INVALID_CREDENTIALS',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
])

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const typed = err as Error & { code?: string; statusCode?: number }

  if (typed.code && KNOWN_CODES.has(typed.code) && typed.statusCode) {
    res.status(typed.statusCode).json({ code: typed.code, message: typed.message })
    return
  }

  console.error(err)
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue' })
}
