export function createStatWidget(title, value, icon = '') {
  const widget = document.createElement('div');
  widget.className = 'stat-widget';
  widget.innerHTML = `
    <div class="stat-widget__icon">${icon}</div>
    <div>
      <span class="stat-widget__label">${title}</span>
      <strong class="stat-widget__value">${value}</strong>
    </div>
  `;
  return widget;
}
