// Profile functionality
// Using global api functions from api.js

const profileDetails = document.getElementById("profileDetails");

async function loadProfile() {
  const currentUser = window.getUser();
  const name = currentUser?.name || "Admin";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  profileDetails.innerHTML = `
      <div class="profile-id-card-topline">
        <span>SMART ATTENDANCE</span>
        <span>ADMIN ID</span>
      </div>
      <div class="profile-card-header">
        <div class="profile-avatar" aria-hidden="true">${initials}</div>
        <div class="profile-card-identity">
          <h4>${name}</h4>
          <p>Administrator account</p>
        </div>
        <span class="profile-status">Active</span>
      </div>
      <div class="profile-card-details">
        <div><strong>Email</strong><span>${currentUser?.email || "N/A"}</span></div>
        <div><strong>Account type</strong><span>Administrator</span></div>
        <div><strong>Access level</strong><span>Full dashboard access</span></div>
      </div>
    `;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProfile().catch(console.error);
});