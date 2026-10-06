# Architecture technique

## 1. Principes

1. **Moteur pur, UI passive.** La logique de jeu (temps, mouvement, statuts, événements) vit dans `src/core` en fonctions TypeScript pures. React ne fait qu'afficher l'état et envoyer des commandes.
2. **Un store, une horloge.** Un seul store Zustand porte l'état du jeu. Une seule boucle (`tick`) le fait avancer.
3. **Données séparées du code.** Unités, secteurs, catégories du glossaire, modèles d'appels et phrases radio sont des fichiers de données (`src/data`), pas du code.
4. **Pas de backend au MVP.** Tout tourne dans le navigateur. Sauvegarde éventuelle en `localStorage` plus tard.

## 2. Vue d'ensemble

```
┌──────────────────────── UI (React) ────────────────────────┐
│  layout/  calls/  map/  units/  incident/                   │
└───────▲───────────────────────────────────┬────────────────┘
        │ sélecteurs (lecture)               │ actions (commandes)
┌───────┴───────────────────────────────────▼────────────────┐
│                  store/ (Zustand)                           │
│  clock · calls · incidents · units · radio · score          │
└───────▲───────────────────────────────────┬────────────────┘
        │ nouvel état                        │ état + commande
┌───────┴───────────────────────────────────▼────────────────┐
│                core/ (fonctions pures, testées)             │
│  tick · movement · dispatch · statusMachine · events ·      │
│  callEngine · callerEngine · scenarioGenerator · scoring                                       │
└───────────────────────────▲────────────────────────────────┘
                            │ lecture seule
                  data/ (unités, secteurs, glossaire, modèles d'appels, radio)
```

Transverses : `audio/` (écoute les événements du store, joue les sons), `lib/` (géo, temps, formatage).

## 3. Modules du moteur (`src/core`)

| Module | Responsabilité |
| :--- | :--- |
| `tick` | Fait avancer l'horloge simulée (`dt × timeScale`), appelle les autres modules dans un ordre fixe |
| `movement` | Pas de module séparé au MVP : `lib/geo` (Haversine, `moveToward`) et `tick` (vitesse unique 50 km/h, ligne droite). Coefficient route et vitesse par type = évolution |
| `dispatch` | `assignUnit` (unité disponible, fiche ouverte et géolocalisée), `unassignUnit` (unité en route), `closeIncident` (fiche de gravité 1 en attente), `releaseUnit` (l'unité libérée rentre à sa brigade en ligne droite à 50 km/h, puis `DISPO_POSTE`). Le statut d'une fiche ouverte est déduit des unités rattachées (`sync`) |
| `statusMachine` | Tables des transitions autorisées (`canUnit`, `canIncident`) ; `dispatch` refuse les transitions illégales |
| `events` | Aléas sur les fiches où une unité est sur place : renfort, concours SAMU / pompiers / service des routes ; tirage de l'issue ; expiration des demandes sans réponse et des fiches laissées trop longtemps sans unité (`FAILED`). RNG injectable (tests reproductibles) |
| `scenarioGenerator` | Tire un appel aléatoire (`CallTruth` : faits, adresse, identité, personnalité) pour une zone donnée ; RNG injectable |
| `callerEngine` | Interface `CallerEngine` + implémentation procédurale : détecte les sujets de la saisie libre (mots-clés), répond d'après `CallTruth` avec variantes aléatoires, gère stress, répétitions, raccroché |
| `callEngine` | État d'un appel (transcript, stress), brouillon de fiche saisi par l'opérateur, validation (catégorie du glossaire + gravité + adresse), construction de l'`Incident` |
| `scoring` | Temps de réponse, délais cibles tenus, issues, satisfaction ; bilan de la journée (bouton « Bilan »), recalculé depuis les fiches |

Ordre d'un tick : générer appels → avancer unités → transitions de statut → aléas → journaliser → score.

## 4. État (`src/store`)

Un store unique découpé en tranches :

| Tranche | Contenu |
| :--- | :--- |
| `clock` | `now` (ms simulées), `timeScale`, `paused` |
| `calls` | File d'`IncomingCall`, appel actif, niveau de stress |
| `incidents` | `Record<id, Incident>`, incident sélectionné |
| `units` | `Record<id, Unit>`, unité sélectionnée |
| `radio` | Fil de messages radio (transcriptions) |
| `score` | Compteurs de performance |

Le store appelle `core` ; il ne contient pas de règle métier. Commandes exposées : `answerCall`, `chooseResponse`, `validateIncident`, `assignUnit`, `unassignUnit`, `requestBackup`, `closeIncident`, `setTimeScale`.

## 5. Carte (`components/map`)

- React-Leaflet, tuiles CartoDB Dark Matter.
- Une couche **unités** (icône par type, couleur par statut), une couche **incidents** (badge de gravité 1-5), une couche **secteurs** (polygones GeoJSON, zone police vs gendarmerie).
- Le déplacement n'utilise pas de routage réel au MVP : interpolation linéaire sur coordonnées. Routage réel (OSRM) = amélioration ultérieure.
- Les marqueurs lisent le store ; ils n'animent pas eux-mêmes la position (le moteur la calcule). Ils sont des pastilles HTML (`L.divIcon`) mises en cache.
- Seules les unités du poste du joueur et les fiches de sa zone sont affichées. Carte centrée sur le Val-d'Oise ; une icône par caserne (`data/brigades` : 20 unités de gendarmerie, BMO et peloton motorisé compris) et une patrouille par véhicule (`LOUVRES.101`, `LOUVRES.102`…), stationnée à sa brigade au départ. Les couches secteurs ne sont pas dessinées.
- Une fiche sans coordonnées se place par un clic sur la carte (`placeIncident`).
- Boucle de jeu : `App` appelle `tick` toutes les 250 ms (temps réel plafonné à 1 s) ; `dt simulé = dt réel × timeScale`.

## 6. Audio (`src/audio`)

Howler.js. Un module unique expose `play(soundId)`. Il s'abonne aux événements du store (appel entrant, urgence radio, message radio). Sons dans `public/audio/`. Respecter la politique d'autoplay : déverrouillage au premier clic (écran de prise de service).

## 7. Appels, appelants et fiche

- **Conversation libre.** L'opérateur écrit ; `say(text)` envoie au `CallerEngine`, qui renvoie une `CallerReply` (texte, variation de stress, sujets traités, fin éventuelle). L'appel reste `pending` pendant l'attente (déjà asynchrone pour accueillir un LLM).
- **Appel = vérité cachée.** `generateCall(rng, service)` produit un `IncomingCall` dont `truth` (catégorie réelle, adresse, victimes, auteurs, armes, identité…) n'est jamais affichée. L'appelant ne dit que `truth.opening` tant qu'on ne l'interroge pas. Il ne ment pas et n'invente rien.
- **Personnalités.** `CALME` (répond directement), `PANIQUE` (stress élevé, parfois incapable de répondre, se calme avec des consignes), `EVASIF` (refuse nom / téléphone la première fois).
- **Stress.** Consignes rassurantes : baisse. Répétition d'une question : hausse. Propos désagréables : forte hausse. À 100, l'appelant raccroche. L'opérateur ne voit qu'un « ton » (calme / tendu / paniqué).
- **Fiche.** Fenêtre CAD (`components/incident/FicheWindow`) au-dessus de la carte pendant l'appel. L'état est un `IncidentDraft` vide au départ ; rien n'est prérempli. La gravité découle de la catégorie du glossaire (non saisie). Le numéro de l'appelant, s'il n'est pas masqué, est prérempli (modifiable) ; l'adresse propose des suggestions depuis le gazetteer. Validation : catégorie du glossaire, adresse non vide.
- **Géolocalisation.** `lib/geocode` retrouve la rue saisie dans un petit gazetteer (`data/gazetteer`) et en déduit coordonnées et zone ; sinon `coordinates = null` (à placer sur la carte à l'étape 3).
- **Glossaire.** `data/categories.json` (313 lignes : libellé, niveau, définition) extrait du PDF officiel de `docs/`.
- **Brancher un LLM plus tard.** Écrire une autre implémentation de `CallerEngine` (prompt = `CallTruth` + transcript), l'exporter à la place de `callerEngine`. Le reste du jeu est inchangé. À prévoir alors : clé API côté serveur (proxy), pas dans le navigateur.

## 8. Choix et limites assumés

| Choix | Limite | Évolution |
| :--- | :--- | :--- |
| Déplacement sur itinéraire OSRM (serveur de démo public, sans clé), vitesse par tronçon × 1,25 (2-tons) ; repli en ligne droite à 50 km/h hors-ligne. Adresse géocodée par la BAN (api-adresse.data.gouv.fr), repli gazetteer | Dépend d'internet ; serveurs publics sans garantie ; mêmes coefficients pour toutes les unités ; une unité engagée ne peut pas être réaffectée en route (gravité 5) ; pas de délai de départ depuis le poste | OSRM auto-hébergé, vitesse par type d'unité |
| Aléas tirés par fiche (renfort, concours SAMU / pompiers / service des routes), deux au plus, probabilité par minute selon la gravité ; issue tirée au hasard à la fin (pacifié 55 %, interpellé 30 %, fausse alerte 15 %) | Pas de poursuite / refus d'obtempérer ; l'opérateur ne peut pas demander un concours de sa propre initiative ; la salle n'envoie pas de message radio libre | Poursuite et herse (DIV), issues liées à la catégorie, demande de concours proactive |
| Appelant procédural (mots-clés) | Comprend mal les formulations inattendues ; réponses de qualité limitée | Implémentation LLM de `CallerEngine` |
| Gazetteer : 183 communes du 95 × 8 noms de voies courants, positions approchées (`data/communes`, `data/gazetteer`) ; tout le 95 est en zone gendarmerie | Les vraies rues viennent de la BAN après validation ; hors-ligne, la fiche est placée près du centre de la commune | Autocomplétion BAN |
| Pas de backend | Pas de multi-joueur ni de persistance serveur | API + base si besoin |
| Une seule ville de départ | Données géographiques réduites | Packs de secteurs |

## 9. Plan de développement

Reprend les étapes 1 à 4 de `CONTEXT.md`, précédées d'une étape 0 de socle.

| Étape | Livrable |
| :--- | :--- |
| 0 (fait) | Socle Vite + React + TS strict + Tailwind + Vitest ; `src/types` ; CI locale (`typecheck`, `test`) |
| 1 (fait) | Cockpit 3 volets, thème sombre, données factices |
| 2 (fait) | Prise d'appel libre, appelants générés, fiche saisie par l'opérateur, glossaire |
| 3 (fait) | Carte, unités, assignation, déplacement, machine à statuts |
| 4 | Aléas, ambiance radio, bilan de fin de journée |
