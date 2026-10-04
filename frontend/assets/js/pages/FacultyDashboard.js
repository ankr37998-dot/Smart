import { initDesktopLayout } from '../layouts/DesktopLayout.js';
import { initMobileLayout } from '../layouts/MobileLayout.js';
import { enhanceResponsiveTables } from '../components/ResponsiveTable.js';

export function initFacultyDashboard() {
  initDesktopLayout();
  initMobileLayout();
  enhanceResponsiveTables();
}
