(() => {
  const params = new URLSearchParams(window.location.search);
  const policyParam = params.get("policy");
  const STATUS_STORAGE_KEY = "fleetidyStatusOverrides";
  const SUBMISSION_STORAGE_KEY = "fleetidySubmittedApplications";
  let statusOverrides = {};

  function loadStatusOverrides() {
    try {
      const raw = localStorage.getItem(STATUS_STORAGE_KEY);
      statusOverrides = raw ? JSON.parse(raw) : {};
    } catch (err) {
      statusOverrides = {};
    }
  }

  function persistStatusOverride(policy, status) {
    statusOverrides[policy] = status;
    try {
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusOverrides));
    } catch (err) {
      // ignore write failures (storage might be full or disabled)
    }
  }

  const baseRecords = [
    { policy: "MTC-10234", effective: "07-01-2024", insured: "Summit Freight Lines", fred: "B+", status: "Bound", contact: "Alex Morgan", phone: "(555) 111-2200", email: "amorgan@summitfreight.com", address: "123 Summit Ave", cityState: "Denver, CO", zip: "80202", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 24 | Drivers: 26"], notes: "Low loss frequency; favorable inspection history. Continue monitoring crash indicator." },
    { policy: "MTC-10235", effective: "06-15-2024", insured: "Riverfront Logistics LLC", fred: "B", status: "Working", contact: "Jamie Lee", phone: "(555) 222-3300", email: "jlee@riverfrontlogistics.com", address: "88 Riverside Pkwy", cityState: "St. Louis, MO", zip: "63101", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 14 | Drivers: 15"], notes: "Awaiting revised driver schedule and safety manual acknowledgement." },
    { policy: "MTC-10236", effective: "08-01-2024", insured: "Metro Cargo Partners", fred: "B-", status: "New", contact: "Morgan Diaz", phone: "(555) 333-4400", email: "mdiaz@metrocargo.com", address: "410 Market St", cityState: "Dallas, TX", zip: "75201", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 9 | Drivers: 9"], notes: "New submission; need loss runs and updated equipment list." },
    { policy: "MTC-10237", effective: "08-15-2024", insured: "Highway Haulers Inc.", fred: "B", status: "Bound", contact: "Taylor Shaw", phone: "(555) 444-5500", email: "tshaw@highwayhaulers.com", address: "732 Sunset Blvd", cityState: "Los Angeles, CA", zip: "90017", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 18 | Drivers: 19"], notes: "Bound pending binder delivery; certificate instructions on file." },
    { policy: "MTC-10238", effective: "08-20-2024", insured: "Blue Ridge Freight", fred: "B+", status: "Bound", contact: "Avery Chen", phone: "(555) 777-8800", email: "achen@blueridgefreight.com", address: "455 Ridge Rd", cityState: "Asheville, NC", zip: "28801", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 16 | Drivers: 17"], notes: "Strong regional focus; continue quarterly review of inspection trends." },
    { policy: "MTC-10239", effective: "09-01-2024", insured: "Crosswind Logistics", fred: "B", status: "Quoted", contact: "Jordan Ellis", phone: "(555) 555-6600", email: "jellis@crosswindlogistics.com", address: "54 Harbor Way", cityState: "Savannah, GA", zip: "31401", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 12 | Drivers: 13"], notes: "Quote delivered; awaiting broker feedback on deductible options." },
    { policy: "MTC-10240", effective: "09-05-2024", insured: "Iron Peak Carriers", fred: "B-", status: "Dead", contact: "Chris Patel", phone: "(555) 888-9900", email: "cpatel@ironpeak.com", address: "98 Forge Ave", cityState: "Pittsburgh, PA", zip: "15222", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 11 | Drivers: 11"], notes: "Declined by insured after competing quote; keep on watchlist." },
    { policy: "MTC-10241", effective: "09-12-2024", insured: "Harborline Transport", fred: "A-", status: "Issued", contact: "Sam Carter", phone: "(555) 666-7700", email: "scarter@harborline.com", address: "210 Pier Ave", cityState: "Seattle, WA", zip: "98101", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 22 | Drivers: 23"], notes: "Policy issued; monitor first 90 days for driver turnover." },
    { policy: "MTC-10242", effective: "09-20-2024", insured: "Frontier Freightways", fred: "B", status: "Working", contact: "Pat Rivers", phone: "(555) 123-8800", email: "privers@frontierfreight.com", address: "12 Meadow Ln", cityState: "Boise, ID", zip: "83702", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 10 | Drivers: 11"], notes: "Waiting on updated MVR pulls for two new drivers." },
    { policy: "MTC-10243", effective: "09-28-2024", insured: "Evergreen Cargo", fred: "B+", status: "Bound", contact: "Dana Brooks", phone: "(555) 134-2200", email: "dbrooks@evergreencargo.com", address: "301 Pine St", cityState: "Portland, OR", zip: "97204", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 20 | Drivers: 21"], notes: "Bound with deductible buyback endorsement; review in 6 months." },
    { policy: "MTC-10244", effective: "10-02-2024", insured: "Western Range Lines", fred: "B", status: "Dead", contact: "Riley Price", phone: "(555) 145-3300", email: "rprice@westernrange.com", address: "44 Range Rd", cityState: "Cheyenne, WY", zip: "82001", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 9 | Drivers: 9"], notes: "Declined due to pricing; revisit at renewal." },
    { policy: "MTC-10245", effective: "10-10-2024", insured: "Tri-State Haulage", fred: "B", status: "Bound", contact: "Drew Morgan", phone: "(555) 156-4400", email: "dmorgan@tristatehaul.com", address: "901 Central Blvd", cityState: "Cincinnati, OH", zip: "45202", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 14 | Drivers: 15"], notes: "Mid-term telematics install scheduled; monitor speeding violations." },
    { policy: "MTC-10246", effective: "10-15-2024", insured: "Silver Creek Freight", fred: "A-", status: "Issued", contact: "Morgan Payne", phone: "(555) 167-5500", email: "mpayne@silvercreekfreight.com", address: "77 Creekside Dr", cityState: "Salt Lake City, UT", zip: "84101", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 18 | Drivers: 18"], notes: "Issued; mid-term review in 90 days for loss control compliance." },
    { policy: "MTC-10247", effective: "10-22-2024", insured: "Midwest Carrier Group", fred: "B", status: "Working", contact: "Jordan Smith", phone: "(555) 178-6600", email: "jsmith@midwestcarriers.com", address: "600 Rail Ave", cityState: "Omaha, NE", zip: "68102", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 13 | Drivers: 14"], notes: "Awaiting loss runs from prior carrier; provisional terms shared." },
    { policy: "MTC-10248", effective: "11-01-2024", insured: "Atlas Road Transport", fred: "B+", status: "Bound", contact: "Sydney Clark", phone: "(555) 189-7700", email: "sclark@atlasroad.com", address: "45 Atlas Blvd", cityState: "Phoenix, AZ", zip: "85004", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 21 | Drivers: 22"], notes: "Bound with fleet safety incentives; share quarterly performance." },
    { policy: "MTC-10249", effective: "11-08-2024", insured: "Coastal Freight Lines", fred: "B-", status: "Quoted", contact: "Taylor Reed", phone: "(555) 190-8800", email: "treed@coastalfreight.com", address: "18 Ocean Dr", cityState: "Charleston, SC", zip: "29401", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 12 | Drivers: 12"], notes: "Quoted with wind/hail sublimit; broker reviewing." },
    { policy: "MTC-10250", effective: "11-15-2024", insured: "Liberty Logistics", fred: "B", status: "Bound", contact: "Casey Jordan", phone: "(555) 201-9900", email: "cjordan@libertylogistics.com", address: "20 Liberty Way", cityState: "Richmond, VA", zip: "23219", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 15 | Drivers: 16"], notes: "Bound; driver safety bonus implemented Q1." },
    { policy: "MTC-10251", effective: "11-22-2024", insured: "Red Oak Transport", fred: "B", status: "Working", contact: "Jamie Patel", phone: "(555) 212-1100", email: "jpatel@redoaktransport.com", address: "300 Oak St", cityState: "Austin, TX", zip: "78701", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 11 | Drivers: 12"], notes: "Working; need valuation of high-value loads." },
    { policy: "MTC-10252", effective: "12-01-2024", insured: "Beacon Freight", fred: "A-", status: "Issued", contact: "Morgan Lee", phone: "(555) 223-2200", email: "mlee@beaconfreight.com", address: "9 Beacon Hill", cityState: "Boston, MA", zip: "02108", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 17 | Drivers: 18"], notes: "Issued; schedule mid-term loss control visit." },
    { policy: "MTC-10253", effective: "12-08-2024", insured: "Northeast Freightways", fred: "B", status: "Dead", contact: "Alex Kim", phone: "(555) 234-3300", email: "akim@nefreightways.com", address: "82 Market St", cityState: "Newark, NJ", zip: "07102", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 8 | Drivers: 8"], notes: "Declined; pricing not competitive this term." },
    { policy: "MTC-10254", effective: "12-15-2024", insured: "Prairie Line Logistics", fred: "B+", status: "Bound", contact: "Taylor Brooks", phone: "(555) 245-4400", email: "tbrooks@prairieline.com", address: "74 Prairie Ave", cityState: "Sioux Falls, SD", zip: "57104", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 12 | Drivers: 13"], notes: "Bound; add quarterly CSA review to service plan." },
    { policy: "MTC-10255", effective: "12-22-2024", insured: "Pacific Crest Cargo", fred: "B", status: "Quoted", contact: "Jordan Hall", phone: "(555) 256-5500", email: "jhall@paccrestcargo.com", address: "501 Crest Blvd", cityState: "San Diego, CA", zip: "92101", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 10 | Drivers: 11"], notes: "Quoted with higher theft deductible near ports." },
    { policy: "MTC-10256", effective: "12-29-2024", insured: "Great Lakes Freight", fred: "B-", status: "Dead", contact: "Avery Long", phone: "(555) 267-6600", email: "along@greatlakesfreight.com", address: "28 Harbor Loop", cityState: "Cleveland, OH", zip: "44114", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 9 | Drivers: 9"], notes: "Declined due to loss history; revisit after corrective actions." },
    { policy: "MTC-10257", effective: "01-05-2025", insured: "Summit Peak Transport", fred: "A-", status: "Issued", contact: "Casey Young", phone: "(555) 278-7700", email: "cyoung@summitpeak.com", address: "10 Summit Peak Rd", cityState: "Bozeman, MT", zip: "59715", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 13 | Drivers: 14"], notes: "Issued; add winter weather driver training follow-up." },
    { policy: "MTC-10258", effective: "01-12-2025", insured: "Canyon Ridge Logistics", fred: "B+", status: "Working", contact: "Jamie Woods", phone: "(555) 289-8800", email: "jwoods@canyonridge.com", address: "59 Ridge Rd", cityState: "Flagstaff, AZ", zip: "86001", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 10 | Drivers: 10"], notes: "Working; clarify radius exposure and reefer usage." },
    { policy: "MTC-10259", effective: "01-20-2025", insured: "Heritage Cargo Co.", fred: "B", status: "Bound", contact: "Riley Adams", phone: "(555) 290-9900", email: "radams@heritagecargo.com", address: "15 Heritage Pl", cityState: "Nashville, TN", zip: "37201", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 11 | Drivers: 12"], notes: "Bound; track onboarding of two trainee drivers." },
    { policy: "MTC-10260", effective: "01-28-2025", insured: "Lakeshore Logistics", fred: "B-", status: "Dead", contact: "Morgan Blake", phone: "(555) 301-1100", email: "mblake@lakeshorelogistics.com", address: "66 Shoreline Dr", cityState: "Milwaukee, WI", zip: "53202", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 8 | Drivers: 8"], notes: "Declined; deferred due to adverse losses." },
    { policy: "MTC-10261", effective: "02-04-2025", insured: "Blue Horizon Hauling", fred: "B", status: "New", contact: "Avery Stone", phone: "(555) 312-2200", email: "astone@bluehorizon.com", address: "101 Skyline Ave", cityState: "Raleigh, NC", zip: "27601", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 7 | Drivers: 7"], notes: "New lead; awaiting full submission from broker." },
    { policy: "MTC-10262", effective: "02-12-2025", insured: "Pioneer Freight Co.", fred: "B+", status: "Working", contact: "Jordan White", phone: "(555) 323-3300", email: "jwhite@pioneerfreight.com", address: "22 Pioneer Rd", cityState: "Billings, MT", zip: "59101", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 12 | Drivers: 12"], notes: "Working; waiting on equipment list confirmation." },
    { policy: "MTC-10263", effective: "02-20-2025", insured: "Evergreen Express", fred: "A-", status: "Issued", contact: "Taylor Green", phone: "(555) 334-4400", email: "tgreen@evergreenexpress.com", address: "14 Evergreen Way", cityState: "Spokane, WA", zip: "99201", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 19 | Drivers: 20"], notes: "Issued; add quarterly CSA check-ins." },
    { policy: "MTC-10264", effective: "03-01-2025", insured: "Valley Transport", fred: "B-", status: "Quoted", contact: "Casey Morgan", phone: "(555) 345-5500", email: "cmorgan@valleytransport.com", address: "72 Valley Blvd", cityState: "Fresno, CA", zip: "93721", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 10 | Drivers: 10"], notes: "Quoted; broker reviewing per-load pricing addendum." },
    { policy: "MTC-10265", effective: "03-08-2025", insured: "Northern Reach Logistics", fred: "B+", status: "Bound", contact: "Jordan King", phone: "(555) 356-6600", email: "jking@northernreach.com", address: "19 Northline Ave", cityState: "Minneapolis, MN", zip: "55401", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 13 | Drivers: 13"], notes: "Bound; plan spring safety ride-alongs." },
    { policy: "MTC-10266", effective: "03-15-2025", insured: "Arrowhead Freight", fred: "B", status: "Dead", contact: "Alexis Fox", phone: "(555) 367-7700", email: "afox@arrowheadfreight.com", address: "808 Arrowhead Rd", cityState: "Tulsa, OK", zip: "74103", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 9 | Drivers: 9"], notes: "Declined by insured; keep marketing notes for renewal." },
    { policy: "MTC-10267", effective: "03-22-2025", insured: "Sunrise Carriers", fred: "B+", status: "New", contact: "Chris Lane", phone: "(555) 378-8800", email: "clane@sunrisecarriers.com", address: "303 Sunrise Pkwy", cityState: "Orlando, FL", zip: "32801", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 8 | Drivers: 8"], notes: "New submission; waiting on safety questionnaire." },
    { policy: "MTC-10268", effective: "03-29-2025", insured: "Redwood Hauling", fred: "A-", status: "Bound", contact: "Morgan Tate", phone: "(555) 389-9900", email: "mtate@redwoodhauling.com", address: "150 Redwood St", cityState: "Eureka, CA", zip: "95501", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 16 | Drivers: 17"], notes: "Bound; schedule initial loss control visit." },
    { policy: "MTC-10269", effective: "04-05-2025", insured: "Everline Transport", fred: "B", status: "Issued", contact: "Avery Quinn", phone: "(555) 390-1010", email: "aquinn@everlinetransport.com", address: "200 Everline Rd", cityState: "Kansas City, MO", zip: "64106", snapshot: ["USDOT Status: ACTIVE", "Operating Authority: Authorized - Contract", "Power Units: 11 | Drivers: 11"], notes: "Issued; confirm filing receipt with broker." },
  ];

  loadStatusOverrides();

  function loadSubmissionRecords() {
    try {
      const raw = localStorage.getItem(SUBMISSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  const records = baseRecords.concat(loadSubmissionRecords());
  const record = records.find((r) => r.policy === policyParam) || records[0];
  if (record && statusOverrides[record.policy]) {
    record.status = statusOverrides[record.policy];
  }

  function digitsOnly(value) {
    if (typeof value === "number") return Math.max(0, Math.floor(value)).toString();
    return String(value || "").replace(/[^0-9]/g, "");
  }

  function formatNumber(value) {
    const digits = digitsOnly(value);
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatCurrencyDisplay(value) {
    const formatted = formatNumber(value);
    return formatted ? `$${formatted}` : "";
  }

  function formatMilesDisplay(value) {
    const formatted = formatNumber(value);
    return formatted ? `${formatted} Miles` : "";
  }

  function numericSeed(rec) {
    const digits = String(rec?.policy || "").replace(/[^0-9]/g, "");
    if (!digits) return 0;
    return digits.split("").reduce((sum, digit) => sum + Number(digit), 0);
  }

  function pickFromList(list, seed) {
    if (!Array.isArray(list) || !list.length) return "";
    return list[seed % list.length];
  }

  function normalizeYesNo(value, fallback = "no") {
    if (value === "yes" || value === "no") return value;
    return fallback;
  }

  function buildDefaultCoverage(rec) {
    const seed = numericSeed(rec);
    const carriers = ["Summit Mutual", "HarborPoint Casualty", "Coastal Assurance", "Ironwood Risk Partners", "Beacon Underwriters"];
    const revenueUnit = seed % 3 === 0;
    return {
      carrier: pickFromList(carriers, seed) || "Summit Mutual",
      reportingType: revenueUnit ? "Current Revenue" : "Current Miles",
      reportingUnit: revenueUnit ? "revenue" : "miles",
      reportedDisplay: revenueUnit ? formatCurrencyDisplay(800000 + seed * 3200) : formatMilesDisplay(120000 + seed * 900),
      premiumDisplay: formatCurrencyDisplay(75000 + (seed % 8) * 4500),
      noCurrentCoverage: false,
      cancelled: seed % 5 === 0 ? "yes" : "no",
      bankruptcy: seed % 7 === 0 ? "yes" : "no",
      priorAuthority: seed % 4 === 0
        ? { status: "yes", name: `${(rec.insured || "Legacy").split(" ")[0]} Logistics`, dot: `USDOT ${500000 + seed}` }
        : { status: "no", name: "", dot: "" }
    };
  }

  function normalizeCoverageHistory(rec) {
    const defaults = buildDefaultCoverage(rec);
    const existing = rec.coverageHistory || {};
    const prior = existing.priorAuthority || {};
    return {
      carrier: existing.carrier || defaults.carrier,
      reportingType: existing.reportingType || defaults.reportingType,
      reportingUnit: existing.reportingUnit || defaults.reportingUnit,
      reportedDisplay: existing.reportedDisplay || defaults.reportedDisplay,
      premiumDisplay: existing.premiumDisplay || defaults.premiumDisplay,
      noCurrentCoverage: Boolean(existing.noCurrentCoverage),
      cancelled: normalizeYesNo(existing.cancelled, defaults.cancelled),
      bankruptcy: normalizeYesNo(existing.bankruptcy, defaults.bankruptcy),
      priorAuthority: {
        status: normalizeYesNo(prior.status, defaults.priorAuthority.status),
        name: prior.name || defaults.priorAuthority.name,
        dot: prior.dot || defaults.priorAuthority.dot,
      }
    };
  }

  function buildDefaultTerminals(rec) {
    const seed = numericSeed(rec);
    const [primaryCity, primaryState] = (rec.cityState || "Columbus, OH").split(",").map((part) => part.trim());
    const altLocations = [
      { city: "Kansas City", state: "MO" },
      { city: "Atlanta", state: "GA" },
      { city: "Memphis", state: "TN" },
      { city: "Chicago", state: "IL" },
      { city: "Dallas", state: "TX" }
    ];
    const alt = pickFromList(altLocations, seed) || altLocations[0];
    return [
      {
        label: `${primaryCity || "Primary"} Terminal`,
        street: rec.address || `${300 + (seed % 60)} Commerce Park Dr`,
        city: primaryCity || alt.city,
        state: primaryState || alt.state,
        zip: rec.zip || `${43000 + (seed % 900)}`,
        limit: formatCurrencyDisplay(450000 + seed * 5500),
        construction: seed % 2 === 0 ? "Fire Resistive" : "MFR",
        sprinkler: seed % 3 === 0 ? "Partially" : "Fully"
      },
      {
        label: `${alt.city} Yard`,
        street: `${150 + (seed % 80)} Logistics Way`,
        city: alt.city,
        state: alt.state,
        zip: `${60000 + (seed % 1000)}`,
        limit: formatCurrencyDisplay(280000 + seed * 4200),
        construction: seed % 4 === 0 ? "NC" : "Frame",
        sprinkler: seed % 5 === 0 ? "Not Sprinklered" : "Fully"
      }
    ];
  }

  function buildDefaultLossHistory(rec) {
    const seed = numericSeed(rec);
    const [month = "01", day = "01", yearStr = "2024"] = (rec.effective || "01-01-2024").split("-");
    const effectiveYear = parseInt(yearStr, 10) || 2024;
    const causes = ["Theft - Yard", "Collision - Rollover", "Weather - Hail", "Reefer Breakdown"];
    const amounts = ["$15,000", "$28,500", "$46,750", "$82,400"];
    const rows = [];
    for (let i = 0; i < 5; i += 1) {
      const startYear = effectiveYear - (i + 1);
      const endYear = startYear + 1;
      const period = `${month}/${day}/${startYear}-${String(endYear).slice(-2)}`;
      const none = (i + seed) % 2 === 0;
      if (none) {
        rows.push({ period, claims: "No Losses", cause: "---", amount: "--", open: "no", none: true });
      } else {
        rows.push({
          period,
          claims: String(((i + seed) % 3) + 1),
          cause: causes[(i + seed) % causes.length],
          amount: amounts[(i + seed) % amounts.length],
          open: (i + seed) % 3 === 0 ? "yes" : "no",
          none: false,
        });
      }
    }
    return rows;
  }

  function buildDefaultTheftSecurity(rec) {
    const seed = numericSeed(rec);
    return {
      unattended: seed % 3 === 0 ? { answer: "Yes", detail: "Only while staged inside fenced yards." } : { answer: "No", detail: "" },
      detached: seed % 4 === 0 ? { answer: "Yes", detail: "Occasional port storage with roving guards." } : { answer: "No", detail: "" },
      atLocations: seed % 2 === 0 ? ["Fenced Lot", "Security Guards", "Cameras"] : ["Fenced Lot", "Inside Secure Building"],
      inTransit: seed % 5 === 0 ? ["GPS Device", "Vehicle Theft Alarm", "Other: Remote disable"] : ["GPS Device", "Vehicle Theft Alarm"],
    };
  }

  function buildDefaultCommodities(rec) {
    const seed = numericSeed(rec);
    const categories = [
      { major: "Agricultural Commodities", minor: "Row Crops" },
      { major: "Consumer Packaged Goods", minor: "Household Essentials" },
      { major: "Electronics & Technology", minor: "Consumer Electronics" },
      { major: "Industrial Machinery", minor: "Construction Equipment" },
      { major: "Retail & E-Commerce", minor: "General Merchandise" }
    ];
    const primary = categories[seed % categories.length];
    const secondary = categories[(seed + 1) % categories.length];
    return [
      { ...primary, value: "45", average: String(45000 + seed * 250), max: String(88000 + seed * 300) },
      { ...secondary, value: "55", average: String(36000 + seed * 200), max: String(76000 + seed * 240) }
    ];
  }

  function applyDefaults(rec) {
    const defaultCarrierTypes = ["common", "contract"];
    const defaultCarrierMetrics = {
      common: { projected: "120,000 Miles", current: "95,000 Miles" },
      contract: { projected: "$1,250,000 Revenue", current: "$1,050,000 Revenue" },
      forwarder: { projected: "$480,000 Revenue", current: "$410,000 Revenue" },
      freightbroker: { projected: "$220,000 Revenue", current: "$180,000 Revenue" },
    };
    const defaultOperations = ["Dry Van / Box", "Refrigerated Freight", "Flat Bed"];

    rec.agencyName = rec.agencyName || "Summit Risk Partners";
    rec.agencyContact = rec.agencyContact || "Jane DeBlazio";
    rec.agencyEmail = rec.agencyEmail || "jane@summitrisk.com";
    rec.agencyPhone = rec.agencyPhone || "(555) 222-8800";
    rec.agencyAddress = rec.agencyAddress || "200 Capital Ave";
    rec.agencyCity = rec.agencyCity || "Columbus";
    rec.agencyState = rec.agencyState || "OH";
    rec.agencyZip = rec.agencyZip || "43215";
    rec.notes = rec.notes || "--";
    rec.carrierTypes = Array.isArray(rec.carrierTypes) && rec.carrierTypes.length ? rec.carrierTypes : defaultCarrierTypes;
    rec.carrierMetrics = rec.carrierMetrics || {};
    rec.carrierTypes.forEach((type) => {
      if (!rec.carrierMetrics[type] && defaultCarrierMetrics[type]) {
        rec.carrierMetrics[type] = defaultCarrierMetrics[type];
      }
    });
    rec.operations = Array.isArray(rec.operations) && rec.operations.length ? rec.operations : defaultOperations;
    rec.coverageHistory = normalizeCoverageHistory(rec);
    if (!Array.isArray(rec.terminals)) {
      rec.terminals = buildDefaultTerminals(rec);
    }
    if (!Array.isArray(rec.lossHistory) || !rec.lossHistory.length) {
      rec.lossHistory = buildDefaultLossHistory(rec);
    }
    if (!rec.theftSecurity) {
      rec.theftSecurity = buildDefaultTheftSecurity(rec);
    }
    if (!Array.isArray(rec.commodities) || !rec.commodities.length) {
      rec.commodities = buildDefaultCommodities(rec);
    }
    rec.snapshot = Array.isArray(rec.snapshot) ? rec.snapshot : [];
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  function renderStatus(status) {
    const el = document.getElementById("detailStatusPill");
    if (!el) return;
    const map = {
      Bound: "bg-emerald-50 text-emerald-700",
      Issued: "bg-teal-50 text-teal-700",
      Quoted: "bg-sky-50 text-sky-700",
      Working: "bg-amber-50 text-amber-700",
      New: "bg-blue-50 text-blue-700",
      Dead: "bg-rose-50 text-rose-700",
    };
    const dotMap = {
      Bound: "bg-emerald-500",
      Issued: "bg-teal-500",
      Quoted: "bg-sky-500",
      Working: "bg-amber-400",
      New: "bg-blue-500",
      Dead: "bg-rose-500",
    };
    const color = map[status] || "bg-slate-100 text-slate-700";
    const dot = dotMap[status] || "bg-slate-400";
    el.className = `inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${color}`;
    const dotEl = el.querySelector("span");
    if (dotEl) dotEl.className = `h-2 w-2 rounded-full ${dot}`;
    setText("detailStatus", status);
  }

  function renderSnapshot(list = []) {
    const ul = document.getElementById("detailSnapshot");
    if (!ul) return;
    ul.innerHTML = "";
    list.forEach((item) => {
      const chip = document.createElement("span");
      const lower = item.toLowerCase();
      let color = "bg-slate-100 text-slate-700";
      if (lower.includes("operating authority")) {
        color = lower.includes("authorized") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
      } else if (lower.includes("usdot status")) {
        color = lower.includes("active") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
      }
      chip.className = `inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${color}`;
      chip.textContent = item;
      ul.appendChild(chip);
    });
  }

  function renderCarrierTypes(list = []) {
    const wrap = document.getElementById("detailCarrierTypes");
    if (!wrap) return;
    wrap.innerHTML = "";
    const labelMap = {
      common: "Common Carrier",
      contract: "Contract Carrier",
      forwarder: "Freight Forwarder",
      freightbroker: "Freight Broker",
    };
    list.forEach((key) => {
      const chip = document.createElement("span");
      chip.className = "inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700";
      chip.textContent = labelMap[key] || key;
      wrap.appendChild(chip);
    });
  }

  function renderCarrierMetrics(metrics = {}, types = []) {
    const container = document.getElementById("detailCarrierMetrics");
    if (!container) return;
    container.innerHTML = "";
    const order = ["common", "contract", "forwarder", "freightbroker"];
    const labelMap = {
      common: "Common Carrier",
      contract: "Contract Carrier",
      forwarder: "Freight Forwarder",
      freightbroker: "Freight Broker",
    };
    order.forEach((key) => {
      if (!types.includes(key) || !metrics[key]) return;
      const projected = metrics[key].projected || "--";
      const current = metrics[key].current || "--";
      const row = document.createElement("div");
      row.className = "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3";
      const left = document.createElement("div");
      left.className = "flex items-center gap-2 text-slate-700";
      left.innerHTML = `<span class="h-2 w-2 rounded-full bg-slate-500"></span><span class="font-semibold">${labelMap[key] || key}</span><span class="text-slate-500">Projected: ${projected}</span>`;
      const right = document.createElement("div");
      right.className = "text-slate-700";
      right.textContent = `Current: ${current}`;
      row.append(left, right);
      container.appendChild(row);
    });
  }

  function renderOperations(list = []) {
    const wrap = document.getElementById("detailOperations");
    if (!wrap) return;
    wrap.innerHTML = "";
    list.forEach((op) => {
      const chip = document.createElement("span");
      chip.className = "inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700";
      chip.textContent = op;
      wrap.appendChild(chip);
    });
  }

  function renderCoverageFlags(data = {}) {
    const wrap = document.getElementById("detailCoverageFlags");
    if (!wrap) return;
    wrap.innerHTML = "";
    const chips = [
      {
        label: data.cancelled === "yes" ? "Cancelled / Non-Renewed" : "No Cancellation History",
        tone: data.cancelled === "yes" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100",
      },
      {
        label: data.bankruptcy === "yes" ? "Recent Bankruptcy" : "No Bankruptcy",
        tone: data.bankruptcy === "yes" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100",
      },
      {
        label: data.priorAuthority?.status === "yes" ? "Prior Authority" : "Single Authority",
        tone: data.priorAuthority?.status === "yes" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-100 text-slate-600 border border-slate-200",
      },
    ];
    chips.forEach(({ label, tone }) => {
      const chip = document.createElement("span");
      chip.className = `inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone}`;
      chip.textContent = label;
      wrap.appendChild(chip);
    });
  }

  function renderCoverageHistory(data = {}) {
    setText("detailCoverageCarrier", data.carrier || "--");
    setText("detailCoverageMetricType", data.reportingType || "--");
    setText("detailCoverageReported", data.reportedDisplay || "--");
    setText("detailCoveragePremium", data.premiumDisplay || "--");
    const badge = document.getElementById("detailNoCurrentCoverage");
    if (badge) {
      const show = Boolean(data.noCurrentCoverage);
      badge.textContent = show ? "No current cargo coverage" : "";
      badge.classList.toggle("hidden", !show);
    }
    const hasPrior = data.priorAuthority?.status === "yes";
    const priorBlock = document.getElementById("detailPriorAuthorityBlock");
    if (priorBlock) priorBlock.classList.toggle("hidden", !hasPrior);
    setText("detailPriorAuthorityName", hasPrior ? data.priorAuthority?.name || "--" : "--");
    setText("detailPriorAuthorityDot", hasPrior ? data.priorAuthority?.dot || "--" : "--");
    renderCoverageFlags(data);
  }

  function renderTerminals(list = []) {
    const wrap = document.getElementById("detailTerminals");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500";
      empty.textContent = "No terminals reported.";
      wrap.appendChild(empty);
      return;
    }
    list.forEach((terminal, index) => {
      const card = document.createElement("div");
      card.className = "rounded-2xl border border-slate-200 bg-slate-50 p-4";
      card.innerHTML = `
        <div class="flex items-center justify-between text-sm">
          <h4 class="font-semibold text-slate-800">${terminal.label || `Terminal ${index + 1}`}</h4>
          <span class="text-xs uppercase tracking-[0.3em] text-slate-400">#${String(index + 1).padStart(2, "0")}</span>
        </div>
        <p class="mt-2 text-sm text-slate-600">${terminal.street || "--"}</p>
        <p class="text-sm text-slate-600">${[terminal.city, terminal.state].filter(Boolean).join(", ")} ${terminal.zip || ""}</p>
        <div class="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 md:grid-cols-3">
          <div>
            <p class="text-[11px]">Limit</p>
            <p class="text-sm font-semibold text-slate-900">${terminal.limit || "--"}</p>
          </div>
          <div>
            <p class="text-[11px]">Construction</p>
            <p class="text-sm font-semibold text-slate-900">${terminal.construction || "--"}</p>
          </div>
          <div>
            <p class="text-[11px]">Sprinkler</p>
            <p class="text-sm font-semibold text-slate-900">${terminal.sprinkler || "--"}</p>
          </div>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  function renderLossHistory(rows = []) {
    const body = document.getElementById("detailLossHistory");
    if (!body) return;
    body.innerHTML = "";
    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td class="px-4 py-3 text-sm text-slate-500" colspan="5">No loss history provided.</td>';
      body.appendChild(tr);
      return;
    }
    rows.forEach((entry) => {
      const tr = document.createElement("tr");
      tr.className = "text-sm text-slate-700";
      tr.innerHTML = `
        <td class="px-4 py-3">${entry.period || "--"}</td>
        <td class="px-4 py-3 text-right font-semibold text-slate-900">${entry.none ? "--" : entry.amount || "--"}</td>
        <td class="px-4 py-3">${entry.none ? "No Losses" : entry.claims || "--"}</td>
        <td class="px-4 py-3">${entry.none ? "---" : entry.cause || "--"}</td>
        <td class="px-4 py-3">${entry.open === "yes" ? "Yes" : "No"}</td>
      `;
      body.appendChild(tr);
    });
  }

  function renderSecurityChips(id, list = []) {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!list.length) {
      const placeholder = document.createElement("span");
      placeholder.className = "text-xs font-semibold text-slate-400";
      placeholder.textContent = "None reported";
      wrap.appendChild(placeholder);
      return;
    }
    list.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700";
      chip.textContent = item;
      wrap.appendChild(chip);
    });
  }

  function renderTheftSecurity(profile = {}) {
    setText("detailTheftUnattended", profile.unattended?.answer || "--");
    setText("detailTheftUnattendedDesc", profile.unattended?.answer === "Yes" ? profile.unattended?.detail || "" : "");
    setText("detailTheftDetached", profile.detached?.answer || "--");
    setText("detailTheftDetachedDesc", profile.detached?.answer === "Yes" ? profile.detached?.detail || "" : "");
    renderSecurityChips("detailLocationSecurity", profile.atLocations || []);
    renderSecurityChips("detailTransitSecurity", profile.inTransit || []);
  }

  function renderCommodities(list = []) {
    const wrap = document.getElementById("detailCommodities");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!list.length) {
      const placeholder = document.createElement("span");
      placeholder.className = "text-slate-500";
      placeholder.textContent = "Not provided.";
      wrap.appendChild(placeholder);
      return;
    }
    list.forEach((entry) => {
      const detailParts = [];
      if (entry.value) detailParts.push(`${entry.value}%`);
      if (entry.average) detailParts.push(`Avg ${formatCurrencyDisplay(entry.average)}`);
      if (entry.max) detailParts.push(`Max ${formatCurrencyDisplay(entry.max)}`);
      const chip = document.createElement("span");
      chip.className = "inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700";
      chip.textContent = `${entry.minor || entry.major || "Commodity"} (${detailParts.join(" | ")})`;
      wrap.appendChild(chip);
    });
  }

  // populate page
  applyDefaults(record);
  document.title = `${record.insured} | Application Details`;
  setText("detailInsured", record.insured);
  setText("detailPolicy", record.policy);
  setText("detailEffective", record.effective);
  renderStatus(record.status);
  setText("detailStatus", record.status);
  // inputs
  setValue("detailPolicyInput", record.policy);
  setValue("detailEffectiveInput", record.effective);
  setValue("detailStatusInput", record.status);
  setValue("detailScoreInput", record.fred);
  setValue("detailAgencyNameInput", record.agencyName);
  setValue("detailAgencyContactInput", record.agencyContact);
  setValue("detailAgencyEmailInput", record.agencyEmail);
  setValue("detailAgencyPhoneInput", record.agencyPhone);
  setValue("detailAgencyAddressInput", record.agencyAddress);
  setValue("detailAgencyCityInput", record.agencyCity);
  setValue("detailAgencyStateInput", record.agencyState);
  setValue("detailAgencyZipInput", record.agencyZip);
  setValue("detailInsuredInput", record.insured);
  setValue("detailContactInput", record.contact);
  setValue("detailPhoneInput", record.phone);
  setValue("detailEmailInput", record.email);
  setValue("detailAddressInput", record.address);
  const [city, state] = (record.cityState || "").split(",").map((s) => s.trim());
  setValue("detailCityInput", city || "");
  setValue("detailStateInput", state || "");
  setValue("detailZipInput", record.zip);
  setValue("detailNotes", record.notes || "");
  const carrierSummary = `Carriers: ${record.carrierTypes.join(", ")}`;
  const opsSummary = `Operations: ${record.operations.join(", ")}`;
  if (!record.snapshot.includes(carrierSummary)) record.snapshot.push(carrierSummary);
  if (!record.snapshot.includes(opsSummary)) record.snapshot.push(opsSummary);
  renderSnapshot(record.snapshot);
  renderCarrierTypes(record.carrierTypes);
  renderCarrierMetrics(record.carrierMetrics, record.carrierTypes);
  renderOperations(record.operations);
  renderCoverageHistory(record.coverageHistory);
  renderTerminals(record.terminals);
  renderLossHistory(record.lossHistory);
  renderTheftSecurity(record.theftSecurity);
  renderCommodities(record.commodities);

  const statusSelect = document.getElementById("detailStatusInput");
  if (statusSelect) {
    statusSelect.addEventListener("change", (event) => {
      const newStatus = event.target.value;
      record.status = newStatus;
      persistStatusOverride(record.policy, newStatus);
      renderStatus(newStatus);
    });
  }
})();
