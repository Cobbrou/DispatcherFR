# Statuts

Trois référentiels : statuts d'**intervention** (fiche), statuts d'**unité**, **gravité**. Les codes `10-x` viennent du cahier des charges (`CONTEXT.md` §2.3) ; ce sont des identifiants de transpondeur internes, jamais prononcés dans les échanges radio (voir « Vocabulaire » plus bas).

## 1. Statuts d'intervention (`IncidentStatus`)

| Statut | Libellé affiché | Signification | Entrée | Sorties possibles |
| :--- | :--- | :--- | :--- | :--- |
| `PENDING` | En attente | Fiche validée, aucune unité engagée | Validation de la fiche après l'appel | `DISPATCHED`, `RESOLVED` (clôture sans intervention), `FAILED` |
| `DISPATCHED` | Engagée | Au moins une unité en route | Première assignation | `ON_SCENE`, `PENDING` (toutes unités désengagées), `FAILED` |
| `ON_SCENE` | Sur place | Au moins une unité sur les lieux | Arrivée de la première unité | `RESOLVED`, `FAILED`, `DISPATCHED` (les unités sur place sont reparties, il ne reste que des unités en route) |
| `RESOLVED` | Résolue | Clôturée avec une issue | Clôture par l'opérateur ou fin de temporisation | — (final) |
| `FAILED` | Échec | Délai dépassé ou issue négative | Dépassement du délai selon la gravité, fuite sans interception | — (final) |

### Issues (`IncidentOutcome`, requis pour `RESOLVED` / `FAILED`)

| Issue | Statut final typique |
| :--- | :--- |
| `INTERPELLE` | `RESOLVED` |
| `PACIFIE` | `RESOLVED` |
| `FAUSSE_ALERTE` | `RESOLVED` |
| `FUITE` | `FAILED` (ou `RESOLVED` si interception après coordination) |

### Transitions

Le jeu déduit le statut d'une fiche ouverte des unités qui lui sont rattachées : une unité sur les lieux → `ON_SCENE` ; sinon une unité en route → `DISPATCHED` ; sinon `PENDING`. La fiche passe à `RESOLVED` (issue `PACIFIE`) quand la dernière unité a fini sa temporisation. Temporisation sur place : 5, 10, 15, 20, 30 min simulées pour les gravités 1 à 5. L'issue (`PACIFIE`, `INTERPELLE`, `FAUSSE_ALERTE`) est tirée au hasard quand la dernière unité libère la fiche.

**Aléas (étape 4).** Une unité sur place peut demander un **renfort** ou le **concours** du SAMU, des pompiers ou du service des routes (`Incident.pending`). Tant que la demande est en attente, l'équipage reste sur place. Renfort : levé par l'arrivée d'une autre unité, sinon échec (`FAILED`, `FUITE`) après 10 min. Concours : levé par le bouton « Alerter » de la fiche, sinon l'équipage appelle lui-même après 5 min (fiche marquée `neglected`, pénalisée au bilan). Une fiche sans unité sur place après le « délai d'échec » du tableau de la gravité passe aussi en `FAILED` (`FUITE`).

```
PENDING ──assign──▶ DISPATCHED ──arrive──▶ ON_SCENE ──close──▶ RESOLVED
   │                    │  ▲                   │
   │                    │  └──── renfort ──────┤
   │                    ▼                      ▼
   └──timeout───────▶ FAILED ◀──────────── FAILED
```

## 2. Statuts d'unité (`UnitStatus`)

| Statut | Code | Libellé | Engageable ? | Couleur suggérée |
| :--- | :--- | :--- | :--- | :--- |
| `DISPO_ON_ZONE` | `10-0` | Disponible sur secteur | Oui (prioritaire : plus proche) | Vert |
| `DISPO_POSTE` | `10-1` | Disponible au poste | Oui (délai de départ) | Vert clair |
| `EN_ROUTE` | `10-2` | Engagée vers les lieux | Non (sauf réaffectation gravité 5) | Orange |
| `SUR_LES_LIEUX` | `10-3` | Sur place | Non | Rouge |
| `EN_TRANSPORT` | `10-4` | Transport d'individu | Non | Violet |
| `INDISPONIBLE` | `10-5` | Fin de service, repas, rédaction | Non | Gris |

`URGENCE_RADIO` (agent en danger, alarme générale) a été retiré : jamais produit, il doublait la demande de renfort. À reprendre avec la mécanique de poursuite / refus d'obtempérer.

### Transitions autorisées

| De | Vers | Déclencheur |
| :--- | :--- | :--- |
| `DISPO_ON_ZONE` / `DISPO_POSTE` | `EN_ROUTE` | Assignation à une fiche |
| `EN_ROUTE` | `SUR_LES_LIEUX` | Position atteinte (interpolation terminée) |
| `EN_ROUTE` | `DISPO_ON_ZONE` | Fiche annulée / désengagement |
| `SUR_LES_LIEUX` | `EN_TRANSPORT` | Interpellation avec transport |
| `SUR_LES_LIEUX` | `DISPO_ON_ZONE` | Fin de temporisation d'intervention |
| `EN_TRANSPORT` | `DISPO_POSTE` | Arrivée au poste / à l'hôpital |
| `DISPO_*` | `INDISPONIBLE` | Bouton « Indispo » : pause, fin de service (l'unité s'arrête sur place) |
| `INDISPONIBLE` | `DISPO_POSTE` / `DISPO_ON_ZONE` | Bouton « Reprendre » : au poste si elle y est, sinon elle regagne sa brigade |

Toute autre transition est rejetée par `core/statusMachine`.

## 3. Gravité (`GravityLevel`)

Échelle de 1 à 5 portée par la fiche. 5 = le plus grave, 1 = simple renseignement.

**Source : le niveau de chaque catégorie du glossaire officiel** (`docs/GLOSSAIRE ALPHABETIQUE ENSEMBLE CATEGORIES (MAJ 01- 2026).pdf`, colonne « NIVEAU »). Quand l'opérateur choisit une catégorie, ce niveau devient la gravité de la fiche (non saisie, non modifiable).

| Niveau | Sens | Exemples de catégories du glossaire | Délai cible de réponse* | Délai d'échec* |
| :--- | :--- | :--- | :--- | :--- |
| `5` | Péril imminent, urgence vitale, événement majeur | accident aéronef mortel, différend violences conjugales mortelles, agression autorité | ≤ 5 min | 15 min |
| `4` | Intervention rapide requise | violences ou voies de faits avec armes, vol à main armée VAMA, accident circulation mortel, disparition inquiétante mineur | ≤ 10 min | 30 min |
| `3` | À traiter, sans urgence immédiate | vol avec violences, rixe bagarre, cambriolage résidence, accident circulation corporel, différend violences conjugales | ≤ 20 min | 1 h |
| `2` | Différé possible, constat | tapage, accident circulation matériel, menaces, personne suspecte rôdeur | ≤ 60 min | 3 h |
| `1` | Renseignement, information | demande renseignement | Aucun | Aucun |

\* Valeurs de départ pour le prototype, à équilibrer au playtest. Temps simulé, pas temps réel.

Niveau `1` : une fiche peut se clôturer sans engager d'unité ; pas de délai d'échec. Au-delà, la clôture sans intervention est refusée (`closeIncident`).

Le délai d'échec ne s'applique que tant qu'aucune unité n'est arrivée sur les lieux. Une unité libérée rentre à sa brigade (`DISPO_ON_ZONE` en route, puis `DISPO_POSTE` à l'arrivée) ; elle reste engageable pendant ce trajet.

## 4. Vocabulaire

À respecter dans toutes les phrases affichées (règle n°3 du cahier des charges) :

- Utiliser : « Bien reçu », « Tenu », « De PAM 2 pour salle », « Message urgent », « Engagez sur zone ».
- Interdit : « copy that », « 10-4 » prononcé, « Dispatch 911 ».
- Les codes `10-x` ne servent que d'identifiants techniques (badges, logs de statut), jamais de réplique radio.
