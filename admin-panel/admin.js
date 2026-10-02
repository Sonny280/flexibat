const modalRoot = document.getElementById('modal-root');
let terrainsCache = [];
let realisationsCache = [];
let usersCache = [];
let currentUserId = null;

// ---------- Session ----------
(async function checkSession() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) { window.location.href = '/admin/login.html'; return; }
  const me = await res.json();
  currentUserId = me.id;
  document.getElementById('current-user').textContent = `Connecté : ${me.username}`;
})();

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});

// ---------- Onglets ----------
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

function statutLabel(s) { return { disponible: 'Disponible', reserve: 'Réservé', vendu: 'Vendu' }[s] || s; }

// ---------- Terrains ----------
async function loadTerrains() {
  const res = await fetch('/api/terrains');
  terrainsCache = await res.json();
  document.getElementById('terrains-count').textContent = `${terrainsCache.length} terrain(s)`;
  document.getElementById('terrains-table').innerHTML = terrainsCache.map(t => `
    <tr>
      <td>${t.photos[0] ? `<img src="${t.photos[0]}">` : '—'}</td>
      <td>${t.titre}</td>
      <td>${t.ville}</td>
      <td>${t.prix}</td>
      <td>
        <select class="status-select" onchange="quickChangeStatut(${t.id}, this.value)">
          ${['disponible', 'reserve', 'vendu'].map(s => `<option value="${s}" ${t.statut === s ? 'selected' : ''}>${statutLabel(s)}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-secondary btn-small" onclick="openTerrainModal(${t.id})">Modifier</button>
        <button class="btn btn-danger btn-small" onclick="deleteTerrain(${t.id})">Supprimer</button>
      </td>
    </tr>
  `).join('');
}

async function quickChangeStatut(id, statut) {
  await fetch(`/api/admin/terrains/${id}/statut`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statut })
  });
  loadTerrains();
}

async function loadRealisations() {
  const res = await fetch('/api/realisations');
  realisationsCache = await res.json();
  document.getElementById('realisations-count').textContent = `${realisationsCache.length} réalisation(s)`;
  document.getElementById('realisations-table').innerHTML = realisationsCache.map(r => `
    <tr>
      <td>${r.photos[0] ? `<img src="${r.photos[0]}">` : '—'}</td>
      <td>${r.titre}</td>
      <td>${r.categorie}</td>
      <td>${r.lieu || ''}</td>
      <td>
        <button class="btn btn-secondary btn-small" onclick="openRealisationModal(${r.id})">Modifier</button>
        <button class="btn btn-danger btn-small" onclick="deleteRealisation(${r.id})">Supprimer</button>
      </td>
    </tr>
  `).join('');
}

async function loadSettings() {
  const res = await fetch('/api/settings');
  const s = await res.json();
  document.getElementById('set-whatsapp').value = s.whatsapp || '';
  document.getElementById('set-email').value = s.email || '';
  document.getElementById('set-telephone').value = s.telephone || '';
  document.getElementById('set-adresse').value = s.adresse || '';
}

// ---------- Utilisateurs ----------
async function loadUsers() {
  const res = await fetch('/api/admin/users');
  usersCache = await res.json();
  document.getElementById('users-count').textContent = `${usersCache.length} utilisateur(s)`;
  document.getElementById('users-table').innerHTML = usersCache.map(u => `
    <tr>
      <td>${u.username}${u.id === currentUserId ? ' <span style="color:#6B6A63; font-size:12px;">(vous)</span>' : ''}</td>
      <td><span class="role-badge ${u.role}">${u.role === 'admin' ? 'Administrateur' : 'Gestionnaire'}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
      <td>
        <button class="btn btn-secondary btn-small" onclick="openUserModal(${u.id})">Modifier</button>
        <button class="btn btn-danger btn-small" onclick="deleteUser(${u.id})" ${u.id === currentUserId ? 'disabled title="Vous ne pouvez pas supprimer votre propre compte"' : ''}>Supprimer</button>
      </td>
    </tr>
  `).join('');
}

function openUserModal(id) {
  const u = id ? usersCache.find(x => x.id === id) : null;
  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h2>${u ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}</h2>
        <form id="user-form">
          <div class="field"><label>Nom d'utilisateur</label><input name="username" required value="${u ? u.username : ''}"></div>
          <div class="field">
            <label>${u ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}</label>
            <input name="password" type="password" ${u ? '' : 'required'} minlength="6">
          </div>
          <div class="field"><label>Rôle</label>
            <select name="role">
              <option value="gestionnaire" ${u && u.role === 'gestionnaire' ? 'selected' : ''}>Gestionnaire</option>
              <option value="admin" ${u && u.role === 'admin' ? 'selected' : ''}>Administrateur</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
          <div class="error" id="user-form-error" style="color:#B8492E; font-size:13px; margin-top:10px; display:none;"></div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    if (!body.password) delete body.password;

    const url = u ? `/api/admin/users/${u.id}` : '/api/admin/users';
    const method = u ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      const errBox = document.getElementById('user-form-error');
      errBox.textContent = err.error || 'Erreur';
      errBox.style.display = 'block';
      return;
    }
    closeModal();
    loadUsers();
  });
}

async function deleteUser(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    alert(err.error || 'Erreur lors de la suppression');
    return;
  }
  loadUsers();
}

// ---------- Modal Terrain ----------
function openTerrainModal(id) {
  const t = id ? terrainsCache.find(x => x.id === id) : null;
  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h2>${t ? 'Modifier le terrain' : 'Ajouter un terrain'}</h2>
        <form id="terrain-form">
          <div class="field"><label>Titre</label><input name="titre" required value="${t ? t.titre : ''}"></div>
          <div class="field-row">
            <div class="field"><label>Ville</label><input name="ville" required value="${t ? t.ville : ''}"></div>
            <div class="field"><label>Site / quartier</label><input name="site" value="${t ? t.site : ''}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Superficie</label><input name="superficie" placeholder="ex: 550 m²" value="${t ? t.superficie : ''}"></div>
            <div class="field"><label>Document</label>
              <select name="document">
                ${['ACD', 'ATT', 'CF'].map(d => `<option ${t && t.document === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Prix</label><input name="prix" placeholder="ex: 8 500 000 FCFA" value="${t ? t.prix : ''}"></div>
            <div class="field"><label>Statut</label>
              <select name="statut">
                ${['disponible', 'reserve', 'vendu'].map(s => `<option value="${s}" ${t && t.statut === s ? 'selected' : ''}>${statutLabel(s)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field"><label>Modalité de paiement</label><input name="paiement" placeholder="ex: Payable sur 6 mois" value="${t ? t.paiement : ''}"></div>
          <div class="field"><label>Description</label><textarea name="description">${t ? t.description : ''}</textarea></div>
          <div class="field">
            <label>Photos</label>
            ${t && t.photos.length ? `<div class="existing-photos" id="existing-photos">${t.photos.map(p => `
              <div class="ph"><img src="${p}"><button type="button" class="remove-ph" data-photo="${p}">×</button></div>
            `).join('')}</div>` : ''}
            <input type="file" name="photos" multiple accept="image/*">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let keepPhotos = t ? [...t.photos] : [];
  modalRoot.querySelectorAll('.remove-ph').forEach(btn => {
    btn.addEventListener('click', () => {
      keepPhotos = keepPhotos.filter(p => p !== btn.dataset.photo);
      btn.closest('.ph').remove();
    });
  });

  document.getElementById('terrain-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (t) formData.append('keepPhotos', JSON.stringify(keepPhotos));
    const url = t ? `/api/admin/terrains/${t.id}` : '/api/admin/terrains';
    const method = t ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: formData });
    if (!res.ok) { alert('Erreur lors de l\'enregistrement'); return; }
    closeModal();
    loadTerrains();
  });
}

async function deleteTerrain(id) {
  if (!confirm('Supprimer ce terrain ?')) return;
  await fetch(`/api/admin/terrains/${id}`, { method: 'DELETE' });
  loadTerrains();
}

// ---------- Modal Réalisation ----------
function openRealisationModal(id) {
  const r = id ? realisationsCache.find(x => x.id === id) : null;
  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h2>${r ? 'Modifier la réalisation' : 'Ajouter une réalisation'}</h2>
        <form id="realisation-form">
          <div class="field"><label>Titre</label><input name="titre" required value="${r ? r.titre : ''}"></div>
          <div class="field-row">
            <div class="field"><label>Catégorie</label>
              <select name="categorie">
                ${['BTP', 'Terrain', 'FlexiPlomb'].map(c => `<option ${r && r.categorie === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Lieu</label><input name="lieu" value="${r ? r.lieu : ''}"></div>
          </div>
          <div class="field"><label>Description</label><textarea name="description">${r ? r.description : ''}</textarea></div>
          <div class="field">
            <label>Photos</label>
            ${r && r.photos.length ? `<div class="existing-photos" id="existing-photos-r">${r.photos.map(p => `
              <div class="ph"><img src="${p}"><button type="button" class="remove-ph" data-photo="${p}">×</button></div>
            `).join('')}</div>` : ''}
            <input type="file" name="photos" multiple accept="image/*">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let keepPhotos = r ? [...r.photos] : [];
  modalRoot.querySelectorAll('.remove-ph').forEach(btn => {
    btn.addEventListener('click', () => {
      keepPhotos = keepPhotos.filter(p => p !== btn.dataset.photo);
      btn.closest('.ph').remove();
    });
  });

  document.getElementById('realisation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (r) formData.append('keepPhotos', JSON.stringify(keepPhotos));
    const url = r ? `/api/admin/realisations/${r.id}` : '/api/admin/realisations';
    const method = r ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: formData });
    if (!res.ok) { alert('Erreur lors de l\'enregistrement'); return; }
    closeModal();
    loadRealisations();
  });
}

async function deleteRealisation(id) {
  if (!confirm('Supprimer cette réalisation ?')) return;
  await fetch(`/api/admin/realisations/${id}`, { method: 'DELETE' });
  loadRealisations();
}

function closeModal() { modalRoot.innerHTML = ''; }

// ---------- Settings ----------
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    whatsapp: document.getElementById('set-whatsapp').value.trim(),
    email: document.getElementById('set-email').value.trim(),
    telephone: document.getElementById('set-telephone').value.trim(),
    adresse: document.getElementById('set-adresse').value.trim()
  };
  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.ok) {
    const msg = document.getElementById('settings-saved');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2500);
  }
});

// ---------- Boutons "ajouter" ----------
document.getElementById('add-terrain-btn').addEventListener('click', () => openTerrainModal(null));
document.getElementById('add-realisation-btn').addEventListener('click', () => openRealisationModal(null));
document.getElementById('add-user-btn').addEventListener('click', () => openUserModal(null));

// ---------- Init ----------
loadTerrains();
loadRealisations();
loadSettings();
loadUsers();
