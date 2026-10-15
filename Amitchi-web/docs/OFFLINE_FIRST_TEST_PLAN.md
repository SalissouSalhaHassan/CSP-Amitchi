# 📋 Plan de Test Offline-First — Edut Pro

> **Version :** 1.0  
> **Date :** 2026-07-07  
> **Modules couverts :** Étudiants · Paiements · Présences · Notes · Impression  

---

## 🔧 Prérequis

- [ ] Application démarrée en local (`npm run dev`)
- [ ] Base de données PostgreSQL accessible
- [ ] Navigateur Chrome / Edge (DevTools disponibles)
- [ ] Onglet DevTools → Application → IndexedDB → `EdutLocalDatabase` visible
- [ ] Page de diagnostic ouverte : `/dashboard/synchronisation/diagnostic`

---

## 🔴 PHASE 1 — Coupure Internet

### 1.1 Simulation de la coupure

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Ouvrir DevTools → Network → **Throttling = Offline** | — |
| 2 | Vérifier le badge en haut de la page | Badge **« Hors ligne »** (amber) visible |
| 3 | Ouvrir `/dashboard/synchronisation/diagnostic` | Status = ❌ Offline · Service Worker = ✅ |
| 4 | Vérifier `Outbox count` | = 0 (avant toute action) |

---

## 👤 PHASE 2 — Création d'un étudiant hors ligne

### 2.1 Créer un nouvel étudiant

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Aller sur `/dashboard/students` | Liste des élèves chargée depuis cache |
| 2 | Cliquer **« Ajouter un élève »** | Dialog ouvert |
| 3 | Remplir les champs : Nom, Matricule, Classe | — |
| 4 | Cliquer **« Enregistrer »** | ✅ Élève ajouté avec `temporaryId` |
| 5 | Vérifier la liste | Élève visible avec badge **« Non synchronisé »** |
| 6 | Ouvrir IndexedDB → `students` | Entrée présente avec ID négatif ou `temp-*` |
| 7 | Vérifier IndexedDB → `outbox` | Action `INSERT` · status = `pending` |
| 8 | Vérifier `Outbox count` sur `/diagnostic` | = 1 |

### 2.2 Modifier l'étudiant hors ligne

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Cliquer sur l'élève → **Modifier** | Dialog ouvert avec données locales |
| 2 | Changer le nom ou la classe | — |
| 3 | Enregistrer | Mise à jour locale immédiate |
| 4 | Vérifier `outbox` | Nouvelle action `UPDATE` · status = `pending` |

### 2.3 Vérification anti-doublon

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Tenter d'ajouter un élève avec le même matricule | ❌ Toast d'erreur : « Matricule déjà utilisé » |

---

## 💰 PHASE 3 — Paiement hors ligne

### 3.1 Enregistrer un paiement

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Aller sur la fiche de l'élève → Paiements | — |
| 2 | Cliquer **« Ajouter un versement »** | Dialog ouvert |
| 3 | Saisir montant, mode, référence | — |
| 4 | Valider | Paiement enregistré localement |
| 5 | Vérifier la liste des versements | Badge **« Provisoire (en attente) »** |
| 6 | IndexedDB → `feePayments` | Entrée avec `isProvisoire: true` |
| 7 | `outbox` | Action `INSERT` · `targetTable = feePayments` |

### 3.2 Générer un reçu provisoire

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Cliquer **« Imprimer reçu provisoire »** | Dialog d'aperçu ouvert |
| 2 | Cliquer **« PDF »** | PDF téléchargé |
| 3 | Vérifier la bannière amber dans le PDF | « Document généré hors ligne - en attente de synchronisation » |
| 4 | Vérifier le QR code | Présent · contient `REF`, `LOCAL_ID`, `STATUS: provisoire` |
| 5 | Cliquer **« Imprimer »** | Impression navigateur avec bannière offline |

### 3.3 Prévention double paiement

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Tenter d'enregistrer le même paiement (même référence) | ❌ Toast d'erreur |
| 2 | `outbox` | Pas de doublon créé |

---

## 📋 PHASE 4 — Présence hors ligne

### 4.1 Enregistrer une feuille d'appel

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Aller sur `/dashboard/attendance` | — |
| 2 | Sélectionner une classe et une date | — |
| 3 | Marquer plusieurs élèves (Présent / Absent / Retard) | — |
| 4 | Cliquer **« Enregistrer »** | ✅ Toast « Présence enregistrée localement » |
| 5 | Badge de statut dans le tableau | **Local** (amber) |
| 6 | IndexedDB → `studentAttendance` | Entrées créées pour chaque élève |
| 7 | `outbox` | Action `INSERT` · `targetTable = attendanceBatches` |

### 4.2 Anti-doublon présence

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Enregistrer à nouveau la même classe / même date | Mise à jour (pas de doublon) |
| 2 | IndexedDB → `studentAttendance` | Même nombre d'entrées qu'avant |

### 4.3 SMS / WhatsApp différé

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Activer le switch SMS ou WhatsApp | — |
| 2 | Enregistrer hors ligne | Pas d'envoi immédiat |
| 3 | Vérifier les logs console | Message « SMS/WhatsApp différé (offline) » |

### 4.4 Impression liste de présence hors ligne

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Cliquer **« Imprimer »** dans la grille d'appel | PDF téléchargé |
| 2 | Vérifier la bannière dans le PDF | « Document généré hors ligne... » |
| 3 | Vérifier le QR code | Contient `ATTENDANCE`, date, `STATUS: provisoire` |

---

## 📝 PHASE 5 — Notes hors ligne

### 5.1 Saisir des notes

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Aller sur la grille de résultats d'un examen | — |
| 2 | Saisir les notes des élèves | — |
| 3 | Cliquer **« Enregistrer »** | ✅ Notes stockées localement |
| 4 | Badges dans le tableau | **En attente** (amber) |
| 5 | IndexedDB → `examResults` | Entrées créées |
| 6 | `outbox` | Action `INSERT` · `targetTable = examResults` |

### 5.2 Impression bulletin hors ligne

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Générer un bulletin d'un élève non synchronisé | — |
| 2 | Vérifier la bannière footer | « ⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE... » |
| 3 | QR code présent | ✅ |

---

## 🌐 PHASE 6 — Retour de la connectivité & Synchronisation

### 6.1 Rétablir l'Internet

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | DevTools → Network → **No throttling** | — |
| 2 | Badge de statut | Passe en **« En ligne »** (emerald) |
| 3 | `/diagnostic` → Status | ✅ Online |

### 6.2 Déclenchement du sync

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Aller sur `/dashboard/synchronisation` | Page outbox |
| 2 | Cliquer **« Synchroniser »** | Spinner visible · items passent en `syncing` |
| 3 | Attendre la fin | Items passent en **Synchronisé** ✅ |
| 4 | `Outbox count` sur `/diagnostic` | = 0 |
| 5 | Vérifier l'étudiant créé | Badge « Non synchronisé » disparaît |
| 6 | Vérifier le paiement | `isProvisoire` = `false` |
| 7 | Vérifier le QR code du reçu régénéré | `STATUS: officiel` |

### 6.3 Remplacement des temporaryId

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | IndexedDB → `students` après sync | ID numérique réel (pas négatif) |
| 2 | IndexedDB → `outbox` | Item avec le bon `entityId` réel |

---

## ⚡ PHASE 7 — Conflits

### 7.1 Simulation d'un conflit

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Modifier un élève hors ligne | Action dans `outbox` |
| 2 | Modifier le même élève sur le serveur (via autre session / BDD) | — |
| 3 | Se reconnecter + Synchroniser | Item passe en **Conflit** 🔥 |
| 4 | Aller sur `/dashboard/synchronisation/conflits` | Conflit listé avec données locale vs serveur |

### 7.2 Résolution « Garder local »

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Cliquer **« Garder local »** | Item repasse en `pending` |
| 2 | Synchroniser | Données locales écrasent le serveur |

### 7.3 Résolution « Garder serveur »

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Cliquer **« Garder serveur »** | Item passe en `cancelled` |
| 2 | Vérifier la liste | Données serveur conservées |

### 7.4 Fusion manuelle

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1 | Cliquer **« Fusionner manuellement »** | Modal de comparaison ouvert |
| 2 | Éditer les champs à fusionner | — |
| 3 | Valider | Item repasse en `pending` avec payload fusionné |
| 4 | Synchroniser | Données fusionnées envoyées |

---

## 🖨️ PHASE 8 — Impression Offline

| Document | Bannière offline | QR code | ✅ |
|----------|-----------------|---------|---|
| Reçu de paiement | « Document généré hors ligne... » | REF + LOCAL_ID + STATUS | ☐ |
| Bulletin scolaire | « ⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE... » | Matricule + Décision + Status | ☐ |
| Attestation | « Document généré hors ligne... » | DOC-REF + LOCAL_ID + STATUS | ☐ |
| Carte d'admission | « Document généré hors ligne... » | ADM-REF + LOCAL_ID + STATUS | ☐ |
| Liste de présence | « Document généré hors ligne... » | ATTENDANCE + date + STATUS | ☐ |

**Après sync :** Reprinter le même document → bannière disparaît, `STATUS: officiel`

---

## 🔍 PHASE 9 — Diagnostic

| # | Vérification | URL | Résultat attendu |
|---|-------------|-----|-----------------|
| 1 | IndexedDB Status | `/diagnostic` | ✅ Accessible |
| 2 | Service Worker | `/diagnostic` | ✅ Registered / Active |
| 3 | Outbox count (offline) | `/diagnostic` | N > 0 après actions |
| 4 | Outbox count (après sync) | `/diagnostic` | = 0 |
| 5 | Last sync | `/diagnostic` | Timestamp mis à jour |
| 6 | Cache size | `/diagnostic` | Taille en KB affichée |
| 7 | Tables counts | `/diagnostic` | students, feePayments, etc. |

---

## ✅ Résumé des critères de validation

| Critère | OK |
|---------|-----|
| Création étudiant offline + badge | ☐ |
| Paiement offline + reçu provisoire | ☐ |
| Présence offline + anti-doublon | ☐ |
| Notes offline + bulletin | ☐ |
| Sync réussie (tous les modules) | ☐ |
| Résolution conflits (3 modes) | ☐ |
| Impression offline (5 documents) | ☐ |
| Page diagnostic fonctionnelle | ☐ |
| Build sans erreurs TypeScript | ☐ |
| 0 régression sur fonctions online | ☐ |

---

> 📌 **Note :** Ce plan doit être exécuté dans l'ordre. Chaque phase suppose que la précédente a réussi.  
> 🔗 **Voir aussi :** `/dashboard/synchronisation/diagnostic` pour le monitoring en temps réel.
