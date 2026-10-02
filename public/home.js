(async function () {
  // Dernier terrain ajouté -> encart prix sur la carte "Terrains"
  try {
    const res = await fetch('/api/terrains');
    const terrains = await res.json();
    const box = document.getElementById('latest-terrain-price');
    if (box && terrains.length > 0) {
      const t = terrains[0]; // déjà trié du plus récent au plus ancien
      box.innerHTML = `
        ${t.titre}, ${t.ville}
        <span class="amount">${t.prix}</span>
        ${t.superficie} — ${t.paiement || ''}
      `;
    } else if (box) {
      box.innerHTML = 'Contactez-nous pour connaître les terrains disponibles';
    }
  } catch (e) { console.warn(e); }

  // Dernières réalisations -> galerie accueil (les plus récentes uniquement, cliquables)
  try {
    const res = await fetch('/api/realisations');
    const realisations = await res.json();
    const grid = document.getElementById('gallery-grid');
    if (grid && realisations.length > 0) {
      grid.innerHTML = '';
      // L'API renvoie déjà du plus récent au plus ancien : on ne garde que les 4 dernières
      realisations.slice(0, 4).forEach(r => {
        const link = document.createElement('a');
        link.href = `realisation-detail.html?id=${r.id}`;
        link.className = 'gallery-item';
        const img = document.createElement('img');
        img.src = (r.photos && r.photos[0]) ? r.photos[0] : 'https://picsum.photos/seed/flexibat-real/500/380';
        img.alt = r.titre;
        link.appendChild(img);
        grid.appendChild(link);
      });
    }
    // Si aucune réalisation en base, on laisse les images placeholder déjà présentes dans le HTML
  } catch (e) { console.warn(e); }

  // Dernières actualités -> aperçu sur l'accueil + bandeau d'annonce
  try {
    const res = await fetch('/api/actualites');
    const actus = await res.json();

    // Bandeau d'annonce (affiche la dernière actualité, fermable, ne revient pas une fois fermé)
    const banner = document.getElementById('actu-banner');
    if (banner && actus.length > 0) {
      const latest = actus[0];
      const dismissedId = localStorage.getItem('flexibat-actu-banner-dismissed');
      if (String(latest.id) !== dismissedId) {
        const prefix = latest.categorie === 'Recrutement' ? 'Recrutement — '
          : latest.categorie === 'Stage' ? 'Stage — ' : '';
        document.getElementById('actu-banner-link').textContent = `📢 ${prefix}${latest.titre} — En savoir plus`;
        banner.style.display = 'flex';
        document.getElementById('actu-banner-close').addEventListener('click', () => {
          localStorage.setItem('flexibat-actu-banner-dismissed', String(latest.id));
          banner.style.display = 'none';
        });
      }
    }

    const list = document.getElementById('home-actus-list');
    if (list) {
      if (actus.length === 0) {
        list.innerHTML = '<p style="color:#6B6A63;">Aucune actualité publiée pour le moment.</p>';
      } else {
        list.innerHTML = actus.slice(0, 3).map(a => `
          <a href="actualites.html" style="display:block; background:#fff; border:1px solid #E4E1D6; border-radius:6px; overflow:hidden; color:inherit; text-decoration:none;">
            ${a.photos && a.photos[0] ? `<img src="${a.photos[0]}" alt="${a.titre}" style="width:100%; height:160px; object-fit:cover; display:block;">` : ''}
            <div style="padding:18px 20px;">
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--laterite, #B8492E); margin-bottom:8px;">${a.categorie}</div>
              <h3 style="font-size:16px; margin-bottom:6px;">${a.titre}</h3>
              <div style="font-size:12px; color:#6B6A63;">${new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </a>
        `).join('');
      }
    }
  } catch (e) { console.warn(e); }

  // Formulaire de contact
  const form = document.getElementById('contact-form');
  if (form) {
    const submitBtn = document.getElementById('contact-submit');
    const feedback = document.getElementById('contact-feedback');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedback.style.display = 'none';

      const data = {
        nom: form.nom.value.trim(),
        prenom: form.prenom.value.trim(),
        email: form.email.value.trim(),
        telephone: form.telephone.value.trim(),
        objet: form.objet.value,
        message: form.message.value.trim()
      };

      if (!data.nom || !data.email || !data.message) {
        feedback.textContent = 'Merci de renseigner au moins votre nom, votre email et votre message.';
        feedback.style.color = '#B8492E';
        feedback.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours...';

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok) {
          feedback.textContent = 'Merci, votre message a bien été envoyé ! Nous vous répondrons sous 1 à 2 jours ouvrés.';
          feedback.style.color = '#5C7A52';
          form.reset();
        } else {
          feedback.textContent = result.error || "Une erreur est survenue, merci de réessayer.";
          feedback.style.color = '#B8492E';
        }
      } catch (err) {
        feedback.textContent = "Impossible d'envoyer le message pour le moment. Réessayez un peu plus tard.";
        feedback.style.color = '#B8492E';
        console.error(err);
      }

      feedback.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer';
    });
  }
})();
