// Department management functionality
// Using global api functions from api.js

const createDepartmentForm = document.getElementById("createDepartmentForm");
const deptMsg = document.getElementById("deptMsg");
const departmentListBody = document.getElementById("departmentListBody");
const departmentCreateCard = document.getElementById("departmentCreateCard");
const showCreateDepartmentBtn = document.getElementById("showCreateDepartmentBtn");
const closeCreateDepartmentBtn = document.getElementById("closeCreateDepartmentBtn");
const departmentFilter = document.getElementById("departmentFilter");
const departmentFormTitle = document.getElementById("departmentFormTitle");
const departmentSubmitBtn = document.getElementById("departmentSubmitBtn");
let editingDepartmentId = null;
let departmentCache = [];

showCreateDepartmentBtn?.addEventListener("click", () => {
  editingDepartmentId = null;
  createDepartmentForm?.reset();
  if (departmentFormTitle) departmentFormTitle.textContent = "➕ Create Department";
  if (departmentSubmitBtn) departmentSubmitBtn.textContent = "Add Department";
  departmentCreateCard?.classList.remove("hidden");
  document.body.classList.add("department-modal-open");
});

closeCreateDepartmentBtn?.addEventListener("click", () => {
  editingDepartmentId = null;
  createDepartmentForm?.reset();
  departmentCreateCard?.classList.add("hidden");
  document.body.classList.remove("department-modal-open");
});

function renderDepartmentList(departments = []) {
  if (!departmentListBody) return;

  const safeDepartments = Array.isArray(departments) ? departments : [];

  if (!safeDepartments.length) {
    departmentListBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No departments found.</td></tr>';
    return;
  }

  departmentListBody.innerHTML = safeDepartments.map(d => `
    <tr>
      <td><strong>${d.name || "Unnamed Department"}</strong></td>
      <td>${d.code || "—"}</td>
      <td>
        <button class="edit-dept-btn" data-id="${d._id}" data-name="${d.name}" data-code="${d.code}">✏️ Edit</button>
        <button class="delete-dept-btn" data-id="${d._id}" data-name="${d.name}">🗑️ Delete</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".edit-dept-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingDepartmentId = btn.dataset.id;
      document.getElementById("deptName").value = btn.dataset.name || "";
      document.getElementById("deptCode").value = btn.dataset.code || "";
      if (departmentFormTitle) departmentFormTitle.textContent = "✏️ Edit Department";
      if (departmentSubmitBtn) departmentSubmitBtn.textContent = "Update Department";
      departmentCreateCard?.classList.remove("hidden");
      document.body.classList.add("department-modal-open");
    });
  });

  document.querySelectorAll(".delete-dept-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteDepartment(btn.dataset.id, btn.dataset.name));
  });
}

async function loadDepartmentList() {
  try {
    const departments = await window.apiGet("/api/admin/departments");
    departmentCache = Array.isArray(departments) ? departments : [];

    if (departmentFilter) {
      departmentFilter.innerHTML = '<option value="">All Departments</option>' +
        departmentCache.map(d => `<option value="${d._id}">${d.name}</option>`).join("");
    }
    renderDepartmentList(departmentCache);
  } catch (err) {
    console.error("Error loading departments:", err);
    if (departmentListBody) {
      departmentListBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error loading departments</td></tr>';
    }
  }
}

departmentFilter?.addEventListener("change", () => {
  const selectedId = departmentFilter.value;
  renderDepartmentList(selectedId
    ? departmentCache.filter(department => department._id === selectedId)
    : departmentCache);
});

async function deleteDepartment(id, name) {
  if (!confirm(`Are you sure you want to delete department "${name}"? This may affect users and sections.`)) return;
  try {
    await window.apiDelete(`/api/admin/departments/${id}`);
    loadDepartmentList();
  } catch (err) {
    alert("Error deleting department: " + err.message);
  }
}

createDepartmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  deptMsg.textContent = "";

  const deptData = {
    name: document.getElementById("deptName").value,
    code: document.getElementById("deptCode").value
  };

  try {
    if (editingDepartmentId) {
      await window.apiPut(`/api/admin/departments/${editingDepartmentId}`, deptData);
    } else {
      await window.apiPost("/api/admin/departments", deptData);
    }
    deptMsg.style.color = "green";
    deptMsg.textContent = editingDepartmentId
      ? `Department "${deptData.name}" updated successfully!`
      : `Department "${deptData.name}" (${deptData.code}) created successfully!`;
    editingDepartmentId = null;
    createDepartmentForm.reset();
    if (departmentFormTitle) departmentFormTitle.textContent = "➕ Create Department";
    if (departmentSubmitBtn) departmentSubmitBtn.textContent = "Add Department";
    departmentCreateCard?.classList.add("hidden");
    document.body.classList.remove("department-modal-open");
    loadDepartmentList();
  } catch (err) {
    deptMsg.style.color = "red";
    deptMsg.textContent = err.message;
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDepartmentList().catch(console.error);
});