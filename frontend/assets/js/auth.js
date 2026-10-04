import { apiPost, getUser } from "./api.js?v=20260526";

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("loginError");

// If already logged in, redirect based on role
const existing = getUser();
if (existing) {
  redirectByRole(existing.role);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!role) {
    errorEl.textContent = "Please select a role";
    return;
  }

  try {
    const data = await apiPost("/api/auth/login", { email, password });

    if (data.user.role !== role) {
      throw new Error(`You are not registered as a ${role}.`);
    }

    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));
    redirectByRole(data.user.role);
  } catch (err) {
    errorEl.textContent = err.message || "Login failed";
  }
});

function redirectByRole(role) {
  if (role === "admin") window.location.href = "admin.html";
  else if (role === "faculty") window.location.href = "faculty.html";
  else if (role === "student") window.location.href = "student.html";
  else window.location.href = "index.html";
}
