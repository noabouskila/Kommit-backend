# Authentification et ouverture d'un stream SSE

Ce document décrit comment un client s'authentifie avec un cookie de session, puis ouvre un stream SSE (Server-Sent Events) sur une route protégée.

## Comment fonctionne SSE côté navigateur

Une requête HTTP classique suit le modèle **requête/réponse** : le client envoie une requête, le serveur calcule la réponse entière, l'envoie, et la connexion se termine. SSE change ça : la connexion reste ouverte, et le serveur envoie plusieurs messages au fil du temps sur cette même connexion.

Côté navigateur, ça se passe en deux temps, avec l'objet `EventSource` comme interface entre le code frontend et le navigateur :

1. **Ouvrir la connexion.** Le code frontend exécute `new EventSource(url)`. Cette ligne est une instruction au navigateur : c'est **le navigateur** qui envoie la requête `GET` au backend (comme pour n'importe quelle requête), mais en la traitant différemment — garder la connexion ouverte indéfiniment, traiter ce qui arrive comme un flux d'événements, se reconnecter tout seul en cas de coupure.
2. **Recevoir les événements.** L'objet retourné par `new EventSource(url)` ne fait pas de réseau lui-même : c'est la poignée que le code frontend garde pour suivre la connexion. Le backend envoie des blocs `data: ...` quand il veut ; le navigateur découpe le flux en événements (un par ligne vide) et appelle, pour chacun, la fonction accrochée sur l'objet :

   ```js
   const stream = new EventSource('http://localhost:3000/stream')
   stream.onmessage = (event) => {
     console.log(event.data) // un événement envoyé par le backend
   }
   ```

Le backend, lui, ne voit jamais cet objet : il reçoit un `GET` ordinaire, et c'est sa réponse qui ne se termine pas.

## Pourquoi un cookie pour SSE

Le raisonnement se déroule en quatre temps.

**Le point de départ : le `Set-Cookie`.** À l'authentification, le backend ne renvoie pas seulement un corps de réponse : dans ses en-têtes, il pose un `Set-Cookie` contenant le token de session. Le navigateur reconnaît cet en-tête, range le cookie sous le domaine du backend, et le rattachera automatiquement à toute requête suivante vers ce domaine — sans une ligne de code côté frontend.

**L'ouverture du stream.** Quand le frontend fait `new EventSource(url)`, ce n'est pas son code qui envoie la requête : c'est le navigateur qui envoie un `GET` ordinaire vers la route de stream (voir la section précédente).

**Le lien entre les deux.** Comme c'est le navigateur qui envoie ce `GET`, et comme il rattache le cookie à toute requête vers ce domaine, le `GET` du stream part avec le cookie de session dessus, automatiquement. Le middleware d'authentification lit le cookie, retrouve la session et ouvre le stream, sans aucun code d'authentification côté frontend. Et si la connexion tombe, `EventSource` se reconnecte tout seul et le cookie est ré-attaché à chaque reconnexion : la ré-authentification est gratuite elle aussi.

**Pourquoi un bearer token ne marche pas ici.** Avec un token porté dans un header `Authorization: Bearer <token>`, c'est le code frontend qui doit ajouter le header à la requête. Or `EventSource` **ne permet pas d'ajouter de headers** : il n'y a pas d'option pour ça, on ne peut donc pas attacher un bearer token au `GET` d'un `EventSource`. Les deux contournements sont mauvais : renoncer à `EventSource` pour lire le flux avec `fetch` (on peut y poser des headers, mais on perd la reconnexion automatique et on réimplémente le découpage du flux), ou faire passer le token dans l'URL (`?token=...`), où il fuit dans les logs et l'historique.

**C'est un problème de transport, pas de contenu.** Ce qui sauve le SSE, c'est que le cookie voyage sans header, rattaché automatiquement — exactement ce dont `EventSource` a besoin. Le débat n'est donc pas « identifiant de session contre JWT » : un JWT posé dans un cookie marcherait tout aussi bien pour le SSE. C'est le transport par header `Authorization` qui casse, parce que `EventSource` ne sait pas poser de header.

## Temps 1 — l'authentification (cookie de session)

1. Le client envoie ses identifiants (email + mot de passe) au backend, par exemple sur `POST /auth/login`.
2. Le backend vérifie les identifiants, puis crée une **ligne de session** dans le stockage serveur (table `sessions` en base, ou entrée Redis) : `abc123 → user 42`.
3. Le backend répond avec un header `Set-Cookie` contenant l'**identifiant de session** (`abc123`). Ce n'est pas un JWT : c'est un identifiant aléatoire opaque, qui ne porte aucune donnée — juste une clé de recherche vers la ligne en base.
4. Le navigateur range le cookie et l'enverra automatiquement sur toutes les requêtes suivantes vers ce backend.

Révoquer une session = supprimer sa ligne côté serveur. Dès la requête suivante, l'identifiant ne correspond plus à rien et l'utilisateur est déconnecté.

## Temps 2 — l'ouverture du stream SSE

1. Le frontend ouvre le stream :

   ```js
   const stream = new EventSource('http://localhost:3000/stream', {
     withCredentials: true,
   })
   ```

   `withCredentials: true` est nécessaire parce que le frontend (`localhost:5173`) et l'API ne sont pas sur la même origine : sans lui, le navigateur n'attache pas le cookie à une requête cross-origin.

2. Le navigateur envoie un `GET /stream` avec le cookie de session attaché automatiquement.
3. Le **middleware d'authentification** — le même que pour les routes classiques — lit l'identifiant dans le cookie, cherche la ligne correspondante dans le stockage de sessions, et retrouve l'utilisateur. Ligne absente → `401`, le stream ne s'ouvre pas.
4. Si la session est valide, le controller ouvre le stream : il répond avec le header `Content-Type: text/event-stream` et **ne termine jamais la réponse**. Il envoie ensuite des événements au fil de l'eau, chacun terminé par une ligne vide :

   ```
   data: {"message": "premier événement"}

   data: {"message": "deuxième événement"}

   ```

   Côté Express, ça se traduit par des `res.write()` répétés, sans jamais appeler `res.end()`.

5. Côté frontend, chaque événement arrive dans `stream.onmessage`. Si la connexion tombe, `EventSource` se reconnecte tout seul — et repasse par le middleware d'authentification à chaque reconnexion.

## Variante : JWT dans un cookie

Le déroulé est identique. Deux différences :

- au temps 1, le backend ne crée aucune ligne en base : il fabrique un JWT signé (`header.payload.signature`, avec le `userId` et l'expiration dans le payload) et le pose dans le cookie ;
- au temps 2, le middleware ne cherche rien en base : il **vérifie la signature** du token. Signature valide → contenu fiable, le stream s'ouvre.

Cette variante est cohérente : le SSE continue de fonctionner, parce que ce qui compte pour `EventSource` c'est le transport (le cookie), pas le contenu (JWT plutôt qu'identifiant opaque). C'est un access token seul, sans refresh token — on émet un JWT et on s'arrête là.

### Le compromis à accepter

En contrepartie, un JWT émis reste valide jusqu'à son expiration : il n'y a aucune ligne à supprimer pour couper une session avant terme. Deux conséquences concrètes.

- **Pas de révocation serveur.** On ne peut pas déconnecter quelqu'un à la demande. La déconnexion devient du « au mieux » : on efface le cookie côté navigateur, mais si le token avait été copié, il reste valide jusqu'à son expiration. Pour couper vraiment avant terme, il faudrait réintroduire de l'état serveur (une liste noire des tokens révoqués), consultée à chaque requête — ce qui annule l'intérêt du JWT et revient à reconstruire une session.
- **Données figées.** Ce que contient le token est fixé à l'émission. Changer un rôle ou un droit ne prend effet qu'à l'expiration du token courant.

Le garde-fou habituel est une **durée de vie courte** : on ne révoque pas, on attend l'expiration, et on réduit la fenêtre de dégâts à cette durée. C'est aussi la raison d'être du refresh token, qui évite de retaper son mot de passe à chaque expiration — au prix de la complexité décrite plus haut.

Quand est-ce un choix légitime ? Quand la révocation instantanée n'est pas un besoin. Dès qu'un critère exige une déconnexion réelle (fermer la session à la demande), l'identifiant de session en base reste le bon choix : la révocation y est gratuite, puisqu'il suffit de supprimer la ligne.
