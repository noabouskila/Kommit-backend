---
name: start-ticket
description: Start work on a ticket — move it to DOING, create a fresh branch off the base branch (dev or main), and surface the ticket's deliverable. Use when the user says "start ticket", "démarre le ticket", "je commence ID-XXXX", "on attaque le ticket", or wants to begin a piece of work tracked in the board.
---

# Start Ticket Skill

Démarre proprement le travail sur un ticket : **statut → DOING → branche dédiée → rappel du livrable**.

## Base Notion (autonome — ne dépend d'aucun autre skill)

- **Base** : Backlog Général (⚡️ Sprint Board en est une vue)
- **Data Source ID** : `2e0f8acc-5fea-83d2-a869-878517c025bd` (à remplacer par l'ID de ta base Notion)
- **Propriété ID ticket** : `Ticket ID` (texte, ex. `ID-1931`)
- **Propriété statut** : `Agile Statut` → option cible `DOING`

## Quand l'utiliser

- "start ticket ID-1931", "démarre le ticket 1931", "je commence ID-1931", "on attaque le ticket X"
- L'utilisateur veut commencer un travail suivi dans le board.

## Identifier le ticket

1. Prendre l'identifiant fourni par l'utilisateur : token `ID-\d+`, ou un nombre nu (`1931`) qu'on préfixe en `ID-1931`.
2. Si rien de fourni → scanner la conversation pour un ticket récemment mentionné/créé.
3. Si toujours rien ou ambigu → demander lequel (ne jamais deviner au hasard).
4. Récupérer le ticket dans le Backlog Général via la propriété **`Ticket ID`** (match exact, préfixe `ID-` inclus).
   - Si aucun ticket ne correspond → **stop**, le dire clairement (rien ne doit être créé sur un ID fantôme).

## Pré-vol (avant de créer la branche)

- **Tree propre** : `git status --porcelain`. S'il reste des changements non commités → prévenir l'utilisateur (la branche emporterait ces changements) et demander avant de continuer.

## Workflow

### 1. Statut → DOING
- Lire `Agile Statut` du ticket.
- Si déjà `DOING` → ne rien faire, juste le signaler.
- Sinon → passer la propriété `Agile Statut` à l'option `DOING`.

### 2. Créer la branche
- **Détecter la branche de base** :
  - si une branche `dev` existe (locale ou remote `origin/dev`) → base = `dev` ;
  - sinon → base = `main`.
  - L'utilisateur peut forcer explicitement (« depuis main », « depuis dev ») — sa consigne prime.
- Partir d'une base à jour :
  ```
  git checkout <base> && git pull --ff-only
  ```
- **Nommer la branche** selon la convention `ID-<num>-<slug>` :
  - `<num>` = le numéro du ticket (ex. `1931`).
  - `<slug>` = kebab-case court dérivé du titre du ticket (mots significatifs, sans les préfixes `PROJET > SOUS-PROJET >`). Ex. titre `KOMMIT > BACKEND > POC` → `ID-1931-poc-backend`.
  ```
  git checkout -b ID-<num>-<slug>
  ```
  - Si la branche existe déjà → ne pas écraser, juste `git checkout` dessus et le signaler.

### 3. Rappeler le livrable
- Lire le **contenu de la page** du ticket (pas seulement les propriétés) et en extraire la section **Livrable** (et le Contexte si utile).
- Restituer le livrable à l'utilisateur de façon visible, pour cadrer le travail qui démarre.

## Restitution

Une ligne d'état + le livrable. Ex :
```
✅ ID-1931 → DOING · branche ID-1931-poc-backend (depuis dev)

🎯 Livrable : POC backend opérationnel, auth + standup démontrés.
```
Si une étape était déjà faite (statut déjà DOING, branche déjà existante), le dire explicitement.

## Anti-patterns

- ❌ Créer une branche sur un `ID-\d+` qui ne correspond à aucun ticket — stop et signaler.
- ❌ Brancher par-dessus des changements non commités sans prévenir.
- ❌ Repasser en DOING un ticket déjà DOING (no-op silencieux suffisant).
- ❌ Écraser une branche existante du même nom.
- ❌ Deviner le ticket au hasard quand plusieurs matchent — demander.
- ❌ Oublier le rappel du livrable : c'est la valeur centrale du skill.
