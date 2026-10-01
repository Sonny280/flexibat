/*
 * Flexibat — animations légères (Motion, build vanilla JS, sans React ni bundler)
 * https://motion.dev
 *
 * Principe : un seul vocabulaire d'animation répété partout (fondu + léger
 * glissement vers le haut), déclenché à l'entrée dans le viewport, avec un
 * effet en cascade pour les grilles. On respecte prefers-reduced-motion et on
 * dégrade proprement si le CDN est bloqué (le site reste utilisable, juste
 * sans animation).
 */
(async () => {
  const html = document.documentElement;
  html.classList.remove('no-js');
  html.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealAllInstantly = () => {
    document.querySelectorAll('.reveal, .reveal-group').forEach((el) => {
      el.classList.add('in-view');
    });
  };

  if (reduceMotion) {
    revealAllInstantly();
    return;
  }

  let animate, inView, stagger;
  try {
    ({ animate, inView, stagger } = await import('https://cdn.jsdelivr.net/npm/motion@11/+esm'));
  } catch (err) {
    // CDN injoignable (réseau restreint, hors-ligne...) : on affiche tout
    // normalement plutôt que de laisser des sections invisibles.
    revealAllInstantly();
    return;
  }

  const EASE = [0.16, 1, 0.3, 1];

  const fadeUp = (el, delay = 0) => {
    el.classList.add('in-view');
    animate(
      el,
      { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0px)'] },
      { duration: 0.7, delay, easing: EASE }
    );
  };

  // ---- Entrée immédiate du hero / bandeau de page (pas de scroll requis) ----
  const heroTargets = document.querySelectorAll('.hero-content > *, .page-banner > *');
  if (heroTargets.length) {
    animate(
      Array.from(heroTargets),
      { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] },
      { duration: 0.7, delay: stagger(0.1), easing: EASE }
    );
  }

  // ---- Révélation au scroll, élément par élément ----
  document.querySelectorAll('.reveal').forEach((el) => {
    inView(
      el,
      () => fadeUp(el),
      { margin: '0px 0px -10% 0px' }
    );
  });

  // ---- Révélation au scroll, en cascade pour les grilles/listes ----
  document.querySelectorAll('.reveal-group').forEach((group) => {
    const items = Array.from(group.children);
    if (!items.length) return;
    inView(
      group,
      () => {
        group.classList.add('in-view');
        animate(
          items,
          { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0px)'] },
          { duration: 0.6, delay: stagger(0.08), easing: EASE }
        );
      },
      { margin: '0px 0px -10% 0px' }
    );
  });

  // ---- Micro-interaction : légère élévation des cartes au survol ----
  document.querySelectorAll('.activity-card, .terrain-card, .team-card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      animate(card, { transform: ['translateY(0px)', 'translateY(-4px)'] }, { duration: 0.25, easing: EASE });
    });
    card.addEventListener('mouseleave', () => {
      animate(card, { transform: ['translateY(-4px)', 'translateY(0px)'] }, { duration: 0.25, easing: EASE });
    });
  });
})();
