-- Schéma Flexibat — PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'gestionnaire',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS terrains (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  ville TEXT NOT NULL,
  site TEXT DEFAULT '',
  superficie TEXT DEFAULT '',
  prix TEXT DEFAULT 'Prix sur demande',
  document TEXT DEFAULT 'ATT',
  statut TEXT NOT NULL DEFAULT 'disponible',
  paiement TEXT DEFAULT '',
  description TEXT DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terrains_ville ON terrains(ville);
CREATE INDEX IF NOT EXISTS idx_terrains_statut ON terrains(statut);
CREATE INDEX IF NOT EXISTS idx_terrains_document ON terrains(document);
CREATE INDEX IF NOT EXISTS idx_terrains_created_at ON terrains(created_at DESC);

CREATE TABLE IF NOT EXISTS realisations (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'BTP',
  lieu TEXT DEFAULT '',
  description TEXT DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_realisations_categorie ON realisations(categorie);
CREATE INDEX IF NOT EXISTS idx_realisations_created_at ON realisations(created_at DESC);

CREATE TABLE IF NOT EXISTS actualites (
  id SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'Info',
  contenu TEXT DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actualites_categorie ON actualites(categorie);
CREATE INDEX IF NOT EXISTS idx_actualites_created_at ON actualites(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  whatsapp TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telephone TEXT NOT NULL DEFAULT '',
  adresse TEXT NOT NULL DEFAULT '',
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id, whatsapp, email, telephone, adresse)
VALUES (1, '', '', '', '')
ON CONFLICT (id) DO NOTHING;
