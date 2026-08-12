import type { RequestHandler } from 'express'

export const getProtected: RequestHandler = (_req, res) => {
  res.json({ message: "Authentifié : le middleware d'authentification fonctionne." })
}
