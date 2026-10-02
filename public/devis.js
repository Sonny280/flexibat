// Formulaire de demande de devis (popup) -> envoie un message WhatsApp
// pré-rempli au numéro configuré dans Paramètres. Rien n'est stocké côté
// serveur : le visiteur part directement sur WhatsApp avec son message prêt.
(function () {
  let whatsappNumber = null;

  async function getWhatsappNumber() {
    if (whatsappNumber) return whatsappNumber;
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();
      whatsappNumber = settings.whatsapp || '';
    } catch (e) {
      whatsappNumber = '';
    }
    return whatsappNumber;
  }

  function openModal(type) {
    const overlay = document.getElementById('devis-modal-overlay');
    if (!overlay) return;
    const select = overlay.querySelector('select[name="type"]');
    if (select && type) select.value = type;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('devis-modal-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    const errorBox = document.getElementById('devis-form-error');
    if (errorBox) errorBox.style.display = 'none';
  }

  // Ouverture : n'importe quel élément avec [data-devis-trigger], ailleurs sur la page
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-devis-trigger]');
    if (trigger) {
      e.preventDefault();
      openModal(trigger.dataset.devisType || '');
    }
    if (e.target.id === 'devis-modal-close' || e.target.id === 'devis-modal-overlay') {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Soumission : construit le message et ouvre WhatsApp
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'devis-form') return;
    e.preventDefault();

    const form = e.target;
    const errorBox = document.getElementById('devis-form-error');
    const data = {
      nom: form.nom.value.trim(),
      telephone: form.telephone.value.trim(),
      type: form.type.value,
      lieu: form.lieu.value.trim(),
      description: form.description.value.trim()
    };

    if (!data.nom || !data.telephone || !data.description) {
      if (errorBox) {
        errorBox.textContent = 'Merci de renseigner au moins votre nom, votre téléphone et votre besoin.';
        errorBox.style.display = 'block';
      }
      return;
    }

    const number = await getWhatsappNumber();
    if (!number) {
      if (errorBox) {
        errorBox.textContent = "Le numéro WhatsApp n'est pas configuré pour le moment, merci de nous contacter directement.";
        errorBox.style.display = 'block';
      }
      return;
    }

    const message = [
      `Bonjour, je souhaite une demande de devis (${data.type}).`,
      `Nom : ${data.nom}`,
      `Téléphone : ${data.telephone}`,
      data.lieu ? `Lieu du projet : ${data.lieu}` : null,
      `Besoin : ${data.description}`
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    form.reset();
    closeModal();
    window.location.href = url;
  });
})();
