---
name: setup-cd
description: Met en place le déploiement continu du service DEV sur Render en écrivant un `render.yaml` (config-as-code) et, si le MCP Render est connecté, en créant le service et en posant ses variables ; sinon il guide les étapes manuelles du dashboard. DEV uniquement pour l'instant, la PROD viendra au soir 7. Action à effet, confirmée avant exécution. Utiliser quand l'utilisateur dit "setup-cd", "branche Render", "mets en place la CD", "déploiement continu".
---

## Entrée

- Le **repo courant** : branche `dev`, scripts `build` (`pnpm install && pnpm build`) et `start` (`pnpm start`), `.nvmrc`, et les variables du service (`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`).
- La **disponibilité du MCP Render** (connecté ou non), qui décide du mode d'exécution.
- Les **valeurs des secrets de DEV**, fournies par l'utilisateur hors du repo (jamais commitées).

## Sortie

- Un **`render.yaml`** à la racine du repo, déclarant le service DEV (config-as-code, versionnée).
- Selon le MCP : soit le **service Render DEV créé et branché** sur `dev` (auto-deploy, variables), soit la **liste des étapes manuelles** restantes si le MCP n'est pas connecté.
- Après un déploiement, **`/health` répond** sur l'instance.

Périmètre : **DEV seulement**. La PROD est un autre environnement, traité au soir 7 (voir le bloc en fin de fichier).

---

## Étapes

1. **Détecter le contexte.** MCP Render connecté ou non. Scripts `build` / `start` du `package.json`, version du `.nvmrc` (Render la lit). Variables exigées au runtime (`config/env.ts`) et au build (`prisma.config.ts` qui fait `throw` si `DIRECT_URL` manque).

2. **Écrire `render.yaml` (toujours, MCP ou pas).** Un blueprint qui déclare le service DEV, sans jamais mettre les valeurs des secrets (`sync: false`) :

   ```yaml
   services:
     - type: web
       name: kommit-backend-dev
       runtime: node
       branch: dev
       autoDeploy: true
       buildCommand: pnpm install --frozen-lockfile && pnpm build
       startCommand: pnpm start
       healthCheckPath: /health
       envVars:
         - key: DATABASE_URL
           sync: false
         - key: DIRECT_URL
           sync: false
         - key: BETTER_AUTH_SECRET
           sync: false
         - key: BETTER_AUTH_URL
           sync: false
         - key: CORS_ORIGINS
           sync: false
   ```

   **`BETTER_AUTH_URL` est l'URL publique du backend déployé** (ex. `https://kommit-backend-dev.onrender.com`). Better Auth s'en sert pour son `baseURL` et pour poser les cookies de session en cross-site (`SameSite=None; Secure`) ; sans elle, le code retombe sur `http://localhost` et la session ne tient pas depuis un front sur un autre domaine. Ce n'est pas un secret, mais on la laisse en `sync: false` (valeur posée dans le dashboard) comme les autres variables d'environnement.

   **Pas de `preDeployCommand` (migrations) en DEV.** La base Neon de DEV est la même en local et en ligne, et les migrations sont appliquées en local avec `prisma migrate dev` avant le push : `prisma migrate deploy` en CD ne trouverait jamais rien à faire. La ligne `preDeployCommand: pnpm prisma migrate deploy` appartient à la **PROD** (base séparée, où la CD est le seul endroit qui applique les migrations) — voir le bloc soir 7.

   **Ce que le `render.yaml` déclare n'est appliqué que via le Blueprint Render**, pas via le MCP. Le MCP et le Blueprint sont deux consommateurs différents : le Blueprint (dashboard : New → Blueprint) lit ce fichier tel quel et honore `healthCheckPath` (et `preDeployCommand` le jour où il existera) ; le MCP, lui, ne sait pas poser ces deux champs (voir l'étape 3).

3. **Agir selon le MCP.**
   - **MCP Render connecté** : créer / lier le service via le MCP, poser les valeurs des variables d'env de DEV (hors repo), **avec confirmation avant chaque effet**. Ne rien muter sans l'accord de l'utilisateur.

     **Ce que le MCP ne sait PAS faire.** Sa fonction de création (`create_web_service`) n'a pas de champ `healthCheckPath` ni `preDeployCommand`, et le MCP n'expose aucun outil de modification des réglages d'un service (seulement les variables d'env). Donc, même avec tous les droits, le health check path ne peut pas être posé via le MCP : c'est une **étape dashboard** (Settings → Health Check Path → `/health`). Le dire à l'utilisateur, ne pas prétendre l'avoir fait, et ne pas confondre avec un manque de droits.

     **Les valeurs des secrets ne passent pas par le chat.** Proposer à l'utilisateur de les saisir lui-même dans le dashboard (Environment) : créer le service avec les clés déclarées mais sans valeurs, le laisser remplir, Render redéploie. Sinon les valeurs transitent par la conversation (donc chez le fournisseur du modèle) et l'historique de session sur disque.

   - **MCP absent** : poser d'abord la question `AskUserQuestion` décrite ci-dessous, puis agir selon la réponse.

### MCP absent — demander avant de continuer

Quand le MCP Render n'est pas connecté, ne pas enchaîner directement sur les étapes manuelles. Poser une question `AskUserQuestion` avec deux options :

- **Installer le MCP Render (recommandé)** : c'est plus facile, le MCP se charge de tout — création du service, liaison sur `dev`, pose des variables, déclenchement du déploiement.
- **Poursuivre sans le MCP (manuel)** : le skill se contente de donner la liste des étapes du dashboard à faire soi-même, une par une.

Marquer explicitement l'option MCP comme **recommandée** dans le libellé, et dire pourquoi : avec le MCP tout est automatisé, sans lui l'utilisateur n'a que la marche à suivre manuelle.

Selon la réponse :

- **Poursuivre avec le MCP** : expliquer comment installer le MCP Render (voir ci-dessous), puis **attendre que l'utilisateur l'installe**. Ne pas continuer tant que le MCP n'est pas connecté ; une fois installé, reprendre au mode « MCP Render connecté ».
- **Poursuivre sans le MCP** : lister clairement les étapes manuelles du dashboard (créer le Blueprint à partir du `render.yaml`, lier le repo sur `dev`, poser les valeurs des secrets), sans prétendre les avoir faites.

### Comment installer le MCP Render

À donner à l'utilisateur seulement s'il choisit de poursuivre avec le MCP :

1. Récupérer une clé d'API Render : dans le dashboard Render, **Account Settings → API Keys → Create API Key**, copier la clé.
2. Ajouter le serveur MCP Render à Claude Code :

   ```bash
   claude mcp add --transport http render https://mcp.render.com/mcp \
     --header "Authorization: Bearer <RENDER_API_KEY>"
   ```

3. Vérifier la connexion avec `claude mcp list` (le serveur `render` doit apparaître comme connecté).

Une fois le MCP connecté, poursuivre au mode « MCP Render connecté ».

4. **Vérifier.** Déclencher / attendre un déploiement, puis appeler `/health` et `/db-health` sur l'instance pour confirmer que ça tient.

## Règles

- **DEV uniquement.** Ne pas créer de service prod, ne pas poser de question DEV/PROD : il n'y a pas encore de branche de prod. La PROD est explicitement reportée (voir le bloc TODO).
- **Le déploiement passe par la CI/CD, pas par la ligne de commande.** Ce skill **met en place** le déploiement continu une fois ; il ne « déploie » pas à la demande. Un déploiement se déclenche au **merge sur `dev`**, pas par un appel manuel.
- **Actions à effet, donc confirmées.** Chaque mutation d'infra via le MCP passe par l'accord de l'utilisateur.
- **Les secrets ne se commitent jamais.** `render.yaml` ne contient que les **clés** (`sync: false`), les valeurs vivent dans Render.
- **Les migrations : un réglage PROD, pas DEV.** En DEV, la base Neon est partagée avec le local et les migrations y sont déjà appliquées via `prisma migrate dev` : `prisma migrate deploy` en CD serait un no-op, donc pas de `preDeployCommand`. En PROD (soir 7), la base est séparée et la CD est le seul endroit qui applique les migrations — là, `prisma migrate deploy` en `preDeployCommand` est obligatoire, sinon le code part et le schéma reste en arrière. Ne jamais le poser en DEV « au cas où » : ça a créé de la confusion.
- **Le health check n'est réglable que par le Blueprint ou le dashboard.** `healthCheckPath: /health` dans le `render.yaml` est honoré si le service est créé via Blueprint. Via le MCP, ce champ n'existe pas : c'est une étape dashboard (Settings → Health Check Path). Le mécanisme est natif Render ; `/health` est la route de l'app (`healthController`).
- **Dire ce qui se fait à la main.** Sans MCP, ce qui passe par le dashboard est listé étape par étape, jamais maquillé en « fait ».
- **Rapporter l'état réel.** Un déploiement rouge se montre avec ses logs.

---

## TODO soir 7 — extension PROD (à ne pas implémenter avant)

Quand la branche de prod existera, ce skill gèrera les deux environnements. L'ajout prévu :

- Poser en tête une question **`AskUserQuestion` « DEV ou PROD ? »**.
- Selon la réponse, cibler le bon service et les bonnes variables : **DEV ← `dev`**, **PROD ← la branche de prod**, chacun avec sa config et ses secrets.
- Deux services Render distincts (ex. `kommit-backend-dev` et `kommit-backend-prod`), chacun en `autoDeploy` sur sa branche : merge sur `dev` → déploiement DEV, merge sur la branche de prod → déploiement PROD.

Tant que la branche de prod n'existe pas, ne rien coder de tout ça : le skill reste DEV.
