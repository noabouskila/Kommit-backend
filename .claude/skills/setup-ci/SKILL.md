---
name: setup-ci
description: Écrit le workflow de CI GitHub Actions (`.github/workflows/ci.yml`) à partir d'un ticket. Détecte les paquets critiques et les incompatibilités de versions, pose les décisions nécessaires à l'utilisateur (versions, niveaux de test, linter) via AskUserQuestion avant d'écrire, puis rend le workflow vert en local. N'appelle que des scripts qui existent déjà dans le repo. Ne commite ni ne pousse. Couvre aussi l'exigence du check au merge (branch protection), en note. Utiliser quand l'utilisateur dit "écris la CI", "setup-ci", "crée le workflow", "mets en place la CI backend", "protège la branche", "bloque le merge si la CI échoue".
---

## Entrée

- Le **ticket de CI** (lien ou ID Notion), avec ses critères d'acceptance.
- Le **repo courant** : ses scripts `package.json` (lint, typecheck, build, test), son `.nvmrc`, son champ `packageManager`, son lockfile.
- Les **décisions de l'utilisateur** sur les versions (Node, TypeScript), les niveaux de test et le linter, obtenues par `AskUserQuestion` quand le ticket ne les fixe pas.

## Sortie

- Le fichier **`.github/workflows/ci.yml`** avec **au minimum trois checks** : **build**, **tests** (au niveau choisi), **lint**. Un check retiré est une décision explicite de l'utilisateur, jamais un défaut silencieux.
- Le workflow **vert en local** puis **vert sur le run GitHub réel**.
- Le contrat de merge : le merge n'est « OK » que quand les **trois checks passent**.

---

## Étapes

1. **Lire le ticket et le repo.** Extraire du ticket les vérifications attendues et le déclencheur. Relever les scripts réels du `package.json`, le `.nvmrc`, le `packageManager`, le lockfile.

2. **Détecter les paquets critiques et les incompatibilités.** Avant d'écrire, repérer ce qui peut faire échouer un build, un lint ou un test :
   - **Node** : version installée vs LTS. Signaler une version impaire / non-LTS (ex. la 23) ou un écart entre `.nvmrc` et la version réellement utilisée.
   - **TypeScript vs `typescript-eslint`** : si TS ≥ 7, ESLint ne démarre pas (`typescript-eslint` plafonne à TS 6). C'est une incompatibilité à trancher, pas à subir.
   - **Variables exigées au chargement** : ex. `prisma.config.ts` qui fait `throw` si `DIRECT_URL` manque, ou des tests qui importent la config d'env. Prévoir une valeur factice au bon step, sans jamais brancher de vraie base.
   - **Gestionnaire de paquets** : version pnpm cohérente avec le lockfile et le `packageManager`.

3. **Cadrer les décisions avec l'utilisateur (`AskUserQuestion`), avant d'écrire.** Ne demander que ce que **ni le ticket ni le repo ne tranchent déjà** : si une info est fixée sans ambiguïté dans le `package.json`, le `.nvmrc` ou le lockfile, l'utiliser telle quelle, sans question. On ne pose que les décisions non encodées et les valeurs présentes mais problématiques. Au minimum :
   - **Version de Node à figer** : proposer les LTS pertinentes. Si l'utilisateur est sur une version impaire / non-LTS (ex. la 23), le signaler et proposer une cible (ex. 22 ou 24).
   - **Niveaux de tests** : lancer les tests **unitaires** seuls, ou aussi **intégration**, ou aussi **e2e** ? Adapter aux niveaux qui existent réellement dans le repo.
   - **Linter** : l'inclure ? Et si la détection a remonté une incompatibilité (TS ≥ 7 vs `typescript-eslint`), la poser explicitement : **aligner TypeScript** sur une version supportée, ou **renoncer au lint** dans la CI.
   - Toute autre décision de version / compatibilité que l'étape 2 a fait remonter.

4. **Écrire le workflow.** `.github/workflows/ci.yml`, un seul job, déclencheur `pull_request` vers la branche d'intégration. Installation de pnpm via `packageManager`, Node depuis `node-version-file: .nvmrc`, cache pnpm, `pnpm install --frozen-lockfile`, puis les **trois checks** dans l'ordre : **lint**, **build**, **tests** (au niveau choisi). Ne poser une étape que pour un script qui existe.

5. **Valider en local.** Rejouer la séquence exacte de la CI sur la machine, sous la version Node retenue. Au premier rouge, corriger et relancer jusqu'au vert.

6. **Rendre le fichier.** Laisser `ci.yml` sur le disque. Ne pas commiter ni pousser.

## Règles

- **Au minimum trois checks : build, tests, lint.** Le merge n'est autorisé que si les trois passent. Retirer un check (ex. lint rendu impossible par une incompatibilité) est une décision **explicite** de l'utilisateur, obtenue par question, jamais un choix silencieux du skill.
- **Poser les questions, ne pas deviner, mais ne demander que le non-tranché.** Utiliser `AskUserQuestion` pour les versions (Node, TypeScript), les niveaux de test et le linter dès que **ni le ticket ni le repo** ne les fixent. Si l'info est déjà déterminée sans ambiguïté dans le `package.json`, le `.nvmrc` ou le lockfile, l'utiliser sans demander : une valeur présente règle un **fait**, pas une **décision** ni une **incohérence**. On ne pose donc de question que pour (a) les décisions non encodées (ex. quels niveaux de test lancer en CI) et (b) les valeurs présentes mais problématiques (Node non-LTS comme la 23, incompatibilité TS ≥ 7 vs `typescript-eslint`). Ces cas-là se tranchent avec l'utilisateur, jamais en douce.
- **N'appeler que des scripts existants.** Le workflow lance `pnpm lint`, `pnpm build`, `pnpm test` tels qu'ils sont définis dans le repo. Ne jamais inventer une commande, ni poser une étape `pnpm lint` qui plantera (vérifier d'abord qu'elle tourne en local).
- **Pas de dépendance externe inutile.** Si aucun test n'en dépend (à vérifier dans les imports), pas de service Postgres, pas de `DATABASE_URL`, pas de migration dans la CI.
- **Ni commit ni push.** Le push et la PR relèvent de `open-pr`, sur décision de l'utilisateur. Ce skill s'arrête au fichier vert.
- **Le vrai vert est sur le run GitHub, pas seulement en local.** Certaines casses n'apparaissent qu'en CI : version de Node, cache pnpm, variable d'environnement absente (c'est le `DIRECT_URL` exigé par `prisma.config.ts` qui nous est tombé dessus, invisible en local grâce au `.env`). `setup-ci` s'arrête au vert local et laisse `open-pr` pousser, mais la validation finale se lit sur le **run réel**, à surveiller après l'ouverture de la PR (`gh run watch`). Ne jamais conclure « vert » sur la seule base du local.
- **Rapporter l'état réel.** Si une étape échoue, montrer la sortie réelle, ne pas prétendre que c'est vert.

---

## Exiger le check au merge (branch protection)

Bloquer le merge tant que la CI est rouge n'est **pas** dans le workflow : c'est un réglage GitHub, à poser une fois le workflow présent sur la branche d'intégration et un check nommé (ex. `ci`) visible sur une PR. Ce n'est pas un skill à part, c'est cette étape finale de la mise en place de la CI.

- **Comment.** Récupérer le nom exact du check (`gh pr checks` / `gh run list`), puis poser la protection via `gh api` sur `repos/{owner}/{repo}/branches/{branche}/protection` en exigeant ce check. Action à effet : confirmer avec l'utilisateur avant de poser, ne rien relâcher en silence.
- **⚠️ Limite plan privé (à vérifier en premier).** Sur un repo **privé en plan gratuit**, l'API de branch protection **et** les rulesets renvoient `403 « Upgrade to GitHub Pro or make this repository public »`, en lecture comme en création. On ne peut alors **rien poser**, et une règle définie à la main dans l'interface n'est de toute façon **pas appliquée** tant que le repo est privé. Le vérifier avant tout, le dire à l'utilisateur (disponible seulement en repo public ou sur un plan payant), et ne jamais prétendre avoir posé la protection.
