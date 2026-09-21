const sidebar = document.querySelector('.sidebar');
const body = document.body;
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileProfileBtn = document.getElementById('mobileProfileBtn');
const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
const mobileBrand = document.querySelector('.mobile-brand');
const sidebarButtons = document.querySelectorAll('.sidebar-btn');

const navFallbacks = {
  dashboardBtn: ['dashboardBtn'],
  timeTableBtn: ['timeTableBtn', 'viewAttendanceBtn', 'timetableBtn'],
  analyticsBtn: ['analyticsBtn'],
  profileBtn: ['profileBtn']
};

const navTitles = {
  dashboardBtn: 'Dashboard',
  createUserBtn: 'Manage Users',
  departmentsBtn: 'Departments',
  sectionsBtn: 'Sections',
  coursesBtn: 'Courses',
  timetableBtn: 'Classes',
  timeTableBtn: 'Classes',
  viewAttendanceBtn: 'Attendance',
  markAttendanceBtn: 'Mark Attendance',
  faceRegsBtn: 'Face Registrations',
  promoteBtn: 'Promote Students',
  analyticsBtn: 'Analytics',
  profileBtn: 'Profile'
};

function setSidebarOpen(open) {
  if (!sidebar) return;
  sidebar.classList.toggle('open', open);
  body.classList.toggle('sidebar-open', open);
  mobileMenuBtn?.setAttribute('aria-expanded', String(open));
}

function closeSidebar() {
  setSidebarOpen(false);
}

function toggleSidebar() {
  if (!sidebar) return;
  setSidebarOpen(!sidebar.classList.contains('open'));
}

function clickNavButton(buttonId) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.click();
    return true;
  }
  return false;
}

function navigateTo(key) {
  const candidates = navFallbacks[key] || [key];
  for (const candidate of candidates) {
    if (clickNavButton(candidate)) {
      syncMobileNavigation(candidate);
      return true;
    }
  }
  return false;
}

function resolveBottomTarget(activeId) {
  if (!activeId) return '';
  if (activeId === 'dashboardBtn') return 'dashboardBtn';
  if (activeId === 'profileBtn') return 'profileBtn';
  if (activeId === 'analyticsBtn') return 'analyticsBtn';
  if (['timeTableBtn', 'viewAttendanceBtn', 'timetableBtn', 'markAttendanceBtn'].includes(activeId)) {
    return 'timeTableBtn';
  }
  return activeId;
}

function updateMobileTitle(activeId) {
  if (!mobileBrand) return;
  mobileBrand.textContent = navTitles[activeId] || 'Smart Attendance';
}

function syncMobileNavigation(activeId) {
  const bottomTarget = resolveBottomTarget(activeId);
  mobileNavItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.target === bottomTarget);
  });
  updateMobileTitle(activeId);
}

function syncFromActiveSidebar() {
  const activeButton = document.querySelector('.sidebar-btn.active');
  if (activeButton?.id) {
    syncMobileNavigation(activeButton.id);
  }
}

function hydrateResponsiveTable(table) {
  if (!(table instanceof HTMLTableElement)) {
    return;
  }

  const labels = Array.from(table.querySelectorAll('thead th')).map((th) =>
    th.textContent.trim().replace(/\s+/g, ' ')
  );

  if (!labels.length) {
    return;
  }

  table.querySelectorAll('tbody tr').forEach((row) => {
    Array.from(row.children).forEach((cell, index) => {
      if (!cell.hasAttribute('data-label') && labels[index]) {
        cell.setAttribute('data-label', labels[index]);
      }
    });
  });
}

function hydrateResponsiveTables(root = document) {
  root.querySelectorAll('table').forEach(hydrateResponsiveTable);
}

if (mobileMenuBtn) {
  mobileMenuBtn.setAttribute('aria-expanded', 'false');
  mobileMenuBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleSidebar();
  });
}

if (mobileProfileBtn) {
  mobileProfileBtn.addEventListener('click', () => {
    navigateTo('profileBtn');
    closeSidebar();
  });
}

mobileNavItems.forEach((item) => {
  item.addEventListener('click', () => {
    const target = item.dataset.target;
    if (target) {
      navigateTo(target);
    }
    closeSidebar();
  });
});

sidebarButtons.forEach((button) => {
  button.addEventListener('click', () => {
    syncMobileNavigation(button.id);
    closeSidebar();
  });
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 1100) {
    closeSidebar();
  }
});

document.addEventListener('click', (event) => {
  if (!sidebar || !sidebar.classList.contains('open')) return;
  if (event.target instanceof Element && !sidebar.contains(event.target) && !mobileMenuBtn?.contains(event.target)) {
    closeSidebar();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSidebar();
  }
});

hydrateResponsiveTables();
syncFromActiveSidebar();

const tableObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches('table')) {
        hydrateResponsiveTable(node);
      }
      const parentTable = node.closest('table');
      if (parentTable) {
        hydrateResponsiveTable(parentTable);
      }
      hydrateResponsiveTables(node);
    });
  }
});

tableObserver.observe(document.body, { childList: true, subtree: true });
