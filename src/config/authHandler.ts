import { auth } from './auth.js'
import { mapAuthError } from '../services/authErrorMapper.js'

const handler: typeof auth.handler = async (request) => {
  const response = await auth.handler(request)

  if (response.status < 400) return response

  const body = await response.clone().json().catch(() => null)
  const mapped = mapAuthError(
    Object.assign(new Error(body?.message ?? 'Unknown error'), {
      code: body?.code,
      meta: body?.meta,
    }),
  )

  if (!mapped) {
    if (response.status >= 500) {
      const headers = new Headers(response.headers)
      headers.delete('content-length')
      headers.set('content-type', 'application/json')
      return new Response(
        JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue' }),
        { status: 500, headers },
      )
    }
    return response
  }

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('content-type', 'application/json')

  return new Response(JSON.stringify({ code: mapped.code, message: mapped.message }), { status: mapped.status, headers })
}

export const authHandler = { ...auth, handler }
