# Flexibat — Site web & espace de gestion

Site vitrine pour Flexibat (BTP, vente de terrains, FlexiPlomb) avec un espace d'administration multi-utilisateurs, sur PostgreSQL.

## Installation

```bash
npm install
cp .env.example .env
```

Ouvrir `.env` :
- `SESSION_SECRET` — remplacer par une chaîne aléatoire longue
- `DATABASE_URL` — URL de connexion PostgreSQL

### Base de données locale

```bash
# Avec PostgreSQL installé localement
createdb flexibat
# DATABASE_URL dans .env : postgresql://user:password@localhost:5432/flexibat
```

### Base de données sur Railway

Ajouter un plugin PostgreSQL au projet Railway — la variable `DATABASE_URL` est injectée automatiquement, rien à faire de plus.

## Créer les tables

```bash
node migrate.js
```

Ce script crée toutes les tables (`users`, `terrains`, `realisations`, `settings`). Sur une base neuve, il crée aussi automatiquement un compte de départ : `admin` / `flexibat2026` — à changer dès la première connexion (onglet Utilisateurs). Si un fichier `data.json` existe encore à la racine (ancienne version du projet), le script importe automatiquement son contenu à la place.

## Démarrage

```bash
npm start
```

- Site public : `http://localhost:3000`
- Espace de gestion : `http://localhost:3000/admin`

## Architecture

```
server.js         Serveur Express — sert le site et expose l'API
db.js              Connexion PostgreSQL (pool pg)
schema.sql          Définition des tables
migrate.js           Script de création des tables + import depuis data.json (une fois)
uploads/              Photos ajoutées depuis l'espace de gestion (fichiers sur disque, chemins en base)
public/                Pages du site public
admin-panel/             Espace de gestion (login + interface, protégé par session)
```

## Espace de gestion

**Terrains** — ajout, modification, suppression, photos multiples, prix, superficie, document (ACD/ATT/CF). Statut modifiable directement dans le tableau.

**Réalisations** — projets réalisés (BTP, terrain, FlexiPlomb) avec photos et description.

**Utilisateurs** — comptes multiples (Administrateur / Gestionnaire), mots de passe hachés (bcrypt).

**Paramètres** — WhatsApp, email, téléphone, adresse — appliqués automatiquement partout sur le site public.

## Déploiement

- **Railway** : ajouter le plugin PostgreSQL (fournit `DATABASE_URL` automatiquement), attacher un volume persistant sur `uploads/` pour les photos.
- **Hébergement cPanel avec Node.js Selector** : PostgreSQL est rarement disponible sur ce type d'offre — vérifier auprès de l'hébergeur, ou héberger uniquement la base ailleurs (Railway, Neon, Supabase) et y connecter l'app via `DATABASE_URL`.
