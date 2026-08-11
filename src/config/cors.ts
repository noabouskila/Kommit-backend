import type { CorsOptions } from 'cors'

export const corsOptions: CorsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
  ],
  credentials: true,
}
