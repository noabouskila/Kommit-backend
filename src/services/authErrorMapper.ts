export type ApiError = { code: string; message: string; status: number }

export function mapAuthError(error: unknown): ApiError | null {
  if (!(error instanceof Error)) return null

  const err = error as Error & { code?: string; meta?: { target?: string[] } }

  if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
    return { code: 'EMAIL_ALREADY_EXISTS', message: 'Un compte avec cet email existe déjà', status: 409 }
  }

  if (err.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
    return { code: 'EMAIL_ALREADY_EXISTS', message: 'Un compte avec cet email existe déjà', status: 409 }
  }

  if (err.code === 'INVALID_EMAIL_OR_PASSWORD') {
    return { code: 'INVALID_CREDENTIALS', message: 'Identifiants incorrects', status: 401 }
  }

  return null
}
