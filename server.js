require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SESSION_SECRET = process.env.SESSION_SECRET || 'flexibat-session-secret-a-changer';

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ---------- Email (seul canal de réception des messages de contact) ----------
// Configuré via les variables SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
// Les messages ne sont PAS enregistrés en base — s'ils ne partent pas par
// email (SMTP mal configuré, panne), ils sont perdus. C'est voulu.
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
} else {
  console.log('SMTP non configuré — le formulaire de contact ne pourra pas envoyer de messages.');
}

async function sendContactNotification(msg) {
  const { rows } = await pool.query('SELECT email FROM settings WHERE id = 1');
  const destination = rows[0]?.email;
  if (!destination) throw new Error("Aucune adresse email de destination configurée dans Paramètres.");

  await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destination,
    replyTo: msg.email,
    subject: `[Flexibat — site web] Nouveau message : ${msg.objet || 'Sans objet'}`,
    text: `Nouveau message reçu via le formulaire de contact du site :

Nom : ${msg.nom} ${msg.prenom || ''}
Email : ${msg.email}
Téléphone : ${msg.telephone || 'non renseigné'}
Objet : ${msg.objet || 'non renseigné'}

Message :
${msg.message}

— Tu peux répondre directement à cet email, la réponse partira vers ${msg.email}.`
  });
}

// ---------- Upload photos ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|jpg)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images JPEG/PNG/WEBP sont acceptées'));
  }
});

// ---------- Session ----------
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 12 * 60 * 60 * 1000 } // 12h
}));

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Auth ----------
function requireAdmin(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Non authentifié' });
}

function requireAdminPage(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login.html');
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ id: user.id, username: user.username, role: user.role });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Non authentifié' });
  res.json({ id: req.session.userId, username: req.session.username });
});

app.get('/admin/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-panel', 'login.html'));
});
app.use('/admin', requireAdminPage, express.static(path.join(__dirname, 'admin-panel')));

// =========================================================
// API PUBLIQUE (lecture seule)
// =========================================================

app.get('/api/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT whatsapp, email, telephone, adresse FROM settings WHERE id = 1');
  res.json(rows[0] || { whatsapp: '', email: '', telephone: '', adresse: '' });
});

app.get('/api/terrains', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM terrains ORDER BY created_at DESC');
  res.json(rows.map(toTerrainJson));
});

app.get('/api/terrains/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM terrains WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Terrain introuvable' });
  res.json(toTerrainJson(rows[0]));
});

app.get('/api/realisations', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM realisations ORDER BY created_at DESC');
  res.json(rows.map(toRealisationJson));
});

app.get('/api/realisations/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM realisations WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Réalisation introuvable' });
  res.json(toRealisationJson(rows[0]));
});

// Convertit les colonnes snake_case de Postgres vers le format attendu par le frontend
function toTerrainJson(row) {
  return {
    id: row.id, titre: row.titre, ville: row.ville, site: row.site,
    superficie: row.superficie, prix: row.prix, document: row.document,
    statut: row.statut, paiement: row.paiement, description: row.description,
    photos: row.photos, createdAt: row.created_at
  };
}
function toRealisationJson(row) {
  return {
    id: row.id, titre: row.titre, categorie: row.categorie, lieu: row.lieu,
    description: row.description, photos: row.photos, createdAt: row.created_at
  };
}

// --- Formulaire de contact (public) ---
app.post('/api/contact', async (req, res) => {
  const { nom, prenom, email, telephone, objet, message } = req.body || {};

  if (!nom || !email || !message) {
    return res.status(400).json({ error: 'Nom, email et message sont obligatoires.' });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  const cleanMsg = {
    nom: nom.trim(), prenom: (prenom || '').trim(), email: email.trim(),
    telephone: (telephone || '').trim(), objet: (objet || '').trim(), message: message.trim()
  };

  if (!mailTransporter) {
    console.error('Tentative de contact reçue mais SMTP non configuré :', cleanMsg);
    return res.status(503).json({ error: "L'envoi d'email n'est pas configuré sur le serveur pour le moment." });
  }

  try {
    await sendContactNotification(cleanMsg);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Échec envoi email contact :', err.message);
    res.status(502).json({ error: "Impossible d'envoyer le message pour le moment, merci de réessayer." });
  }
});

// =========================================================
// API ADMIN (protégée par session)
// =========================================================

app.use('/api/admin', requireAdmin);

// --- Paramètres ---
app.put('/api/admin/settings', async (req, res) => {
  const { whatsapp, email, telephone, adresse } = req.body;
  const { rows } = await pool.query(
    `UPDATE settings SET
       whatsapp = COALESCE($1, whatsapp),
       email = COALESCE($2, email),
       telephone = COALESCE($3, telephone),
       adresse = COALESCE($4, adresse)
     WHERE id = 1 RETURNING *`,
    [whatsapp, email, telephone, adresse]
  );
  res.json(rows[0]);
});

// --- Terrains CRUD ---
app.post('/api/admin/terrains', upload.array('photos', 10), async (req, res) => {
  const photos = (req.files || []).map(f => `/uploads/${f.filename}`);
  const { titre, ville, site, superficie, prix, document, statut, paiement, description } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO terrains (titre, ville, site, superficie, prix, document, statut, paiement, description, photos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [titre || '', ville || '', site || '', superficie || '', prix || 'Prix sur demande',
     document || 'ATT', statut || 'disponible', paiement || '', description || '', JSON.stringify(photos)]
  );
  res.status(201).json(toTerrainJson(rows[0]));
});

app.put('/api/admin/terrains/:id', upload.array('photos', 10), async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM terrains WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Terrain introuvable' });

  const newPhotos = (req.files || []).map(f => `/uploads/${f.filename}`);
  let keepPhotos = existing.photos;
  if (req.body.keepPhotos) {
    try { keepPhotos = JSON.parse(req.body.keepPhotos); } catch (e) {}
  }
  const photos = [...keepPhotos, ...newPhotos];

  const fields = ['titre', 'ville', 'site', 'superficie', 'prix', 'document', 'statut', 'paiement', 'description'];
  const merged = {};
  fields.forEach(f => { merged[f] = req.body[f] !== undefined ? req.body[f] : existing[f]; });

  const { rows } = await pool.query(
    `UPDATE terrains SET titre=$1, ville=$2, site=$3, superficie=$4, prix=$5, document=$6,
       statut=$7, paiement=$8, description=$9, photos=$10 WHERE id=$11 RETURNING *`,
    [merged.titre, merged.ville, merged.site, merged.superficie, merged.prix, merged.document,
     merged.statut, merged.paiement, merged.description, JSON.stringify(photos), req.params.id]
  );
  res.json(toTerrainJson(rows[0]));
});

app.patch('/api/admin/terrains/:id/statut', async (req, res) => {
  if (!['disponible', 'reserve', 'vendu'].includes(req.body.statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  const { rows } = await pool.query(
    'UPDATE terrains SET statut = $1 WHERE id = $2 RETURNING *',
    [req.body.statut, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Terrain introuvable' });
  res.json(toTerrainJson(rows[0]));
});

app.delete('/api/admin/terrains/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM terrains WHERE id = $1 RETURNING photos', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Terrain introuvable' });
  (rows[0].photos || []).forEach(p => {
    const filePath = path.join(__dirname, p);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  res.status(204).send();
});

// --- Réalisations CRUD ---
app.post('/api/admin/realisations', upload.array('photos', 10), async (req, res) => {
  const photos = (req.files || []).map(f => `/uploads/${f.filename}`);
  const { titre, categorie, lieu, description } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO realisations (titre, categorie, lieu, description, photos)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [titre || '', categorie || 'BTP', lieu || '', description || '', JSON.stringify(photos)]
  );
  res.status(201).json(toRealisationJson(rows[0]));
});

app.put('/api/admin/realisations/:id', upload.array('photos', 10), async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM realisations WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Réalisation introuvable' });

  const newPhotos = (req.files || []).map(f => `/uploads/${f.filename}`);
  let keepPhotos = existing.photos;
  if (req.body.keepPhotos) {
    try { keepPhotos = JSON.parse(req.body.keepPhotos); } catch (e) {}
  }
  const photos = [...keepPhotos, ...newPhotos];

  const fields = ['titre', 'categorie', 'lieu', 'description'];
  const merged = {};
  fields.forEach(f => { merged[f] = req.body[f] !== undefined ? req.body[f] : existing[f]; });

  const { rows } = await pool.query(
    `UPDATE realisations SET titre=$1, categorie=$2, lieu=$3, description=$4, photos=$5 WHERE id=$6 RETURNING *`,
    [merged.titre, merged.categorie, merged.lieu, merged.description, JSON.stringify(photos), req.params.id]
  );
  res.json(toRealisationJson(rows[0]));
});

app.delete('/api/admin/realisations/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM realisations WHERE id = $1 RETURNING photos', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Réalisation introuvable' });
  (rows[0].photos || []).forEach(p => {
    const filePath = path.join(__dirname, p);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  res.status(204).send();
});

// --- Utilisateurs CRUD ---
app.get('/api/admin/users', async (req, res) => {
  const { rows } = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id');
  res.json(rows.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.created_at })));
});

app.post('/api/admin/users', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis" });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });

  const { rows: clash } = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  if (clash[0]) return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });

  const passwordHash = bcrypt.hashSync(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3) RETURNING id, username, role, created_at`,
    [username, passwordHash, role === 'admin' ? 'admin' : 'gestionnaire']
  );
  const u = rows[0];
  res.status(201).json({ id: u.id, username: u.username, role: u.role, createdAt: u.created_at });
});

app.put('/api/admin/users/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const { username, password, role } = req.body;

  if (username) {
    const { rows: clash } = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
      [username, req.params.id]
    );
    if (clash[0]) return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });
  }

  const newUsername = username || existing.username;
  const newPasswordHash = password ? bcrypt.hashSync(password, 10) : existing.password_hash;
  const newRole = role ? (role === 'admin' ? 'admin' : 'gestionnaire') : existing.role;

  const { rows } = await pool.query(
    `UPDATE users SET username=$1, password_hash=$2, role=$3 WHERE id=$4 RETURNING id, username, role, created_at`,
    [newUsername, newPasswordHash, newRole, req.params.id]
  );
  const u = rows[0];
  res.json({ id: u.id, username: u.username, role: u.role, createdAt: u.created_at });
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.session.userId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (countRows[0].count <= 1) {
    return res.status(400).json({ error: 'Impossible de supprimer le dernier utilisateur' });
  }
  const { rows } = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [targetId]);
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.status(204).send();
});

// Erreurs (multer + erreurs async non catchées)
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Erreur serveur' });
});

app.listen(PORT, () => {
  console.log(`Flexibat server running on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});

