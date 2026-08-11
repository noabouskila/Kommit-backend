---
name: write-code
description: Écrit la logique métier backend jusqu'à faire passer au vert les tests rouges du ticket (écrits par unit-test-writer), ou à défaut jusqu'à satisfaire les scénarios de smoke (testing/smokes-<TICKET_ID>.md) + le ticket. Crée le service (logique pure), le client de dépendance réel, le controller mince et le câblage du router, selon les conventions du repo. N'impose aucun découpage : l'unité de travail se lit dans les tests. Utiliser quand l'utilisateur dit "write-code", "implémente le service", "fais passer les tests", "make it green", "passe au vert".
---

## Entrée

- Le **cahier des charges**, dans cet ordre de priorité :
  - les **tests unitaires rouges** du ticket, s'ils existent (écrits par `unit-test-writer`) ;
  - **sinon**, les **scénarios de smoke** (`testing/smokes-<TICKET_ID>.md`, écrits par `smoke-test-writer`) + le ticket. Les scénarios jouent le même rôle que les tests rouges : ils fixent les endpoints, les formes de réponse, les codes attendus.
- Le **contrat d'API** et les **types partagés** (chercher un `apiContract`/`contract` sous `src/types/`) + les **rules du repo** (couches, nommage, câblage).
- Optionnel : une **tranche précise** à traiter maintenant (un fichier de test, une fonction). Sans précision, on avance jusqu'à ce que toute la suite soit verte.

## Sortie

- Le code backend qui fait passer le cahier des charges — service (logique pure), client de dépendance réel, controller mince, câblage du router — selon les conventions du repo.
- **Avec tests unitaires** : les tests concernés au vert (`pnpm vitest run`), plus `typecheck` qui passe.
- **Sans tests unitaires** : le serveur démarre (`pnpm dev`) et `typecheck` passe. **L'exécution des scénarios de smoke revient à l'utilisateur**, case à cocher par case — le skill ne les exécute pas à sa place.

---

## Ne pas découper par paquet de CA

Les paquets du ticket groupent les CA **par thème** ; le code groupe **par fonction**. Une même fonction sert souvent des CA de plusieurs paquets — sur BE01, `toApiError` en sert de trois. Imposer la frontière du paquet à l'implémentation force à n'écrire que la moitié d'une fonction, donc à boucher le trou avec une valeur de remplissage, puis à revenir la démonter ensuite. C'est ce qui a produit le `status: 0` de BE01, et le retour sur `authHandler` qui s'appuyait dessus.

Comme tous les tests rouges existent déjà (étape 2 du workflow), **l'unité se lit d'elle-même** : ouvrir un fichier de test, écrire la fonction **en entier** pour faire passer tous ses tests, passer au suivant. Rien à prescrire, rien à anticiper.

Le code sans tests unitaires (branchement d'une dépendance, middleware) forme ses propres tranches, pilotées par leurs scénarios de smoke.

## Règles

- **Décision structurante → mode plan d'abord.** Si l'implémentation implique une nouvelle dépendance, un changement de schéma Prisma / une migration, ou un fichier hors des couches établies : passer en mode plan, présenter le plan, et **attendre l'aval explicite de l'utilisateur** avant d'exécuter quoi que ce soit. Sans décision structurante (faire passer au vert des tests dans des services existants), implémenter directement.
- Le cahier des charges (tests unitaires ou scénarios de smoke) définit ce qui doit être implémenté — **rien de plus, rien de moins**. Si un comportement n'y figure pas, ne pas l'inventer.
- Ne JAMAIS modifier un test pour le faire passer. Si un test (ou un scénario) semble faux, demander à l'utilisateur.
- **Écrire une fonction en entier**, avec toutes les branches que ses tests exigent. Ne jamais laisser une valeur de remplissage pour un cas « traité plus tard ».
- La logique métier vit dans `services/`, jamais dans les controllers (qui restent minces).
- Suivre les conventions des rules du repo (couches, nommage, câblage) — ne pas réinventer la structure, ne pas créer de dossier de premier niveau sous `src/` sans accord.
- Le vrai client de dépendance n'est mocké que dans les tests, jamais dans le code de prod.

## Étapes

| Étape | Nom | Description |
|-------|-----|-------------|
| 1 | Lire le cahier des charges | Les tests rouges s'ils existent, sinon les scénarios de smoke + le ticket |
| 2 | Lire le contrat & les conventions | Types (`src/types/`), `TECH.md`, et les rules du repo |
| 3 | Implémenter | Service (logique pure) + client de dépendance + controller mince + câblage du router |
| 4 | Vérifier | Tests au vert + `typecheck` — ou, sans tests unitaires : serveur qui démarre + `typecheck` |
| 5 | Remettre la main | Rapporter ce qui est prêt ; l'utilisateur exécute les scénarios de smoke |

## Étape 1 : Lire le cahier des charges

**S'il y a des tests unitaires** — parcourir les fichiers de test concernés. Pour chaque test, identifier :

- La fonction appelée et ses paramètres d'entrée
- Le résultat attendu
- Les edge cases couverts
- Ce que les **mocks** renvoient → c'est la forme des données externes que le vrai code devra consommer

**Sinon** — parcourir les scénarios de smoke dans `testing/smokes-<TICKET_ID>.md` + le ticket. Chaque scénario fixe : l'endpoint exact, les étapes, le résultat attendu (code HTTP, forme de réponse, cookie). L'implémentation doit faire passer ces scénarios **tels qu'ils sont écrits** — s'en écarter (autre chemin de montage, autre forme de réponse) rend leur exécution ininterprétable pour l'utilisateur.

Dans les deux cas : le cahier des charges dicte le périmètre. Ne pas deviner des comportements qui n'y sont pas.

## Étape 2 : Lire le contrat & les conventions

- **Types partagés** (sous `src/types/`) → la forme de sortie exacte à produire.
- **Contrat d'API** + `TECH.md` → endpoints, règles, signaux d'échec.
- **Conventions du repo** (`.claude/rules/`) → où vit chaque couche (`routes/`/`controllers/`/`services/`), comment on nomme, comment on câble. **L'implémentation DOIT suivre ces rules** — elles sont déjà chargées en contexte.

## Étape 3 : Implémenter

Dans l'ordre des dépendances :

1. **Service** (`src/services/`) — la logique pure (transformations, calculs, décisions `null`/erreur). C'est le cœur testé.
2. **Client de dépendance** — le vrai client externe que le service utilise (ex. client IA, client Prisma), à l'emplacement que les rules du repo prévoient (ex. `src/config/prisma.ts`). En test il est mocké ; ici on écrit le vrai.
3. **Controller** (`src/controllers/`) — handler **mince** : lit `req`, délègue au service, renvoie la réponse. Aucune logique métier dedans.
4. **Routes + câblage** (`src/routes/`) — brancher le handler, monter le router dans `routes/index.ts`. Aucun corps de handler dans les fichiers de routes.

## Étape 4 : Vérifier

**Avec tests unitaires** — les lancer après chaque changement significatif (`pnpm vitest run`).

- Si un test échoue → corriger **l'implémentation**, pas le test.
- Si un test semble faux → le **signaler à l'utilisateur**, ne pas le modifier sans validation.

**Sans tests unitaires** — démarrer le serveur (`pnpm dev`) et vérifier qu'il tient (pas de crash au boot, route montée qui répond).

Dans les deux cas : `typecheck` doit passer.

## Étape 5 : Remettre la main pour les smokes

Les tests unitaires mockent les dépendances, et un serveur qui démarre ne prouve pas le comportement réel : les scénarios de smoke restent à exécuter — **par l'utilisateur**, pas par le skill.

**Les faire jouer au fil de l'eau**, dès qu'une tranche est écrite, pas tous à la fin : c'est le seul moyen de découvrir tôt qu'un mock ne correspond pas à la réalité, avant d'avoir écrit d'autres mappings sur la même hypothèse fausse (sur BE01, le mock de CA9 portait un code d'erreur Better Auth inventé — seul le smoke l'a rattrapé).

Rapporter :

- ce qui a été implémenté (fichiers) ;
- l'état des vérifications (tests verts / serveur qui démarre, `typecheck`) ;
- les scénarios de smoke prêts à être exécutés, et toute précondition à préparer (`.env`, base accessible, migration appliquée).
