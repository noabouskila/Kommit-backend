import { describe, it, expect } from 'vitest'
import { mapAuthError } from './authErrorMapper.js'

// ──────────────────────────────────────────────────────────────
// Sections 3 et 4 du ticket KOM-06 :
//   - CA9  (section 3) : violation UNIQUE → EMAIL_ALREADY_EXISTS
//   - CA13 (section 4) : identifiants incorrects → INVALID_CREDENTIALS
//
// Ces deux CA sont 🟠 : la part unitaire (le mapping) est testee ici,
// le smoke manuel (confirmer la forme reelle de l'erreur de la
// dependance) est du ressort de smoke-test-writer.
// ──────────────────────────────────────────────────────────────

describe('Mapping des erreurs d\'authentification', () => {
  // ── CA9 — Violation UNIQUE email → EMAIL_ALREADY_EXISTS ────
  //
  // Forme mockee : PrismaClientKnownRequestError avec code P2002,
  // verifiee depuis les types source :
  //   node_modules/.pnpm/@prisma+client-runtime-utils@7.9.1/
  //     .../errors/PrismaClientKnownRequestError.d.ts
  //
  // ⚠️ Point remonte : l'erreur reelle peut etre un P2002 brut OU
  //    une erreur Better Auth qui le re-emballe. Better Auth n'est
  //    pas encore installe, la forme n'est pas confirmee. Le smoke
  //    de CA9 devra trancher.

  describe('CA9 — email deja utilise', () => {
    it('mappe une erreur Prisma P2002 sur le champ email en EMAIL_ALREADY_EXISTS', () => {
      const prismaError = Object.assign(
        new Error('Unique constraint failed on the fields: (`email`)'),
        {
          code: 'P2002',
          meta: { target: ['email'] },
          clientVersion: '7.9.1',
          name: 'PrismaClientKnownRequestError',
        },
      )

      const result = mapAuthError(prismaError)

      expect(result).not.toBeNull()
      expect(result!.code).toBe('EMAIL_ALREADY_EXISTS')
      expect(result!.status).toBe(409)
      expect(typeof result!.message).toBe('string')
      expect(result!.message.length).toBeGreaterThan(0)
    })

    it('ne mappe PAS une erreur P2002 sur un champ autre que email', () => {
      const prismaError = Object.assign(
        new Error('Unique constraint failed on the fields: (`username`)'),
        {
          code: 'P2002',
          meta: { target: ['username'] },
          clientVersion: '7.9.1',
          name: 'PrismaClientKnownRequestError',
        },
      )

      const result = mapAuthError(prismaError)

      expect(result).toBeNull()
    })

    it('ne mappe PAS une erreur Prisma qui n\'est pas un P2002', () => {
      const prismaError = Object.assign(
        new Error('Record not found'),
        {
          code: 'P2025',
          meta: {},
          clientVersion: '7.9.1',
          name: 'PrismaClientKnownRequestError',
        },
      )

      const result = mapAuthError(prismaError)

      expect(result).toBeNull()
    })
  })

  // ── CA13 — Identifiants incorrects → INVALID_CREDENTIALS ──
  //
  // ⚠️ Point remonte : Better Auth n'est pas installe. La forme
  //    exacte de son erreur d'identifiants incorrects n'est PAS
  //    verifiee a la source. Le mock ci-dessous est une
  //    approximation. Le smoke de CA13 devra confirmer la forme
  //    reelle et le test devra etre ajuste si elle differe.

  describe('CA13 — identifiants incorrects', () => {
    it('mappe une erreur d\'identifiants invalides en INVALID_CREDENTIALS', () => {
      const authError = Object.assign(
        new Error('Invalid email or password'),
        {
          // Forme supposee — a confirmer par smoke quand Better Auth sera installe
          code: 'INVALID_EMAIL_OR_PASSWORD',
        },
      )

      const result = mapAuthError(authError)

      expect(result).not.toBeNull()
      expect(result!.code).toBe('INVALID_CREDENTIALS')
      expect(result!.status).toBe(401)
      expect(typeof result!.message).toBe('string')
      expect(result!.message.length).toBeGreaterThan(0)
    })

    it('ne revele pas si c\'est l\'email ou le mot de passe qui est faux', () => {
      const authError = Object.assign(
        new Error('Invalid email or password'),
        { code: 'INVALID_EMAIL_OR_PASSWORD' },
      )

      const result = mapAuthError(authError)

      expect(result).not.toBeNull()
      const message = result!.message.toLowerCase()
      expect(message).not.toContain('email incorrect')
      expect(message).not.toContain('mot de passe incorrect')
      expect(message).not.toContain('wrong password')
      expect(message).not.toContain('wrong email')
    })
  })

  // ── Erreur inconnue → null (le error handler generique prend le relais) ──

  describe('erreur non reconnue', () => {
    it('renvoie null pour une erreur sans code connu', () => {
      const result = mapAuthError(new Error('Something unexpected'))

      expect(result).toBeNull()
    })

    it('renvoie null pour une valeur non-Error', () => {
      const result = mapAuthError('crash')

      expect(result).toBeNull()
    })
  })
})
