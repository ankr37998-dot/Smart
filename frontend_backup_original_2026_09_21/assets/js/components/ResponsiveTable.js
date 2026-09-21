export function enhanceResponsiveTables(root = document) {
  const tables = Array.from(root.querySelectorAll('table'));
  tables.forEach((table) => {
    const headings = Array.from(table.querySelectorAll('thead th')).map((th) =>
      th.textContent.trim().replace(/\s+/g, ' ')
    );

    table.querySelectorAll('tbody tr').forEach((row) => {
      Array.from(row.cells).forEach((cell, index) => {
        if (headings[index] && !cell.hasAttribute('data-label')) {
          cell.setAttribute('data-label', headings[index]);
        }
      });
    });
  });
}
