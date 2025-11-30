// Dummy census data
const censusData = {
  "123456": {
    applicantName: "Sample Trucking LLC",
    dbaName: "Sample Trucking DBA Logistics Co.",
    address: "100 Main Street",
    city: "Columbus",
    state: "OH",
    zip: "43004",
    mailingAddress: "PO Box 123",
    mailingCity: "Columbus",
    mailingState: "OH",
    mailingZip: "43004",
    powerUnits: 15,
    drivers: 24,
    contactName: "Jane Doe",
    phone: "614-555-1234",
    yearsInBusiness: 5,
    dateOfAuthority: "1996-01-01",
    stateAuthority: "MC123456",
    dotStatus: "Active",
    dotStatusDate: "2025-11-23",
    operationClass: "Interstate",
    authority: "Authorized For Hire",
    safetyRating: "Satisfactory"
  }
};

const dotInput = document.getElementById("dotNumber");
const dotSearchBtn = document.querySelector(".dot-search-btn");
const dbaRow = document.querySelector(".dba-row");
const dotDrivenFieldIds = [
  "applicantName",
  "applicantDbaName",
  "applicantAddress",
  "applicantCity",
  "applicantState",
  "applicantZip",
  "mailingAddress",
  "mailingCity",
  "mailingState",
  "mailingZip",
  "powerUnits",
  "drivers",
  "yearsInBusiness",
  "stateAuthority"
];

function setFieldVisibilityByInputId(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  const wrapper = el.closest(".field") || el.closest(".row");
  if (wrapper) wrapper.style.display = show ? "" : "none";
  if (!show) {
    if (el.tagName === "SELECT") {
      el.value = "";
    } else if (el.type === "radio" || el.type === "checkbox") {
      el.checked = false;
    } else {
      el.value = "";
    }
  }
  const row = el.closest(".row");
  if (row) {
    const fields = row.querySelectorAll(".field, .field-full");
    const anyVisible = Array.from(fields).some((f) => f.style.display !== "none");
    row.style.display = anyVisible ? "" : "none";
  }
}

function hideAllDotDrivenFields() {
  dotDrivenFieldIds.forEach((id) => setFieldVisibilityByInputId(id, false));
}
function setDotStatusVisible(show) {
  const wrap = document.querySelector(".dot-status-wrapper");
  if (!wrap) return;
  wrap.style.display = show ? "flex" : "none";
  if (!show) {
    const statusTextEl = document.getElementById("dotStatusText");
    const indicator = document.getElementById("dotStatusIndicator");
    const metaEl = document.getElementById("dotMeta");
    if (statusTextEl) {
      statusTextEl.textContent = "";
      statusTextEl.style.color = "";
    }
    if (indicator) {
      indicator.textContent = "";
      indicator.style.color = "";
    }
    if (metaEl) metaEl.textContent = "";
  }
}
hideAllDotDrivenFields();
setDotStatusVisible(false);

function applyDotStatusStyle(status) {
  const statusTextEl = document.getElementById("dotStatusText");
  const indicator = document.getElementById("dotStatusIndicator");
  if (!statusTextEl || !indicator) return;
  const upper = (status || "").trim().toUpperCase();
  statusTextEl.style.color = "";
  indicator.textContent = "";
  indicator.style.color = "";
  if (!upper) return;
  if (upper === "ACTIVE") {
    indicator.textContent = "✔";
    indicator.style.color = "#16a34a";
  } else {
    statusTextEl.style.color = "#b91c1c";
  }
}

function fillFromCensus(dot) {
  const key = (dot || "").trim();
  const rec = censusData[key];
  const statusTextEl = document.getElementById("dotStatusText");
  const indicator = document.getElementById("dotStatusIndicator");
  const metaEl = document.getElementById("dotMeta");

  if (!rec) {
    if (key) alert("No dummy data found for DOT # " + key);
    hideAllDotDrivenFields();
    setDotStatusVisible(false);
    if (dbaRow) {
      const dbaField = document.getElementById("applicantDbaName");
      if (dbaField) dbaField.value = "";
      dbaRow.style.display = "none";
    }
    if (statusTextEl && indicator && metaEl) {
      statusTextEl.textContent = "";
      statusTextEl.style.color = "";
      indicator.textContent = "";
      indicator.style.color = "";
      metaEl.textContent = "";
    }
    return;
  }

  document.getElementById("applicantName").value = rec.applicantName || "";
  setFieldVisibilityByInputId("applicantName", !!rec.applicantName);

  const dbaField = document.getElementById("applicantDbaName");
  if (dbaField && dbaRow) {
    if (rec.dbaName && rec.dbaName.trim() !== "") {
      dbaField.value = rec.dbaName;
      dbaRow.style.display = "flex";
      setFieldVisibilityByInputId("applicantDbaName", true);
    } else {
      dbaField.value = "";
      dbaRow.style.display = "none";
      setFieldVisibilityByInputId("applicantDbaName", false);
    }
  }

  document.getElementById("applicantAddress").value = rec.address || "";
  document.getElementById("applicantCity").value = rec.city || "";
  document.getElementById("applicantState").value = rec.state || "";
  document.getElementById("applicantZip").value = rec.zip || "";
  setFieldVisibilityByInputId("applicantAddress", !!rec.address);
  setFieldVisibilityByInputId("applicantCity", !!rec.city);
  setFieldVisibilityByInputId("applicantState", !!rec.state);
  setFieldVisibilityByInputId("applicantZip", !!rec.zip);

  const mailingAddressEl = document.getElementById("mailingAddress");
  const mailingCityEl = document.getElementById("mailingCity");
  const mailingStateEl = document.getElementById("mailingState");
  const mailingZipEl = document.getElementById("mailingZip");
  if (mailingAddressEl) mailingAddressEl.value = rec.mailingAddress || "";
  if (mailingCityEl) mailingCityEl.value = rec.mailingCity || "";
  if (mailingStateEl) mailingStateEl.value = rec.mailingState || "";
  if (mailingZipEl) mailingZipEl.value = rec.mailingZip || "";
  setFieldVisibilityByInputId("mailingAddress", !!rec.mailingAddress);
  setFieldVisibilityByInputId("mailingCity", !!rec.mailingCity);
  setFieldVisibilityByInputId("mailingState", !!rec.mailingState);
  setFieldVisibilityByInputId("mailingZip", !!rec.mailingZip);

  const powerUnitsEl = document.getElementById("powerUnits");
  const driversEl = document.getElementById("drivers");
  if (powerUnitsEl) powerUnitsEl.value = rec.powerUnits ?? "";
  if (driversEl) driversEl.value = rec.drivers ?? "";
  setFieldVisibilityByInputId("powerUnits", rec.powerUnits != null);
  setFieldVisibilityByInputId("drivers", rec.drivers != null);

  document.getElementById("yearsInBusiness").value = rec.dateOfAuthority || "";
  document.getElementById("stateAuthority").value = rec.stateAuthority || "";
  setFieldVisibilityByInputId("yearsInBusiness", !!rec.dateOfAuthority);
  setFieldVisibilityByInputId("stateAuthority", !!rec.stateAuthority);

  if (statusTextEl) {
    if (rec.dotStatus) {
      const datePart = rec.dotStatusDate ? " as of " + rec.dotStatusDate : "";
      statusTextEl.textContent = rec.dotStatus + datePart;
      setDotStatusVisible(true);
    } else {
      statusTextEl.textContent = "";
      setDotStatusVisible(false);
    }
  }

  applyDotStatusStyle(rec.dotStatus);

  if (metaEl) {
    const parts = [];
    if (rec.operationClass) parts.push(rec.operationClass);
    if (rec.authority) parts.push(rec.authority);
    if (rec.safetyRating) parts.push("Safety rating: " + rec.safetyRating);
    metaEl.textContent = parts.length ? "— " + parts.join(" • ") : "";
  }

  updateMailingAddressVisibility();
}

if (dotInput) dotInput.addEventListener("blur", () => fillFromCensus(dotInput.value));
if (dotSearchBtn) dotSearchBtn.addEventListener("click", () => fillFromCensus(dotInput.value));

// Expiring mileage formatting (comma-separated)
const expiringMileageInput = document.getElementById("expiringMileage");
const expiringMode = document.getElementById("expiringMode");
function formatExpiring() {
  if (!expiringMileageInput) return;
  let digits = expiringMileageInput.value.replace(/\D/g, "");
  if (!digits) {
    expiringMileageInput.value = "";
    return;
  }
  const num = parseInt(digits, 10);
  if (isNaN(num)) {
    expiringMileageInput.value = "";
    return;
  }
  if (expiringMode && expiringMode.value === "revenue") {
    expiringMileageInput.value = "$" + num.toLocaleString("en-US");
  } else {
    expiringMileageInput.value = num.toLocaleString("en-US");
  }
}

if (expiringMileageInput) {
  expiringMileageInput.addEventListener("input", formatExpiring);
}

if (expiringMode) {
  expiringMode.value = "revenue";
  expiringMode.addEventListener("change", formatExpiring);
}

// Premium formatting (dollar, no decimals)
const presentPremiumInput = document.getElementById("presentPremium");
if (presentPremiumInput) {
  presentPremiumInput.setAttribute("inputmode", "numeric");
  presentPremiumInput.setAttribute("autocomplete", "off");
  presentPremiumInput.addEventListener("input", () => {
    let digits = presentPremiumInput.value.replace(/\D/g, "");
    if (!digits) {
      presentPremiumInput.value = "";
      return;
    }
    const num = parseInt(digits, 10);
    if (isNaN(num)) {
      presentPremiumInput.value = "";
      return;
    }
    presentPremiumInput.value = "$" + num.toLocaleString("en-US");
  });
}

// Website link builder
const applicantWebsiteInput = document.getElementById("applicantWebsite");
const applicantWebsiteLink = document.getElementById("applicantWebsiteLink");
if (applicantWebsiteInput && applicantWebsiteLink) {
  applicantWebsiteInput.addEventListener("blur", () => {
    const raw = applicantWebsiteInput.value.trim();
    if (!raw) {
      applicantWebsiteLink.style.display = "none";
      applicantWebsiteLink.removeAttribute("href");
      applicantWebsiteLink.textContent = "";
      return;
    }
    let url = raw;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    applicantWebsiteLink.href = url;
    applicantWebsiteLink.textContent = raw;
    applicantWebsiteLink.style.display = "inline";
  });
}

// Inception -> Expiration (one year) + auto-fill Loss Experience policy periods
const inceptionInput = document.getElementById("inceptionDate");
const expirationInput = document.getElementById("expirationDate");

function clearLossExperiencePeriods() {
  for (let i = 1; i <= 5; i++) {
    const input = document.querySelector(`input[name="lossPeriod${i}"]`);
    if (input) input.value = "";
  }
}

function fillLossExperiencePeriodsFromInception(isoDateString) {
  const parts = isoDateString.split("-");
  if (parts.length !== 3) return;
  const [yearStr, monthStrRaw, dayStrRaw] = parts;
  const effYear = parseInt(yearStr, 10);
  if (isNaN(effYear)) return;

  const mm = monthStrRaw.padStart(2, "0");
  const dd = dayStrRaw.padStart(2, "0");

  for (let i = 0; i < 5; i++) {
    const termEndYear = effYear - i;
    const termStartYear = termEndYear - 1;
    const input = document.querySelector(`input[name="lossPeriod${i + 1}"]`);
    if (input) {
      input.value = `${mm}/${dd}/${termStartYear} - ${mm}/${dd}/${termEndYear}`;
    }
  }
}

if (inceptionInput) {
  inceptionInput.addEventListener("change", () => {
    const val = inceptionInput.value;
    if (!val) {
      if (expirationInput) expirationInput.value = "";
      clearLossExperiencePeriods();
      return;
    }

    const parts = val.split("-");
    if (parts.length !== 3) {
      if (expirationInput) expirationInput.value = "";
      clearLossExperiencePeriods();
      return;
    }

    const [yearStr, monthStrRaw, dayStrRaw] = parts;
    const startYear = parseInt(yearStr, 10);
    if (isNaN(startYear)) {
      if (expirationInput) expirationInput.value = "";
      clearLossExperiencePeriods();
      return;
    }

    const mm = monthStrRaw.padStart(2, "0");
    const dd = dayStrRaw.padStart(2, "0");
    const expYear = startYear + 1;

    if (expirationInput) {
      expirationInput.value = `${expYear}-${mm}-${dd}`;
    }

    fillLossExperiencePeriodsFromInception(val);
  });
}

// Type of carrier projections
const carrierTypeCheckboxes = document.querySelectorAll('input[name="carrierType"]');
const carrierProjectionContainer = document.getElementById("carrierProjectionContainer");
const carrierLabelMap = {
  common: "Common Carrier",
  contract: "Contract Carrier",
  forwarder: "Freight Forwarder",
  broker: "Freight Broker",
  warehouse: "Warehouse Operator"
};

function formatCarrierProjectionInput(inputEl, modeSelect) {
  const mode = modeSelect.value;
  let digits = (inputEl.value || "").replace(/\D/g, "");
  if (!digits) {
    inputEl.value = "";
    return;
  }
  const num = parseInt(digits, 10);
  if (isNaN(num)) {
    inputEl.value = "";
    return;
  }
  if (mode === "revenue") {
    inputEl.value = "$" + num.toLocaleString("en-US");
  } else {
    inputEl.value = num.toLocaleString("en-US");
  }
}

function formatRevenueOnly(inputEl) {
  let digits = (inputEl.value || "").replace(/\D/g, "");
  if (!digits) {
    inputEl.value = "";
    return;
  }
  const num = parseInt(digits, 10);
  if (isNaN(num)) {
    inputEl.value = "";
    return;
  }
  inputEl.value = "$" + num.toLocaleString("en-US");
}

function createCarrierProjectionRow(typeValue) {
  const row = document.createElement("div");
  row.className = "carrier-projection-row";
  row.dataset.carrierType = typeValue;

  const revenueOnly = typeValue === "forwarder" || typeValue === "broker" || typeValue === "warehouse";
  const heading = document.createElement("span");
  heading.className = "carrier-projection-label";
  heading.textContent = revenueOnly
    ? `• Projected Upcoming ${carrierLabelMap[typeValue] || typeValue} Revenue`
    : `• Projected Upcoming ${carrierLabelMap[typeValue] || typeValue}`;

  const expGroup = document.createElement("div");
  expGroup.className = "carrier-expiring-group";

  if (revenueOnly) {
    const upcomingInput = document.createElement("input");
    upcomingInput.type = "text";
    upcomingInput.setAttribute("inputmode", "numeric");
    upcomingInput.setAttribute("autocomplete", "off");
    upcomingInput.addEventListener("input", () => formatRevenueOnly(upcomingInput));

    const expLabel = document.createElement("span");
    expLabel.textContent = `Expiring ${carrierLabelMap[typeValue] || typeValue} Revenue`;

    const expInput = document.createElement("input");
    expInput.type = "text";
    expInput.setAttribute("inputmode", "numeric");
    expInput.setAttribute("autocomplete", "off");
    expInput.addEventListener("input", () => formatRevenueOnly(expInput));

    row.appendChild(heading);
    row.appendChild(upcomingInput);
    expGroup.appendChild(expLabel);
    expGroup.appendChild(expInput);
    row.appendChild(expGroup);
  } else {
    const upcomingSelect = document.createElement("select");
    const optRev = new Option("Revenue", "revenue");
    const optMiles = new Option("Miles", "miles");
    const optPU = new Option("Power Units", "powerunits");
    upcomingSelect.append(optRev, optMiles, optPU);

    const upcomingInput = document.createElement("input");
    upcomingInput.type = "text";
    upcomingInput.setAttribute("inputmode", "numeric");
    upcomingInput.setAttribute("autocomplete", "off");
    upcomingInput.addEventListener("input", () => formatCarrierProjectionInput(upcomingInput, upcomingSelect));

    const expLabel = document.createElement("span");
    expLabel.textContent = `Expiring ${carrierLabelMap[typeValue] || typeValue} Revenue`;

    const expInput = document.createElement("input");
    expInput.type = "text";
    expInput.setAttribute("inputmode", "numeric");
    expInput.setAttribute("autocomplete", "off");
    expInput.addEventListener("input", () => formatCarrierProjectionInput(expInput, upcomingSelect));

    upcomingSelect.addEventListener("change", () => {
      const mode = upcomingSelect.value;
      let suffix = "";
      if (mode === "revenue") suffix = " Revenue";
      else if (mode === "miles") suffix = " Miles";
      else if (mode === "powerunits") suffix = " Power Units";
      expLabel.textContent = `Expiring ${carrierLabelMap[typeValue] || typeValue}${suffix}`;
      if (upcomingInput.value) formatCarrierProjectionInput(upcomingInput, upcomingSelect);
      if (expInput.value) formatCarrierProjectionInput(expInput, upcomingSelect);
    });

    row.appendChild(heading);
    row.appendChild(upcomingSelect);
    row.appendChild(upcomingInput);
    expGroup.appendChild(expLabel);
    expGroup.appendChild(expInput);
    row.appendChild(expGroup);
  }

  return row;
}

function syncCarrierProjections() {
  if (!carrierProjectionContainer) return;
  const order = ["common", "contract", "forwarder", "broker", "warehouse"];
  order.forEach((typeVal) => {
    const cb = document.querySelector(`input[name="carrierType"][value="${typeVal}"]`);
    if (!cb) return;
    let row = carrierProjectionContainer.querySelector(`.carrier-projection-row[data-carrier-type="${typeVal}"]`);
    if (cb.checked) {
      if (!row) {
        row = createCarrierProjectionRow(typeVal);
      }
      carrierProjectionContainer.appendChild(row);
    } else if (row) {
      row.remove();
    }
  });
}

carrierTypeCheckboxes.forEach((cb) => {
  cb.addEventListener("change", syncCarrierProjections);
});
syncCarrierProjections();

// Inject “Other” rows into commodity groups with minor classifications
function updateOtherVisibility(pctInput, descInput) {
  descInput.style.display = "inline-block";
  if (!pctInput.value.trim()) descInput.value = "";
}

function insertCommodityOtherRows() {
  const tables = document.querySelectorAll(".commodity-group table");
  tables.forEach((table) => {
    if (table.querySelector(".commodity-other-row")) return;
    const groupEl = table.closest(".commodity-group");
    const group = groupEl?.dataset.group;
    if (!group) return;
    const summaryText = groupEl?.querySelector("summary span")?.textContent?.trim() || group.replace(/_/g, " ");

    const tr = document.createElement("tr");
    tr.className = "commodity-other-row";

    const tdLabel = document.createElement("td");

    const labelSpan = document.createElement("span");
    labelSpan.textContent = "";
    const descInput = document.createElement("input");
    descInput.type = "text";
    descInput.className = "commodity-other-text";
    descInput.placeholder = `Describe Other ${summaryText}`;
    descInput.style.display = "inline-block";
    descInput.style.marginLeft = "8px";
    descInput.style.width = "440px";
    descInput.style.boxSizing = "border-box";
    descInput.style.textAlign = "right";
    descInput.dataset.parent = group;

    tdLabel.appendChild(labelSpan);
    tdLabel.appendChild(descInput);

    const tdPct = document.createElement("td");
    const pctInput = document.createElement("input");
    pctInput.type = "text";
    pctInput.className = "commodity-percent commodity-other-percent";
    pctInput.dataset.id = `${group}_other`;
    pctInput.dataset.parent = group;
    pctInput.setAttribute("inputmode", "decimal");
    pctInput.addEventListener("input", () => updateOtherVisibility(pctInput, descInput));
    tdPct.appendChild(pctInput);

    tr.appendChild(tdLabel);
    tr.appendChild(tdPct);
    table.appendChild(tr);
  });
}

insertCommodityOtherRows();

// Remove major % inputs; replace with computed display from minors
function stripMajorPercentInputs() {
  const majorInputs = document.querySelectorAll(".commodity-group > summary input.commodity-percent");
  majorInputs.forEach((input) => {
    const span = document.createElement("span");
    span.className = "major-percent-display";
    span.dataset.majorId = input.dataset.id || "";
    span.style.fontWeight = "600";
    span.textContent = "";
    input.replaceWith(span);
  });
}

stripMajorPercentInputs();

// Initialize 0% on standalone major inputs (those not inside a commodity group)
function initStandaloneMajorDefaults() {
  const topLevelMajorInputs = document.querySelectorAll(".commodities-table > tbody > tr > td > input.commodity-percent");
  topLevelMajorInputs.forEach((input) => {
    if (!input.value.trim()) {
      input.value = "";
      input.dataset.prevVal = "";
      input.dataset.prevNum = "";
    }
  });
}

initStandaloneMajorDefaults();

function updateMajorCommodityDisplays() {
  const groups = document.querySelectorAll(".commodity-group");
  groups.forEach((grp) => {
    const display = grp.querySelector(".major-percent-display");
    if (!display) return;
    const minors = grp.querySelectorAll("table input.commodity-percent");
    let sum = 0;
    let any = false;
    minors.forEach((inp) => {
      const num = parsePercentNumber(inp);
      if (!isNaN(num)) {
        sum += num;
        any = true;
      }
    });
    display.textContent = any ? `${sum.toFixed(0)}%` : "";
  });
}

// Commodities – FMCSA major category percentages
const commodityPercentInputs = document.querySelectorAll(".commodity-percent");
const commodityTotalSpan = document.getElementById("commodityTotalPercent");
const commodityTotalWrapper = document.getElementById("commodityTotalWrapper");
const commoditySearchInput = document.getElementById("commoditySearch");
const commodityShowAllBtn = document.getElementById("commodityShowAll");
const commodityShowSelectedBtn = document.getElementById("commodityShowSelected");
const commodityCollapseBtn = document.getElementById("commodityCollapse");
const commodityDetailGroups = document.querySelectorAll(".commodity-group");
const commodityEpsilon = 0.000001;

function parsePercentNumber(input) {
  const raw = (input.value || "").replace(/\D/g, "");
  if (!raw) return NaN;
  const num = parseInt(raw, 10);
  return isNaN(num) ? NaN : num;
}

function computeCommodityTotal() {
  let total = 0;
  let anyEntered = false;
  commodityPercentInputs.forEach((input) => {
    const raw = (input.value || "").trim();
    if (raw !== "") anyEntered = true;
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) return;
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) total += num;
  });
  return { total, anyEntered };
}

function updateCommodityTotals() {
  const { total, anyEntered } = computeCommodityTotal();
  if (commodityTotalSpan) {
    commodityTotalSpan.textContent = total.toFixed(1);
  }
  if (!commodityTotalWrapper) return;
  const epsilon = 0.01;
  commodityTotalWrapper.classList.remove("ok", "error");
  if (anyEntered) {
    if (Math.abs(total - 100) <= epsilon) {
      commodityTotalWrapper.classList.add("ok");
    } else {
      commodityTotalWrapper.classList.add("error");
    }
  }
}

function handleCommodityPercentInput(e) {
  const input = e.currentTarget;
  const prevVal = input.dataset.prevVal || "";
  let raw = (input.value || "").replace(/\D/g, "");
  if (!raw) {
    input.value = "";
    input.dataset.prevVal = "";
    input.dataset.prevNum = "";
    updateCommodityTotals();
    return;
  }
  const num = parseInt(raw, 10);
  if (isNaN(num)) {
    input.value = prevVal;
    return;
  }

  let total = 0;
  commodityPercentInputs.forEach((el) => {
    if (el === input) {
      total += num;
    } else {
      const otherVal = parsePercentNumber(el);
      if (!isNaN(otherVal)) total += otherVal;
    }
  });

  if (total > 100 + commodityEpsilon) {
    input.value = prevVal;
    return;
  }

  input.value = `${num}%`;
  input.dataset.prevVal = input.value;
  input.dataset.prevNum = num.toString();
  updateCommodityTotals();
  updateMajorCommodityDisplays();
}

commodityPercentInputs.forEach((input) => {
  input.dataset.prevVal = input.value || "";
  const n = parsePercentNumber(input);
  if (!isNaN(n)) input.dataset.prevNum = n.toString();
  input.addEventListener("input", handleCommodityPercentInput);
});
updateMajorCommodityDisplays();

function filterCommodities(term) {
  const needle = term.trim().toLowerCase();
  // Handle groups with minor categories
  commodityDetailGroups.forEach((details) => {
    const containerRow = details.closest("tr");
    const minorRows = details.querySelectorAll("table tr");
    let anyMatch = false;
    minorRows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const match = !needle || text.includes(needle);
      row.style.display = match ? "" : "none";
      if (match) anyMatch = true;
    });
    if (containerRow) containerRow.style.display = anyMatch ? "" : "none";
    details.open = anyMatch;
  });

  // Handle majors without subcategories (standalone rows)
  const standaloneRows = document.querySelectorAll(".commodities-table tbody > tr:not(:has(.commodity-group))");
  standaloneRows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const match = !needle || text.includes(needle);
    row.style.display = match ? "" : "none";
  });
}

if (commoditySearchInput) {
  commoditySearchInput.addEventListener("input", () => {
    filterCommodities(commoditySearchInput.value || "");
  });
}

function showAllCommodities() {
  if (commoditySearchInput) commoditySearchInput.value = "";
  filterCommodities("");
  // Ensure all minor rows inside details are visible
  commodityDetailGroups.forEach((details) => {
    details.querySelectorAll("table tr").forEach((row) => (row.style.display = ""));
    const containerRow = details.closest("tr");
    if (containerRow) containerRow.style.display = "";
  });
}

function showSelectedCommodities() {
  // Show only rows with a percent filled
  commodityDetailGroups.forEach((details) => {
    const containerRow = details.closest("tr");
    const minorRows = details.querySelectorAll("table tr");
    let anyShow = false;
    minorRows.forEach((row) => {
      const hasPercent = !!row.querySelector("input.commodity-percent")?.value.trim();
      row.style.display = hasPercent ? "" : "none";
      if (hasPercent) anyShow = true;
    });
    if (containerRow) containerRow.style.display = anyShow ? "" : "none";
    details.open = anyShow;
  });

  const standaloneRows = document.querySelectorAll(".commodities-table tbody > tr:not(:has(.commodity-group))");
  standaloneRows.forEach((row) => {
    const hasPercent = !!row.querySelector("input.commodity-percent")?.value.trim();
    row.style.display = hasPercent ? "" : "none";
  });
}

if (commodityShowAllBtn) {
  commodityShowAllBtn.addEventListener("click", () => {
    showAllCommodities();
  });
}

if (commodityShowSelectedBtn) {
  commodityShowSelectedBtn.addEventListener("click", showSelectedCommodities);
}

if (commodityCollapseBtn) {
  commodityCollapseBtn.addEventListener("click", () => {
    if (commoditySearchInput) commoditySearchInput.value = "";
    filterCommodities("");
    commodityDetailGroups.forEach((details) => {
      details.open = false;
      const containerRow = details.closest("tr");
      if (containerRow) containerRow.style.display = "";
    });
  });
}

// Radius total
const radiusTotalDisplay = document.getElementById("radiusTotalDisplay");
const radiusTotalWrapper = document.getElementById("radiusTotalWrapper");
function computeRadiusTotal() {
  const ids = ["radUnder300", "rad301_500", "rad501_1500", "rad1500plus"];
  let total = 0;
  let anyFilled = false;
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const raw = (el.value || "").replace("%", "").trim();
    if (raw !== "") anyFilled = true;
    const num = parseFloat(raw);
    if (!isNaN(num)) total += num;
  });
  return { total, anyFilled };
}

function updateRadiusDisplay() {
  const { total } = computeRadiusTotal();
  if (radiusTotalDisplay) {
    radiusTotalDisplay.textContent = "Total radius distribution adds up to " + total.toFixed(1) + "%";
    if (radiusTotalWrapper) {
      radiusTotalWrapper.classList.remove("ok", "error");
      if (total > 100) {
        radiusTotalWrapper.classList.add("error");
      } else if (Math.abs(total - 100) < 0.01) {
        radiusTotalWrapper.classList.add("ok");
      }
    } else {
      radiusTotalDisplay.style.color = "";
      radiusTotalDisplay.style.fontWeight = "";
      if (total > 100) {
        radiusTotalDisplay.style.color = "#b91c1c";
        radiusTotalDisplay.style.fontWeight = "700";
      } else if (Math.abs(total - 100) < 0.01) {
        radiusTotalDisplay.style.color = "#15803d";
        radiusTotalDisplay.style.fontWeight = "700";
      }
    }
  }
}

["radUnder300", "rad301_500", "rad501_1500", "rad1500plus"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", updateRadiusDisplay);
});

// Theft exposure: toggle description when unattended = no
const unattendedRadios = document.querySelectorAll('input[name="loadedUnattended"]');
const unattendedDesc = document.querySelector('textarea[name="loadedUnattendedDesc"]');
if (unattendedDesc) {
  function syncUnattendedDesc() {
    const choice = Array.from(unattendedRadios).find((r) => r.checked)?.value;
    const disable = choice === "no";
    unattendedDesc.disabled = disable;
    unattendedDesc.style.backgroundColor = disable ? "#f3f4f6" : "";
    if (disable) unattendedDesc.value = "";
  }
  unattendedRadios.forEach((r) => r.addEventListener("change", syncUnattendedDesc));
  syncUnattendedDesc();
}

// Trailers detached: toggle description when detached = no
const detachedRadios = document.querySelectorAll('input[name="trailersDetached"]');
const detachedDesc = document.querySelector('textarea[name="trailersDetachedDesc"]');
if (detachedDesc) {
  function syncDetachedDesc() {
    const choice = Array.from(detachedRadios).find((r) => r.checked)?.value;
    const disable = choice === "no";
    detachedDesc.disabled = disable;
    detachedDesc.style.backgroundColor = disable ? "#f3f4f6" : "";
    if (disable) detachedDesc.value = "";
  }
  detachedRadios.forEach((r) => r.addEventListener("change", syncDetachedDesc));
  syncDetachedDesc();
}

// Loss runs upload toggling
const lossRunsRadios = document.querySelectorAll('input[name="lossRunsAttached"]');
const lossRunsUploadRow = document.getElementById("lossRunsUploadRow");
const lossRunsFile = document.getElementById("lossRunsFile");
if (lossRunsUploadRow && lossRunsFile) {
  function syncLossRunsUpload() {
    const choice = Array.from(lossRunsRadios).find((r) => r.checked)?.value;
    const show = choice === "yes";
    lossRunsUploadRow.style.display = show ? "flex" : "none";
    lossRunsFile.disabled = !show;
    if (!show) lossRunsFile.value = "";
  }
  lossRunsRadios.forEach((r) => r.addEventListener("change", syncLossRunsUpload));
  syncLossRunsUpload();
}

// Loss experience: lock fields when "No" losses selected
const anyLossesRadios = document.querySelectorAll('input[name="anyLosses"]');
const lossInputs = [];
for (let i = 1; i <= 5; i++) {
  ["lossPeriod", "lossPaid", "lossClaims", "lossCause"].forEach((prefix) => {
    const el = document.querySelector(`input[name="${prefix}${i}"]`);
    if (el) lossInputs.push(el);
  });
  const openRadios = document.querySelectorAll(`input[name="lossOpen${i}"]`);
  openRadios.forEach((r) => lossInputs.push(r));
}

function setLossFieldsDisabled(disabled) {
  lossInputs.forEach((el) => {
    el.disabled = disabled;
    if (disabled && (el.type === "text" || el.type === "number")) {
      // Leave the period (years) intact; clear other text/number fields
      const name = el.getAttribute("name") || "";
      if (!name.startsWith("lossPeriod")) {
        el.value = "";
      }
    }
    if (disabled && el.type === "radio") {
      el.checked = false;
    }
    // Match the same light gray used elsewhere when disabled
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.style.backgroundColor = disabled ? "#f3f4f6" : "";
    }
  });
}

function syncLossFields() {
  const selected = Array.from(anyLossesRadios).find((r) => r.checked);
  const disable = selected && selected.value === "no";
  setLossFieldsDisabled(disable);
  if (disable) {
    for (let i = 1; i <= 5; i++) {
      const paidInput = document.querySelector(`input[name="lossPaid${i}"]`);
      const claimsInput = document.querySelector(`input[name="lossClaims${i}"]`);
      const causeInput = document.querySelector(`input[name="lossCause${i}"]`);
      if (paidInput && !paidInput.value.includes("No Claims")) {
        paidInput.value = "- No Claims -";
      }
      if (claimsInput) claimsInput.value = "";
      if (causeInput) causeInput.value = "";
    }
  } else {
    // If toggled back to "yes", clear the placeholder text if present
    for (let i = 1; i <= 5; i++) {
      const paidInput = document.querySelector(`input[name="lossPaid${i}"]`);
      const causeInput = document.querySelector(`input[name="lossCause${i}"]`);
      if (paidInput && paidInput.value.includes("No Claims")) paidInput.value = "";
      if (causeInput && causeInput.value.includes("No Claims")) causeInput.value = "";
    }
  }
}

anyLossesRadios.forEach((r) => r.addEventListener("change", syncLossFields));
syncLossFields();

// Prior authority: show/hide extra fields
const priorAuthorityRadios = document.querySelectorAll('input[name="priorAuthority"]');
const priorAuthorityNameInput = document.getElementById("priorAuthorityName");
const priorAuthorityDotInput = document.getElementById("priorAuthorityDot");
const priorAuthorityRow = priorAuthorityNameInput?.closest(".row");

function syncPriorAuthority() {
  const choice = Array.from(priorAuthorityRadios).find((r) => r.checked)?.value;
  const show = choice === "yes";
  if (priorAuthorityRow) priorAuthorityRow.style.display = show ? "" : "none";
  if (!show) {
    if (priorAuthorityNameInput) priorAuthorityNameInput.value = "";
    if (priorAuthorityDotInput) priorAuthorityDotInput.value = "";
  }
}

priorAuthorityRadios.forEach((r) => r.addEventListener("change", syncPriorAuthority));
syncPriorAuthority();

// In-transit security: inline Other input when Other checked
const transitOtherCheckbox = document.querySelector('input[name="securityTransit"][value="other"]');
const transitOtherInput = document.getElementById("securityTransitOther");
if (transitOtherCheckbox && transitOtherInput) {
  function syncTransitOther() {
    const show = transitOtherCheckbox.checked;
    transitOtherInput.style.display = show ? "inline-block" : "none";
    transitOtherInput.disabled = !show;
    if (!show) transitOtherInput.value = "";
  }
  transitOtherCheckbox.addEventListener("change", syncTransitOther);
  syncTransitOther();
}

// Terminals: dynamic rows + $ formatting + Google Maps + dropdowns
const terminalCountSelect = document.getElementById("terminalCount");
const terminalsBody = document.getElementById("terminalsBody");

function formatTerminalLimit(inputEl) {
  let digits = (inputEl.value || "").replace(/\D/g, "");
  if (!digits) {
    inputEl.value = "";
    return;
  }
  const num = parseInt(digits, 10);
  if (isNaN(num)) {
    inputEl.value = "";
    return;
  }
  inputEl.value = "$" + num.toLocaleString("en-US");
}

function createTerminalRow(index) {
  const tr = document.createElement("tr");
  tr.dataset.index = index;

  const tdLimit = document.createElement("td");
  const limitInput = document.createElement("input");
  limitInput.type = "text";
  limitInput.name = "terminalLimit" + index;
  limitInput.className = "terminal-limit-input";
  limitInput.placeholder = "$0";
  limitInput.setAttribute("inputmode", "numeric");
  limitInput.setAttribute("autocomplete", "off");
  limitInput.addEventListener("input", () => formatTerminalLimit(limitInput));
  tdLimit.appendChild(limitInput);

  const tdAddr = document.createElement("td");
  const addrWrapper = document.createElement("div");
  addrWrapper.style.display = "flex";
  addrWrapper.style.alignItems = "center";
  addrWrapper.style.gap = "6px";
  const addrInput = document.createElement("input");
  addrInput.type = "text";
  addrInput.name = "terminalAddr" + index;
  addrInput.placeholder = "123 Main St, Springfield, IL 62704";
  addrInput.style.flex = "1";
  const mapButton = document.createElement("button");
  mapButton.type = "button";
  mapButton.textContent = "Map";
  mapButton.style.fontSize = "0.75rem";
  mapButton.style.padding = "4px 8px";
  mapButton.disabled = true;
  addrInput.addEventListener("input", () => {
    mapButton.disabled = !addrInput.value.trim();
  });
  mapButton.addEventListener("click", () => {
    const addr = addrInput.value.trim();
    if (!addr) return;
    const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr);
    window.open(url, "_blank", "noopener");
  });
  addrWrapper.appendChild(addrInput);
  addrWrapper.appendChild(mapButton);
  tdAddr.appendChild(addrWrapper);

  const tdConst = document.createElement("td");
  const constructionSelect = document.createElement("select");
  constructionSelect.name = "terminalConstruction" + index;
  constructionSelect.appendChild(new Option("Select…", ""));
  ["Frame", "JM", "NC", "MNC", "MFR", "FR"].forEach((c) => {
    constructionSelect.appendChild(new Option(c, c));
  });
  tdConst.appendChild(constructionSelect);

  const tdSprink = document.createElement("td");
  const sprinkSelect = document.createElement("select");
  sprinkSelect.name = "terminalSprinkler" + index;
  sprinkSelect.appendChild(new Option("Select…", ""));
  ["Fully", "Partial", "None"].forEach((s) => {
    sprinkSelect.appendChild(new Option(s, s));
  });
  tdSprink.appendChild(sprinkSelect);

  tr.appendChild(tdLimit);
  tr.appendChild(tdAddr);
  tr.appendChild(tdConst);
  tr.appendChild(tdSprink);
  return tr;
}

function rebuildTerminalsRows(count) {
  if (!terminalsBody) return;
  const desired = parseInt(count, 10) || 0;
  const current = terminalsBody.querySelectorAll("tr").length;
  if (desired > current) {
    for (let i = current + 1; i <= desired; i++) {
      terminalsBody.appendChild(createTerminalRow(i));
    }
  } else if (desired < current) {
    for (let i = current; i > desired; i--) {
      const row = terminalsBody.querySelector(`tr[data-index="${i}"]`) || terminalsBody.lastElementChild;
      if (row) row.remove();
    }
  }
}

if (terminalCountSelect) {
  terminalCountSelect.addEventListener("change", () => {
    rebuildTerminalsRows(terminalCountSelect.value);
  });
  rebuildTerminalsRows(terminalCountSelect.value);
}

// Limits auto-calculation: per-vehicle vs per-occurrence (any one loss)
const limitPerVehicleSelect = document.getElementById("limitPerVehicle");
const limitAnyOneLossSelect = document.getElementById("limitAnyOneLoss");

function getNumericLimit(selectEl) {
  if (!selectEl) return null;
  const val = selectEl.value;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function setSelectAtOrAbove(selectEl, target) {
  if (!selectEl || target == null) return;
  let chosenValue = null;
  let chosenNumeric = null;
  Array.from(selectEl.options).forEach((opt) => {
    const optNum = parseInt(opt.value, 10);
    if (isNaN(optNum) || optNum < target) return;
    if (chosenNumeric == null || optNum < chosenNumeric) {
      chosenNumeric = optNum;
      chosenValue = opt.value;
    }
  });
  if (chosenValue == null) {
    Array.from(selectEl.options).forEach((opt) => {
      const optNum = parseInt(opt.value, 10);
      if (isNaN(optNum)) return;
      if (chosenNumeric == null || optNum > chosenNumeric) {
        chosenNumeric = optNum;
        chosenValue = opt.value;
      }
    });
  }
  if (chosenValue != null) {
    selectEl.value = chosenValue;
  }
}

function syncLossLimitToVehicle() {
  const perVeh = getNumericLimit(limitPerVehicleSelect);
  if (perVeh == null) return;
  const desired = perVeh * 2;
  setSelectAtOrAbove(limitAnyOneLossSelect, desired);
}

if (limitPerVehicleSelect && limitAnyOneLossSelect) {
  limitPerVehicleSelect.addEventListener("change", () => {
    if (!limitPerVehicleSelect.value) return;
    syncLossLimitToVehicle();
  });

  limitAnyOneLossSelect.addEventListener("change", () => {
    const perVeh = getNumericLimit(limitPerVehicleSelect);
    const perLoss = getNumericLimit(limitAnyOneLossSelect);
    if (perVeh == null || perLoss == null) return;
    if (perLoss < perVeh) {
      setSelectAtOrAbove(limitAnyOneLossSelect, perVeh);
    }
  });

  if (limitPerVehicleSelect.value) {
    syncLossLimitToVehicle();
  }
}

// Mailing address visibility if different
const mailingAddressRow = document.querySelector(".mailing-address-row");
const mailingLocationRow = document.querySelector(".mailing-location-row");

function updateMailingAddressVisibility() {
  if (!mailingAddressRow || !mailingLocationRow) return;
  const physAddr = (document.getElementById("applicantAddress").value || "").trim().toLowerCase();
  const physCity = (document.getElementById("applicantCity").value || "").trim().toLowerCase();
  const physState = (document.getElementById("applicantState").value || "").trim().toLowerCase();
  const physZip = (document.getElementById("applicantZip").value || "").trim();

  const mailAddr = (document.getElementById("mailingAddress").value || "").trim().toLowerCase();
  const mailCity = (document.getElementById("mailingCity").value || "").trim().toLowerCase();
  const mailState = (document.getElementById("mailingState").value || "").trim().toLowerCase();
  const mailZip = (document.getElementById("mailingZip").value || "").trim();

  const mailingNonBlank = !!(mailAddr || mailCity || mailState || mailZip);
  const anyDiff =
    (mailAddr && mailAddr !== physAddr) ||
    (mailCity && mailCity !== physCity) ||
    (mailState && mailState !== physState) ||
    (mailZip && mailZip !== physZip);
  const showMailing = mailingNonBlank && anyDiff;

  mailingAddressRow.style.display = showMailing ? "flex" : "none";
  mailingLocationRow.style.display = showMailing ? "flex" : "none";
}

[
  "applicantAddress",
  "applicantCity",
  "applicantState",
  "applicantZip",
  "mailingAddress",
  "mailingCity",
  "mailingState",
  "mailingZip"
].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const evt = el.tagName === "SELECT" ? "change" : "input";
  el.addEventListener(evt, updateMailingAddressVisibility);
});

// Printable export helpers
const PRINT_STORAGE_KEY = "mtcPrintData";

const friendlyLabels = {
  agencyName: "Agency/Brokerage",
  agentFirstName: "Agent First Name",
  agentLastName: "Agent Last Name",
  agentLicense: "License Number",
  agencyAddress: "Agency Address",
  agencyCity: "Agency City",
  agencyState: "Agency State",
  agencyZip: "Agency Zip",
  insuredStatus: "Insured Status",
  inceptionDate: "Policy Inception",
  expirationDate: "Policy Expiration",
  applicantWebsite: "Applicant Website",
  dotNumber: "USDOT Number",
  yearsInBusiness: "Years in Business",
  powerUnits: "Power Units",
  drivers: "Drivers",
  applicantName: "Applicant Name",
  applicantDbaName: "DBA Name",
  stateAuthority: "State Authority",
  applicantAddress: "Physical Address",
  applicantCity: "Physical City",
  applicantState: "Physical State",
  applicantZip: "Physical Zip",
  mailingAddress: "Mailing Address",
  mailingCity: "Mailing City",
  mailingState: "Mailing State",
  mailingZip: "Mailing Zip",
  presentCarrier: "Present Carrier",
  expiringMode: "Expiring Basis",
  expiringMileage: "Expiring Miles/Revenue",
  presentPremium: "Expiring Premium",
  limitPerVehicle: "Limit per Vehicle",
  limitAnyOneLoss: "Limit Any One Loss",
  deductible: "Deductible",
  radUnder300: "Radius <300 miles",
  rad301_500: "Radius 301–500 miles",
  rad501_1500: "Radius 501–1500 miles",
  rad1500plus: "Radius >1500 miles",
  carrierType: "Type of Carrier",
  opType: "Type of Operation",
  cargoCancelled: "Cargo Cancelled/Refused/Renewal Declined",
  bankruptcy: "Bankruptcy (7 years)",
  priorAuthority: "Prior Authority Held",
  priorAuthorityName: "Prior Authority Name",
  priorAuthorityDot: "Prior Authority DOT",
  loadedUnattended: "Loaded Units Left Unattended",
  loadedUnattendedDesc: "Unattended Description",
  trailersDetached: "Trailers Detached",
  trailersDetachedDesc: "Detached Description",
  securityLocation: "Security at Locations",
  securityTransit: "Security In Transit",
  securityTransitOther: "Other In-Transit Security",
  optCover: "Optional Coverages",
  anyLosses: "Any Cargo Losses",
  lossRunsAttached: "Loss Runs Attached",
  terminalCount: "Terminals"
};

function labelFromName(key, fallback) {
  if (!key) return fallback || "Field";
  if (friendlyLabels[key]) return friendlyLabels[key];
  if (key.startsWith("lossPeriod")) return "Loss Period " + key.replace("lossPeriod", "");
  if (key.startsWith("lossPaid")) return "Loss Paid " + key.replace("lossPaid", "");
  if (key.startsWith("lossClaims")) return "Loss Claims " + key.replace("lossClaims", "");
  if (key.startsWith("lossCause")) return "Loss Cause " + key.replace("lossCause", "");
  if (key.startsWith("lossOpen")) return "Loss Open " + key.replace("lossOpen", "");
  return fallback || key;
}

function getLabelText(el) {
  if (!el) return "";
  let labelEl = null;
  if (el.id) {
    labelEl = document.querySelector(`label[for="${el.id}"]`);
  }
  if (!labelEl) {
    labelEl = el.closest("label");
  }
  if (labelEl) {
    const clone = labelEl.cloneNode(true);
    clone.querySelectorAll("input, select, textarea").forEach((node) => node.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  }
  if (el.placeholder) return el.placeholder.trim();
  return "";
}

function pushField(arr, key, label, value, display) {
  if (value === undefined || value === null) return;
  const normalized =
    Array.isArray(value) && value.length
      ? value
      : !Array.isArray(value) && String(value).trim() !== ""
      ? value
      : null;
  if (normalized === null) return;
  arr.push({ key: key || "", label: label || key || "Field", value, display: display ?? value });
}

function collectApplicationData() {
  const form = document.getElementById("mtcForm");
  const record = { generatedAt: new Date().toISOString(), fields: [], commodities: [], carrierProjections: [], terminals: [] };
  if (!form) return record;

  const checkboxGroups = {};
  const processedRadios = new Set();
  const controls = Array.from(form.querySelectorAll("input, select, textarea"));

  controls.forEach((el) => {
    // Handled later so skip
    if (el.closest("#carrierProjectionContainer")) return;
    if (el.closest("#terminalsBody")) return;

    // Commodities
    if (el.classList.contains("commodity-percent")) {
      const val = (el.value || "").trim();
      if (!val) return;
      const key = el.dataset.id || el.id || "";
      let label = "";
      const rowLabel = el.closest("tr")?.querySelector("td:first-child");
      if (rowLabel) label = rowLabel.textContent.replace(/\s+/g, " ").trim();
      if (!label) {
        const summary = el.closest("summary");
        label = summary?.querySelector("span")?.textContent?.trim() || "";
      }
      if (!label) label = key || "Commodity";
      record.commodities.push({ key, label, value: val });
      return;
    }

    const type = (el.type || "").toLowerCase();
    const name = el.name || el.id || el.dataset.id;
    const baseLabel = labelFromName(name, getLabelText(el));

    if (type === "radio" && el.name) {
      if (processedRadios.has(el.name)) return;
      processedRadios.add(el.name);
      const checked = form.querySelector(`input[name="${el.name}"]:checked`);
      const value = checked ? checked.value : "";
      const displayLabel = checked ? getLabelText(checked) || value : value;
      pushField(record.fields, name, baseLabel, value, displayLabel);
      return;
    }

    if (type === "checkbox" && el.name) {
      if (!checkboxGroups[el.name]) checkboxGroups[el.name] = [];
      if (el.checked) checkboxGroups[el.name].push(el.value);
      return;
    }

    let value = el.value;
    let displayValue = value;
    if (type === "file") {
      value = el.files?.length ? Array.from(el.files).map((f) => f.name).join(", ") : "";
      displayValue = value;
    } else if (el.tagName === "SELECT") {
      const opt = el.selectedOptions?.[0];
      displayValue = opt ? opt.textContent.trim() : value;
    }
    pushField(record.fields, name, baseLabel, value, displayValue);
  });

  Object.entries(checkboxGroups).forEach(([name, values]) => {
    const label = labelFromName(name, name);
    pushField(record.fields, name, label, values, values.join(", "));
  });

  const projRows = carrierProjectionContainer?.querySelectorAll(".carrier-projection-row") || [];
  projRows.forEach((row) => {
    const type = row.dataset.carrierType || "";
    const mode = row.querySelector("select")?.value || "";
    const inputs = row.querySelectorAll('input[type="text"]');
    const upcoming = inputs[0]?.value || "";
    const expiring = inputs[1]?.value || "";
    if (type || mode || upcoming || expiring) {
      record.carrierProjections.push({ type, mode, upcoming, expiring });
    }
  });

  const terminalRows = terminalsBody?.querySelectorAll("tr") || [];
  terminalRows.forEach((tr, idx) => {
    const limit = tr.querySelector('input[name^="terminalLimit"]')?.value || "";
    const address = tr.querySelector('input[name^="terminalAddr"]')?.value || "";
    const construction = tr.querySelector('select[name^="terminalConstruction"]')?.value || "";
    const sprinkler = tr.querySelector('select[name^="terminalSprinkler"]')?.value || "";
    if (limit || address || construction || sprinkler) {
      record.terminals.push({ index: idx + 1, limit, address, construction, sprinkler });
    }
  });

  return record;
}

// Form validation on submit
const mtcForm = document.getElementById("mtcForm");
if (mtcForm) {
  mtcForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const { errors: requiredErrors, missingElements } = validateRequiredFields();
    if (requiredErrors.length) {
      const target = missingElements.find((el) => !!el) || null;
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof target.focus === "function") target.focus({ preventScroll: true });
      }
      return;
    }
    const epsilon = 0.01;
    const { total, anyFilled } = computeRadiusTotal();
    if (anyFilled && Math.abs(total - 100) > epsilon) {
      alert("Radius of Operations percentages must total 100%. Current total: " + total.toFixed(1) + "%.");
      return;
    }

    const { total: commodityTotal, anyEntered } = computeCommodityTotal();
    if (anyEntered && Math.abs(commodityTotal - 100) > epsilon) {
      alert("Commodity mix must total 100%. Current total: " + commodityTotal.toFixed(1) + "%.");
      return;
    }

    const record = collectApplicationData();
    localStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(record));
    window.location.href = "application-output.html";
  });
}

// Initial state
updateCommodityTotals();
updateRadiusDisplay();
updateMailingAddressVisibility();

// -------------------------
// Policy view (read-only)
// -------------------------
const policySeeds = [
  { policy: "POL-1001", dot: "DOT123450", name: "Acme Logistics LLC", grade: "A" },
  { policy: "POL-1002", dot: "DOT123451", name: "Blue Ridge Haulers", grade: "B+" },
  { policy: "POL-1003", dot: "DOT123452", name: "Summit Freight Co.", grade: "A-" },
  { policy: "POL-1004", dot: "DOT123453", name: "Lakeside Transport", grade: "B" },
  { policy: "POL-1005", dot: "DOT123454", name: "Prairie Carriers", grade: "B-" },
  { policy: "POL-1006", dot: "DOT123455", name: "Iron Trail Freight", grade: "A+" },
  { policy: "POL-1007", dot: "DOT123456", name: "Red Rock Carriers", grade: "B+" },
  { policy: "POL-1008", dot: "DOT123457", name: "Evergreen Transport", grade: "A-" },
  { policy: "POL-1009", dot: "DOT123458", name: "Highway Star Freight", grade: "C+" },
  { policy: "POL-1010", dot: "DOT123459", name: "Riverbend Logistics", grade: "B" },
  { policy: "POL-1011", dot: "DOT123460", name: "Coastal Cargo Lines", grade: "A" },
  { policy: "POL-1012", dot: "DOT123461", name: "Oak Leaf Hauling", grade: "B-" },
  { policy: "POL-1013", dot: "DOT123462", name: "Sunrise Freightways", grade: "C" },
  { policy: "POL-1014", dot: "DOT123463", name: "Canyon Ridge Movers", grade: "B+" },
  { policy: "POL-1015", dot: "DOT123464", name: "Silver Line Carriers", grade: "A-" }
];

const cityStateSeeds = [
  { city: "Kansas City", state: "MO" },
  { city: "Dallas", state: "TX" },
  { city: "Phoenix", state: "AZ" },
  { city: "Charlotte", state: "NC" },
  { city: "Denver", state: "CO" },
  { city: "Chicago", state: "IL" },
  { city: "Atlanta", state: "GA" },
  { city: "Portland", state: "OR" },
  { city: "Nashville", state: "TN" },
  { city: "Cincinnati", state: "OH" },
  { city: "Jacksonville", state: "FL" },
  { city: "Minneapolis", state: "MN" },
  { city: "Boise", state: "ID" },
  { city: "Salt Lake City", state: "UT" },
  { city: "Richmond", state: "VA" }
];

const commoditySets = [
  { general_freight_palletized_mixed: 40, building_materials_roofing: 30, household_goods_home_furniture: 30 },
  { refrigerated_dairy: 30, refrigerated_frozen_foods: 30, grain_feed_hay_animal_feed_pet_food: 40 },
  { motor_vehicles_parts_components: 45, machinery_industrial_machinery: 30, chemicals_cleaning_detergents: 25 },
  { paper_products_cardboard_corrugated: 40, general_freight_ecommerce_parcels: 35, beverages_beer_wine_spirits: 25 },
  { farm_supplies_fertilizers: 35, farm_supplies_seeds_planting: 35, refrigerated_frozen_foods: 30 }
];

const carrierTypeSets = [
  ["common", "contract"],
  ["common"],
  ["contract", "forwarder"],
  ["broker", "warehouse"],
  ["common", "broker"]
];

const opTypeSets = [
  ["dryvan", "reefer"],
  ["flatbed", "oversize"],
  ["dryvan", "doubles"],
  ["reefer", "hhg"],
  ["autohauler", "container"]
];

const securityLocationSets = [
  ["fenced", "cameras", "kingpin"],
  ["guards", "cameras"],
  ["fenced", "alarms", "kingpin"],
  ["cameras", "building"],
  ["fenced", "guards", "building"]
];

const securityTransitSets = [
  ["gps", "alarm"],
  ["gps", "armedGuard", "other"],
  ["gps", "other"],
  ["gps", "alarm", "other"],
  ["gps", "alarm"]
];

function slugifyName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function oneYearLater(dateStr) {
  if (!dateStr || dateStr.split("-").length !== 3) return "";
  const [y, m, d] = dateStr.split("-");
  const expYear = parseInt(y, 10) + 1;
  if (isNaN(expYear)) return "";
  return `${expYear}-${m}-${d}`;
}

function buildPolicy(seed, idx) {
  const loc = cityStateSeeds[idx % cityStateSeeds.length];
  const commodity = commoditySets[idx % commoditySets.length];
  const carrierTypes = carrierTypeSets[idx % carrierTypeSets.length];
  const opTypes = opTypeSets[idx % opTypeSets.length];
  const securityLocations = securityLocationSets[idx % securityLocationSets.length];
  const securityTransits = securityTransitSets[idx % securityTransitSets.length];
  const inceptionMonth = String((idx % 9) + 1).padStart(2, "0");
  const inceptionDate = `2024-${inceptionMonth}-01`;
  const expirationDate = oneYearLater(inceptionDate);

  const terminals = Array.from({ length: 2 + (idx % 2) }).map((_, i) => ({
    limit: 200000 + idx * 7000 + i * 25000,
    address: `${120 + idx * 3 + i} ${loc.city} Logistics Park`,
    construction: ["MFR", "FR", "JM"][(idx + i) % 3],
    sprinkler: ["Fully", "Partial", "None"][(idx + i) % 3]
  }));

  const lossHistory = Array.from({ length: 5 }).map((_, i) => ({
    period: `${inceptionMonth}/01/${2019 + i} - ${inceptionMonth}/01/${2020 + i}`,
    paid: `$${(14000 + idx * 900 + i * 1500).toLocaleString("en-US")}`,
    claims: (i % 2) + 1,
    cause: ["Collision", "Theft", "Weather", "Cargo Shift", "Fire"][(idx + i) % 5],
    open: i === 0 && idx % 4 === 0 ? "yes" : "no"
  }));

  const carrierProjections = carrierTypes.map((type, cIdx) => ({
    type,
    mode: cIdx % 2 === 0 ? "revenue" : "miles",
    upcoming: 900000 + idx * 5000 + cIdx * 25000,
    expiring: 820000 + idx * 4500 + cIdx * 22000
  }));

  return {
    policy: seed.policy,
    dotNumber: seed.dot,
    grade: seed.grade || "B",
    agency: {
      agencyName: "Harbor Ridge Brokerage",
      agentFirstName: "Alex",
      agentLastName: "Kim",
      agentLicense: `BR-${77000 + idx}`,
      agencyAddress: "410 Market St Suite 500",
      agencyCity: "Seattle",
      agencyState: "WA",
      agencyZip: "98101",
      insuredStatus: idx % 2 === 0 ? "existing" : "new"
    },
    applicant: {
      name: seed.name,
      dbaName: `${seed.name.split(" ")[0]} Transport`,
      address: `${100 + idx} Freight Avenue`,
      city: loc.city,
      state: loc.state,
      zip: `9${idx}10${idx}`,
      mailingAddress: `${100 + idx} PO Box`,
      mailingCity: loc.city,
      mailingState: loc.state,
      mailingZip: `9${idx}10${idx}`,
      website: `${slugifyName(seed.name)}.com`,
      inceptionDate,
      expirationDate,
      dotStatus: "Active",
      dotStatusDate: "2025-01-01",
      operationClass: "Interstate",
      authority: "Authorized For Hire",
      safetyRating: "Satisfactory",
      dateOfAuthority: "1996-01-01",
      stateAuthority: `MC${150000 + idx}`,
      powerUnits: 18 + idx,
      drivers: 22 + idx
    },
    coverages: {
      presentCarrier: "Praxis Mutual",
      expiringMode: idx % 3 === 0 ? "miles" : "revenue",
      expiringMileage: idx % 3 === 0 ? 180000 + idx * 1200 : 1200000 + idx * 5500,
      premium: 80000 + idx * 2500,
      limitPerVehicle: ["100000", "250000", "500000", "1000000"][idx % 4],
      limitAnyOneLoss: ["250000", "500000", "1000000", "2000000"][idx % 4],
      deductible: "$5,000"
    },
    cargoCancelled: idx % 5 === 0 ? "yes" : "no",
    bankruptcy: idx % 6 === 0 ? "yes" : "no",
    priorAuthority: idx % 4 === 0 ? "yes" : "no",
    priorAuthorityName: idx % 4 === 0 ? `${seed.name.split(" ")[0]} Freight Lines` : "",
    priorAuthorityDot: idx % 4 === 0 ? `ALT${seed.dot.slice(-3)}` : "",
    commodities: commodity,
    radius: { under300: 45, mid500: 30, mid1500: 15, over1500: 10 },
    carrierTypes,
    carrierProjections,
    opTypes,
    terminals,
    optionalCoverages: ["text1", "text2"],
    anyLosses: "yes",
    lossRunsAttached: idx % 3 === 0 ? "yes" : "no",
    lossHistory,
    loadedUnattended: idx % 2 === 0 ? "yes" : "no",
    loadedUnattendedDesc: "Units staged overnight in fenced lot with cameras.",
    trailersDetached: idx % 3 === 0 ? "yes" : "no",
    trailersDetachedDesc: idx % 3 === 0 ? "Occasional drop at secured yards." : "",
    securityLocations,
    securityTransits,
    securityTransitOther: "Hidden ignition disable"
  };
}

const policyRecords = {};
policySeeds.forEach((seed, idx) => {
  policyRecords[seed.policy] = buildPolicy(seed, idx);
});

function setRadioValue(name, value) {
  if (!name || value == null) return;
  const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function setCheckboxValues(name, values = []) {
  const valSet = new Set(values);
  document.querySelectorAll(`input[name="${name}"]`).forEach((cb) => {
    cb.checked = valSet.has(cb.value);
  });
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.value = value;
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.value = value;
}

function setInputByName(name, value) {
  if (!name || value == null) return;
  const el = document.querySelector(`[name="${name}"]`);
  if (el) el.value = value;
}

function showDotDrivenFieldsForPrefill(dotValue) {
  const hasDot = !!(dotValue || "").trim();
  if (!hasDot) return;
  dotDrivenFieldIds.forEach((id) => setFieldVisibilityByInputId(id, true));
  if (dbaRow) dbaRow.style.display = "flex";
  setDotStatusVisible(true);
}

function hideEmptyCommoditiesForPolicyView() {
  // Hide minor rows without percentages and collapse empty groups
  const groups = document.querySelectorAll(".commodity-group");
  groups.forEach((group) => {
    const rows = group.querySelectorAll("table tr");
    let anyVisible = false;
    rows.forEach((row) => {
      const input = row.querySelector("input.commodity-percent");
      if (input && !input.value.trim()) {
        row.style.display = "none";
      } else {
        row.style.display = "";
        anyVisible = true;
      }
    });
    const containerRow = group.closest("tr");
    if (containerRow) containerRow.style.display = anyVisible ? "" : "none";
    if (anyVisible) group.open = true;
  });

  // Hide standalone major rows with no percentage
  const standaloneRows = Array.from(document.querySelectorAll(".commodities-table tbody > tr")).filter(
    (row) => !row.querySelector(".commodity-group")
  );
  standaloneRows.forEach((row) => {
    const input = row.querySelector("input.commodity-percent");
    row.style.display = input && !input.value.trim() ? "none" : "";
  });
}

function fillCommoditiesFromRecord(map) {
  if (!map) return;
  Object.entries(map).forEach(([key, val]) => {
    const input = document.querySelector(`input[data-id="${key}"]`) || document.getElementById(key);
    if (!input) return;
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    input.value = `${num}%`;
    input.dataset.prevVal = input.value;
    input.dataset.prevNum = num.toString();
    const grp = input.closest(".commodity-group");
    if (grp) grp.open = true;
  });
  updateCommodityTotals();
  updateMajorCommodityDisplays();
}

function fillLossHistoryFromRecord(list) {
  if (!Array.isArray(list)) return;
  list.forEach((item, idx) => {
    const rowNum = idx + 1;
    const period = document.querySelector(`input[name="lossPeriod${rowNum}"]`);
    const paid = document.querySelector(`input[name="lossPaid${rowNum}"]`);
    const claims = document.querySelector(`input[name="lossClaims${rowNum}"]`);
    const cause = document.querySelector(`input[name="lossCause${rowNum}"]`);
    if (period && item.period) period.value = item.period;
    if (paid && item.paid) paid.value = item.paid;
    if (claims && item.claims != null) claims.value = item.claims;
    if (cause && item.cause) cause.value = item.cause;
    if (item.open) setRadioValue(`lossOpen${rowNum}`, item.open);
  });
}

function fillCarrierProjectionValues(projections) {
  if (!Array.isArray(projections)) return;
  projections.forEach((proj) => {
    const row = carrierProjectionContainer?.querySelector(`.carrier-projection-row[data-carrier-type="${proj.type}"]`);
    if (!row) return;
    const select = row.querySelector("select");
    const inputs = row.querySelectorAll('input[type="text"]');
    if (select && proj.mode) {
      select.value = proj.mode;
      select.dispatchEvent(new Event("change"));
    }
    if (inputs[0] && proj.upcoming != null) {
      inputs[0].value = proj.upcoming;
      if (select) formatCarrierProjectionInput(inputs[0], select);
      inputs[0].dispatchEvent(new Event("input"));
    }
    if (inputs[1] && proj.expiring != null) {
      inputs[1].value = proj.expiring;
      if (select) formatCarrierProjectionInput(inputs[1], select);
      inputs[1].dispatchEvent(new Event("input"));
    }
  });
}

function fillTerminalsFromRecord(list) {
  if (!Array.isArray(list)) return;
  const count = list.length;
  if (terminalCountSelect) {
    terminalCountSelect.value = String(count);
    rebuildTerminalsRows(count);
  }
  list.forEach((term, idx) => {
    const rowIndex = idx + 1;
    const limit = terminalsBody?.querySelector(`input[name="terminalLimit${rowIndex}"]`);
    const addr = terminalsBody?.querySelector(`input[name="terminalAddr${rowIndex}"]`);
    const construction = terminalsBody?.querySelector(`select[name="terminalConstruction${rowIndex}"]`);
    const sprinkler = terminalsBody?.querySelector(`select[name="terminalSprinkler${rowIndex}"]`);
    if (limit && term.limit != null) {
      limit.value = term.limit;
      formatTerminalLimit(limit);
    }
    if (addr && term.address) addr.value = term.address;
    if (construction && term.construction) construction.value = term.construction;
    if (sprinkler && term.sprinkler) sprinkler.value = term.sprinkler;
  });
}

function syncLossRunsUploadManual() {
  if (!lossRunsUploadRow || !lossRunsFile) return;
  const choice = Array.from(lossRunsRadios).find((r) => r.checked)?.value;
  const show = choice === "yes";
  lossRunsUploadRow.style.display = show ? "flex" : "none";
  lossRunsFile.disabled = !show;
  if (!show) lossRunsFile.value = "";
}

function syncUnattendedManual() {
  if (!unattendedDesc) return;
  const choice = Array.from(unattendedRadios).find((r) => r.checked)?.value;
  const disable = choice === "no";
  unattendedDesc.disabled = disable;
  unattendedDesc.style.backgroundColor = disable ? "#f3f4f6" : "";
  if (disable) unattendedDesc.value = "";
}

function syncDetachedManual() {
  if (!detachedDesc) return;
  const choice = Array.from(detachedRadios).find((r) => r.checked)?.value;
  const disable = choice === "no";
  detachedDesc.disabled = disable;
  detachedDesc.style.backgroundColor = disable ? "#f3f4f6" : "";
  if (disable) detachedDesc.value = "";
}

function syncTransitOtherManual() {
  if (!transitOtherCheckbox || !transitOtherInput) return;
  const show = transitOtherCheckbox.checked;
  transitOtherInput.style.display = show ? "inline-block" : "none";
  transitOtherInput.disabled = !show;
  if (!show) transitOtherInput.value = "";
}

// Prefill commodities when returning from print/back
function applyCommodityPrefill(list) {
  if (!Array.isArray(list)) return;
  list.forEach((item) => {
    const key = item?.key;
    const val = item?.value;
    if (!key) return;
    const input = document.querySelector(`input[data-id="${key}"]`) || document.getElementById(key);
    if (!input) return;
    const cleaned = val || "";
    input.value = cleaned;
    input.dataset.prevVal = cleaned;
    const num = parsePercentNumber ? parsePercentNumber(input) : NaN;
    if (!isNaN(num)) input.dataset.prevNum = num.toString();
    input.dispatchEvent(new Event("input"));
    const details = input.closest(".commodity-group");
    if (details) {
      const row = input.closest("tr");
      if (row) row.style.display = "";
      details.open = true;
      const containerRow = details.closest("tr");
      if (containerRow) containerRow.style.display = "";
    } else {
      const row = input.closest("tr");
      if (row) row.style.display = "";
    }
  });
  updateCommodityTotals();
  updateMajorCommodityDisplays();
  if (typeof hideEmptyCommoditiesForPolicyView === "function") {
    hideEmptyCommoditiesForPolicyView();
  }
}

function clearRequiredHighlights() {
  document.querySelectorAll(".required-missing").forEach((el) => {
    el.classList.remove("required-missing");
  });
  document.querySelectorAll(".required-highlight").forEach((el) => {
    el.classList.remove("required-highlight");
  });
}

function markMissing(el) {
  if (!el) return;
  el.classList.add("required-missing");
  const label = el.closest("label") || document.querySelector(`label[for="${el.id}"]`);
  if (label) label.classList.add("required-highlight");
}

function validateRequiredFields() {
  clearRequiredHighlights();
  const errors = [];
  const missingElements = [];

  const requireInput = (id, label) => {
    const el = document.getElementById(id);
    if (!el || !(el.value || "").trim()) {
      errors.push(label);
      if (el) {
        markMissing(el);
        missingElements.push(el);
      }
    }
  };

  const requireSelect = (id, label) => {
    const el = document.getElementById(id);
    if (!el || !(el.value || "").trim()) {
      errors.push(label);
      if (el) {
        markMissing(el);
        missingElements.push(el);
      }
    }
  };

  const requireRadio = (name, label) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (!selected) {
      errors.push(label);
      const radios = document.querySelectorAll(`input[name="${name}"]`);
      radios.forEach((r) => {
        markMissing(r);
        missingElements.push(r);
      });
    }
  };

  const requireCheckbox = (name, label) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (!selected) {
      errors.push(label);
      const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
      checkboxes.forEach((cb) => {
        markMissing(cb);
        missingElements.push(cb);
      });
    }
  };

  // Agency Information
  ["agencyName", "agentFirstName", "agentLastName", "agentLicense", "agencyAddress", "agencyCity", "agencyState", "agencyZip"].forEach((id) =>
    requireInput(id, "Agency Information is incomplete")
  );
  requireSelect("insuredStatus", "Agency Information is incomplete");

  // Dates and DOT
  requireInput("inceptionDate", "Inception Date is required");
  requireInput("dotNumber", "USDOT Number is required");

  // Type of carrier + projections (upcoming required, expiring optional)
  const carrierChecked = document.querySelector('input[name="carrierType"]:checked');
  if (!carrierChecked) errors.push("At least one Type of Carrier must be selected");
  const projectionRows = carrierProjectionContainer?.querySelectorAll(".carrier-projection-row") || [];
  projectionRows.forEach((row) => {
    const typeLabel = carrierLabelMap[row.dataset.carrierType] || "Carrier projection";
    const basis = row.querySelector("select");
    if (basis && !basis.value) {
      errors.push(`${typeLabel}: select basis (Revenue/Miles/Power Units)`);
      markMissing(basis);
      missingElements.push(basis);
    }
    const upcoming = row.querySelector('input[type="text"]');
    if (upcoming && !(upcoming.value || "").trim()) {
      errors.push(`${typeLabel}: enter Projected Upcoming amount`);
      markMissing(upcoming);
      missingElements.push(upcoming);
    }
  });

  // Type of operation
  requireCheckbox("opType", "Select at least one Type of Operation");

  // Limits section
  requireSelect("limitPerVehicle", "Limit per Vehicle is required");
  requireSelect("limitAnyOneLoss", "Limit Any One Loss is required");
  requireSelect("deductible", "Deductible is required");

  // Terminals section: require at least one terminal and all columns
  const terminalCount = parseInt(terminalCountSelect?.value || "0", 10) || 0;
  if (terminalCount <= 0) {
    errors.push("Enter at least one Terminal location with details");
  } else {
    const rows = terminalsBody?.querySelectorAll("tr") || [];
    rows.forEach((tr) => {
      const idx = tr.dataset.index || "";
      const limit = tr.querySelector(`input[name="terminalLimit${idx}"]`);
      const addr = tr.querySelector(`input[name="terminalAddr${idx}"]`);
      const construction = tr.querySelector(`select[name="terminalConstruction${idx}"]`);
      const sprinkler = tr.querySelector(`select[name="terminalSprinkler${idx}"]`);
      if (!limit || !(limit.value || "").trim()) {
        errors.push(`Terminal ${idx}: Limit`);
        markMissing(limit);
        missingElements.push(limit);
      }
      if (!addr || !(addr.value || "").trim()) {
        errors.push(`Terminal ${idx}: Address`);
        markMissing(addr);
        missingElements.push(addr);
      }
      if (!construction || !(construction.value || "").trim()) {
        errors.push(`Terminal ${idx}: Construction`);
        markMissing(construction);
        missingElements.push(construction);
      }
      if (!sprinkler || !(sprinkler.value || "").trim()) {
        errors.push(`Terminal ${idx}: Sprinkler`);
        markMissing(sprinkler);
        missingElements.push(sprinkler);
      }
    });
  }

  // Coverage history questions (not current carrier)
  requireRadio("cargoCancelled", "Coverage History: cancellation question unanswered");
  requireRadio("bankruptcy", "Coverage History: bankruptcy question unanswered");
  requireRadio("priorAuthority", "Coverage History: prior authority question unanswered");
  const priorChoice = document.querySelector('input[name="priorAuthority"]:checked')?.value;
  if (priorChoice === "yes") {
    requireInput("priorAuthorityName", "Coverage History: prior authority name required");
    requireInput("priorAuthorityDot", "Coverage History: prior authority DOT required");
  }

  // Loss experience section
  requireRadio("anyLosses", "Loss Experience: indicate if any losses");
  requireRadio("lossRunsAttached", "Loss Experience: indicate if loss runs are attached");

  // Theft exposure
  requireRadio("loadedUnattended", "Theft Exposure: loaded units unattended question unanswered");
  requireRadio("trailersDetached", "Theft Exposure: trailers detached question unanswered");
  requireCheckbox("securityLocation", "Select at least one Security at Locations control");
  requireCheckbox("securityTransit", "Select at least one Security In Transit control");

  return { errors, missingElements };
}

function lockFormForPolicyView() {
  document.querySelectorAll("input, select, textarea, button").forEach((el) => {
    if (el.id === "applicantWebsiteLink") return;
    if (el.dataset.keepEnabled === "true") return;
    el.disabled = true;
  });
}

function fillPolicyRecord(policyId) {
  const data = policyRecords[policyId];
  if (!data) return;
  const actions = document.getElementById("policyActions");
  if (actions) actions.style.display = "flex";
  const ratingBtn = document.getElementById("seeRatingBtn");
  if (ratingBtn) {
    ratingBtn.dataset.grade = data.grade || "B";
    ratingBtn.addEventListener("click", () => {
      const grade = ratingBtn.dataset.grade || "B";
      alert(`Rating for ${data.policy}: ${grade}`);
    });
  }

  // Show all DOT-driven fields
  dotDrivenFieldIds.forEach((id) => setFieldVisibilityByInputId(id, true));
  if (dbaRow) dbaRow.style.display = "flex";
  setDotStatusVisible(true);

  // Agency
  setInputValue("agencyName", data.agency.agencyName);
  setInputValue("agentFirstName", data.agency.agentFirstName);
  setInputValue("agentLastName", data.agency.agentLastName);
  setInputValue("agentLicense", data.agency.agentLicense);
  setInputValue("agencyAddress", data.agency.agencyAddress);
  setInputValue("agencyCity", data.agency.agencyCity);
  setSelectValue("agencyState", data.agency.agencyState);
  setInputValue("agencyZip", data.agency.agencyZip);
  setSelectValue("insuredStatus", data.agency.insuredStatus);

  // Applicant + DOT
  setInputValue("inceptionDate", data.applicant.inceptionDate);
  setInputValue("expirationDate", data.applicant.expirationDate);
  setInputValue("applicantWebsite", data.applicant.website);
  if (applicantWebsiteInput) applicantWebsiteInput.dispatchEvent(new Event("blur"));
  setInputValue("dotNumber", data.dotNumber);
  setInputValue("yearsInBusiness", data.applicant.dateOfAuthority);
  setInputValue("powerUnits", data.applicant.powerUnits);
  setInputValue("drivers", data.applicant.drivers);
  setInputValue("applicantName", data.applicant.name);
  setInputValue("applicantDbaName", data.applicant.dbaName);
  setInputValue("stateAuthority", data.applicant.stateAuthority);
  setInputValue("applicantAddress", data.applicant.address);
  setInputValue("applicantCity", data.applicant.city);
  setSelectValue("applicantState", data.applicant.state);
  setInputValue("applicantZip", data.applicant.zip);
  setInputValue("mailingAddress", data.applicant.mailingAddress);
  setInputValue("mailingCity", data.applicant.mailingCity);
  setSelectValue("mailingState", data.applicant.mailingState);
  setInputValue("mailingZip", data.applicant.mailingZip);
  updateMailingAddressVisibility();

  const statusTextEl = document.getElementById("dotStatusText");
  if (statusTextEl) statusTextEl.textContent = `${data.applicant.dotStatus} as of ${data.applicant.dotStatusDate}`;
  applyDotStatusStyle(data.applicant.dotStatus);
  const metaEl = document.getElementById("dotMeta");
  if (metaEl) {
    metaEl.textContent = `— ${data.applicant.operationClass} • ${data.applicant.authority} • Safety rating: ${data.applicant.safetyRating}`;
  }

  // Coverages
  setInputValue("presentCarrier", data.coverages.presentCarrier);
  if (expiringMode) expiringMode.value = data.coverages.expiringMode || "revenue";
  if (expiringMileageInput && data.coverages.expiringMileage != null) {
    expiringMileageInput.value = data.coverages.expiringMileage;
    formatExpiring();
  }
  if (presentPremiumInput && data.coverages.premium != null) {
    const digits = parseInt(data.coverages.premium, 10);
    if (!isNaN(digits)) {
      presentPremiumInput.value = "$" + digits.toLocaleString("en-US");
    }
  }
  setSelectValue("limitPerVehicle", data.coverages.limitPerVehicle);
  setSelectValue("limitAnyOneLoss", data.coverages.limitAnyOneLoss);
  setSelectValue("deductible", data.coverages.deductible);

  // Carrier projections / operations
  setCheckboxValues("carrierType", data.carrierTypes);
  syncCarrierProjections();
  fillCarrierProjectionValues(data.carrierProjections);
  setCheckboxValues("opType", data.opTypes);

  // Commodities
  fillCommoditiesFromRecord(data.commodities);
  hideEmptyCommoditiesForPolicyView();

  // Radius
  if (data.radius) {
    setInputValue("radUnder300", data.radius.under300);
    setInputValue("rad301_500", data.radius.mid500);
    setInputValue("rad501_1500", data.radius.mid1500);
    setInputValue("rad1500plus", data.radius.over1500);
    updateRadiusDisplay();
  }

  // Loss runs and experience
  setRadioValue("anyLosses", data.anyLosses);
  setRadioValue("lossRunsAttached", data.lossRunsAttached);
  syncLossRunsUploadManual();
  fillLossHistoryFromRecord(data.lossHistory);
  syncLossFields();

  // Underwriting questions
  setRadioValue("cargoCancelled", data.cargoCancelled);
  setRadioValue("bankruptcy", data.bankruptcy);
  setRadioValue("priorAuthority", data.priorAuthority);
  syncPriorAuthority();
  setInputValue("priorAuthorityName", data.priorAuthorityName);
  setInputValue("priorAuthorityDot", data.priorAuthorityDot);

  // Theft exposure
  setRadioValue("loadedUnattended", data.loadedUnattended);
  syncUnattendedManual();
  if (data.loadedUnattendedDesc) setInputByName("loadedUnattendedDesc", data.loadedUnattendedDesc);
  setRadioValue("trailersDetached", data.trailersDetached);
  syncDetachedManual();
  if (data.trailersDetachedDesc) setInputByName("trailersDetachedDesc", data.trailersDetachedDesc);
  setCheckboxValues("securityLocation", data.securityLocations);
  setCheckboxValues("securityTransit", data.securityTransits);
  syncTransitOtherManual();
  if (transitOtherInput && data.securityTransitOther && transitOtherCheckbox?.checked) {
    transitOtherInput.value = data.securityTransitOther;
  }

  // Optional coverages
  setCheckboxValues("optCover", data.optionalCoverages);

  // Terminals
  fillTerminalsFromRecord(data.terminals);

  // Premiums / loss totals
  updateCommodityTotals();
  updateMajorCommodityDisplays();
  updateRadiusDisplay();

  // Read-only
  lockFormForPolicyView();
}

function prefillFromStoredRecord() {
  const raw = localStorage.getItem(PRINT_STORAGE_KEY);
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return;
  }
  const fields = data.fields || [];

  // If DOT was present before, make sure DOT-driven fields are visible when coming back
  const dotField = fields.find((f) => f.key === "dotNumber");
  showDotDrivenFieldsForPrefill(dotField?.value || dotField?.display || "");

  // Commodities (show any rows with values)
  const storedCommodities = data.commodities || [];
  applyCommodityPrefill(storedCommodities);

  fields.forEach((f) => {
    const key = f.key || "";
    if (!key) return;
    const value = f.value;
    const radios = document.querySelectorAll(`input[type="radio"][name="${key}"]`);
    if (radios.length) {
      radios.forEach((r) => {
        r.checked = r.value == value;
      });
      radios[0].dispatchEvent(new Event("change"));
      return;
    }

    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${key}"]`);
    if (checkboxes.length) {
      const vals = Array.isArray(value)
        ? value
        : String(value || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      checkboxes.forEach((cb) => {
        cb.checked = vals.includes(cb.value);
        cb.dispatchEvent(new Event("change"));
      });
      return;
    }

    const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
    if (!el) return;
    if (el.tagName === "SELECT") {
      el.value = value ?? "";
      el.dispatchEvent(new Event("change"));
    } else if (el.type === "checkbox") {
      el.checked = !!value;
      el.dispatchEvent(new Event("change"));
    } else {
      el.value = value ?? "";
      const evtName = el.tagName === "SELECT" ? "change" : "input";
      el.dispatchEvent(new Event(evtName));
    }
  });

  // Commodities
  (data.commodities || []).forEach((c) => {
    const key = c.key || "";
    if (!key) return;
    const input = document.querySelector(`input[data-id="${key}"]`) || document.getElementById(key);
    if (!input) return;
    input.value = c.value || "";
    input.dispatchEvent(new Event("input"));
  });

  // Carrier projections
  syncCarrierProjections();
  (data.carrierProjections || []).forEach((proj) => {
    if (!proj.type) return;
    const row = carrierProjectionContainer?.querySelector(`.carrier-projection-row[data-carrier-type="${proj.type}"]`);
    if (!row) return;
    const select = row.querySelector("select");
    const inputs = row.querySelectorAll('input[type="text"]');
    if (select && proj.mode) {
      select.value = proj.mode;
      select.dispatchEvent(new Event("change"));
    }
    if (inputs[0] && proj.upcoming != null) {
      inputs[0].value = proj.upcoming;
      inputs[0].dispatchEvent(new Event("input"));
    }
    if (inputs[1] && proj.expiring != null) {
      inputs[1].value = proj.expiring;
      inputs[1].dispatchEvent(new Event("input"));
    }
  });

  // Terminals
  const terminals = data.terminals || [];
  if (terminalCountSelect) {
    terminalCountSelect.value = String(terminals.length || terminalCountSelect.value || 0);
    terminalCountSelect.dispatchEvent(new Event("change"));
    terminals.forEach((term, idx) => {
      const rowIndex = idx + 1;
      const limit = terminalsBody?.querySelector(`input[name="terminalLimit${rowIndex}"]`);
      const addr = terminalsBody?.querySelector(`input[name="terminalAddr${rowIndex}"]`);
      const construction = terminalsBody?.querySelector(`select[name="terminalConstruction${rowIndex}"]`);
      const sprinkler = terminalsBody?.querySelector(`select[name="terminalSprinkler${rowIndex}"]`);
      if (limit && term.limit != null) {
        limit.value = term.limit;
        limit.dispatchEvent(new Event("input"));
      }
      if (addr && term.address) {
        addr.value = term.address;
        addr.dispatchEvent(new Event("input"));
      }
      if (construction && term.construction) {
        construction.value = term.construction;
        construction.dispatchEvent(new Event("change"));
      }
      if (sprinkler && term.sprinkler) {
        sprinkler.value = term.sprinkler;
        sprinkler.dispatchEvent(new Event("change"));
      }
    });
  }

  updateMailingAddressVisibility();
  syncCarrierProjections();
  fillCarrierProjectionValues(data.carrierProjections);
  updateCommodityTotals();
  updateMajorCommodityDisplays();
  updateRadiusDisplay();
  syncLossRunsUploadManual();
  syncLossFields();
  syncPriorAuthority();
  syncUnattendedManual();
  syncDetachedManual();
  syncTransitOtherManual();
}

const searchParams = new URLSearchParams(window.location.search);
const policyParam = searchParams.get("policy");
const allowPrefill =
  ["1", "true", "yes"].includes((searchParams.get("fromDashboard") || "").toLowerCase()) ||
  ["1", "true", "yes"].includes((searchParams.get("prefill") || "").toLowerCase());

if (policyParam) {
  fillPolicyRecord(policyParam);
} else if (allowPrefill) {
  prefillFromStoredRecord();
}
