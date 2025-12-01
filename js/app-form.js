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

  let lookupSucceeded = false;
  let extraSectionData = [];

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

  function init() {
    extraDotRadios.forEach((radio) => radio.addEventListener("change", updateExtraSections));
    extraDotRadios2.forEach((radio) => radio.addEventListener("change", updateExtraSections));
    dotLookupBtn?.addEventListener("click", handleDotLookupClick);
    dotLookup2Btn?.addEventListener("click", handleExtraLookup2Click);
    dotLookup3Btn?.addEventListener("click", handleExtraLookup3Click);
    dashboardToggle?.addEventListener("click", toggleDashboardDropdown);
    hideGroup("base");
    hideGroup("extra1");
    hideGroup("extra2");
    renderStatus("baseStatusPanel", "base", null);
    renderStatus("extraStatusPanel", "extra", null);
    renderStatus("extra2StatusPanel", "extra2", null);
    updateExtraRadiosAvailability();
    updateExtraSections();
  }

  init();
})();
