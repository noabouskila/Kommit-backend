# Périmètre de travail — le backend, et rien d'autre

Cette session travaille sur le repo `kommit-backend-ccem`. **Le seul endroit où il est permis d'écrire, c'est l'arborescence de ce repo.**

## Interdit — le frontend avant tout

**Aucune écriture dans `kommit-frontend-ccem/`**, ni nulle part sous son arborescence. Le frontend est un repo indépendant, avec sa propre stack et sa propre session Claude Code. Il ne se modifie pas depuis ici, même pour une ligne, même « pour aligner les deux côtés », même si l'utilisateur décrit un besoin qui touche visiblement le front.

C'est le point le plus important de cette rule.

## Interdit — tout ce qui est en dehors du repo

De la même façon, aucune écriture :

- dans le dossier parent `kommit-ccem/` (son `CLAUDE.md`, ses `rules/`, ses `skills/`, son `.vscode/`) ;
- dans `~/.claude` (la config globale de la machine) ;
- dans n'importe quel autre dossier du système hors du repo.

L'interdiction porte sur **l'emplacement du fichier**, pas sur la façon d'y arriver : un chemin absolu, un `cd`, un lien symbolique ou un script ne la contournent pas.

## Autorisé

- Écrire partout dans `kommit-backend-ccem/` : `src/`, `prisma/`, `.claude/`, la config, les docs.
- **Lire** en dehors du repo (`Read`, `Grep`, `Glob`, `git log`…) pour comprendre le contexte — lire le frontend pour savoir ce qu'il attend de l'API est normal et utile.

## Si une demande implique d'écrire ailleurs

Demander l'autorisation avant de vouloir le faire. Exception quand la demande est explicitement demandée par l'utilisateur, par exemple pour corriger un fichier de skill dans un autre repo ou pour modifier un bug dans le frontend.
