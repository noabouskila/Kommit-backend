# Scenarios de smoke manuels -- KOM-06 Authentification backend

Ticket : [KOM-06 -- Authentification -- backend](https://app.notion.com/p/043f8acc5fea82ff9072814159f2f0a8)
Inventaire : `testing/inventaire-KOM-06.md`

> Ces scenarios sont ecrits **avant** l'implementation (test-first).
> Ils s'executent **apres**, une fois le code en place, serveur lance sur `localhost:3000`.

**Preparation commune** (a lancer une fois avant la serie) :

```bash
# serveur lance (pnpm dev), base Neon accessible, migration appliquee
EMAIL="smoke-$(date +%s)@kommit.test"
JAR=/tmp/kommit-smoke-cookies.txt
```

Les trois scenarios du premier paquet s'enchainent dans l'ordre : CA8 cree le compte que
CA12 reconnecte, CA5 ferme la session ouverte par CA12.

---

### 1 -- Cas nominaux : creation, connexion, deconnexion

| CA | Inventaire | Ce qu'on verifie | Scenario |
|---|---|---|---|
| CA8 | 🔴 Manuel | Signup valide : compte cree et utilisateur connecte automatiquement | Smoke CA8 ci-dessous |
| CA12 | 🔴 Manuel | Signin valide : utilisateur connecte | Smoke CA12 ci-dessous |
| CA5 | 🔴 Manuel | Signout : session fermee | Smoke CA5 ci-dessous |

#### Smoke CA8 -- Signup valide, connecte automatiquement

> **Ce qu'on verifie :**
> - Le signup avec prenom, email non utilise et mot de passe valide cree le compte et connecte automatiquement l'utilisateur (cookie de session pose dans la reponse).
> - C'est le flux natif de Better Auth + base : pas de code a nous a isoler, d'ou le smoke.

**Preconditions**

- Serveur lance, base accessible.
- `EMAIL` et `JAR` definis (preparation commune).
- Aucun compte n'existe avec cet email (garanti par le timestamp dans `EMAIL`).

**Etapes**

1. Creer le compte :

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -c "$JAR" \
  -d "{\"name\":\"Alice\",\"email\":\"$EMAIL\",\"password\":\"Password1234\"}"
```

2. Verifier que la session est posee, sans se reconnecter :

```bash
curl -s http://localhost:3000/api/auth/get-session -b "$JAR"
```

**Resultat attendu**

- Etape 1 : **200**, avec un header `Set-Cookie: better-auth.session_token=...`.
- Etape 2 : un JSON contenant `user` avec `name: "Alice"` et l'email envoye — pas `null`. La session est active sans passer par le signin.

- [ ] CA8 verifie

---

#### Smoke CA12 -- Signin valide, connecte

> **Ce qu'on verifie :**
> - Le signin avec des identifiants corrects connecte l'utilisateur (cookie de session pose).
> - Meme raison que CA8 : flux natif de Better Auth.

**Preconditions**

- Le compte de CA8 existe. Partir d'un cookie vierge pour prouver que c'est bien le signin qui connecte : `rm -f "$JAR"`.

**Etapes**

1. Se connecter :

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c "$JAR" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Password1234\"}"
```

2. Verifier la session :

```bash
curl -s http://localhost:3000/api/auth/get-session -b "$JAR"
```

**Resultat attendu**

- Etape 1 : **200**, avec un header `Set-Cookie: better-auth.session_token=...`.
- Etape 2 : un JSON contenant `user` avec l'email du compte — pas `null`.

- [ ] CA12 verifie

---

#### Smoke CA5 -- Signout, session fermee

> **Ce qu'on verifie :**
> - Apres signout, la session est fermee : le cookie de session ne permet plus d'acceder a une route protegee.
> - Flux natif de Better Auth : rien a isoler.

**Preconditions**

- Session active dans `$JAR` (sortie de CA12).

**Etapes**

1. Se deconnecter (le header `Origin` est obligatoire : Better Auth rejette en 403 un POST porteur de cookie sans `Origin` de confiance — protection CSRF ; un navigateur l'envoie toujours, curl non) :

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-out \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b "$JAR"
```

2. Reutiliser le **meme cookie** pour verifier que la session est fermee cote serveur (pas seulement le cookie efface chez le client) :

```bash
curl -s http://localhost:3000/api/auth/get-session -b "$JAR"
```

**Resultat attendu**

- Etape 1 : **200**.
- Etape 2 : `null` (l'etat « non connecte » du contrat) — l'identifiant de session ne correspond plus a rien cote serveur.

- [ ] CA5 verifie

---

### 2 -- Valeurs refusees

| CA | Inventaire | Ce qu'on verifie | Scenario |
|---|---|---|---|
| CA10 | 🟢 Unitaire | Email mal forme ou mot de passe < 8 chars refuse | Aucun smoke, couvert en unitaire |
| CA11 | 🟢 Unitaire | Signup sans prenom refuse | Aucun smoke, couvert en unitaire |
| CA20 | 🟢 Unitaire | Prenom d'espaces seulement refuse | Aucun smoke, couvert en unitaire |

Aucun scenario de smoke dans ce paquet : la validation Zod est notre code, testee en unitaire.

---

### 3 -- Unicite de l'email

| CA | Inventaire | Ce qu'on verifie | Scenario |
|---|---|---|---|
| CA9 | 🟠 Smoke | Email deja utilise : la DB rejette le doublon, pas de 500 | Smoke CA9 ci-dessous |
| CA21 | 🟢 Unitaire | Unicite insensible a la casse et aux espaces | Aucun smoke, couvert en unitaire |

#### Smoke CA9 -- Email deja utilise, EMAIL_ALREADY_EXISTS (complement du 🟠)

> **Ce qu'on verifie :**
> - Quand on tente un signup avec un email deja en base, le serveur repond `EMAIL_ALREADY_EXISTS` et non un 500.
> - La partie unitaire couvre le mapping violation UNIQUE -> `EMAIL_ALREADY_EXISTS`. Ce smoke confirme que la base rejette bien le doublon et que le 500 ne fuit pas dans le flux reel.

**Preconditions**

- Le compte de CA8 existe avec `$EMAIL`.

**Etapes**

Re-soumettre un signup avec le **meme** email :

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Bob\",\"email\":\"$EMAIL\",\"password\":\"AutreMotDePasse1234\"}"
```

**Resultat attendu**

- Code HTTP : **pas un 500**. Le code exact depend de la configuration Better Auth (probablement 422 ou 409).
- Le corps est un `ApiError` : `{ "code": "EMAIL_ALREADY_EXISTS", "message": "..." }`.
- Aucun second compte n'est cree.

- [ ] CA9 verifie (smoke)

---

### 4 -- Gestion des erreurs et pannes

| CA | Inventaire | Ce qu'on verifie | Scenario |
|---|---|---|---|
| CA13 | 🟠 Smoke | Identifiants incorrects : Better Auth rejette, wrapper intercepte | Smoke CA13 ci-dessous |
| CA18, CA19 | 🟢 Unitaire | Panne : reponse INTERNAL_ERROR, distincte des erreurs metier | Aucun smoke, couvert en unitaire |
| CA2 | 🔴 Manuel | Route protegee sans session : reponse 401 | Smoke CA2 ci-dessous |

#### Smoke CA13 -- Identifiants incorrects, INVALID_CREDENTIALS (complement du 🟠)

> **Ce qu'on verifie :**
> - Quand on soumet un signin avec un mauvais mot de passe, le serveur repond `INVALID_CREDENTIALS`.
> - La partie unitaire couvre le mapping erreur Better Auth -> `INVALID_CREDENTIALS`. Ce smoke confirme que Better Auth rejette bien de mauvais identifiants et que notre wrapper intercepte dans le flux reel.

**Preconditions**

- Le compte de CA8 existe avec `$EMAIL` et le mot de passe `Password1234`.

**Etapes**

Se connecter avec le bon email mais un **mauvais** mot de passe :

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"MauvaisMotDePasse\"}"
```

**Resultat attendu**

- Code HTTP : **pas un 200** (probablement 401).
- Le corps est un `ApiError` : `{ "code": "INVALID_CREDENTIALS", "message": "..." }`.
- Le message ne revele pas si c'est l'email ou le mot de passe qui est faux (message generique, cf. contrat).

- [ ] CA13 verifie (smoke)

---

#### Smoke CA2 -- Route protegee sans session, 401

> **Ce qu'on verifie :**
> - Une requete sans cookie de session sur une route protegee recoit un 401.
> - Le middleware de session de Better Auth lit le cookie, cherche la session, renvoie 401 si absente. Pas de code a nous a isoler.

**Preconditions**

- Serveur lance.
- **Aucun cookie de session** envoye (on n'utilise pas `-b "$JAR"`).
- Ce smoke vise `GET /protected`, une route de demonstration jetable montee derriere `requireAuth` (elle existe uniquement pour rendre CA2 jouable tant que les vraies routes protegees de F2 n'existent pas). Un **404** au lieu d'un 401 signifierait que la route n'est pas montee.

```bash
PROTECTED_URL=http://localhost:3000/protected
```

**Etapes**

Appeler la route protegee **sans** cookie de session :

```bash
curl -i "$PROTECTED_URL"
```

**Resultat attendu**

- **401** — le middleware refuse la requete faute de session valide, le handler n'est jamais atteint. Ni **200** (la route ne doit pas repondre sans session), ni **404** (la route existe et est bien montee derriere le middleware).

- [ ] CA2 verifie

---

### 5 -- CORS

| CA | Inventaire | Ce qu'on verifie | Scenario |
|---|---|---|---|
| CX | 🔴 Manuel | Whitelist des origines autorisees (localhost:5173 a 5176) | Smoke CX ci-dessous |

#### Smoke CX -- Whitelist CORS

> **Ce qu'on verifie :**
> - Le serveur accepte les requetes cross-origin depuis les origines `localhost:5173` a `localhost:5176` (header `Access-Control-Allow-Origin` present, credentials autorisees).
> - Une origine hors whitelist est refusee (pas de header ACAO).
> - C'est de la configuration du middleware `cors`, pas du code a nous : le comportement ne se teste qu'en conditions reelles.

**Preconditions**

- Serveur lance.

**Etapes**

1. Origine autorisee (preflight) :

```bash
curl -v -X OPTIONS http://localhost:3000/api/auth/sign-in/email \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

2. Origine refusee (preflight) :

```bash
curl -v -X OPTIONS http://localhost:3000/api/auth/sign-in/email \
  -H "Origin: http://localhost:9999" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

3. Origine autorisee (requete simple) :

```bash
curl -v http://localhost:3000/health \
  -H "Origin: http://localhost:5174"
```

**Resultat attendu**

- Etape 1 : les headers de reponse contiennent `Access-Control-Allow-Origin: http://localhost:5173` et `Access-Control-Allow-Credentials: true`. Code HTTP **204** (preflight OK).
- Etape 2 : le header `Access-Control-Allow-Origin` est **absent** ou ne contient pas `http://localhost:9999`.
- Etape 3 : le header `Access-Control-Allow-Origin: http://localhost:5174` est present.

> **Note :** ce scenario fait 3 etapes mais chacune est un curl independant, pas un enchainement avec etat.

- [ ] CX verifie
