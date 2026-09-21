export function createDashboardCard({ title, value, subtitle, badge }) {
  const card = document.createElement('article');
  card.className = 'card stat-card';
  card.innerHTML = `
    <div class="stat-card__top">
      <span class="stat-card__title">${title}</span>
      ${badge ? `<span class="stat-card__badge">${badge}</span>` : ''}
    </div>
    <div class="stat-card__value">${value}</div>
    ${subtitle ? `<p class="stat-card__subtitle">${subtitle}</p>` : ''}
  `;
  return card;
}
