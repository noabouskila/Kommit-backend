import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'

// ──────────────────────────────────────────────────────────────
// Section 4 du ticket KOM-06 : Gestion des erreurs et pannes
// CA18, CA19 — Panne → INTERNAL_ERROR, distinct des erreurs metier
//
// L'error handler est le catch-all Express. Il doit :
//   1. Mapper toute erreur inconnue en { code: 'INTERNAL_ERROR', message }
//   2. Laisser passer les erreurs metier avec leur code d'origine
// ──────────────────────────────────────────────────────────────

describe('Error handler (CA18, CA19)', () => {
  let req: Request
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    req = {} as Request
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response
    next = vi.fn() as unknown as NextFunction
  })

  // ── CA18/CA19 — erreur inconnue → INTERNAL_ERROR ──────────

  describe('erreur inconnue → INTERNAL_ERROR', () => {
    it('repond 500 avec code INTERNAL_ERROR pour une Error generique', () => {
      errorHandler(new Error('boom'), req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INTERNAL_ERROR' }),
      )
    })

    it('repond 500 avec code INTERNAL_ERROR pour une TypeError', () => {
      errorHandler(new TypeError('cannot read property x of undefined'), req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INTERNAL_ERROR' }),
      )
    })

    it('inclut un message dans la reponse INTERNAL_ERROR', () => {
      errorHandler(new Error('panne'), req, res, next)

      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(typeof body.message).toBe('string')
      expect(body.message.length).toBeGreaterThan(0)
    })

    it('ne fuit PAS le message technique de l\'erreur originale dans la reponse', () => {
      errorHandler(new Error('ECONNREFUSED 127.0.0.1:5432'), req, res, next)

      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(body.message).not.toContain('ECONNREFUSED')
      expect(body.message).not.toContain('5432')
    })
  })

  // ── CA18/CA19 — erreur metier → code preserve, pas INTERNAL_ERROR ──

  describe('erreur metier → code et status preserves', () => {
    it('preserve le code EMAIL_ALREADY_EXISTS et le status 409', () => {
      const businessError = Object.assign(
        new Error('Un compte avec cet email existe deja'),
        { code: 'EMAIL_ALREADY_EXISTS', statusCode: 409 },
      )

      errorHandler(businessError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'EMAIL_ALREADY_EXISTS' }),
      )
    })

    it('preserve le code INVALID_CREDENTIALS et le status 401', () => {
      const businessError = Object.assign(
        new Error('Identifiants incorrects'),
        { code: 'INVALID_CREDENTIALS', statusCode: 401 },
      )

      errorHandler(businessError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
      )
    })

    it('preserve le code VALIDATION_ERROR et le status 400', () => {
      const businessError = Object.assign(
        new Error('Le prenom est requis'),
        { code: 'VALIDATION_ERROR', statusCode: 400 },
      )

      errorHandler(businessError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      )
    })
  })

  // ── Forme de la reponse : toujours ApiError { code, message } ──

  describe('forme de la reponse', () => {
    it('la reponse a exactement les champs code et message', () => {
      errorHandler(new Error('crash'), req, res, next)

      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(body).toHaveProperty('code')
      expect(body).toHaveProperty('message')
    })
  })
})
