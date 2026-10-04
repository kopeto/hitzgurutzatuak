const navToggle = document.querySelector('[data-nav-toggle]');
navToggle?.addEventListener('click', () => {
  const navigation = document.querySelector('[data-site-navigation]');
  const open = navigation?.classList.toggle('is-open') || false;
  navToggle.setAttribute('aria-expanded', String(open));
});