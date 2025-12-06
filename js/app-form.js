(() => {
  "use strict";

  const mockLookupData = {
    "123456": {
      base: {
        legalName: "Fleetidy Motor Cargo LLC",
        dbaName: "fleetidy logistics co.",
        address: "200 Capital Ave.",
        city: "Columbus",
        state: "OH",
        zip: "43215",
        mailingAddress: "PO Box 150",
        mailingCity: "Columbus",
        mailingState: "OH",
        mailingZip: "43215",
        powerUnits: "128",
        drivers: "210",
        yearsInBusiness: "2015-04-01",
        mcsMileageYear: "320000",
        stateAuthority: "MC123456",
        operationClassification: "Motor Truck Cargo",
        dotStatus: "ACTIVE",
        outOfServiceDate: "None",
        operatingAuthorityStatus: "Authorized For Hire"
      },
      extraDots: [
        {
          dotNumber: "789012",
          yearsInBusiness: "2021-05-01",
          mcsMileageYear: "148000",
          legalName: "Metro Cargo Partners",
          dbaName: "Metro Cargo",
          powerUnits: "42",
          drivers: "56",
          stateAuthority: "MC789012",
          physicalAddress: "500 Logistics Blvd",
          city: "Dayton",
          state: "OH",
          zip: "45402",
          mailingAddress: "PO Box 789",
          mailingCity: "Dayton",
          mailingState: "OH",
          mailingZip: "45402",
          operationClassification: "Intermodal",
          dotStatus: "ACTIVE",
          outOfServiceDate: "None",
          operatingAuthorityStatus: "Authorized - Contract"
        },
        {
          city: "Cincinnati",
          state: "OH",
          zip: "45202",
          dotNumber: "345678",
          yearsInBusiness: "2022-02-01",
          mcsMileageYear: "95000",
          legalName: "Riverfront Logistics LLC",
          dbaName: "riverfront cargo",
          powerUnits: "18",
          drivers: "25",
          stateAuthority: "MC345678",
          physicalAddress: "220 Riverfront Ave",
          mailingAddress: "100 Riverfront Ave",
          mailingCity: "Cincinnati",
          mailingState: "OH",
          mailingZip: "45202",
          operationClassification: "Short Haul Logistics",
          dotStatus: "ACTIVE",
          outOfServiceDate: "None",
          operatingAuthorityStatus: "Authorized - Contract"
        }
      ]
    }
  };
  const SUBMISSION_STORAGE_KEY = "fleetidySubmittedApplications";
  const STATE_CODES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
  ];
  const STATE_OPTIONS_HTML = STATE_CODES.map((code) => `<option value="${code}">${code}</option>`).join("");

  const baseFieldMap = {
    legalName: "applicantName",
    dbaName: "dbaName",
    address: "applicantAddress",
    city: "applicantCity",
    state: "applicantState",
    zip: "applicantZip",
    mailingAddress: "mailingAddress",
    mailingCity: "mailingCity",
    mailingState: "mailingState",
    mailingZip: "mailingZip",
    powerUnits: "powerUnits",
    drivers: "drivers",
    yearsInBusiness: "yearsInBusiness",
    mcsMileageYear: "mcsMileageYear",
    stateAuthority: "stateAuthority",
    operationClassification: "operationClassification"
  };

  const extraFieldMaps = [
    {
      dotNumber: "dotNumber2",
      yearsInBusiness: "yearsInBusiness2",
      mcsMileageYear: "mcsMileageYear2",
      legalName: "extraLegalName",
      dbaName: "extraDbaName",
      powerUnits: "extraPowerUnits",
      drivers: "extraDrivers",
      stateAuthority: "extraStateAuthority",
      physicalAddress: "extraPhysicalAddress",
      city: "extraCity",
      state: "extraState",
      zip: "extraZip",
      mailingAddress: "extraMailingAddress",
      mailingCity: "extraMailingCity",
      mailingState: "extraMailingState",
      mailingZip: "extraMailingZip",
      operationClassification: "extraOperationClassification"
    },
    {
      dotNumber: "dotNumber3",
      yearsInBusiness: "yearsInBusiness3",
      mcsMileageYear: "mcsMileageYear3",
      legalName: "extra2LegalName",
      dbaName: "extra2DbaName",
      powerUnits: "extra2PowerUnits",
      drivers: "extra2Drivers",
      stateAuthority: "extra2StateAuthority",
      physicalAddress: "extra2PhysicalAddress",
      city: "extra2City",
      state: "extra2State",
      zip: "extra2Zip",
      mailingAddress: "extra2MailingAddress",
      mailingCity: "extra2MailingCity",
      mailingState: "extra2MailingState",
      mailingZip: "extra2MailingZip",
      operationClassification: "extra2OperationClassification"
    }
  ];

  const dotInput = document.getElementById("dotNumber");
  const dotLookupBtn = document.getElementById("dotLookup");
  const dotLookup2Btn = document.getElementById("dotLookup2");
  const dotLookup3Btn = document.getElementById("dotLookup3");
  const extraDotSection = document.getElementById("extraDotSection");
  const extraDotSection2 = document.getElementById("extraDotSection2");
  const extraDotRadios = Array.from(document.querySelectorAll('input[name="extraDot"]'));
  const extraDotRadios2 = Array.from(document.querySelectorAll('input[name="extraDot2"]'));
  const dashboardToggle = document.getElementById("dashboardToggle");
  const dashboardDropdown = document.getElementById("dashboardDropdown");
  const priorAuthorityFields = document.getElementById("priorAuthorityFields");
  const coverageMetricTypeSelect = document.getElementById("coverageMetricType");
  const coverageReportedInput = document.getElementById("coverageMiles");
  const coveragePremiumInput = document.getElementById("coveragePremium");
  const coverageReportedLabel = document.getElementById("coverageReportedLabel");
  const expirationDateInput = document.getElementById("expirationDate");
  const lossHistoryTableBody = document.getElementById("lossHistoryTableBody");
  const listTerminalsRadios = Array.from(document.querySelectorAll('input[name="listTerminals"]'));
  const terminalsCountWrap = document.getElementById("terminalsCountWrap");
  const terminalsCountSelect = document.getElementById("terminalsCount");
  const terminalsList = document.getElementById("terminalsList");
  const mtcForm = document.getElementById("mtcForm");
  const commoditiesSummaryPrimary = document.getElementById("commoditiesSummaryPrimary");
  const commoditiesSummaryList = document.getElementById("commoditiesSummaryList");

  let lookupSucceeded = false;
  let extraSectionData = [];
  const COMMODITIES_STORAGE_KEY = "fleetidyCommodityMix";

  const visibilityGroups = {
    base: [
      "yearsInBusiness",
      "mcsMileageYear",
      "applicantName",
      "dbaName",
      "powerUnits",
      "drivers",
      "stateAuthority",
      "applicantAddress",
      "applicantCity",
      "applicantState",
      "applicantZip",
      "mailingAddress",
      "mailingCity",
      "mailingState",
      "mailingZip",
      "operationClassification"
    ],
    extra1: [
      "yearsInBusiness2",
      "mcsMileageYear2",
      "extraLegalName",
      "extraDbaName",
      "extraPowerUnits",
      "extraDrivers",
      "extraStateAuthority",
      "extraPhysicalAddress",
      "extraCity",
      "extraState",
      "extraZip",
      "extraMailingAddress",
      "extraMailingCity",
      "extraMailingState",
      "extraMailingZip",
      "extraOperationClassification"
    ],
    extra2: [
      "dotNumber3",
      "yearsInBusiness3",
      "mcsMileageYear3",
      "extra2LegalName",
      "extra2DbaName",
      "extra2PowerUnits",
      "extra2Drivers",
      "extra2StateAuthority",
      "extra2PhysicalAddress",
      "extra2City",
      "extra2State",
      "extra2Zip",
      "extra2MailingAddress",
      "extra2MailingCity",
      "extra2MailingState",
      "extra2MailingZip",
      "extra2OperationClassification"
    ]
  };

  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (!el || value === undefined || value === null) return;
    el.value = value;
  }

  function setFieldVisible(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    const wrapper = el.closest("div");
    if (!wrapper) return;
    wrapper.classList.toggle("hidden", !visible);
  }

  function applyVisibility(groupKey) {
    const ids = visibilityGroups[groupKey] || [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      const hasValue = !!el && !!(el.value || "").trim();
      setFieldVisible(id, hasValue);
    });
  }

  function hideGroup(groupKey) {
    const ids = visibilityGroups[groupKey] || [];
    ids.forEach((id) => setFieldVisible(id, false));
  }

  function renderStatus(panelId, prefix, data) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const hasData = data && (data.dotStatus || data.outOfServiceDate || data.operatingAuthorityStatus);
    panel.classList.toggle("hidden", !hasData);
    if (!hasData) return;
    const statusOK = (data.dotStatus || "").toUpperCase() === "ACTIVE";
    const oosOK = !data.outOfServiceDate || (data.outOfServiceDate || "").toLowerCase() === "none";
    const authOK = (data.operatingAuthorityStatus || "").toLowerCase().startsWith("authorized");

    const setLine = (iconId, textId, ok, label, value) => {
      const icon = document.getElementById(iconId);
      const text = document.getElementById(textId);
      if (!icon || !text) return;
      icon.classList.toggle("bg-emerald-500", ok);
      icon.classList.toggle("bg-rose-500", !ok);
      text.classList.toggle("text-emerald-700", ok);
      text.classList.toggle("text-rose-700", !ok);
      text.textContent = `${label}: ${value || "Unknown"}`;
    };

    setLine(`${prefix}StatusUsdotsIcon`, `${prefix}StatusUsdotsText`, statusOK, "USDOT Status", data.dotStatus || "Unknown");
    setLine(`${prefix}StatusOosIcon`, `${prefix}StatusOosText`, oosOK, "Out of Service Date", data.outOfServiceDate || "None");
    setLine(`${prefix}StatusAuthIcon`, `${prefix}StatusAuthText`, authOK, "Operating Authority Status", data.operatingAuthorityStatus || "Unknown");
  }

  function clearGroupValues(groupKey) {
    const ids = visibilityGroups[groupKey] || [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  function resetAllGroups() {
    ["base", "extra1", "extra2"].forEach((g) => {
      clearGroupValues(g);
      hideGroup(g);
    });
    renderStatus("baseStatusPanel", "base", null);
    renderStatus("extraStatusPanel", "extra", null);
    renderStatus("extra2StatusPanel", "extra2", null);
    extraSectionData = [];
    lookupSucceeded = false;
    updateExtraRadiosAvailability();
    updateExtraSections();
  }

  function toggleDashboardDropdown() {
    if (!dashboardDropdown) return;
    dashboardDropdown.classList.toggle("opacity-0");
    dashboardDropdown.classList.toggle("pointer-events-none");
  }

  function updateExtraLookup2State() {
    if (dotLookup2Btn) {
      dotLookup2Btn.disabled = !(lookupSucceeded && extraSectionData.length >= 1);
    }
    if (dotLookup3Btn) {
      dotLookup3Btn.disabled = !(lookupSucceeded && extraSectionData.length >= 2);
    }
  }

  function updatePriorAuthorityFields() {
    if (!priorAuthorityFields) return;
    const selected = document.querySelector('input[name="priorAuthority"]:checked');
    priorAuthorityFields.classList.toggle("hidden", selected?.value !== "yes");
  }

  function updateCoverageReporting() {
    if (!coverageReportedInput || !coverageReportedLabel) return;
    const type = coverageMetricTypeSelect?.value || "miles";
    if (type === "revenue") {
      coverageReportedLabel.textContent = "Revenue";
      coverageReportedInput.placeholder = "$";
      coverageReportedInput.dataset.fixedUnit = "Revenue";
      sanitizeNumberInput({ target: coverageReportedInput });
    } else {
      coverageReportedLabel.textContent = "Miles";
      coverageReportedInput.placeholder = "Annual miles";
      delete coverageReportedInput.dataset.fixedUnit;
      const digitsOnly = coverageReportedInput.value.replace(/[^0-9]/g, "");
      coverageReportedInput.value = digitsOnly;
    }
  }

  function formatPolicyPeriod(startDate, yearsBack) {
    const parts = (startDate || "").split("-");
    if (parts.length !== 3) return "";
    const [yearStr, monthStr, dayStr] = parts;
    const baseYear = Number(yearStr);
    if (Number.isNaN(baseYear)) return "";
    const startYear = baseYear - yearsBack;
    const endYear = startYear + 1;
    const month = monthStr ? monthStr.padStart(2, "0") : "01";
    const day = dayStr ? dayStr.padStart(2, "0") : "01";
    return `${month}/${day}/${startYear}-${String(endYear).slice(-2)}`;
  }

  function updateLossHistoryPeriods(startDate) {
    if (!lossHistoryTableBody) return;
    const rows = Array.from(lossHistoryTableBody.querySelectorAll("tr"));
    rows.forEach((row, index) => {
      const input = row.querySelector("td input");
      if (!input) return;
      if (!startDate) {
        input.value = "";
        return;
      }
      input.value = formatPolicyPeriod(startDate, index + 1);
    });
  }

  function updateExtraRadiosAvailability() {
    const extra1Ready = lookupSucceeded && extraSectionData.length >= 1;
    extraDotRadios.forEach((radio) => {
      radio.disabled = radio.value === "yes" ? !extra1Ready : false;
    });
    const extra2Ready = lookupSucceeded && extraSectionData.length >= 2;
    extraDotRadios2.forEach((radio) => {
      radio.disabled = radio.value === "yes" ? !extra2Ready : false;
    });
    updateExtraLookup2State();
  }

  function fillBaseFields(base) {
    setInputValue("dotNumber", base.lookupDot || base.dotNumber || "");
    Object.entries(baseFieldMap).forEach(([key, id]) => {
      if (base[key] !== undefined && base[key] !== null) {
        setInputValue(id, base[key]);
      }
    });
    applyVisibility("base");
    renderStatus("baseStatusPanel", "base", base);
  }

  function fillExtraSection(index, data) {
    if (!data) return;
    const map = extraFieldMaps[index];
    if (!map) return;
    Object.entries(map).forEach(([key, id]) => {
      if (data[key] !== undefined && data[key] !== null) {
        setInputValue(id, data[key]);
      }
    });
    applyVisibility(index === 0 ? "extra1" : "extra2");
    if (index === 0) renderStatus("extraStatusPanel", "extra", data);
    if (index === 1) renderStatus("extra2StatusPanel", "extra2", data);
  }

  function updateExtraSections() {
    const firstChecked = document.querySelector('input[name="extraDot"]:checked');
    const showFirst = firstChecked?.value === "yes" && lookupSucceeded && extraSectionData.length >= 1;
    if (extraDotSection) {
      extraDotSection.classList.toggle("hidden", !showFirst);
      if (showFirst) fillExtraSection(0, extraSectionData[0]);
      else hideGroup("extra1");
      if (!showFirst) renderStatus("extraStatusPanel", "extra", null);
    }
    const secondChecked = document.querySelector('input[name="extraDot2"]:checked');
    const showSecond = secondChecked?.value === "yes" && lookupSucceeded && extraSectionData.length >= 2;
    if (extraDotSection2) {
      extraDotSection2.classList.toggle("hidden", !showSecond);
      if (showSecond) fillExtraSection(1, extraSectionData[1]);
      else hideGroup("extra2");
      if (!showSecond) renderStatus("extra2StatusPanel", "extra2", null);
    }
    updateExtraLookup2State();
  }

  function applyMockLookup(dot) {
    const record = mockLookupData[dot];
    if (!record) return false;
    clearGroupValues("base");
    clearGroupValues("extra1");
    clearGroupValues("extra2");
    hideGroup("extra1");
    hideGroup("extra2");
    const baseData = { ...record.base, lookupDot: dot };
    fillBaseFields(baseData);
    extraSectionData = Array.isArray(record.extraDots) ? record.extraDots : [];
    lookupSucceeded = true;
    applyVisibility("base");
    updateExtraRadiosAvailability();
    updateExtraSections();
    return true;
  }

  function handleDotLookupClick(event) {
    event?.preventDefault();
    const dot = (dotInput?.value || "").trim();
    if (!dot) {
      alert("Please enter a DOT Number to lookup.");
      return;
    }
    if (applyMockLookup(dot)) {
      return;
    }
    resetAllGroups();
    alert("Only DOT 123456 is wired for this prototype. Use 123456 to demo the experience.");
  }

  function handleExtraLookup2Click(event) {
    event?.preventDefault();
    if (!lookupSucceeded || extraSectionData.length < 1) return;
    fillExtraSection(0, extraSectionData[0]);
  }

  function handleExtraLookup3Click(event) {
    event?.preventDefault();
    if (!lookupSucceeded || extraSectionData.length < 2) return;
    fillExtraSection(1, extraSectionData[1]);
  }

  function createTerminalCard(index) {
    const card = document.createElement("div");
    card.className = "rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner";
    card.dataset.terminalIndex = String(index);
    card.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-900">Terminal ${index}</h3>
        <span class="text-xs uppercase tracking-[0.3em] text-slate-400">#${index.toString().padStart(2, "0")}</span>
      </div>
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Street Address</label>
            <input name="terminalStreet-${index}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">City</label>
            <input name="terminalCity-${index}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">State</label>
            <select name="terminalState-${index}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
              <option value="">--</option>
              ${STATE_OPTIONS_HTML}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Zip</label>
            <input name="terminalZip-${index}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Terminal Limit</label>
            <input name="terminalLimit-${index}" inputmode="numeric" data-fixed-unit="Revenue" class="terminal-limit-input mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900" placeholder="$" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Construction Type</label>
            <select name="terminalConstruction-${index}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
              <option value="">Select</option>
              <option value="Frame">Frame</option>
              <option value="JM">JM</option>
              <option value="NC">NC</option>
              <option value="MFR">MFR</option>
              <option value="Fire Resistive">Fire Resistive</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Sprinkler System</label>
            <select name="terminalSprinkler-${index}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
              <option value="Fully">Fully Sprinklered</option>
              <option value="Partially">Partially Sprinklered</option>
              <option value="Not Sprinklered">Not Sprinklered</option>
            </select>
          </div>
        </div>
      </div>
    `;
    card.querySelectorAll(".terminal-limit-input").forEach((input) => {
      input.addEventListener("input", sanitizeNumberInput);
    });
    return card;
  }

  function renderTerminalCards(count) {
    if (!terminalsList) return;
    const desired = Math.min(Math.max(Number(count) || 0, 1), 10);
    terminalsList.innerHTML = "";
    for (let i = 1; i <= desired; i += 1) {
      terminalsList.appendChild(createTerminalCard(i));
    }
  }

  function syncTerminalSection() {
    if (!terminalsList) return;
    const wantsTerminals = listTerminalsRadios.find((radio) => radio.checked)?.value === "yes";
    terminalsCountWrap?.classList.toggle("hidden", !wantsTerminals);
    terminalsList.classList.toggle("hidden", !wantsTerminals);
    if (!wantsTerminals) {
      terminalsList.innerHTML = "";
      return;
    }
    const count = terminalsCountSelect?.value || 1;
    renderTerminalCards(count);
  }

  function setLossRowState(row, locked) {
    if (!row) return;
    row.dataset.locked = locked ? "true" : "false";
    const button = row.querySelector(".no-claims-btn");
    const policyInput = row.querySelector(".loss-policy-input");
    const claimsInput = row.querySelector(".loss-claims-input");
    const causeInput = row.querySelector(".loss-cause-input");
    const amountInput = row.querySelector(".lossAmountInput");
    const openSelect = row.querySelector(".loss-open-select");
    const controls = row.querySelectorAll("input:not(.no-claims-btn), select");

    button?.classList.toggle("active", locked);
    button?.setAttribute("aria-pressed", locked ? "true" : "false");
    if (button) button.textContent = locked ? "None" : "Some";

    controls.forEach((control) => {
      if (control.tagName === "SELECT") {
        control.disabled = locked;
      } else {
        control.readOnly = locked;
      }
    });

    if (locked) {
      if (claimsInput) claimsInput.value = "No Losses";
      if (causeInput) causeInput.value = "---";
      if (amountInput) {
        amountInput.value = "";
        sanitizeNumberInput({ target: amountInput });
      }
      if (openSelect) openSelect.value = "no";
    } else {
      if (claimsInput && claimsInput.value === "No Losses") claimsInput.value = "";
      if (causeInput && causeInput.value === "---") causeInput.value = "";
      if (policyInput) policyInput.readOnly = false;
    }
  }

  function initializeLossRows() {
    if (!lossHistoryTableBody) return;
    const rows = Array.from(lossHistoryTableBody.querySelectorAll("tr"));
    rows.forEach((row) => setLossRowState(row, true));
  }

  function handleLossHistoryActions(event) {
    const button = event.target.closest(".no-claims-btn");
    if (!button || !lossHistoryTableBody?.contains(button)) return;
    const row = button.closest("tr");
    if (!row) return;
    const isLocked = row.dataset.locked !== "false";
    setLossRowState(row, !isLocked);
  }

  function loadCommodityStore() {
    try {
      const raw = localStorage.getItem(COMMODITIES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function formatCurrencyDigits(digits) {
    if (!digits) return "";
    const clean = String(digits).replace(/[^0-9]/g, "");
    if (!clean) return "";
    return `$${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }

  function createCommodityChip(entry) {
    if (!entry || !entry.minor || !entry.value) return null;
    const details = [`${entry.value}%`];
    const avgFormatted = formatCurrencyDigits(entry.average);
    const maxFormatted = formatCurrencyDigits(entry.max);
    if (avgFormatted) details.push(`Avg ${avgFormatted}`);
    if (maxFormatted) details.push(`Max ${maxFormatted}`);
    const chip = document.createElement("span");
    chip.className = "inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-base font-semibold text-slate-700";
    chip.textContent = `${entry.minor} (${details.join(" | ")})`;
    if (entry.major) chip.title = entry.major;
    return chip;
  }

  function renderCommoditySummary(store) {
    if (!commoditiesSummaryPrimary || !commoditiesSummaryList) return;
    commoditiesSummaryPrimary.innerHTML = "";
    commoditiesSummaryList.innerHTML = "";
    const entries = Object.values(store || {});
    if (!entries.length) {
      const placeholder = document.createElement("span");
      placeholder.className = "text-slate-500";
      placeholder.textContent = "No commodities entered yet.";
      commoditiesSummaryPrimary.appendChild(placeholder);
      return;
    }
    const [first, ...rest] = entries;
    const firstChip = createCommodityChip(first);
    if (firstChip) commoditiesSummaryPrimary.appendChild(firstChip);
    rest.forEach((entry) => {
      const chip = createCommodityChip(entry);
      if (chip) commoditiesSummaryList.appendChild(chip);
    });
  }

  function refreshCommoditySummary() {
    renderCommoditySummary(loadCommodityStore());
  }

  function formatDisplayDate(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}-${day}-${date.getFullYear()}`;
  }

  const OPERATION_LABELS = {
    dryvan: "Dry Van / Box",
    reefer: "Refrigerated Freight",
    household: "Household Goods",
    flatbed: "Flat Bed",
    oversized: "Oversized / Overweight",
    doubles: "Double Trailers",
    autohauler: "Automobile Hauler",
    containerized: "Containerized Freight",
    mobilehome: "Mobile Home Hauler"
  };

  function collectCarrierTypes() {
    return Array.from(document.querySelectorAll('input[name="carrierType"]:checked')).map((input) => input.value);
  }

  function collectOperations() {
    const values = Array.from(document.querySelectorAll('input[name="opType"]:checked')).map((input) => input.value);
    return values.map((value) => OPERATION_LABELS[value] || value);
  }

  function getRadioValue(name, fallback = "") {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : fallback;
  }

  function formatMetricForStorage(value, unit) {
    const digits = (value || "").replace(/[^0-9]/g, "");
    if (!digits) return "";
    const base = formatDisplayValue(digits, unit === "Revenue" ? "Revenue" : unit);
    if (unit === "Revenue") return base;
    return `${base} ${unit}`;
  }

  function collectCarrierMetrics(selected) {
    const metrics = {};
    if (selected.includes("common")) {
      const unit = document.getElementById("projectedUnit")?.value || "Miles";
      const projected = formatMetricForStorage(document.getElementById("projectedValue")?.value || "", unit);
      const current = formatMetricForStorage(document.getElementById("currentTermValue")?.value || "", unit);
      if (projected || current) metrics.common = { projected, current };
    }
    if (selected.includes("contract")) {
      const unit = document.getElementById("contractUnit")?.value || "Miles";
      const projected = formatMetricForStorage(document.getElementById("contractValue")?.value || "", unit);
      const current = formatMetricForStorage(document.getElementById("currentTermValueContract")?.value || "", unit);
      if (projected || current) metrics.contract = { projected, current };
    }
    if (selected.includes("forwarder")) {
      const projected = formatMetricForStorage(document.getElementById("forwarderRevenueValue")?.value || "", "Revenue");
      const current = formatMetricForStorage(document.getElementById("forwarderRevenueCurrent")?.value || "", "Revenue");
      if (projected || current) metrics.forwarder = { projected, current };
    }
    if (selected.includes("freightbroker")) {
      const projected = formatMetricForStorage(document.getElementById("brokerRevenueValue")?.value || "", "Revenue");
      const current = formatMetricForStorage(document.getElementById("brokerRevenueCurrent")?.value || "", "Revenue");
      if (projected || current) metrics.freightbroker = { projected, current };
    }
    return metrics;
  }

  function collectCoverageHistory() {
    const type = coverageMetricTypeSelect?.value || "miles";
    const typeLabel = coverageMetricTypeSelect?.selectedOptions?.[0]?.textContent?.trim() || "Current Miles";
    const reportedDigits = (coverageReportedInput?.value || "").replace(/[^0-9]/g, "");
    const premiumDigits = (coveragePremiumInput?.value || "").replace(/[^0-9]/g, "");
    const reportedDisplay = reportedDigits
      ? `${formatDisplayValue(reportedDigits, type === "revenue" ? "Revenue" : "Miles")}${type === "miles" ? " Miles" : ""}`
      : "";
    const premiumDisplay = premiumDigits ? formatDisplayValue(premiumDigits, "Revenue") : "";
    return {
      carrier: (document.getElementById("priorCarrier")?.value || "").trim(),
      reportingType: typeLabel,
      reportingUnit: type,
      reportedDisplay,
      premiumDisplay,
      noCurrentCoverage: document.getElementById("noCurrentCarrier")?.checked || false,
      cancelled: getRadioValue("cargoCancelled", "no"),
      bankruptcy: getRadioValue("bankruptcy", "no"),
      priorAuthority: {
        status: getRadioValue("priorAuthority", "no"),
        name: (document.getElementById("priorAuthorityName")?.value || "").trim(),
        dot: (document.getElementById("priorAuthorityDot")?.value || "").trim()
      }
    };
  }

  function collectTerminalsPayload() {
    const wantsTerminals = listTerminalsRadios.some((radio) => radio.checked && radio.value === "yes");
    if (!wantsTerminals || !terminalsList) return [];
    const cards = Array.from(terminalsList.querySelectorAll("[data-terminal-index]"));
    return cards
      .map((card) => {
        const index = card.dataset.terminalIndex;
        const readValue = (name) => (card.querySelector(`[name="${name}-${index}"]`)?.value || "").trim();
        const entry = {
          label: `Terminal ${index}`,
          street: readValue("terminalStreet"),
          city: readValue("terminalCity"),
          state: card.querySelector(`[name="terminalState-${index}"]`)?.value || "",
          zip: readValue("terminalZip"),
          limit: readValue("terminalLimit"),
          construction: card.querySelector(`[name="terminalConstruction-${index}"]`)?.value || "",
          sprinkler: card.querySelector(`[name="terminalSprinkler-${index}"]`)?.value || "Fully"
        };
        const hasData = Object.entries(entry).some(([key, value]) => (key === "label" ? false : Boolean(value)));
        return hasData ? entry : null;
      })
      .filter(Boolean);
  }

  function collectLossHistoryPayload() {
    if (!lossHistoryTableBody) return [];
    return Array.from(lossHistoryTableBody.querySelectorAll("tr")).map((row) => ({
      period: (row.querySelector(".loss-policy-input")?.value || "").trim(),
      claims: (row.querySelector(".loss-claims-input")?.value || "").trim(),
      cause: (row.querySelector(".loss-cause-input")?.value || "").trim(),
      amount: (row.querySelector(".lossAmountInput")?.value || "").trim(),
      open: row.querySelector(".loss-open-select")?.value || "no",
      none: row.dataset.locked !== "false"
    }));
  }

  function collectSecuritySelections(anchorId) {
    const anchor = document.getElementById(anchorId);
    const wrap = anchor?.previousElementSibling;
    if (!wrap) return [];
    const selections = [];
    wrap.querySelectorAll("label").forEach((label) => {
      const input = label.querySelector('input[type="checkbox"]');
      if (!input || !input.checked) return;
      if (input.classList.contains("theft-other-toggle")) {
        const custom = document.getElementById(input.dataset.target || "")?.value?.trim();
        if (custom) selections.push(custom);
        return;
      }
      const text = label.textContent?.replace(/\s+/g, " ").trim();
      if (text) selections.push(text);
    });
    return selections;
  }

  function collectTheftProfilePayload() {
    const unattendedValue = getRadioValue("unattendedVehicles", "no");
    const detachedValue = getRadioValue("detachedTrailers", "no");
    return {
      unattended: {
        answer: unattendedValue === "yes" ? "Yes" : "No",
        detail: (document.getElementById("unattendedDescription")?.value || "").trim()
      },
      detached: {
        answer: detachedValue === "yes" ? "Yes" : "No",
        detail: (document.getElementById("detachedDescription")?.value || "").trim()
      },
      atLocations: collectSecuritySelections("atLocationOther"),
      inTransit: collectSecuritySelections("inTransitOther")
    };
  }

  function collectCommoditiesSnapshot() {
    const store = loadCommodityStore();
    return Object.values(store || {}).map((entry) => ({ ...entry }));
  }

  function loadSubmissions() {
    try {
      const raw = localStorage.getItem(SUBMISSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveSubmissions(records) {
    try {
      localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      // ignore storage write failures
    }
  }

  function generatePolicyNumber() {
    const stamp = Date.now().toString().slice(-6);
    return `APP-${stamp}`;
  }

  function buildSubmissionRecord() {
    const policy = generatePolicyNumber();
    const insured = (document.getElementById("applicantName")?.value || "Pending Submission").trim() || "Pending Submission";
    const effectiveRaw = document.getElementById("inceptionDate")?.value || "";
    const effective = formatDisplayDate(effectiveRaw);
    const agencyName = (document.getElementById("agencyName")?.value || "").trim();
    const agencyContact = (document.getElementById("agentFirstName")?.value || "").trim();
    const agencyEmail = (document.getElementById("agentEmail")?.value || "").trim();
    const agencyAddress = (document.getElementById("agencyAddress")?.value || "").trim();
    const agencyCity = (document.getElementById("agencyCity")?.value || "").trim();
    const agencyState = (document.getElementById("agencyState")?.value || "").trim();
    const agencyZip = (document.getElementById("agencyZip")?.value || "").trim();
    const applicantAddress = (document.getElementById("applicantAddress")?.value || "").trim();
    const applicantCity = (document.getElementById("applicantCity")?.value || "").trim();
    const applicantState = (document.getElementById("applicantState")?.value || "").trim();
    const applicantZip = (document.getElementById("applicantZip")?.value || "").trim();
    const contactEmail = agencyEmail;
    const notes = `Submitted digitally on ${new Date().toLocaleDateString()}.`;
    const cityState = [applicantCity, applicantState].filter(Boolean).join(", ");
    const carrierTypes = collectCarrierTypes();
    const operations = collectOperations();
    const carrierMetrics = collectCarrierMetrics(carrierTypes);
    const coverageHistory = collectCoverageHistory();
    const terminals = collectTerminalsPayload();
    const lossHistory = collectLossHistoryPayload();
    const theftSecurity = collectTheftProfilePayload();
    const commodities = collectCommoditiesSnapshot();
    return {
      policy,
      insured,
      effective,
      status: "New",
      fred: "--",
      contact: agencyContact,
      phone: "",
      email: contactEmail,
      address: applicantAddress,
      cityState,
      zip: applicantZip,
      notes,
      carrierTypes: carrierTypes.length ? carrierTypes : undefined,
      carrierMetrics: Object.keys(carrierMetrics).length ? carrierMetrics : undefined,
      operations: operations.length ? operations : undefined,
      coverageHistory,
      terminals,
      lossHistory,
      theftSecurity,
      commodities,
      agencyName,
      agencyContact,
      agencyEmail,
      agencyPhone: "",
      agencyAddress,
      agencyCity,
      agencyState,
      agencyZip,
    };
  }

  function handleFormSubmit(event) {
    event?.preventDefault();
    const record = buildSubmissionRecord();
    const submissions = loadSubmissions();
    submissions.push(record);
    saveSubmissions(submissions);
    const thankYouUrl = `thank-you.html?policy=${encodeURIComponent(record.policy)}`;
    window.location.href = thankYouUrl;
  }

  function updateInputMode(unit, input) {
    if (!input) return;
    input.setAttribute("inputmode", "numeric");
    input.removeAttribute("pattern");
    if (unit === "Revenue") {
      input.placeholder = "$";
    } else if (unit === "Miles") {
      input.placeholder = "Enter miles";
    } else if (unit === "PUs") {
      input.placeholder = "Enter PUs";
    } else {
      input.placeholder = "Enter value";
    }
  }

  function formatDisplayValue(digits, unit) {
    if (!digits) return "";
    const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (unit === "Revenue") {
      return `$${withCommas}`;
    }
    return withCommas;
  }

  function sanitizeNumberInput(event) {
    if (!event?.target) return;
    const input = event.target;
    const fixedUnit = input.dataset.fixedUnit;
    const unitSource = input.dataset.unitSource;
    const unitSelect = unitSource ? document.getElementById(unitSource) : null;
    const unit = fixedUnit || unitSelect?.value || "Miles";
    const digitsOnly = input.value.replace(/[^0-9]/g, "");
    input.value = formatDisplayValue(digitsOnly, unit);
    updateInputMode(unit, input);
  }

  function handleUnitChange(unitSelectId, unitLabelId, inputs) {
    const selectEl = document.getElementById(unitSelectId);
    const labelEl = document.getElementById(unitLabelId);
    if (!selectEl) return;
    const unit = selectEl.value || "Miles";
    if (labelEl) labelEl.textContent = unit;
    (inputs || []).forEach((inputId) => {
      const el = document.getElementById(inputId);
      if (!el) return;
      const effectiveUnit = el.dataset.fixedUnit || unit;
      updateInputMode(effectiveUnit, el);
      const digitsOnly = el.value.replace(/[^0-9]/g, "");
      el.value = formatDisplayValue(digitsOnly, effectiveUnit);
    });
  }

  function init() {
    extraDotRadios.forEach((radio) => radio.addEventListener("change", updateExtraSections));
    extraDotRadios2.forEach((radio) => radio.addEventListener("change", updateExtraSections));
    dotLookupBtn?.addEventListener("click", handleDotLookupClick);
    dotLookup2Btn?.addEventListener("click", handleExtraLookup2Click);
    dotLookup3Btn?.addEventListener("click", handleExtraLookup3Click);
    const unitConfigs = [
      { select: "projectedUnit", label: "currentTermUnit", inputs: ["projectedValue", "currentTermValue"] },
      { select: "contractUnit", label: "currentTermUnitContract", inputs: ["contractValue", "currentTermValueContract"] },
    ];

    unitConfigs.forEach((cfg) => {
      const selectEl = document.getElementById(cfg.select);
      selectEl?.addEventListener("change", () => handleUnitChange(cfg.select, cfg.label, cfg.inputs));
      cfg.inputs.forEach((inputId) => {
        const inputEl = document.getElementById(inputId);
        inputEl?.addEventListener("input", sanitizeNumberInput);
      });
      handleUnitChange(cfg.select, cfg.label, cfg.inputs);
    });
    // Fixed unit (revenue-only) inputs
    ["forwarderRevenueValue", "forwarderRevenueCurrent", "brokerRevenueValue", "brokerRevenueCurrent"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", sanitizeNumberInput);
    });
    handleUnitChange("contractUnit", "currentTermUnitContract", ["forwarderRevenueValue", "forwarderRevenueCurrent", "brokerRevenueValue", "brokerRevenueCurrent"]);
    document.querySelectorAll('input[name="priorAuthority"]').forEach((radio) => {
      radio.addEventListener("change", updatePriorAuthorityFields);
    });
    dashboardToggle?.addEventListener("click", toggleDashboardDropdown);
    const inceptionInput = document.getElementById("inceptionDate");

    inceptionInput?.addEventListener("change", (event) => {
      const value = event.target.value;
      if (!value) {
        if (expirationDateInput) expirationDateInput.value = "";
        updateLossHistoryPeriods(null);
        return;
      }
      const parts = value.split("-");
      if (parts.length !== 3) return;
      const [yearStr, monthStr, dayStr] = parts;
      const nextYear = Number(yearStr) + 1;
      if (!Number.isNaN(nextYear) && expirationDateInput) {
        const tentative = new Date(`${nextYear}-${monthStr}-${dayStr}T00:00:00`);
        const monthIndex = Number(monthStr);
        if (!Number.isNaN(tentative.getTime()) && tentative.getMonth() + 1 === monthIndex) {
          expirationDateInput.value = `${tentative.getFullYear()}-${String(tentative.getMonth() + 1).padStart(2, "0")}-${String(tentative.getDate()).padStart(2, "0")}`;
        } else {
          const fallback = new Date(nextYear, monthIndex, 0);
          expirationDateInput.value = `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;
        }
      }
      updateLossHistoryPeriods(value);
    });
    coverageReportedInput?.addEventListener("input", sanitizeNumberInput);
    coveragePremiumInput?.addEventListener("input", sanitizeNumberInput);
    coverageMetricTypeSelect?.addEventListener("change", updateCoverageReporting);
    updateCoverageReporting();
    lossHistoryTableBody?.querySelectorAll(".lossAmountInput").forEach((input) => input.addEventListener("input", sanitizeNumberInput));
    lossHistoryTableBody?.addEventListener("click", handleLossHistoryActions);
    initializeLossRows();
    document.querySelectorAll(".theft-toggle").forEach((radio) => {
      radio.addEventListener("change", handleTheftToggle);
    });
    document.querySelectorAll(".theft-other-toggle").forEach((checkbox) => {
      checkbox.addEventListener("change", handleTheftOtherToggle);
    });
    refreshCommoditySummary();
    window.addEventListener("storage", (event) => {
      if (event.key === COMMODITIES_STORAGE_KEY) {
        refreshCommoditySummary();
      }
    });
    listTerminalsRadios.forEach((radio) => radio.addEventListener("change", syncTerminalSection));
    terminalsCountSelect?.addEventListener("change", syncTerminalSection);
    syncTerminalSection();
    hideGroup("base");
    hideGroup("extra1");
    hideGroup("extra2");
    renderStatus("baseStatusPanel", "base", null);
    renderStatus("extraStatusPanel", "extra", null);
    renderStatus("extra2StatusPanel", "extra2", null);
    updateExtraRadiosAvailability();
    updatePriorAuthorityFields();
    updateExtraSections();
    mtcForm?.addEventListener("submit", handleFormSubmit);
  }

  init();
})();
  function handleTheftToggle(event) {
    const targetId = event.target.dataset.target;
    if (!targetId) return;
    const textarea = document.getElementById(targetId);
    if (!textarea) return;
    const isYes = event.target.value === "yes";
    textarea.readOnly = !isYes;
    if (!isYes) {
      textarea.value = "";
      textarea.classList.add("bg-slate-50");
      textarea.classList.remove("textarea-active");
    } else {
      textarea.classList.remove("bg-slate-50");
      textarea.classList.add("textarea-active");
    }
  }

  function handleTheftOtherToggle(event) {
    const targetId = event.target.dataset.target;
    if (!targetId) return;
    const input = document.getElementById(targetId);
    if (!input) return;
    if (event.target.checked) {
      input.classList.remove("hidden");
      input.classList.add("textarea-active");
    } else {
      input.classList.add("hidden");
      input.classList.remove("textarea-active");
      input.value = "";
    }
  }
