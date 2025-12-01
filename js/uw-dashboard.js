(() => {
  const searchInput = document.getElementById("uwSearchInput");
  const table = document.getElementById("uwTable");
  if (!table) return;

  const rows = Array.from(table.querySelectorAll("tbody tr"));

  function filterRows() {
    const term = (searchInput?.value || "").trim().toLowerCase();
    rows.forEach((row) => {
      if (!term) {
        row.style.display = "";
        return;
      }
      const text = row.textContent?.toLowerCase() || "";
      row.style.display = text.includes(term) ? "" : "none";
    });
  }

  searchInput?.addEventListener("input", filterRows);
})();
