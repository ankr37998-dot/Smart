export function setupSidebarToggle() {
  const sidebar = document.querySelector('.sidebar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileOverlay = document.querySelector('.mobile-overlay');

  if (!sidebar || !mobileMenuBtn) return;

  const setOpen = (isOpen) => {
    sidebar.classList.toggle('open', isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
    if (mobileOverlay) {
      mobileOverlay.classList.toggle('visible', isOpen);
    }
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  };

  const closeSidebar = () => setOpen(false);

  mobileMenuBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(!sidebar.classList.contains('open'));
  });

  mobileOverlay?.addEventListener('click', closeSidebar);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) {
      closeSidebar();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSidebar();
    }
  });
}
