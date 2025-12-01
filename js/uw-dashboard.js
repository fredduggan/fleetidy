(() => {
  const searchInput = document.getElementById("uwSearchInput");
  const table = document.getElementById("uwTable");
  const boundCountEl = document.getElementById("boundCount");
  const avgFredScoreEl = document.getElementById("avgFredScore");
  const unquotedCountEl = document.getElementById("unquotedCount");
  const tbody = document.getElementById("uwTableBody");

  if (!table || !tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));

  // map letter grades to numeric for averaging
  const gradeMap = {
    "A+": 4.3,
    A: 4.0,
    "A-": 3.7,
    "B+": 3.3,
    B: 3.0,
    "B-": 2.7,
    "C+": 2.3,
    C: 2.0,
    "C-": 1.7,
  };

  function formatGrade(num) {
    if (isNaN(num)) return "--";
    // choose closest letter grade
    const entries = Object.entries(gradeMap);
    let best = entries[0][0];
    let bestDiff = Infinity;
    entries.forEach(([grade, val]) => {
      const diff = Math.abs(num - val);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = grade;
      }
    });
    return best;
  }

  function updateCounts() {
    let count = 0;
    let gradeSum = 0;
    let gradeCount = 0;
    let unquoted = 0;
    rows.forEach((row) => {
      if (row.style.display === "none") return;
      const statusText = row.textContent?.toLowerCase() || "";
      const isBound = statusText.includes("bound") || statusText.includes("issued");
      const isQuoted = statusText.includes("quoted");
      const isDead = statusText.includes("dead");
      if (isBound) {
        count += 1;
        // get the FRED score cell (4th cell)
        const cells = row.querySelectorAll("td");
        const grade = cells[3]?.textContent?.trim() || "";
        const numeric = gradeMap[grade] ?? NaN;
        if (!isNaN(numeric)) {
          gradeSum += numeric;
          gradeCount += 1;
        }
      }
      if (!isBound && !isQuoted && !isDead) {
        unquoted += 1;
      }
    });
    if (boundCountEl) boundCountEl.textContent = String(count);
    if (unquotedCountEl) unquotedCountEl.textContent = String(unquoted);
    if (avgFredScoreEl) {
      const avg = gradeCount ? gradeSum / gradeCount : NaN;
      avgFredScoreEl.textContent = gradeCount ? formatGrade(avg) : "--";
    }
  }

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
    updateCounts();
  }

  tbody.addEventListener("click", (event) => {
    const row = event.target.closest("tr");
    if (!row || !tbody.contains(row)) return;
    const policy = row.querySelector("td")?.textContent?.trim() || "";
    if (policy) {
      const url = new URL("record-detail.html", window.location.href);
      url.searchParams.set("policy", policy);
      window.location.href = url.toString();
    }
  });

  searchInput?.addEventListener("input", filterRows);
  updateCounts();
})();
