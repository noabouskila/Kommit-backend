import { Router, type Router as RouterType } from 'express'
import { toNodeHandler } from 'better-auth/node'
import { authHandler } from '../config/authHandler.js'

const authRoutes: RouterType = Router()

authRoutes.all('/api/auth/{*any}', toNodeHandler(authHandler))

export default authRoutes
