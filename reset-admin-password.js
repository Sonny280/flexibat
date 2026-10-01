// Réinitialise le mot de passe d'un utilisateur existant.
// Usage : node reset-admin-password.js <nom_utilisateur> <nouveau_mot_de_passe>
// Exemple : node reset-admin-password.js admin flexibat2026
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.error('Usage : node reset-admin-password.js <nom_utilisateur> <nouveau_mot_de_passe>');
  console.error('Exemple : node reset-admin-password.js admin flexibat2026');
  process.exit(1);
}

async function run() {
  const hash = bcrypt.hashSync(newPassword, 10);
  const { rowCount } = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2',
    [hash, username]
  );
  if (rowCount === 0) {
    console.log(`Aucun utilisateur "${username}" trouvé dans la base.`);
  } else {
    console.log(`✓ Mot de passe mis à jour pour "${username}". Tu peux te connecter avec ce nouveau mot de passe.`);
  }
  await pool.end();
}

run().catch(err => {
  console.error('Erreur pendant la réinitialisation :', err);
  process.exit(1);
});
