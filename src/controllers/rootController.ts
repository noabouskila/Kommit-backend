import type { Request, Response } from 'express'

export function getRoot(_req: Request, res: Response) {
  res.json({ message: 'kommit-backend is running' })
}
