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
})();

