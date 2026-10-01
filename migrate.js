// Script à lancer UNE FOIS pour créer les tables et importer les données
// existantes de data.json vers PostgreSQL.
//
// Usage : node migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function run() {
  console.log('Création des tables...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
  console.log('✓ Tables créées.');

  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('Aucun data.json trouvé — base neuve.');
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    if (rows[0].count === 0) {
      const bcrypt = require('bcryptjs');
      await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3)',
        ['admin', bcrypt.hashSync('flexibat2026', 10), 'admin']
      );
      console.log('✓ Compte admin de départ créé (admin / flexibat2026) — à changer dès la première connexion.');
    }
    await pool.end();
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Utilisateurs
  for (const u of data.users || []) {
    await pool.query(
      `INSERT INTO users (id, username, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.username, u.passwordHash, u.role, u.createdAt]
    );
  }
  console.log(`✓ ${(data.users || []).length} utilisateur(s) importé(s).`);

  // Terrains
  for (const t of data.terrains || []) {
    await pool.query(
      `INSERT INTO terrains (id, titre, ville, site, superficie, prix, document, statut, paiement, description, photos, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [t.id, t.titre, t.ville, t.site, t.superficie, t.prix, t.document, t.statut, t.paiement, t.description, JSON.stringify(t.photos || []), t.createdAt]
    );
  }
  console.log(`✓ ${(data.terrains || []).length} terrain(s) importé(s).`);

  // Réalisations
  for (const r of data.realisations || []) {
    await pool.query(
      `INSERT INTO realisations (id, titre, categorie, lieu, description, photos, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.titre, r.categorie, r.lieu, r.description, JSON.stringify(r.photos || []), r.createdAt]
    );
  }
  console.log(`✓ ${(data.realisations || []).length} réalisation(s) importée(s).`);

  // Paramètres
  if (data.settings) {
    await pool.query(
      `UPDATE settings SET whatsapp=$1, email=$2, telephone=$3, adresse=$4 WHERE id=1`,
      [data.settings.whatsapp || '', data.settings.email || '', data.settings.telephone || '', data.settings.adresse || '']
    );
    console.log('✓ Paramètres importés.');
  }

  // Remettre les compteurs auto-incrémentés à jour après un import avec ID explicites
  await pool.query(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))`);
  await pool.query(`SELECT setval('terrains_id_seq', COALESCE((SELECT MAX(id) FROM terrains), 1))`);
  await pool.query(`SELECT setval('realisations_id_seq', COALESCE((SELECT MAX(id) FROM realisations), 1))`);

  console.log('\nMigration terminée. Tu peux maintenant renommer data.json (ex: data.json.backup) et démarrer le serveur normalement.');
  await pool.end();
}

run().catch(err => {
  console.error('Erreur pendant la migration :', err);
  process.exit(1);
});
