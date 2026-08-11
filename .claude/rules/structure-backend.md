# Structure des dossiers — backend

Le découpage est **par couche technique**, pas par domaine. Cette structure est figée : ne pas en inventer une autre, ne pas ajouter de dossier de premier niveau sous `src/` sans accord explicite de l'utilisateur.

```
src/
├── index.ts          # démarrage du serveur : lit la config, écoute. Rien d'autre.
├── app.ts            # assemblage de l'app Express. Ne connaît aucune route.
├── config/           # configuration (variables d'environnement…)
├── middlewares/      # middlewares Express (404, gestion des erreurs…)
├── routes/           # déclaration des routes. Aucun corps de handler.
├── controllers/      # les handlers : lire la requête, appeler un service, répondre.
└── services/         # la logique métier. Ne connaît ni Express, ni req, ni res.
```

## Le rôle de chaque emplacement

**`index.ts`** — le point d'entrée. Il crée l'app et l'écoute sur le port. Aucune route, aucun middleware ici.

**`app.ts`** — il assemble, dans cet ordre : les middlewares globaux (`express.json()`…), le router principal, le 404, puis le middleware d'erreur. Il importe `routes` et rien de plus : **`app.ts` ne doit jamais déclarer une route lui-même**.

**`routes/index.ts`** — le router principal. Il monte les routers des autres fichiers de `routes/` (`routes.use('/commits', commitsRoutes)`). C'est le seul endroit à modifier quand on branche un nouveau groupe de routes.

**`routes/`** — un fichier par groupe de routes (`commitsRoutes.ts`, `usersRoutes.ts`). Chaque fichier ne contient que des associations méthode + chemin + handler importé :

```ts
commitsRoutes.get('/', getCommits)
```

**Interdit d'écrire le corps d'un handler dans `routes/`**, même pour une réponse d'une ligne. Un fichier de route se lit comme la liste des URL exposées, sans logique à sauter.

**`controllers/`** — un fichier par groupe de routes, qui exporte les handlers. Un controller lit `req`, appelle un service, écrit dans `res`. Il ne contient pas de logique métier : dès qu'il y a une décision, un calcul ou un accès aux données, ça part dans `services/`.

**`services/`** — la logique métier, en fonctions qui prennent et rendent des données. **Un service ne reçoit jamais `req` ni `res`** et n'importe jamais Express : il doit rester appelable depuis un test ou un script sans serveur HTTP.

## Nommage des fichiers

**camelCase** partout, sans point ni tiret : `rootController.ts`, `errorHandler.ts`, `commitsRoutes.ts`, `commitsService.ts`.

Le nom porte le suffixe de sa couche (`…Controller`, `…Routes`, `…Service`) pour rester lisible quand plusieurs fichiers du même domaine sont ouverts côte à côte. Pas de `root.controller.ts`, pas de `error-handler.ts`.

## Imports

Le projet est en ESM (`"type": "module"`, `moduleResolution: NodeNext`) : **tous les imports relatifs portent l'extension `.js`**, même si le fichier source est un `.ts`.

```ts
import { getRoot } from '../controllers/rootController.js'
```

## Sens des dépendances

`routes/` → `controllers/` → `services/`, jamais l'inverse. Un service n'importe pas un controller ; un controller n'importe pas un fichier de routes.
