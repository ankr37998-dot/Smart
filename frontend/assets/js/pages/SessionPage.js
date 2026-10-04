import { initMobileLayout } from '../layouts/MobileLayout.js';
import { enhanceResponsiveTables } from '../components/ResponsiveTable.js';

export function initSessionPage() {
  initMobileLayout();
  enhanceResponsiveTables();
}
