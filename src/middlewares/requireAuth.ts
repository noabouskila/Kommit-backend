import type { RequestHandler } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../config/auth.js'

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })

    if (!session) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Non authentifié' })
      return
    }

    next()
  } catch (err) {
    next(err)
  }
}
