
# kommit-backend

API REST en TypeScript (Node.js + Express), avec PostgreSQL hébergé chez Neon et accessible via Prisma.

## Arborescence

```
kommit-backend-ccem/
├── .claude/
│   └── rules/                      # règles de comportement (périmètre de travail, structure des dossiers, pnpm)
├── .vscode/
├── docs/
│   ├── authentication.md           # authentification (cookie de session) et ouverture d'un stream SSE
│   └── workflow-ticket-backend.md  # le workflow d'un ticket : inventaire → test-first → implémentation → PR
├── prisma/
│   ├── schema.prisma               # le schéma de la base (modèles Better Auth : User, Session, Account, Verification)
│   └── migrations/                 # les migrations appliquées
├── src/
│   ├── index.ts                    # démarrage du serveur
│   ├── app.ts                      # assemblage de l'app Express
│   ├── config/
│   │   ├── env.ts                  # variables d'environnement
│   │   ├── auth.ts                 # l'instance Better Auth
│   │   └── prisma.ts               # le client Prisma
│   ├── middlewares/
│   │   ├── errorHandler.ts
│   │   └── notFound.ts
│   ├── routes/
│   │   ├── index.ts                # le router principal
│   │   └── authRoutes.ts           # montage des routes Better Auth (/api/auth/*)
│   ├── controllers/                # les handlers des routes
│   │   ├── rootController.ts
│   │   ├── healthController.ts
│   │   └── dbHealthController.ts
│   ├── services/                   # la logique métier
│   │   └── dbHealthService.ts
│   └── generated/                  # client Prisma généré — ignoré par git
├── .env                            # variables d'environnement — ignoré par git
├── .env.example
├── .nvmrc                          # Node 24 (LTS ; Prisma 7 refuse Node 23)
├── eslint.config.js                # config ESLint (lancé par le hook Stop à chaque fin de tour)
├── prisma.config.ts                # config Prisma (URL directe pour les migrations)
├── tsconfig.json
├── package.json
└── TECH.md                         # la stack technique visée
```

> **À maintenir :** dès qu'un dossier ou un fichier de premier niveau est ajouté ou supprimé, mettre à jour cette arborescence en conséquence.
