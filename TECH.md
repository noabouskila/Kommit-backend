# Stack technique — Backend

API REST en TypeScript, exécutée sur Node.js.

## Runtime et serveur

- **Node.js** — le runtime.
- **Express** — le serveur HTTP : routes, middlewares, gestion des erreurs.
- **TypeScript** — tout le code est typé, en mode strict.

## Données

- **PostgreSQL** — la base de données.
- **Neon** — l'hébergeur PostgreSQL (serverless, avec branches de base de données).
- **Prisma ORM** — l'accès aux données : schéma, migrations et client typé.

## Authentification et validation

- **BetterAuth** — l'authentification : sessions, comptes, connexion/inscription.
- **Zod** — la validation des données entrantes (body, params, query) et le typage qui en découle.

## Qualité de code

- **ESLint** — le linter.

## Tests

- **Vitest** — les tests unitaires (logique métier, fonctions pures).
- **Playwright** — les tests end-to-end (parcours complets, depuis l'appel HTTP jusqu'à la base).
