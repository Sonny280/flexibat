// Injecte dynamiquement le numéro WhatsApp, l'email et le téléphone
// partout dans la page où ces attributs data-* sont présents.
// Utilisation :
//   <a data-whatsapp-link href="#">...</a>   -> href = https://wa.me/NUMERO
//   <span data-whatsapp-display></span>       -> texte = numéro formaté
//   <span data-email-display></span>          -> texte = email
//   <a data-email-link href="#">...</a>       -> href = mailto:email
//   <span data-telephone-display></span>      -> texte = téléphone
async function applyFlexibatSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();

    const defaultWhatsappMessage = 'Bonjour, je souhaite avoir des informations sur vos services (BTP, VRD, FlexiPlomb, terrains).';
    document.querySelectorAll('[data-whatsapp-link]').forEach(el => {
      const msg = el.dataset.whatsappMessage || defaultWhatsappMessage;
      el.href = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`;
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
}

// Le header/footer communs sont injectés de façon asynchrone par includes.js
// (voir partials/). On attend qu'ils soient dans la page avant d'y appliquer
// les coordonnées (WhatsApp, email, téléphone, adresse) ; si la page n'utilise
// pas includes.js (pas de #site-header), on applique directement.
if (document.getElementById('site-header') || document.getElementById('site-footer')) {
  document.addEventListener('partials:loaded', applyFlexibatSettings);
} else {
  applyFlexibatSettings();
}

// Utilitaire pour les pages qui affichent des listes (terrains, réalisations)
function statutLabel(statut) {
  return { disponible: 'Disponible', reserve: 'Réservé', vendu: 'Vendu' }[statut] || statut;
}
function statutClass(statut) {
  return { disponible: 'disponible', reserve: 'reserve', vendu: 'reserve' }[statut] || '';
}
