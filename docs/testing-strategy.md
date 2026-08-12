# Stratégie de test — quel test pour quel critère d'acceptance

Ce document décrit **comment décider, pour chaque critère d'acceptance, s'il se teste en
test unitaire automatisé ou s'il se vérifie à la main**. Il dit à quel moment les subagents
`unit-test-writer` et `smoke-test-writer`, ainsi que le skill
`write-code`, s'appliquent — et à quel moment non.

## L'idée principale

Ne pas partir par réflexe sur « j'écris d'abord des tests unitaires, puis j'implémente
pour les faire passer ». C'est le cas le plus **fréquent**, pas la règle universelle.
Certains critères ne se testent pas en unitaire — les forcer dans ce moule fait écrire des
tests qui mockent exactement ce qu'on voulait vérifier.

Donc, une seule question de tri : **ce critère est-il testable en unitaire, ou non ?**
La réponse peut être « les deux à la fois » — c'est le troisième état, 🟠 (voir plus bas).

## Pourquoi ce tri, et pas des niveaux de test

Il existe d'autres niveaux (intégration, end-to-end) et tout un savoir-faire autour :
reconnaître un bon d'un mauvais test, les mettre en place, les brancher en CI/CD. **Dans
CCE, on ne traite pas ça** — le but de la formation, c'est Claude Code, pas le testing. Et
en entreprise, on n'a pas le budget-temps d'automatiser l'intégration et l'e2e dès le
départ. On se concentre donc sur **le test unitaire — le moins coûteux** — et tout ce qui
n'est pas unitaire se **vérifie à la main**.

> La profondeur (les niveaux intégration / e2e, bons vs mauvais tests, la mise en place, la
> CI/CD avec GitHub Actions) est **hors périmètre ici** — on n'en parle pas.

## La question de tri, par paquet de CA

Pour chaque critère (on suit le découpage du ticket) : **testable en unitaire ?** Trois
verdicts possibles :

- **🟢 Oui** → test unitaire **automatisé**, écrit en **test-first** : test rouge d'abord,
  puis implémentation jusqu'au vert.
- **🔴 Non** → **vérification manuelle** (smoke) : le scénario s'écrit avant l'implémentation
  (subagent `smoke-test-writer`, fichier `testing/smokes-<TICKET_ID>.md`), puis s'exécute
  à la main après (curl, Postman).
- **🟠 Partiel** → **les deux**. Le test unitaire couvre une tranche précise (notre logique)
  mais laisse une tranche réelle, distincte, qu'aucune ligne manuelle ne couvre déjà :
  typiquement un mapping qui mocke une **forme d'erreur de la dépendance** qu'aucun smoke ne
  vient confirmer. Un 🟠 = une ligne unitaire (test-first) **plus** un smoke manuel à ajouter.

## Comment savoir si c'est unitaire

La question à se poser : **qu'est-ce que je vérifie exactement ?**

- **Du code à moi** — une transformation, un calcul, une décision (`null` vs erreur), une
  validation. Même s'il appelle une dépendance externe, on la **mocke** et on teste la
  logique autour → **unitaire**.
- **Le comportement réel d'une dépendance et son branchement** — le compte se crée
  vraiment, la session se pose, la contrainte `UNIQUE` rejette le doublon. Le mocker
  reviendrait à mocker exactement ce qu'on teste → **pas unitaire → vérification manuelle**.

Présence d'une dépendance externe ≠ non-testable en unitaire. Ce qui rend non-unitaire,
c'est que **le comportement sous test est celui de la dépendance elle-même**, pas une
logique à nous.

## Définitions

- **Test unitaire** — isole une fonction / un service, dépendances externes mockées,
  tourne en mémoire, déterministe et rapide.
- **Vérification manuelle (smoke)** — un humain tape l'endpoint à la main (curl, Postman) et
  vérifie que le parcours critique tient debout. « Smoke » = grossier, on regarde juste si
  ça marche du tout, pas une suite exhaustive.

## Exemple appliqué — BE01, authentification

Le ticket découpe l'auth en paquets de CA. Chaque CA est classé sur les trois états :

| Paquet de CA (ticket) | Ce qu'on vérifie | Verdict | Comment |
|---|---|---|---|
| Cas nominaux (CA8, CA12, CA5) | signup crée + connecte, signin, signout | 🔴 — comportement de Better Auth + base | Manuel (curl/Postman) |
| Valeurs refusées (CA10, CA11, CA20) | validation Zod du signup | 🟢 | Unitaire, test-first |
| Unicité email (CA9, CA21, CA16) | normalisation (CA21, 🟢) ; mapping `UNIQUE` → `EMAIL_ALREADY_EXISTS` dont la forme d'erreur mockée n'est confirmée par aucun smoke (CA9, 🟠) ; contrainte `UNIQUE` en concurrence (CA16, 🔴) | 🟢 / 🟠 / 🔴 | Unitaire test-first + smoke + manuel |
| Erreurs & pannes (CA13, CA18/19, CA2) | mapping panne → `INTERNAL_ERROR` (CA18/19, 🟢) ; mapping échec d'auth → `INVALID_CREDENTIALS`, forme mockée sans smoke existant (CA13, 🟠) ; 401 sur route protégée (CA2, 🔴) | 🟢 / 🟠 / 🔴 | Unitaire test-first + smoke + manuel |

À retenir : un même paquet de CA peut mélanger les trois états. On ne classe pas « pour
le paquet », on classe **par ce qu'on vérifie**, CA par CA.
