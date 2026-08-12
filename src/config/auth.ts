import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import { prisma } from './prisma.js'
import { env } from './env.js'
import { validateSignupInput } from '../services/authValidation.js'

const validateSignup = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== '/sign-up/email') return

  const validation = validateSignupInput(ctx.body)

  if (!validation.success) {
    throw new APIError('BAD_REQUEST', {
      message: validation.message,
      code: 'VALIDATION_ERROR',
    })
  }

  return {
    context: {
      body: validation.data,
    },
  }
})

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  secret: env.betterAuthSecret,
  baseURL: env.authUrl,
  trustedOrigins: env.corsOrigins,
  ...(env.crossSiteCookies && {
    advanced: {
      crossSubDomainCookies: { enabled: true },
      defaultCookieAttributes: {
        sameSite: 'none' as const,
        secure: true,
      },
    },
  }),
  hooks: {
    before: validateSignup,
  },
})
