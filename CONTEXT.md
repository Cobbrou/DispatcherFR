# CONTEXTE PROJET & CAHIER DES CHARGES : SIMULATEUR CAD / OPÉRATEUR 17 (POLICE & GENDARMERIE)

> **Document de référence pour l'IA d'assistance au développement (Claude / Anthropic)**  
> **Objectif :** Fournir le contexte métier, fonctionnel, technique et architectural pour guider la conception et le développement complet d'un simulateur de dispatching réaliste pour la Police Nationale et la Gendarmerie Nationale.

---

## 1. VISION & POSITIONNEMENT DU PROJET

### 1.1 Concept
Le projet (nom de code provisoire : **"DISPATCH-17"**) est un simulateur de poste de commandement et de gestion des interventions d'urgence inspiré de simulateurs professionnels (CAD - *Computer-Aided Dispatch*) et de jeux comme *Sim Dispatcher*, *112 Operator* ou *Police Simulator*, mais adapté avec un **hyper-réalisme ciblé sur les doctrines et le vocabulaire français**.

Le joueur incarne un opérateur de salle opérationnelle :
- **Police Nationale :** Opérateur au **CIC** (Centre d'Information et de Commandement).
- **Gendarmerie Nationale :** Opérateur au **CORG** (Centre d'Opérations et de Renseignement de la Gendarmerie).

### 1.2 Piliers de l'expérience
1. **Réalisme procédural :** Respect des procédures françaises de qualification d'infraction, des indicatifs radio, des statuts et de la sectorisation (Zone Police vs Zone Gendarmerie).
2. **Stress & Prise de décision :** Gestion simultanée du flux d'appels 17, de la cartographie dynamique, de la disponibilité limitée des effectifs et des demandes de renforts imprévues.
3. **Ergonomie logicielle :** Interface inspirée des logiciels opérationnels réels (type SARI / Pégase / LUPIN) : épurée, sombre, fonctionnelle, orientée données et cartographie.

---

## 2. LORE MÉTIER & RÉALISME FRANÇAIS (RÉFÉRENTIEL OPÉRATIONNEL)

Ce module sert à calibrer les termes et logiques que l'IA utilisera dans les scripts et données du jeu.

### 2.1 Les Centres Opérationnels
- **CIC (Police Nationale - Zone Police / ZPN) :** Gestion des zones urbaines denses (Circonscriptions de Sécurité Publique - CSP / commissariats).
- **CORG (Gendarmerie Nationale - Zone Gendarmerie / ZGN) :** Gestion des zones périurbaines et rurales, autoroutes, compagnies et brigades territoriales.

### 2.2 Unités & Moyens disponibles

#### Police Nationale
- **Police Secours / PAM (Patrouille d'Assistance Mutuelle) :** Première réponse généraliste, équipage de 2 ou 3 agents.
- **BAC (Brigade Anti-Criminalité) :** Équipages en civil/tenue banalisée ou sérigraphiée, flagrants délits, interventions sensibles.
- **BST / GSP (Brigade Spécialisée de Terrain / Groupe de Sécurité de Proximité) :** Présence dissuasive en zones sensibles.
- **Motocyclistes (FM / FMU) :** Rapidité d'accès, circulation dense, refus d'obtempérer légers.
- **OPJ d'Appel (Officier de Police Judiciaire) :** Référant légal pour qualifications, mandats, gardes à vue.
- **Unités d'intervention spécialisées :** BRI / RAID (événements majeurs : forcené armé, prise d'otages).
- **Canine / Cynophile :** Détection stups/explosifs, recherche de fuite.

#### Gendarmerie Nationale
- **BTA / COB (Brigade Territoriale Autonome / Communauté de Brigades) :** Patrouilles de secteur rurales et périurbaines.
- **PSIG (Peloton de Surveillance et d'Intervention de la Gendarmerie) :** Force d'appui, équipages armés pour situations dégradées.
- **BMO / EDSR (Brigade Motorisée / Escadron Départemental de Sécurité Routière) :** Vitesse, axes routiers.
- **GIGN / AGIGN :** Terrorisme, forcenés retranchés, prises d'otages.

### 2.3 Statuts Opérationnels (Transpondeur / Radio)
Chaque unité possède un état strict :
- `10-0` / `DISPO_ON_ZONE` : Disponible sur secteur (en patrouille proactive).
- `10-1` / `DISPO_POSTE` : Disponible au commissariat / à la brigade.
- `10-2` / `EN_ROUTE` : Tenu / Engagé vers le lieu de l'intervention.
- `10-3` / `SUR_LES_LIEUX` : Arrivé sur place, prise de contact.
- `10-4` / `EN_TRANSPORT` : Transport d'individu (vers commissariat, hôpital, etc.).
- `10-5` / `INDISPONIBLE` : Fin de service, relève, repas, rédaction de PV.
- `URGENCE_RADIO` / `APPEL_DETRESSE` : Agent en danger immédiat (déclenchement alarme générale).

---

## 3. BOUCLE DE GAMEPLAY & ARCHITECTURE DES MODULES

### 3.1 Module 1 : Prise d'Appel (Call Taking)
- **Déclenchement :** Ligne 17 sonne (signal sonore et visuel).
- **Conversation libre (pas d'arbre de dialogue) :** l'opérateur écrit lui-même ses questions et consignes ; aucune phrase n'est prédéfinie.
  - L'appelant est généré au hasard (faits, adresse, identité, personnalité calme / paniqué / évasif) et répond à ce qu'on lui demande, sans rien révéler de plus que sa première phrase.
  - Gestion du stress : un appelant paniqué se calme avec des consignes rassurantes, s'agace des répétitions, raccroche si on est désagréable.
  - Possibilité de donner des consignes de sécurité à l'appelant (se cacher, ne pas intervenir, premiers secours).
  - Moteur de réponse **procédural local** aujourd'hui (mots-clés + tirages) ; interface prévue pour le remplacer plus tard par un LLM via API.
- **Fiche saisie par l'opérateur :** il est seul responsable du contenu. Une fenêtre CAD s'ouvre au décroché : catégorie (parmi le glossaire officiel), gravité, requérant (nom, prénom, téléphone), adresse, complément, faits, victimes, auteurs, blessés, armes, signalement, moyens à engager. Rien n'est prérempli ; l'appelant ne remplit jamais la fiche.

### 3.2 Module 2 : Main Courante Informatisée (CAD)
- Interface de gestion des fiches d'intervention :
  - **Identifiant :** ex: `FICH-2026-0042`
  - **Catégorie :** libellé du *Glossaire alphabétique ensemble catégories* (MAJ 01-2026), `docs/GLOSSAIRE ALPHABETIQUE ENSEMBLE CATEGORIES (MAJ 01- 2026).pdf`, 313 catégories.
  - **Localisation :** adresse saisie par l'opérateur, géocodée si possible (sinon à placer sur la carte).
  - **Gravité (échelle de 1 à 5, proposée par le niveau de la catégorie dans le glossaire, modifiable par l'opérateur) :**
    - `5` (Urgence vitale / Arme / Péril imminent : gyrophare + 2-tons)
    - `4` (Intervention rapide requise)
    - `3` (Intervention à traiter, sans urgence immédiate)
    - `2` (Différé possible / Constat)
    - `1` (Simple renseignement / information)
  - **Chronologie (Journal des logs) :** Horodatage automatique des actions (Appel reçu, unité engagée, arrivée sur les lieux, clôture).

### 3.3 Module 3 : Cartographie Opérationnelle (GIS / SIG)
- Carte vectorielle interactive (fond type Mapbox / Leaflet / MapLibre avec thème sombre tactique).
- Affichage des icônes d'unités avec vecteur de déplacement réaliste (vitesse calculée selon réseau routier ou formule de distance pondérée).
- Secteurs d'affectation (zones de patrouille délimitées).
- Affichage des marqueurs d'interventions avec badge de gravité.

### 3.4 Module 4 : Résolution Dynamique & Événements Aléatoires
- L'intervention n'est pas un simple minuteur passif :
  - **Événement inattendu :** Demande de renforts ("L'individu refuse de coopérer, présence de 3 individus supplémentaires"), blessé nécessitant une demande de concours SAMU (15) ou Sapeurs-Pompiers (18).
  - **Poursuite / Refus d'obtempérer :** Marqueur mobile sur la carte, nécessité de coordonner une interception ou une herse (DIV).
  - **Issue de l'intervention :** Individu interpellé, fuite, fausse alerte, situation pacifiée.

---

## 4. STACK TECHNIQUE RECOMMANDÉE

Pour un développement rapide, réactif, modulaire et maintenable :

| Composant | Technologie suggérée | Justification |
| :--- | :--- | :--- |
| **Framework Frontend** | React 19 (TypeScript) ou SvelteKit | Écosystème riche, gestion du typage pour les modèles de données complexes |
| **Styling** | Tailwind CSS + Lucide Icons | Interface sombre de type tableau de bord / terminal militaire |
| **Cartographie** | Leaflet (React-Leaflet) ou MapLibre GL | Léger, supporte des tuiles OpenStreetMap avec styles sombres (CartoDB Dark Matter) |
| **State Management** | Zustand (si React) | Parfait pour synchroniser en temps réel la minuterie, les unités et les appels |
| **Audio** | Howler.js | Tonalités radio, bips d'urgence, grésillements réalistes, sonneries du 17 |
| **Génération d'appels** | Générateur procédural local (aléatoire) ; LLM (API) possible plus tard | Appels tirés au hasard, réponses libres ; `CallerEngine` permet de brancher un LLM sans refonte |

---

## 5. MODÈLES DE DONNÉES CLÉS (TYPESCRIPT)

Source de vérité : [`docs/data-model.md`](./docs/data-model.md) (copié dans `src/types/index.ts`). Les types du cahier des charges initial ont évolué : gravité 1-5, catégories du glossaire, fiche saisie par l'opérateur, appel généré (`CallTruth`) au lieu d'un arbre de dialogue.

---

## 6. FEUILLE DE ROUTE DE DÉVELOPPEMENT (MVP PAR ÉTAPES)

### Étape 1 : Socle et Maquette UI (Cockpit d'Opérateur)
- Créer un layout divisé en 3 volets principaux :
  - **Gauche :** Gestion des appels entrants (téléphonie 17) & file d'attente.
  - **Centre :** Carte vectorielle interactive avec affichage des marqueurs (unités et incidents).
  - **Droite :** Liste des unités disponibles/engagées et panneau de détail de la fiche d'incident active (CAD).
- Thème graphique : Interface sombre (`slate-900` / `zinc-900`), typographie monospace tactique pour les statuts et horaires.

### Étape 2 : Moteur d'Appels & Dialogues (Call-Taking Simulator)
- Implémenter le composant de prise d'appel interactif :
  - Sonnerie du 17.
  - Saisie libre de l'opérateur ; réponses de l'appelant générées au hasard.
  - Fenêtre CAD de fiche : l'opérateur remplit lui-même tous les champs (catégorie du glossaire, requérant, lieu, faits…).
  - Bouton "Valider la fiche" pour basculer la fiche dans la main courante active.

### Étape 3 : Gestion Cartographique & Mouvement des Unités (réalisée)
- Placement d'unités de patrouille sur la carte avec des indicatifs français crédibles.
- Logique d'assignation d'une patrouille à un incident.
- Déplacement progressif simulé (interpolation de coordonnées de la position actuelle vers le lieu de l'incident).
- Changement automatique des statuts : `EN_ROUTE` -> `SUR_LES_LIEUX` -> Temporisation d'intervention -> `DISPO_ON_ZONE`.

### Étape 4 : Gestion des Aléas & Radio Ambiance (réalisée)
- Moteur d'événements :
  - Probabilité d'escalade d'une intervention (demande de renforts d'un équipage).
  - Messages audio ou transcriptions radio réalistes ("De PAM 1 pour CIC, arrivés sur les lieux, situation calme").
- Calcul de performance en fin de journée (temps moyen de réponse, interventions résolues, satisfaction des administrés).

---

## 7. CONSIGNES POUR L'ASSISTANT IA (DIRECTIVES POUR CLAUDE)

Lors de vos sessions de travail avec Claude, demandez-lui d'adopter les principes suivants :

1. **Rôle de Claude :** Architecte Logiciel Senior & Spécialiste Gameplay / Ergonomie Opérationnelle.
2. **Qualité de code :**
   - Code typé de façon stricte (TypeScript).
   - Découpage par composants clairs et réutilisables.
   - Séparation stricte entre l'état du jeu (State Management) et l'affichage (UI).
3. **Réalisme linguistique :** Ne jamais utiliser de jargon policier américain générique (comme "10-4 copy that" ou "Dispatch 911"). Toujours privilégier le langage des transmissions françaises : *"Bien reçu", "Tenu", "De PAM 2 pour salle", "Message urgent", "Engagez sur zone"*.
4. **Itération pas-à-pas :** Demandez toujours à Claude de concevoir un composant ou un sous-système à la fois plutôt que d'essayer de coder tout le jeu d'un seul bloc.