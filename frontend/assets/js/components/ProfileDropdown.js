export function initProfileDropdown() {
  const trigger = document.querySelector('[data-profile-menu]');
  const menu = document.querySelector('.profile-dropdown');
  if (!trigger || !menu) return;

  trigger.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (!trigger.contains(event.target) && !menu.contains(event.target)) {
      menu.classList.remove('open');
    }
  });
}
