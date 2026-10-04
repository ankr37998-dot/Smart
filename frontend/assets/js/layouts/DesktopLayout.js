export function initDesktopLayout() {
  const header = document.querySelector('.desktop-topbar');
  if (!header) return;

  const updateHeaderState = () => {
    header.classList.toggle('scrolled', window.scrollY > 16);
  };

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState);
}
