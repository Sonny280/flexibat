// Injecte dynamiquement le numéro WhatsApp, l'email et le téléphone
// partout dans la page où ces attributs data-* sont présents.
// Utilisation :
//   <a data-whatsapp-link href="#">...</a>   -> href = https://wa.me/NUMERO
//   <span data-whatsapp-display></span>       -> texte = numéro formaté
//   <span data-email-display></span>          -> texte = email
//   <a data-email-link href="#">...</a>       -> href = mailto:email
//   <span data-telephone-display></span>      -> texte = téléphone
(async function () {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();

    document.querySelectorAll('[data-whatsapp-link]').forEach(el => {
      el.href = `https://wa.me/${settings.whatsapp}`;
    });
    document.querySelectorAll('[data-whatsapp-display]').forEach(el => {
      el.textContent = '+' + settings.whatsapp.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
    });
    document.querySelectorAll('[data-email-link]').forEach(el => {
      el.href = `mailto:${settings.email}`;
    });
    document.querySelectorAll('[data-email-display]').forEach(el => {
      el.textContent = settings.email;
    });
    document.querySelectorAll('[data-telephone-display]').forEach(el => {
      el.textContent = settings.telephone;
    });
    document.querySelectorAll('[data-adresse-display]').forEach(el => {
      el.textContent = settings.adresse;
    });
  } catch (e) {
    console.warn('Impossible de charger les paramètres Flexibat', e);
  }
})();

// Menu mobile : ouverture/fermeture du panneau de navigation sous 900px.
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('header nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Ferme le menu automatiquement quand on choisit un lien.
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

// Utilitaire pour les pages qui affichent des listes (terrains, réalisations)
function statutLabel(statut) {
  return { disponible: 'Disponible', reserve: 'Réservé', vendu: 'Vendu' }[statut] || statut;
}
function statutClass(statut) {
  return { disponible: 'disponible', reserve: 'reserve', vendu: 'reserve' }[statut] || '';
}
