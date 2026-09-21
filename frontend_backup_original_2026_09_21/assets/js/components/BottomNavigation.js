export function initBottomNavigation() {
  const items = Array.from(document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item'));
  if (!items.length) return;

  const setActive = (item) => {
    items.forEach((button) => button.classList.toggle('active', button === item));
  };

  items.forEach((item) => {
    item.addEventListener('click', () => setActive(item));
  });
}
