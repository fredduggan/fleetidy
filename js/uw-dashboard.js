(() => {
  const searchInput = document.getElementById("uwSearchInput");
  const table = document.getElementById("uwTable");
  const boundCountEl = document.getElementById("boundCount");
  const avgFredScoreEl = document.getElementById("avgFredScore");
  const unquotedCountEl = document.getElementById("unquotedCount");
  const tbody = document.getElementById("uwTableBody");
  const sortHeaderButtons = document.querySelectorAll('th[data-sort-key] button');
  const statusFilterToggle = document.getElementById("statusFilterToggle");
  const statusFilterMenu = document.getElementById("statusFilterMenu");
  const statusFilterOptions = document.getElementById("statusFilterOptions");

  if (!table || !tbody) return;

  let rows = Array.from(tbody.querySelectorAll("tr"));
  rows.forEach((row) => {
    row.classList.remove("odd:bg-white", "even:bg-sky-50", "bg-white", "bg-sky-50");
  });
  const STATUS_STORAGE_KEY = "fleetidyStatusOverrides";
  const SUBMISSION_STORAGE_KEY = "fleetidySubmittedApplications";
  const statusClassMap = {
    Bound: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    Issued: { pill: "bg-teal-50 text-teal-700", dot: "bg-teal-500" },
    Quoted: { pill: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
    Working: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
    New: { pill: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
    Dead: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  };
  const statusOrder = {
    Bound: 1,
    Issued: 2,
    Quoted: 3,
    Working: 4,
    New: 5,
    Dead: 6,
  };

  function applyZebraStripes() {
    const visibleRows = rows.filter((row) => row.style.display !== "none");
    visibleRows.forEach((row, index) => {
      row.classList.remove("bg-white", "bg-sky-50");
      row.classList.add(index % 2 === 0 ? "bg-white" : "bg-sky-50");
    });
  }

  function loadStatusOverrides() {
    try {
      const raw = localStorage.getItem(STATUS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function loadSubmissionRecords() {
    try {
      const raw = localStorage.getItem(SUBMISSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function renderStatusBadge(status) {
    const styles = statusClassMap[status] || { pill: "bg-slate-100 text-slate-700", dot: "bg-slate-400" };
    return `<span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${styles.pill}"><span class="h-2 w-2 rounded-full ${styles.dot}"></span>${status}</span>`;
  }

  function applyStatusOverrides() {
    const overrides = loadStatusOverrides();
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      const policy = cells[0]?.textContent?.trim();
      const statusCell = cells[4];
      if (!policy || !statusCell) return;
      const override = overrides[policy];
      if (override) {
        statusCell.innerHTML = renderStatusBadge(override);
      }
    });
  }

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

  function createRowFromRecord(record) {
    const tr = document.createElement("tr");
    tr.className = "cursor-pointer transition hover:bg-slate-100";
    const policyCell = document.createElement("td");
    policyCell.className = "px-4 py-3 font-semibold text-slate-900";
    policyCell.textContent = record.policy || "APP";
    const effectiveCell = document.createElement("td");
    effectiveCell.className = "px-4 py-3 text-slate-700";
    effectiveCell.textContent = record.effective || "--";
    const insuredCell = document.createElement("td");
    insuredCell.className = "px-4 py-3 text-slate-700";
    insuredCell.textContent = record.insured || "Pending Submission";
    const fredCell = document.createElement("td");
    fredCell.className = "px-4 py-3 text-slate-700";
    fredCell.textContent = record.fred || "--";
    const statusCell = document.createElement("td");
    statusCell.className = "px-4 py-3";
    statusCell.innerHTML = renderStatusBadge(record.status || "New");
    tr.append(policyCell, effectiveCell, insuredCell, fredCell, statusCell);
    return tr;
  }

  function appendSubmissionRows() {
    const submissions = loadSubmissionRecords();
    submissions.forEach((record) => {
      const row = createRowFromRecord(record);
      tbody.appendChild(row);
      rows.push(row);
    });
  }

  const allStatuses = ["Bound", "Issued", "Quoted", "Working", "New", "Dead"];
  const activeStatuses = new Set(allStatuses);
  let isFilterOpen = false;
  const sortState = { key: null, direction: "asc" };

  function setFilterMenuState(open) {
    if (!statusFilterMenu || !statusFilterToggle) return;
    statusFilterMenu.classList.toggle("opacity-0", !open);
    statusFilterMenu.classList.toggle("opacity-100", open);
    statusFilterMenu.classList.toggle("pointer-events-none", !open);
    statusFilterMenu.classList.toggle("pointer-events-auto", open);
    statusFilterToggle.setAttribute("aria-expanded", String(open));
    statusFilterMenu.setAttribute("aria-hidden", String(!open));
  }

  function getRowStatus(row) {
    const statusCell = row.querySelectorAll("td")[4];
    return statusCell?.textContent?.trim() || "";
  }

  function applyFilters() {
    const term = (searchInput?.value || "").trim().toLowerCase();
    rows.forEach((row) => {
      const status = getRowStatus(row);
      const matchesStatus = !status || activeStatuses.has(status);
      const text = row.textContent?.toLowerCase() || "";
      const matchesSearch = !term || text.includes(term);
      row.style.display = matchesStatus && matchesSearch ? "" : "none";
    });
    updateCounts();
    applyZebraStripes();
  }

  function parseDateValue(text) {
    if (!text) return 0;
    const parts = text.split("-").map((part) => parseInt(part, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    const [month, day, year] = parts;
    return new Date(year, month - 1, day).getTime();
  }

  function getSortValue(row, key) {
    const cells = row.querySelectorAll("td");
    switch (key) {
      case "policy":
        return cells[0]?.textContent?.trim().toLowerCase() || "";
      case "effective":
        return parseDateValue(cells[1]?.textContent?.trim() || "");
      case "insured":
        return cells[2]?.textContent?.trim().toLowerCase() || "";
      case "fred": {
        const grade = cells[3]?.textContent?.trim() || "";
        return gradeMap[grade] ?? -Infinity;
      }
      case "status": {
        const status = cells[4]?.textContent?.trim() || "";
        return statusOrder[status] ?? Number.MAX_SAFE_INTEGER;
      }
      default:
        return row.textContent?.trim().toLowerCase() || "";
    }
  }

  function updateSortIndicators() {
    sortHeaderButtons.forEach((button) => {
      const indicator = button.querySelector(".sort-indicator");
      const key = button.closest("th")?.dataset.sortKey;
      if (!indicator || !key) return;
      if (sortState.key === key) {
        indicator.textContent = sortState.direction === "asc" ? "↑" : "↓";
        indicator.classList.remove("text-slate-400");
        indicator.classList.add("text-brand-blue");
      } else {
        indicator.textContent = "↕";
        indicator.classList.add("text-slate-400");
        indicator.classList.remove("text-brand-blue");
      }
    });
  }

  function sortRows(key) {
    if (!key) return;
    if (sortState.key === key) {
      sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
    } else {
      sortState.key = key;
      sortState.direction = "asc";
    }
    const sorted = [...rows].sort((a, b) => {
      const valA = getSortValue(a, key);
      const valB = getSortValue(b, key);
      if (typeof valA === "number" && typeof valB === "number") {
        return valA - valB;
      }
      return String(valA).localeCompare(String(valB), undefined, { sensitivity: "base" });
    });
    if (sortState.direction === "desc") sorted.reverse();
    sorted.forEach((row) => tbody.appendChild(row));
    applyFilters();
    updateSortIndicators();
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

  searchInput?.addEventListener("input", applyFilters);

  sortHeaderButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.closest("th")?.dataset.sortKey;
      if (key) sortRows(key);
    });
  });

  statusFilterToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    isFilterOpen = !isFilterOpen;
    setFilterMenuState(isFilterOpen);
  });

  document.addEventListener("click", (event) => {
    if (!isFilterOpen) return;
    if (
      !statusFilterMenu?.contains(event.target) &&
      !statusFilterToggle?.contains(event.target)
    ) {
      isFilterOpen = false;
      setFilterMenuState(false);
    }
  });

  statusFilterMenu?.addEventListener("click", (event) => event.stopPropagation());

  statusFilterOptions?.querySelectorAll(".status-filter-radio").forEach((input) => {
    input.addEventListener("change", (event) => {
      const radio = event.target;
      if (!radio.checked) return;
      const status = radio.dataset.status;
      if (!status) return;
      if (radio.value === "show") {
        activeStatuses.add(status);
      } else {
        activeStatuses.delete(status);
      }
      applyFilters();
    });
  });

  appendSubmissionRows();
  applyStatusOverrides();
  applyFilters();
  updateSortIndicators();
})();
