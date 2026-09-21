import { initDesktopLayout } from '../layouts/DesktopLayout.js';
import { initMobileLayout } from '../layouts/MobileLayout.js';
import { enhanceResponsiveTables } from '../components/ResponsiveTable.js';

export function initAdminDashboard() {
  initDesktopLayout();
  initMobileLayout();
  enhanceResponsiveTables();
}
