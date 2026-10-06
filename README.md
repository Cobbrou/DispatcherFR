# DISPATCH-17

Simulateur de salle opérationnelle (CAD – *Computer-Aided Dispatch*) pour la **Police Nationale (CIC)** et la **Gendarmerie Nationale (CORG)**. Le joueur prend les appels du 17, qualifie les faits, engage les patrouilles et gère les imprévus, avec le vocabulaire et les doctrines français.

> Statut : **étapes 0 à 4 terminées** – socle, cockpit 3 volets, prise d'appel en texte libre (appelants générés au hasard), fenêtre CAD de fiche saisie à la main, catégories du glossaire officiel, carte sombre, engagement des unités et déplacement, aléas (renforts, concours SAMU / pompiers / service des routes), fil radio, archive des fiches et bilan de journée. Voir [Prochaines étapes](#prochaines-étapes).

Cahier des charges source : [`CONTEXT.md`](./CONTEXT.md).

---

## 1. Vision

- **Rôle du joueur :** opérateur CIC (zone police, ZPN) ou CORG (zone gendarmerie, ZGN).
- **Inspirations :** *112 Operator*, *Sim Dispatcher*, logiciels opérationnels réels (SARI, Pégase, LUPIN) pour l'ergonomie : sombre, dense, orienté données et carte.
- **Hyper-réalisme ciblé sur le français :** indicatifs (`PAM 1`, `BAC 75`, `PSIG MELUN 1`), sectorisation police/gendarmerie, qualifications d'infraction, formules radio (« Bien reçu », « Tenu », « De PAM 2 pour salle »). Aucun jargon américain (« copy that », « Dispatch 911 »).

### Piliers

1. **Réalisme procédural** – qualification, indicatifs, statuts, zones.
2. **Stress & décision** – appels simultanés, effectifs limités, renforts imprévus.
3. **Ergonomie opérationnelle** – cockpit 3 volets, thème sombre, police monospace pour statuts et horaires.

### Boucle de jeu

```
Appel 17 → conversation libre → fiche saisie par l'opérateur (catégorie du glossaire, gravité 5 à 1) → engagement d'unités
   → déplacement sur carte → sur les lieux → aléas (renfort, SAMU/pompiers, fuite)
   → clôture (résolu / échec) → bilan de fin de journée
```

### Prise d'appel et fiche

- **Aucune phrase prédéfinie.** Tu écris toi-même tes questions et consignes ; l'appelant répond à ce que tu demandes.
- **Appels aléatoires** : faits, adresse, identité, personnalité (calme, paniqué, évasif) tirés au hasard. L'appelant ne dit que sa première phrase tant que tu ne poses pas les bonnes questions (adresse, nom, blessés, auteurs, armes…).
- **Tu es seul responsable de la fiche.** Une fenêtre CAD s'ouvre au décroché : catégorie, gravité, requérant, adresse, faits, victimes… Rien n'est prérempli.
- **Catégories** : les 313 libellés du glossaire officiel (`docs/GLOSSAIRE ALPHABETIQUE ENSEMBLE CATEGORIES (MAJ 01- 2026).pdf`). Le niveau du glossaire (1 à 5) propose la gravité, que tu peux modifier.
- **Moteur de réponse** : procédural local aujourd'hui (mots-clés + tirages). L'interface `CallerEngine` permet de le remplacer par un LLM via API.

### Carte et unités

- **Carte** Leaflet (fond sombre) : pastilles d'unités colorées par statut, pastilles de fiches numérotées par gravité. Clic sur une fiche = la sélectionne.
- **Engager** : sélectionne une fiche dans la main courante, puis « Engager » sur une unité disponible. L'unité roule en ligne droite (50 km/h), arrive, reste le temps de l'intervention (5 à 30 min selon la gravité), redevient disponible ; la fiche est alors résolue. « Rappeler » désengage une unité encore en route.
- **Fiche sans coordonnées** (adresse inconnue du géocodeur) : un bandeau demande de cliquer sur la carte pour la placer.
- **Temps** : horloge simulée ×10 par défaut ; boutons Pause, ×1, ×10, ×30 dans l'en-tête.

### Interface cible (MVP)

| Gauche | Centre | Droite |
| :--- | :--- | :--- |
| Appels entrants + file d'attente | Carte sombre (unités + incidents) | Liste des unités + fiche d'incident active |

---

## 2. Stack technique

| Besoin | Choix | Note |
| :--- | :--- | :--- |
| Framework | React 19 + TypeScript (strict) + Vite | Typage fort pour les modèles |
| Style | Tailwind CSS + Lucide Icons | Thème `slate-900` / `zinc-900` |
| Carte | Leaflet via React-Leaflet, tuiles CartoDB Dark Matter | Léger, sans clé API |
| État | Zustand | Horloge, unités, appels, incidents |
| Audio | Howler.js | Sonnerie 17, bips, grésillements radio |
| Appels | Générateur procédural local, réponses libres | LLM via API : prévu, interface `CallerEngine` |
| Tests | Vitest | Moteur pur (`src/core`) uniquement |

Détails et justifications : [`docs/architecture.md`](./docs/architecture.md).

---

## 3. Arborescence

```
Dispatch-17/
├── CONTEXT.md              Cahier des charges source
├── README.md
├── docs/
│   ├── architecture.md     Architecture technique
│   ├── data-model.md       Modèle de données TypeScript
│   ├── statuses.md         Statuts d'unité, d'intervention, gravité
│   └── GLOSSAIRE ALPHABETIQUE ENSEMBLE CATEGORIES (MAJ 01- 2026).pdf
├── public/
│   └── audio/              Sons (sonnerie, bips, radio)
└── src/
    ├── types/              Types partagés (modèle de données)
    ├── core/               Moteur de jeu pur (aucun import React)
    ├── store/              Stores Zustand (pont moteur ↔ UI)
    ├── data/               Glossaire (categories.json), gazetteer, modèles d'appels, unités, textes radio
    ├── audio/              Gestionnaire Howler
    ├── lib/                Utilitaires (géo, temps, formatage)
    └── components/
        ├── layout/         Cockpit 3 volets
        ├── calls/          Téléphonie 17, conversation libre
        ├── map/            Carte, marqueurs
        ├── units/          Liste et cartes d'unités
        └── incident/       Fenêtre de fiche CAD, main courante, détail
```

Règle d'or : `core/` ne dépend ni de React ni du DOM ; `components/` ne contient aucune règle de jeu.

---

## 4. Commandes

Les scripts sont déclarés dans `package.json`.

| Commande | Effet |
| :--- | :--- |
| `npm install` | Installe les dépendances |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Typecheck + build de production |
| `npm run preview` | Sert le build localement |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, exécution unique (`--passWithNoTests` tant qu'il n'y a aucun test) |
| `npm run test:watch` | Vitest en continu |
| `npm run lint` | ESLint |

---

## 5. Conventions

- TypeScript `strict`, pas de `any`.
- Une seule source de vérité : le store ; l'UI lit, le moteur écrit.
- Textes radio et métier en français, centralisés dans `src/data/` (pas de chaînes en dur dans les composants).
- Un composant / sous-système à la fois, avec son test si la logique est non triviale.

## Prochaines étapes

0. ~~Socle Vite + React + TS strict + Tailwind + Vitest, puis `src/types`.~~ Fait.
1. ~~Cockpit 3 volets (données factices).~~ Fait.
2. ~~Prise d'appel libre, appelants générés, fiche saisie par l'opérateur.~~ Fait.
3. ~~Carte, assignation, déplacement, machine à statuts.~~ Fait.
4. ~~Ambiance radio & compte rendu, archive des fiches clôturés, demande de renforts ou de concours d'autres services (pompiers, samu, service des routes), ajout d'animations pour rendre l'interface plus vivante.~~ Fait.
5. Passage en mode gendarmerie uniquement, se baser sur tout le 95 en zone gendarmerie, intégrer une patrouille pour chaque brigade de gendarmerie avec un numéro véhicule par véhicule (101,102,103) ([COMMUNE].[NUMERO VL]), ajouter sur la carte les icones des brigades.
6. 

Détail : [`docs/architecture.md`](./docs/architecture.md#9-plan-de-développement).
