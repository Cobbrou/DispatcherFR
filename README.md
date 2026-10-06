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
6. Ajout de la possibilité de parler à la radio en tant qu'opérateur, 

Issues de la revue du projet (moteur, interface, hygiène). Les `fichier:ligne` pointent le code au moment de la revue.

7. **Correctifs du moteur (priorité haute).**
   - Une fiche `PENDING` de n'importe quelle gravité peut être clôturée sans intervention avec l'issue `FAUSSE_ALERTE` en dur (`core/dispatch.ts`, `store/gameStore.ts`) : satisfaction 100, aucune pénalité. Limiter à la gravité 1 (comme prévu dans `docs/statuses.md`), sinon issue distincte « Classée sans suite » comptée au bilan, avec confirmation en gravité 4-5.
   - `FM 1` (`EN_TRANSPORT`) et `CYNO 1` (`INDISPONIBLE`) restent figées toute la partie (`data/mock.ts`) : aucun code ne les remet en service. Ajouter un délai de retour (`busyUntil`) et un enchaînement `INTERPELLE → EN_TRANSPORT → DISPO_POSTE`, ou les remettre en dispo.
   - Délai d'échec calculé depuis la création (`core/events.ts`) : si la dernière unité sur place repart alors qu'un renfort est en route, la fiche passe aussitôt en `FAILED`. Ne l'appliquer que tant que `firstArrivalAt === null`.
   - `onTimePct` (`core/scoring.ts`) ignore les fiches sans arrivée (échec ou retard) : pourcentage gonflé. Compter ces fiches comme délai manqué (gravité ≥ 2) et adapter le test.
   - Résultat BAN appliqué sans condition (`store/gameStore.ts`) : il écrase un placement manuel, fait « sauter » une unité déjà engagée et ne recalcule pas la zone. N'appliquer que si les coordonnées n'ont pas changé ; sortir `geocodeBan` du callback de `set`.
   - BAN (`lib/ban.ts`) : `lat/lon` n'est qu'un biais, un homonyme hors département peut sortir (unité envoyée à des centaines de km) ; rejeter au-delà de ~30 km du centre, passer le centre selon la zone du poste (utile pour l'étape 5), vérifier `res.ok`.
   - `lib/geocode.ts` : le premier nombre de l'adresse est pris pour le numéro ; un code postal (« rue Carnot 77000 Melun ») décale la fiche de ~170 km. Ne lire que `^\d{1,3}\b`.
   - Fiche saisie hors zone du poste (ex. Dammarie en zone police) : la fiche disparaît de la liste et de la carte sans message, puis échoue. Afficher un avertissement de transfert ou une pastille « hors zone ». Ajouter aussi la garde `service` / `zone` dans `assignUnit` (le moteur doit refuser, pas seulement l'interface).
   - OSRM (`lib/route.ts`) : `res.ok` non vérifié, durée absente → `NaN` (l'unité arrive instantanément), repli en ligne droite silencieux. Vérifier `Number.isFinite`, timeout plus court (2 s), message de journal « itinéraire estimé », cache des routes déjà calculées, URL configurable (`VITE_OSRM_URL`), espacer les requêtes (le serveur de démo limite à ~1 req/s).
   - Après l'intervention, l'unité reste à l'adresse de la fiche en `DISPO_ON_ZONE` (`core/tick.ts`) : prévoir un trajet de retour vers son secteur ou le poste, et un délai de départ du poste.
   - Instant d'arrivée imprécis à vitesse élevée : `firstArrivalAt` et `onSceneUntil` utilisent la fin du tick (`core/tick.ts`) ; calculer l'instant réel d'arrivée.
   - `say` (`store/gameStore.ts`) : si `callerEngine.reply` rejette, `pending` reste à `true` et l'appel est bloqué ; ajouter un `try/catch` avec réplique de repli (nécessaire avant un `CallerEngine` LLM).
   - `callerEngine` : regex non ancrées (« respirez » ou « j'envoie les pompiers » déclenchent `VICTIMS`, « dépêchez vous » est classé grossier) ; `REASSURE` perdu quand une phrase a trois sujets (`slice(0, 3)`). Ancrer avec `\b`, traiter `REASSURE` hors plafond.
   - Reproductibilité : le nombre de tirages RNG dépend de la cadence des ticks (`core/events.ts`) ; un tirage par fiche et par tick, ou un RNG par fiche.
   - `RadioLog` : le défilement dépend de `radio.length`, plafonné à 200 messages ; il s'arrête une fois le plafond atteint. Dépendre du dernier `id` et défiler le conteneur.
8. **Flux d'appels et bilan.**
   - Génération automatique des appels dans le moteur (`nextCallAt`, cadence selon la charge et `timeScale`, RNG injectable) : aujourd'hui seul le bouton « + Appel entrant (test) » en ajoute. Masquer ce bouton hors `import.meta.env.DEV`, afficher l'attente de chaque appel, abandon d'un appel resté trop longtemps en file avec pénalité au bilan.
   - Utiliser `CallTruth.requiredUnits` (lu nulle part) : sous-engagement / sur-engagement au bilan.
   - Comparer la catégorie saisie à `truth.category` : pénaliser la sous-évaluation de gravité.
   - Compteurs de temps réaliste : unité en attente d'itinéraire (jusqu'à 5 s réelles) ne doit pas faire perdre du temps simulé au joueur.
9. **Ergonomie de l'opérateur.**
   - Raccourcis clavier (Espace = pause, 1/2/3 = vitesses, F2 = fiche, Ctrl+Entrée = valider, Échap = fermer), `aria-pressed` sur les vitesses, bannière « PAUSE ».
   - Synchroniser sélection liste / carte / détail : `selectedUnitId` dans le store, `flyTo` sur la fiche sélectionnée, clic sur un marqueur d'unité, défilement de la ligne sélectionnée.
   - `UnitList` : trier les unités disponibles par distance, afficher distance et ETA, raison de l'impossibilité d'engager en texte visible, libellés de types lisibles (`MOTOCYCLISTES`), pluriel (« 1 agents »), « calcul… » tant que la route n'est pas arrivée.
   - Bandeau d'état dégradé quand OSRM ou la BAN sont hors-ligne (« tracé direct », « fiche non géolocalisée : cause »). Signaler les fiches « à placer » dans la liste.
   - Fiche d'appel : bouton « Réduire » (elle masque toute la carte), `<form onSubmit>` (Entrée valide), `required`, raison affichée quand « Valider » est grisé, confirmation avant « Abandonner » / « Raccrocher », avertissement « catégorie absente du glossaire » seulement si aucune catégorie ne commence par la saisie.
   - Accessibilité : `ReportModal` en `<dialog>` (rôle, Échap, focus, retour du focus), `role="log"` / `aria-live` sur le transcript d'appel et `RadioLog`, `aria-current` / `aria-pressed` sur la liste et les onglets, contraste des badges (blanc sur orange / sky / emerald < 4,5:1) et de `text-slate-500`, `color-scheme: dark`.
   - Mise en page : colonnes `clamp(...)` et colonne de droite repliable sous ~1100 px ; la carte est écrasée à 1024 px.
   - Constantes et libellés en dur à centraliser dans `src/data` (vitesses, salle CIC / CORG via `salleOf`, centre de carte, URL des tuiles, seuils de ton, couleurs de statut dupliquées entre `mapIcons` et `statuses`) ; apostrophes à unifier.
10. **Performance.**
    - `Cockpit` relit `now` 4 fois par seconde et re-rend tous ses enfants (la `datalist` de 313 options de la fiche est reconstruite à chaque tick) : composant `<Clock/>`, `memo` sur `FicheWindow`, `RadioLog`, `CallPanel`.
    - `MapView` : `useGameStore()` sans sélecteur (re-rendu à chaque frappe de la fiche), `renderToStaticMarkup` appelé à chaque tick avant le test du cache d'icônes (`mapIcons.tsx`), `pathOptions` recréés à chaque rendu.
    - `IncidentList` : lire `Math.floor(now / 60_000)` ; `IncidentDetail` : ne s'abonner qu'aux indicatifs, pas à tout `units`.
    - Bundle de 691 kB : `react-dom/server` embarqué pour 4 glyphes (pré-rendre en constantes SVG), `React.lazy` sur `MapView`.
11. **Tests, CI et hygiène.**
    - Tests manquants : `core/tick.ts`, `core/scoring.ts`, `core/statusMachine.ts`, `lib/route.ts` (`positionAt`, `buildRoute`, repli hors-ligne), `lib/ban.ts`, `store/gameStore.ts` (course `assignUnit` / `fetchRoute`, `placeIncident` après engagement, pause). Cas du moteur à fixer : clôture en gravité ≥ 4, renfort en route quand l'unité sur place repart, arrivée et échec dans le même tick, adresse avec code postal.
    - CI : script `check` (typecheck + lint + test) et workflow GitHub Actions (`npm ci`, `check`, `build`) ; retirer `--passWithNoTests`.
    - `LICENSE` (ou `UNLICENSED` explicite), provenance du glossaire PDF et de `categories.json`, `.gitattributes` (`* text=auto eol=lf`).
    - Dépendances : `howler` / `@types/howler` et `@types/node` inutilisés (supprimer, ou livrer l'audio) ; `src/audio/` et `public/audio/` vides.
    - Sécurité : CSP dans `index.html` (`connect-src` OSRM + BAN, `img-src` tuiles), favicon, échapper `callsign` injecté dans le HTML des `divIcon`.
    - Tuiles OSM : attribution avec lien vers `openstreetmap.org/copyright` ; politique d'usage limitée, prévoir un fournisseur à clé ou des tuiles auto-hébergées avant diffusion publique ; message quand les tuiles ne chargent pas (`tileerror`).
12. **Fonctionnalités à étudier.**
    - Audio : sonnerie d'appel, bip de renfort / urgence radio, grésillement (`howler`, déverrouillage au premier clic).
    - Sauvegarde / reprise de la journée (`persist` de Zustand, `partialize` sans `route`), bouton « Nouvelle journée ».
    - Poursuite / refus d'obtempérer (herse), demande de concours à l'initiative de l'opérateur, suggestions d'adresse via la BAN (le gazetteer ne couvre que 16 rues).
    - Statuts jamais produits (`URGENCE_RADIO`, `INDISPONIBLE`, `DISPO_POSTE`) : implémenter ou retirer.
13. **Documentation à réaligner sur le code.**
    - Tuiles : code = OSM + filtre CSS, docs = CartoDB (`README` §2, `docs/architecture.md` §5, `CONTEXT.md` §4).
    - Déplacement : `README` §1, `docs/architecture.md` §3 (ligne `movement`) et §5 décrivent la ligne droite ; le code suit OSRM avec repli à 50 km/h.
    - `docs/architecture.md` §4 : commandes du store périmées (`chooseResponse`, `validateIncident`, `requestBackup` n'existent pas ; le store est plat) ; §3 et §9 : « générer appels » et l'audio ne sont pas implémentés.
    - `docs/data-model.md` : manquent `Route`, `Unit.route`, `routeElapsedMs`, `ConcoursService`, `PendingEvent`, `Incident.pending` / `firstArrivalAt` / `neglected`.
    - `README` §1 et `CONTEXT.md` §3.2 disent la gravité « modifiable », `docs/data-model.md` et `docs/statuses.md` « non modifiable » (le code suit ces derniers) ; `CONTEXT.md` §3.1 cite des champs de fiche supprimés (blessés, armes, signalement, moyens à engager).
    - `README` §4 : phrase `--passWithNoTests` périmée (51 tests).

Détail : [`docs/architecture.md`](./docs/architecture.md#9-plan-de-développement).
