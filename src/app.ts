import express, { type Express } from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'
import routes from './routes/index.js'
import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { corsOptions } from './config/cors.js'

const app: Express = express()

app.use(cors(corsOptions))
app.use(authRoutes)
app.use(express.json())
app.use(routes)
app.use(notFound)
app.use(errorHandler)

export default app
