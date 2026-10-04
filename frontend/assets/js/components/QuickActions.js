export function mountQuickActions(container, actions) {
  if (!container || !Array.isArray(actions)) return;
  const grid = document.createElement('div');
  grid.className = 'quick-actions-grid';

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-action';
    button.textContent = action.label;
    if (typeof action.onClick === 'function') {
      button.addEventListener('click', action.onClick);
    }
    grid.appendChild(button);
  });

  container.appendChild(grid);
}
