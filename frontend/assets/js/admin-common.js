import { ensureAuth, getUser, logout } from "./api.js?v=20260526";

// Check authentication for admin pages
const user = ensureAuth(["admin"]);

// Logout functionality
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", logout);

// Common error handling
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

// Common utilities
const formatDateTime = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString();
  } catch (e) {
    return "";
  }
};

const resetMainPanelScroll = () => {
  const mainPanel = document.querySelector(".app-shell__main");
  if (mainPanel) {
    mainPanel.scrollTop = 0;
    mainPanel.scrollTo({ top: 0, behavior: "instant" });
  }

  if (document.body) document.body.scrollTop = 0;
  if (document.documentElement) document.documentElement.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" });
};

window.addEventListener("load", resetMainPanelScroll);
window.addEventListener("pageshow", resetMainPanelScroll);
resetMainPanelScroll();

// Export utilities for use in other modules
export { formatDateTime, resetMainPanelScroll, user };