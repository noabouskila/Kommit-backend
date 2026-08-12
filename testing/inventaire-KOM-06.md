# Inventaire des tests -- KOM-06 Authentification backend

Ticket : [KOM-06 -- Authentification -- backend](https://app.notion.com/p/043f8acc5fea82ff9072814159f2f0a8)
Doctrine appliquee : `docs/testing-strategy.md`

---

### 1 -- Cas nominaux : creation, connexion, deconnexion

| CA | Ce qu'on verifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| CA8 | Signup valide : compte cree et utilisateur connecte automatiquement | 🔴 | Le signup + auto-login est le flux natif de Better Auth + base. Pas d'endpoint maison, pas de code a nous a isoler : on configure Better Auth, c'est lui qui cree le compte et ouvre la session. Mocker reviendrait a mocker ce qu'on teste. | Manuel (smoke) |
| CA12 | Signin valide : utilisateur connecte | 🔴 | Le signin est le flux natif de Better Auth + base. Meme raison que CA8 : la verification porte sur le comportement reel de Better Auth. | Manuel (smoke) |
| CA5 | Signout : session fermee | 🔴 | Le signout est le flux natif de Better Auth. Aucun code a nous a isoler. | Manuel (smoke) |

### 2 -- Valeurs refusees

| CA | Ce qu'on verifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| CA10 | Email mal forme ou mot de passe < 8 chars : requete refusee, aucun compte cree | 🟢 | La validation Zod du signup verifie le format de l'email et la longueur du mot de passe. C'est notre schema, testable en isolation sans dependance externe. | Unitaire, test-first |
| CA11 | Signup sans prenom : requete refusee, aucun compte cree | 🟢 | La validation Zod du champ `name` (presence) est notre code. Le schema Zod se teste en isolation. | Unitaire, test-first |
| CA20 | Prenom d'espaces seulement : refuse comme CA11 | 🟢 | Le trim avant validation puis le rejet du vide est notre code Zod. Meme schema que CA11, cas supplementaire. | Unitaire, test-first |

### 3 -- Unicite de l'email

| CA | Ce qu'on verifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| CA9 | Email deja utilise : reponse `EMAIL_ALREADY_EXISTS`, pas de 500 | 🟠 | Le mapping de la violation `UNIQUE` en `EMAIL_ALREADY_EXISTS` est notre code (on mocke l'erreur de la dependance et on verifie la sortie). Mais la forme exacte de l'erreur qu'on mocke (Prisma P2002 ou Better Auth) n'est confirmee par aucun smoke existant. La contrainte technique le dit : « une violation UNIQUE ressort en CA9, jamais en 500 ». | Unitaire (mapping violation -> EMAIL_ALREADY_EXISTS) + smoke manuel (confirmer que la DB rejette le doublon et que le 500 ne fuit pas) |
| CA21 | Unicite insensible a la casse et aux espaces (` MARC@x.com ` refuse si `marc@x.com` existe) | 🟢 | La normalisation de l'email (lowercase + trim) avant stockage et avant controle d'unicite est notre code, testable en isolation. Si la normalisation est correcte, les deux emails produisent la meme valeur et la contrainte UNIQUE (couverte par le smoke de CA9) fait le reste. | Unitaire, test-first |

### 4 -- Gestion des erreurs et pannes

| CA | Ce qu'on verifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| CA13 | Identifiants incorrects : reponse `INVALID_CREDENTIALS` | 🟠 | Le re-emballage de l'erreur Better Auth en `INVALID_CREDENTIALS` est notre code, mockable. Mais la forme exacte de l'erreur Better Auth qu'on mocke n'est confirmee par aucun smoke existant. | Unitaire (mapping erreur Better Auth -> INVALID_CREDENTIALS) + smoke manuel (confirmer que Better Auth rejette de mauvais identifiants et que notre wrapper intercepte) |
| CA18, CA19 | Panne (5xx, timeout) : reponse `INTERNAL_ERROR`, distincte des erreurs metier | 🟢 | Notre error handler attrape toute erreur inconnue et la mappe en `INTERNAL_ERROR`. C'est un catch-all : il ne depend pas d'une forme specifique d'erreur de la dependance. On teste que toute erreur non-metier produit INTERNAL_ERROR et que les erreurs metier conservent leur code. | Unitaire, test-first |
| CA2 | Route protegee sans session : reponse 401 | 🔴 | La protection repose sur le middleware de session de Better Auth : c'est lui qui lit le cookie, cherche la session et renvoie 401. Le mocker reviendrait a mocker le comportement qu'on veut verifier. | Manuel (smoke) |

### 5 -- CORS

| CA | Ce qu'on verifie | Testable unitaire ? | Pourquoi | Comment |
|---|---|---|---|---|
| CX | Whitelist des origines autorisees (localhost:5173 a 5176) | 🔴 | La whitelist CORS est de la configuration du middleware `cors`. Le comportement reel (headers `Access-Control-Allow-Origin`, preflight) depend du middleware + des requetes HTTP reelles. Rien a mocker qui soit notre code. | Manuel (smoke) |

---

## Recap

### Test unitaire automatise (-> `unit-test-writer`)

- **CA10** -- Validation Zod : email mal forme ou mot de passe < 8 chars refuse
- **CA11** -- Validation Zod : signup sans prenom refuse
- **CA20** -- Validation Zod : prenom d'espaces seulement refuse (trim + rejet du vide)
- **CA21** -- Normalisation email : lowercase + trim avant stockage et controle d'unicite
- **CA18, CA19** -- Error handler : toute erreur inconnue mappe en `INTERNAL_ERROR`, distincte des erreurs metier

### Couverture partielle : unitaire + smoke manuel

- **CA9** -- Unitaire : mapping violation UNIQUE -> `EMAIL_ALREADY_EXISTS`. Smoke : confirmer que la DB rejette le doublon et que le 500 ne fuit pas.
- **CA13** -- Unitaire : mapping erreur Better Auth -> `INVALID_CREDENTIALS`. Smoke : confirmer que Better Auth rejette de mauvais identifiants et que notre wrapper intercepte.

### Verification manuelle uniquement (-> `smoke-test-writer`)

- **CA8** -- Signup valide, connecte automatiquement (flux natif Better Auth)
- **CA12** -- Signin valide, connecte (flux natif Better Auth)
- **CA5** -- Signout, session fermee (flux natif Better Auth)
- **CA2** -- Route protegee sans session, 401 (middleware de session Better Auth)
- **CX** -- Whitelist CORS (config a verifier en conditions reelles)
