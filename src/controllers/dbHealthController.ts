import type { Request, Response } from 'express'
import { checkDbHealth } from '../services/dbHealthService.js'

export async function getDbHealth(_req: Request, res: Response) {
  try {
    const result = await checkDbHealth()
    res.json(result)
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unreachable' })
  }
}
