export function initTopNavbar() {
  const profileToggle = document.querySelector('[data-profile-menu]');
  if (!profileToggle) return;

  profileToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('profile-open');
  });
}
