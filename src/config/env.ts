const port = Number(process.env.PORT) || 3000

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const authUrl = process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`)
  return value
}

export const env = {
  PORT: port,
  DATABASE_URL: requireEnv('DATABASE_URL'),
  betterAuthSecret: requireEnv('BETTER_AUTH_SECRET'),
  authUrl,
  corsOrigins,
  crossSiteCookies: (process.env.CROSS_SITE_COOKIES ?? (authUrl.startsWith('https://') ? 'true' : 'false')) === 'true',
}
