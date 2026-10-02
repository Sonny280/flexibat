// Charge le header et le footer communs (public/partials/) dans les
// emplacements <div id="site-header"></div> / <div id="site-footer"></div>
// de chaque page, pour ne plus avoir à dupliquer ce code partout.
(async function () {
  const headerSlot = document.getElementById('site-header');
  const footerSlot = document.getElementById('site-footer');

  async function inject(slot, url) {
    if (!slot) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} -> ${res.status}`);
      slot.innerHTML = await res.text();
    } catch (e) {
      console.warn('Impossible de charger', url, e);
    }
  }

  await Promise.all([
    inject(headerSlot, 'partials/header.html'),
    inject(footerSlot, 'partials/footer.html')
  ]);

  // Marque le lien actif dans le menu selon la page actuellement affichée
  if (headerSlot) {
    const current = location.pathname.split('/').pop() || 'index.html';
    headerSlot.querySelectorAll('nav a').forEach(a => {
      const hrefPage = (a.getAttribute('href') || '').split('#')[0];
      if (hrefPage === current) a.classList.add('nav-active');
    });

    // Menu mobile (hamburger)
    const toggle = headerSlot.querySelector('.nav-toggle');
    const nav = headerSlot.querySelector('nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const isOpen = toggle.classList.toggle('is-open');
        nav.classList.toggle('nav-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
    }
  }

  // Le modal de demande de devis fait partie du header commun : on charge
  // son script une seule fois, sur toutes les pages, sans avoir à l'ajouter
  // manuellement partout.
  if (headerSlot && !document.querySelector('script[src="devis.js"]')) {
    const script = document.createElement('script');
    script.src = 'devis.js';
    document.body.appendChild(script);
  }

  // Signale aux autres scripts (app.js, animations.js) que le header/footer
  // sont désormais dans le DOM et peuvent être ciblés en toute sécurité.
  document.dispatchEvent(new Event('partials:loaded'));
})();
