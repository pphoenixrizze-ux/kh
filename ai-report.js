// Storage migrated to IndexedDB via Dexie (see feasibility-db.js)

"use strict";

  const CONFIG = (typeof window !== "undefined" && window.APP_CONFIG) ? window.APP_CONFIG : {};

  // --- Globals / Keys ---
  // Prefer CONFIG-provided APL key; fall back to global if present
  const APL_KEY = (typeof CONFIG !== "undefined" && typeof CONFIG.APL_KEY !== "undefined")
    ? CONFIG.APL_KEY
    : (typeof window !== "undefined" && typeof window.APL_KEY !== "undefined" ? window.APL_KEY : undefined);

  // Store functions are now imported directly from ES modules

  // --- Utilities ---
  function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value).length === 0;
    }
    return false;
  }

  function deepFilter(data) {
    if (Array.isArray(data)) {
      const arr = data.map(deepFilter).filter((v) => !isEmptyValue(v));
      return arr;
    }
    if (data && typeof data === "object") {
      const out = {};
      Object.entries(data).forEach(([k, v]) => {
        const fv = deepFilter(v);
        if (!isEmptyValue(fv)) out[k] = fv;
      });
      return out;
    }
    return data;
  }

  // --- Sanitization & Sizing ---
  function sanitizeString(input, maxLen = 2000) {
    if (typeof input !== "string") return input;
    let s = input;
    // Strip HTML tags
    s = s.replace(/<[^>]*>/g, "");
    // Remove control chars except tab/newline/carriage return
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    // Normalize quotes/backticks
    s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/`{3,}/g, "``");
    // Collapse excessive whitespace
    s = s.replace(/[\t ]{2,}/g, " ");
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s.trim();
  }

  function sanitizeData(data, options = {}) {
    const maxStringLen = options.maxStringLen ?? 2000;
    const maxArrayLen = options.maxArrayLen ?? 100;
    if (Array.isArray(data)) {
      const trimmed = data.slice(0, maxArrayLen).map((v) => sanitizeData(v, options));
      return trimmed.filter((v) => !isEmptyValue(v));
    }
    if (data && typeof data === "object") {
      const out = {};
      for (const [k, v] of Object.entries(data)) {
        const sanitized = sanitizeData(v, options);
        if (!isEmptyValue(sanitized)) out[k] = sanitized;
      }
      return out;
    }
    if (typeof data === "string") {
      return sanitizeString(data, maxStringLen);
    }
    return data;
  }

  // Build additional plain-string context lines for the prompt
  function buildPlainContextStrings(coverPage, aiReportData) {
    // [AI PROMPT FORMAT FIX]
    // [MAPPING CONSISTENCY & DATA INTEGRATION FIX]
    // Push ONLY structured, plain English strings.
    const out = [];
    try {
      const cp = coverPage || {};
      const bi = (cp && cp.basicInfo) || {};
      const author = (cp && cp.author) || {};

      const projectName = cp.projectName ? String(cp.projectName).trim() : "";
      const projectType = bi.projectType ? String(bi.projectType).trim() : "";
      const projectSector = bi.sector ? String(bi.sector).trim() : "";
      const userName = author.fullName ? String(author.fullName).trim() : "";
      const userEmail = author.email ? String(author.email).trim() : "";

      // Always English-only context; exclude any phone fields
      if (projectName) out.push(`Project Name: ${projectName}`);
      if (projectType) out.push(`Project Type: ${projectType}`);
      if (projectSector) out.push(`Project Sector: ${projectSector}`);
      if (userName) out.push(`User Name: ${userName}`);
      if (userEmail) out.push(`User Email: ${userEmail}`);
    } catch (_) { /* ignore */ }

    try {
      // Only push non-empty survey strings, one per item
      if (Array.isArray(aiReportData)) {
        aiReportData.forEach(function(txt){
          if (typeof txt === 'string' && txt.trim().length > 0) out.push(txt.trim());
        });
      }
    } catch (_) { /* ignore */ }

    // Ensure all outputs are concise plain strings
    return out
      .map((s) => sanitizeString(String(s), 800))
      .filter((s) => typeof s === "string" && s.trim().length > 0);
  }

  // Integration fix (pre-feasibility/Pre-feasibility Study.html only):
  // Expose sanitization helpers globally for the pre-feasibility page to call
  // before persisting/displaying data.
  try {
    if (typeof window !== 'undefined') {
      window.deepFilter = deepFilter; // Make deepFilter globally accessible
      window.sanitizeData = sanitizeData; // Make sanitizeData globally accessible
    }
  } catch (_) { /* non-fatal */ }

  function stringifySize(obj) {
    try { return JSON.stringify(obj).length; } catch (_) { return Infinity; }
  }

  function fitDataToLimit(data, maxChars = 40000) {
    let sanitized = sanitizeData(data, { maxStringLen: 2000, maxArrayLen: 100 });
    if (stringifySize(sanitized) <= maxChars) return sanitized;
    sanitized = sanitizeData(data, { maxStringLen: 1000, maxArrayLen: 60 });
    if (stringifySize(sanitized) <= maxChars) return sanitized;
    sanitized = sanitizeData(data, { maxStringLen: 600, maxArrayLen: 30 });
    if (stringifySize(sanitized) <= maxChars) return sanitized;
    sanitized = sanitizeData(data, { maxStringLen: 300, maxArrayLen: 15 });
    return sanitized;
  }

  async function getPreferredLanguage() {
    try {
      const v = (typeof window !== 'undefined' && window.FeasibilityDB) ? await window.FeasibilityDB.getString('preferredLanguage', null) : null;
      return (v && typeof v === 'string' && v.trim()) ? v : 'en';
    } catch (_) {
      return 'en';
    }
  }

  function isRTL(lang) {
    return ["ar", "he", "fa", "ur"].includes((lang || "").toLowerCase());
  }

  async function readJSON(key, fallback) {
    try {
        if (typeof window !== 'undefined' && window.FeasibilityDB) {
          return await window.FeasibilityDB.getJSON(key, fallback);
        }
        // Fallback to localStorage for environments without FeasibilityDB (e.g., tests)
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(key);
          if (raw === null || raw === undefined) return fallback;
          try { return JSON.parse(raw); } catch (_) { return fallback; }
        }
        return fallback;
    } catch (error) {
        console.error(`Error reading ${key} from storage:`, error);
        return fallback;
    }
  }

  async function readStringLoose(key, fallback) {
    try {
      if (typeof window !== 'undefined' && window.FeasibilityDB) {
        const v = await window.FeasibilityDB.getString(key, fallback);
        if (v !== undefined && v !== null) return String(v);
      }
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const v = window.localStorage.getItem(key);
        if (v !== null && v !== undefined) return String(v);
      }
    } catch (_) {}
    return (fallback === undefined ? null : fallback);
  }

  // --- Unified schema sync with surveyLogic.js ---
  async function readUnifiedSchema() {
    try {
      if (typeof window !== 'undefined' && window.FeasibilityDB) {
        const obj = await window.FeasibilityDB.getJSON('feasibilityUnifiedSchema', null);
        if (obj) return obj;
      }
    } catch (_) {}
    // Fallback aliases must mirror surveyLogic.js
    return {
      version: 1,
      aliasToCanonical: {
        technologyMaturity: 'technologyModernity',
        politicalStabilityExplanation: 'stabilityExplanation',
        regulatoryExplanation: 'exposureExplanation',
        behaviorExplanation: 'alignmentExplanation',
        environmentExplained: 'environmentalImpact',
        gdpContribution: 'gdpImpact',
        operations: 'operationalEfficiency',
        hasAdditionalInvestments: 'needsAdditionalInvestments'
      },
      canonicalKeys: []
    };
  }

  async function canonicalizeKeys(obj) {
    const schema = await readUnifiedSchema();
    const alias = (schema && schema.aliasToCanonical) || {};
    const out = {};
    const src = obj || {};
    Object.keys(src).forEach((k) => {
      const mapped = alias[k] || k;
      out[mapped] = src[k];
    });
    // Unify target age if split variants present
    if (!out.targetAge && (out.targetAgeMin || out.targetAgeMax)) {
      const min = (out.targetAgeMin !== undefined && out.targetAgeMin !== null) ? String(out.targetAgeMin).trim() : '';
      const max = (out.targetAgeMax !== undefined && out.targetAgeMax !== null) ? String(out.targetAgeMax).trim() : '';
      if (min || max) out.targetAge = [min || '—', max || '—'].join(' - ');
      delete out.targetAgeMin;
      delete out.targetAgeMax;
    }
    return out;
  }

  function deepMergePreferNonEmpty(a, b) {
    // Prefer b if it is non-empty; deep-merge objects; keep numbers/booleans/0
    const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
    const empty = (v) => isEmptyValue(v);
    if (isPlainObject(a) && isPlainObject(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      const out = {};
      keys.forEach((k) => { out[k] = deepMergePreferNonEmpty(a[k], b[k]); });
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      return !empty(b) ? b : a;
    }
    if (b === undefined || b === null) return a;
    if (typeof b === 'string') return (b.trim() === '') ? a : b;
    return b; // numbers/booleans/objects/arrays already handled
  }

  // --- New standardized collection helpers ---
  /**
   * Read initial project/basic info captured from start-feasibility.html and related pages.
 * Reads from IndexedDB via FeasibilityDB wrapper.
   */
  async function readStartForm() {
    try {
      const fromForm = await readJSON('startFeasibilityForm', {});
      // Overlay any individually stored fields that pages might re-save for consistency
      const overlayKeys = [
        // [BUGFIX DOC] Use canonical start-feasibility keys, replacing legacy 'sector' with 'projectSector' to avoid ambiguity. Change exclusive to this file.
        'studyType','projectName','projectDescription','visionMission','projectType','specifiedProjectType','projectSector',
        'country','city','area','fundingMethod','personalContribution','loanAmount','interestValue','currency','totalCapital',
        'loanMonths','targetAudience','projectStatus','duration','durationUnit','projectTaxRate','taxRate'
      ];
      const overlays = {};
      overlayKeys.forEach((k) => {
        try {
          const raw = await (window.FeasibilityDB ? window.FeasibilityDB.getJSON(k, undefined) : undefined);
          if (raw !== undefined) overlays[k] = raw;
        } catch (_) { /* non-fatal */ }
      });
      return Object.assign({}, fromForm, overlays);
    } catch (err) {
      console.error('Failed to read start form data from storage:', err);
      return {};
    }
  }

  /**
   * Collect processed/simulated survey answers written by surveyLogic.js
   * Reads keys: 'feasibilityStudyAnswers' (primary) and 'simulatedFeasibilityAnswers' (mirror).
   */
  // =============================================================================
  // COMPREHENSIVE DATA COLLECTION - Integration Fix
  // =============================================================================
  async function collectSurveyData() {
    try {
      console.group('🔍 Collecting Survey Data from All Sources');
      
      // Collect from ALL data sources
      const sources = [
        // Primary survey data
        await readJSON('feasibilityStudyAnswers', {}),
        
        // Processed/simulated data
        await readJSON('simulatedFeasibilityAnswers', {}),
        
        // Start form data
        await readJSON('startFeasibilityForm', {}),
        
        // User info from dashboard
        await readJSON('userInfo', {}),
        
        // Commercial sector data (direct check)
        getCommercialSectorData(),
        
        // Any direct form data available
        getDirectFormData()
      ];
      
      console.log('Raw sources:', sources);
      
      // Deep merge all sources with proper conflict resolution
      const merged = deepMergeMultipleSources(sources);
      
      // Canonicalize all keys using FIELD_MAPPING
      const canonicalized = await canonicalizeAllKeys(merged);
      
      // Validate data completeness
      const missingSections = validateDataCompleteness(canonicalized);
      if (missingSections.length > 0) {
        showDataStatusWarning(`Missing data in: ${missingSections.join(', ')}`);
      }
      
      console.log('Final merged data:', canonicalized);
      console.groupEnd();
      
      return canonicalized;
      
    } catch (err) {
      console.error('❌ collectSurveyData failed:', err);
      showDataStatusWarning(`Data collection error: ${err.message}`);
      return {};
    }
  }

  function getCommercialSectorData() {
    const data = {};
    try {
      // Direct access to commercial sector form fields
      const commercialIds = [
        'business-type',
        'sustainable-fashion',
        'eco-friendly',
        'local-artisans',
        'organic-materials',
        'recycled-materials',
        'limited-editions',
        'social-media-focused',
        'influencer-collabs',
        'pop-up-events',
        'community-workshops',
        'brand-storytelling'
      ];
      const mapFn = (typeof window !== 'undefined' && typeof window.mapHtmlToJsField === 'function') ? window.mapHtmlToJsField : (k) => k; // [MAPPING FIX] Canonicalize keys
      commercialIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        const v = (element.type === 'checkbox') ? !!element.checked : element.value;
        const key = mapFn(id);
        data[key] = v; // [MAPPING FIX] Store under canonical key to avoid later loss during merging
      });
    } catch (e) {
      console.warn('Could not access commercial sector form data:', e);
    }
    return data;
  }

  function deepMergeMultipleSources(sources) {
    let result = {};
    sources.forEach((source) => {
      if (source && typeof source === 'object') {
        result = deepMergePreferNonEmpty(result, source);
      }
    });
    return result;
  }

  // Canonicalize keys using FIELD_MAPPING / unified schema alias if available
  async function canonicalizeAllKeys(obj) {
    try {
      const src = obj || {};
      const out = {};
      const mapFn = (typeof window !== 'undefined' && typeof window.mapHtmlToJsField === 'function')
        ? window.mapHtmlToJsField
        : (k) => k;
      Object.keys(src).forEach((k) => {
        const mapped = mapFn(k);
        out[mapped] = src[k];
      });
      // Reuse existing canonicalization rules
      return await canonicalizeKeys(out);
    } catch (_) {
      return obj || {};
    }
  }

  function validateDataCompleteness(data) {
    const missing = [];
    // [VALIDATION ROBUSTNESS FIX] Treat numeric 0 as present; coerce numbers safely
    const has = (k) => {
      if (!data) return false;
      const v = data[k];
      if (v === 0) return true;
      if (typeof v === 'number' && Number.isFinite(v)) return true;
      if (v === undefined || v === null) return false;
      return String(v).trim() !== '';
    };

    // Cover/basic info remains a separate requirement
    if (!(has('projectName') && (has('sector') || has('projectType')))) missing.push('Cover Page');

    const completeness = data && data.sectionCompleteness;
    if (completeness && completeness.sections) {
      const sectionOrder = [
        { key: 'projectOverview', label: 'Project Overview' },
        { key: 'market', label: 'Market' },
        { key: 'marketing', label: 'Marketing' },
        { key: 'technical', label: 'Technical' },
        { key: 'financial', label: 'Financial' }
      ];
      sectionOrder.forEach(({ key, label }) => {
        const entry = completeness.sections[key];
        if (!entry || entry.complete !== true) missing.push(label);
      });
      return missing;
    }

    // Fallback: legacy heuristic checks when structured completeness unavailable
    if (!(has('marketSize') && (has('competitorsCount') || has('competitors')))) missing.push('Market');
    if (!(has('marketingCost') || has('marketingPlan') || has('marketingChannels'))) missing.push('Marketing');
    if (!(has('propertyPrice') || has('requiredArea') || has('equipmentList'))) missing.push('Technical');
    const fs = data && data.financialStatements;
    const hasFs = !!(fs && typeof fs === 'object' && (
      (fs.incomeStatement && Array.isArray(fs.incomeStatement.headers)) ||
      (fs.balanceSheet && Array.isArray(fs.balanceSheet.headers)) ||
      (fs.cashFlow && Array.isArray(fs.cashFlow.headers))
    ));
    if (!hasFs) missing.push('Financial');
    return missing;
  }

  function showDataStatusWarning(message) {
    try {
      if (typeof document === 'undefined') return;
      const el = document.getElementById('data-status');
      if (!el) return;
      const box = document.createElement('div');
      box.className = 'error-message';
      box.style.cssText = 'background:#fff7e6;color:#8a5300;padding:10px;border-radius:6px;margin:8px 0;border:1px solid #ffe0a3;';
      box.textContent = message;
      el.appendChild(box);
    } catch (_) { /* non-fatal */ }
  }

  function getDirectFormData() {
    const out = {};
    try {
      if (typeof document === 'undefined') return out;
      const nodes = document.querySelectorAll('input, select, textarea');
      nodes.forEach((el) => {
        if (!el || !el.id) return;
        if (el.type === 'checkbox') {
          out[el.id] = !!el.checked;
        } else if (el.type === 'number') {
          const v = parseFloat(el.value);
          out[el.id] = Number.isFinite(v) ? v : (el.value || '');
        } else {
          out[el.id] = el.value;
        }
      });
    } catch (_) {}
    return out;
  }

  // Helper function to ensure required fields
  function ensureRequiredFields(data) {
    // Professional integration/refactor: guarantee fully valid financial objects with sensible defaults
    // (Part of professional integration/refactor task)
    const withDefaultTable = (table, fallbackHeaders) => {
      const headers = Array.isArray(table?.headers) && table.headers.length ? table.headers : fallbackHeaders;
      const rows = Array.isArray(table?.rows) && table.rows.length ? table.rows : [Array(headers.length).fill('—')];
      return { headers, rows };
    };

    if (!data || typeof data !== 'object') data = {};
    if (!data.financialStatements || typeof data.financialStatements !== 'object') {
      data.financialStatements = {};
    }
    const fs = data.financialStatements;
    if (!Array.isArray(fs.assumptions)) fs.assumptions = [];
    fs.incomeStatement = withDefaultTable(fs.incomeStatement, ["Year", "Revenue", "COGS", "Gross Profit", "Operating Expenses", "EBIT", "Net Profit"]);
    fs.balanceSheet = withDefaultTable(fs.balanceSheet, ["Year", "Assets", "Liabilities", "Equity", "Total Liabilities & Equity"]);
    fs.cashFlow = withDefaultTable(fs.cashFlow, ["Year", "Operating Activities", "Investing Activities", "Financing Activities", "Net Cash Flow"]);
    if (!Array.isArray(fs.ratios)) fs.ratios = [];
    if (!fs.roi || typeof fs.roi !== 'object') fs.roi = { npv: '—', irr: '—', paybackPeriod: '—' };

    // Keep other soft-required fields non-blocking but surface as console warnings for devs
    ['projectIdea', 'marketSize'].forEach((field) => {
      if (!data[field]) {
        try { console.warn(`Required field missing in report data: ${field}`); } catch (_) {}
      }
    });
    return data;
  }

  // [NAME READ ORDER FIX - Pre-feasibility only]
  // Always resolve the latest user name using canonical priority via IndexedDB:
  // 1) FeasibilityDB 'userName'  2) userInfo.name (JSON)
  async function getCanonicalUserName() {
    try {
      // Prefer FeasibilityDB; fallback to localStorage
      let v = '';
      try {
        v = (typeof window !== 'undefined' && window.FeasibilityDB)
          ? (await window.FeasibilityDB.getString('userName', '') || '').trim()
          : '';
      } catch (_) { v = ''; }
      if (v) return v;
    } catch (_) {}
    try {
      let ui = {};
      try {
        ui = (typeof window !== 'undefined' && window.FeasibilityDB) ? (await window.FeasibilityDB.getJSON('userInfo', {})) : {};
      } catch (_) { ui = {}; }
      if ((!ui || Object.keys(ui).length === 0) && typeof window !== 'undefined' && window.localStorage) {
        try { ui = JSON.parse(window.localStorage.getItem('userInfo') || '{}'); } catch(_) { ui = {}; }
      }
      const nm = (ui && typeof ui.name === 'string') ? ui.name.trim() : '';
      if (nm) return nm;
    } catch (_) {}
    return '';
  }

  /**
   * Extract author info (fullName, email) saved by dashboard.html or Pre-feasibility Study.
   */
  async function collectAuthorFromDashboard() {
    try {
      // [BUGFIX DOC] Unify author retrieval to canonical keys (userName, userEmail, userPhone) to prevent mismatches. Change exclusive to this file.
      let fullName;
      let email;
      let phone;
      try {
        // [NAME READ ORDER FIX]
        // Prefer 'userName' then fallback to 'userInfo.name' to avoid stale names
        fullName = await getCanonicalUserName();
      } catch (_) { fullName = ''; }
      try {
        // [KEY RETRIEVAL UNIFICATION FIX]
        email = (typeof window !== 'undefined' && window.FeasibilityDB) ? await window.FeasibilityDB.getString('userEmail', '') : '';
      } catch (_) { email = ''; }
      try {
        // [KEY RETRIEVAL UNIFICATION FIX]
        phone = (typeof window !== 'undefined' && window.FeasibilityDB) ? await window.FeasibilityDB.getString('userPhone', '') : '';
      } catch (_) { phone = ''; }
      return { fullName: fullName || undefined, email: email || undefined, phone: phone || undefined };
    } catch (err) {
      console.error('Failed to collect author info from storage:', err);
      return { fullName: undefined, email: undefined };
    }
  }

  function nowTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    // Human formatted: "2 October 2025, 13:37"
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const human = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return { iso: d.toISOString(), date, time, formatted: human };
  }

  function buildPrompt(language, expertPrompt, data, options = {}) {
  const { requestedSectionIds = null, includeMeta = true, includeComparison = true } = options;
  const guidance = sanitizeString(expertPrompt || "", 4000);
  const targetLang = sanitizeString(language || "en", 16);

  // Required section order (exactly 19 sections: 1-1 .. 1-19)
  const requiredSectionIds = Array.from({ length: 19 }, (_, i) => `1-${i + 1}`);
  const effectiveSectionIds = (Array.isArray(requestedSectionIds) && requestedSectionIds.length === 19)
    ? requestedSectionIds
    : requiredSectionIds;

  const EXPERT_INSTRUCTIONS = `
🎯 **Expert Instructions for Writing a Comprehensive Feasibility Report**

🏢 **Objective:** Write a professional, full-scale feasibility study in ${targetLang}, based on the provided data.

📋 **Your Role as an Expert:**

1. **Comprehensive Introduction** – Begin with a complete and contextual introduction for the project (Section 1-1).
2. **Unique Section Openings** – Write a distinctive and relevant introductory paragraph at the start of each section.
3. **In-Depth Analysis** – Provide a deep, data-driven analysis for every section, connecting findings to real-world context.
4. **Academic Tone** – Maintain a formal academic style with fully justified alignment.
5. **Originality** – Avoid generic phrasing and produce original, non-repetitive content.

🚫 **Do NOT use any of the following generic phrases:**
❌ "Introduction – introduction"
❌ "Detailed analysis:"
❌ "Interpretation and recommendations:"
❌ "Based on available inputs and reasonable assumptions"
❌ "The narrative connects evidence to conclusions"
❌ "This section outlines the context, objectives, and evaluation approach..."
❌ "Analysis: The table(s) above summarize core data points"

📊 **Required Report Structure (in exact order):**

**Page 1:** Cover Page  
- Study type and project name  
- Project description and vision  
- Basic project information (type, sector, location, capital, etc.)  
- Author details (name, email)  
- Issue date and time  
- Confidentiality statement  

**Page 2:** Summary  
- 500–700 words comprehensive project summary  
- Keywords on the same page  

**Page 3:** Table of Contents  

**Page 4:** Introduction (1-1)  

**Following Pages:** Sections 1-2 through 1-19 in exact order

📝 **Content Requirements for Each Section:**
 - **Opening Paragraph:** Unique and context-specific introduction  
 - **Analysis:** Deep interpretation of provided data and tables  
 - **Tables:** Use real numerical values whenever available  
 - **Explanation:** Add interpretive paragraphs explaining each dataset  

🔢 **List of Required Sections (1-1 → 1-19):**
1-1: Introduction – General context of the project  
1-2: Project Idea Analysis  
1-3: Market Feasibility Study  
1-4: Marketing Strategy Analysis  
1-5: Technical Feasibility Evaluation  
1-6: Technological Infrastructure Analysis  
1-7: Operational Requirements Analysis  
1-8: Organizational Structure Design  
1-9: Legal and Regulatory Compliance  
1-10: Environmental Impact Assessment  
1-11: Social Impact Analysis  
1-12: Cultural Context Analysis  
1-13: Consumer Behavior Analysis  
1-14: Political and Regulatory Environment  
1-15: Project Timeline and Key Tasks  
1-16: Risk Assessment and Mitigation  
1-17: Economic Feasibility Analysis  
1-18: Financial Feasibility Study  
1-19: Additional Investment Requirements  

💰 **Special Requirements for Section 1-18 (Financial Feasibility):**

- **Complete Financial Statements:**  
  * Income Statement  
  * Balance Sheet  
  * Cash Flow Statement  

- **Key Financial Ratios and Analyses:**  
  * Liquidity, profitability, and leverage ratios  
  * ROI analysis (NPV, IRR, Payback Period)  
  * Break-even and sensitivity analysis  

- **Interpretation:**  
  * Analytical commentary for each financial table  
  * Link financial findings to investment decisions  
  * Evaluate expected profitability and feasibility  

🎨 **Formatting & Style Requirements:**
- **Language:** ${targetLang}  
- **Alignment:** Fully Justified  
- **Style:** Academic and professional  
- **Output:** Valid JSON only, following the defined schema  
- **Quality:** Original, expert-level content only  

📊 **Provided Project Data:**
${JSON.stringify(data, null, 2)}

Remember: You are a professional feasibility study expert. Your task is to deliver a comprehensive, decision-oriented feasibility analysis.
`;

  const schema = `{
  "title": "string",
  "language": "${targetLang}",
  "executiveSummary": "string",
  "coverPage": {
    "studyType": "string",
    "projectName": "string",
    "projectDescription": "string",
    "visionMission": "string",
    "basicInfo": {
      "sector": "string", "projectType": "string", "specifiedProjectType": "string",
      "country": "string", "city": "string", "area": "string",
      "fundingMethod": "string", "personalContribution": "string", "loanAmount": "string",
      "interestValue": "string", "currency": "string", "totalCapital": "string",
      "loanMonths": "string", "targetAudience": "string", "projectStatus": "string",
      "duration": "string", "durationUnit": "string"
    },
    "author": { "fullName": "string", "email": "string" },
    "timestamp": { "iso": "string", "date": "string", "time": "string", "formatted": "string" },
    "confidentiality": "string"
  },
  "sections": [
    {
      "id": "1-1", // IDs must follow this exact format: "1-1", "1-2", ..., "1-19"
      "title": "string",
      "content": "string",
      "tables": [ { "title": "string", "headers": ["string"], "rows": [["string"]] } ],
      "wordCount": number
    }
  ],
  "financial": {
    "assumptions": ["string"],
    "incomeStatement": { "headers": ["string"], "rows": [["string"]] },
    "balanceSheet": { "headers": ["string"], "rows": [["string"]] },
    "cashFlow": { "headers": ["string"], "rows": [["string"]] },
    "ratios": [ { "metric": "string", "value": "string" } ],
    "roi": { "npv": "string", "irr": "string", "paybackPeriod": "string" }
  } | null,
  "comparison": { "enabled": boolean, "table": { "headers": ["string"], "rows": [["string"]] } | null, "notes": "string" } | null,
  "keywords": ["string"],
  "disclaimers": ["string"]
}`;

  const tpl = `You are a professional feasibility study expert. Your job is to write a comprehensive, high-quality feasibility report.

${EXPERT_INSTRUCTIONS}

${includeMeta ? 'Include all main fields (title, executiveSummary, coverPage, sections, etc.).' : 'Include only the "sections" field.'}
${includeComparison ? 'Include the comparison section only if comparison data is enabled in the project inputs.' : 'Exclude the comparison section completely.'}

Required section order: ${effectiveSectionIds.join(", ")}

JSON Schema (must strictly follow this format):
${schema}

Provided Data:
${JSON.stringify(data, null, 2)}

Important: Do not use generic text or templates. All content must be original, analytical, and professionally written.`;

// ✅ Log successful prompt generation for debugging
console.debug(`[buildPrompt] Prompt generated for ${effectiveSectionIds.length} sections in ${targetLang} language.`);

  return tpl.trim();
}

  async function callOpenAI(apiKey, userPrompt, extraUserStrings = []) {
    // LOCAL/TEST-ONLY: If no APL backend is configured, allow direct browser calls
    // to OpenAI using keys/endpoints from window.APP_CONFIG. This is NOT secure
    // for production use. Prefer server-side proxy (APL) in real deployments.
    const url = CONFIG.OPENAI_API_ENDPOINT;
    const baseMessages = [
      { role: "system", content: "You are a professional feasibility report generator. Always return JSON only." }
    ];
    const mainPrompt = (typeof userPrompt === "string" ? userPrompt : String(userPrompt || "")).trim();
    if (mainPrompt) baseMessages.push({ role: "user", content: mainPrompt });
    if (Array.isArray(extraUserStrings)) {
      extraUserStrings.forEach((s) => {
        if (typeof s !== "string") return;
        const t = s.trim();
        if (t) baseMessages.push({ role: "user", content: t });
      });
    }

    const payload = {
      model: CONFIG.OPENAI_MODEL || "gpt-4o-mini",
      messages: baseMessages,
      temperature: typeof CONFIG.OPENAI_TEMPERATURE === "number" ? CONFIG.OPENAI_TEMPERATURE : 0.2
    };

    // Improved payload debug logging
    try {
      console.debug("[OpenAI] Request payload (object):");
      // Use console.dir for deep inspection without forcing full stringify
      console.dir(payload);
      const payloadString = JSON.stringify(payload);
      const size = payloadString ? payloadString.length : 0;
      console.debug(`[OpenAI] Payload size: ${size} chars`);
      if (size > 12000) {
        console.debug("[OpenAI] Payload preview (first 8000 chars):", payloadString.slice(0, 8000));
      } else {
        console.debug("[OpenAI] Payload (full):", payloadString);
      }
    } catch (e) {
      console.warn("[OpenAI] Failed to log payload:", e);
    }

    const isOpenAI = /(^https?:\/\/)?api\.openai\.com\//i.test(String(url));
    // [API KEY HANDLING FIX]
    // Prefer explicit function arg, then APP_CONFIG only. Ignore globals/localStorage.
    const effectiveKey = (typeof apiKey === 'string' && apiKey.trim())
      ? apiKey.trim()
      : (CONFIG && typeof CONFIG.OPENAI_API_KEY === 'string' && CONFIG.OPENAI_API_KEY.trim() ? CONFIG.OPENAI_API_KEY.trim() : undefined);
    const res = await fetch(url, {
      method: "POST",
      headers: Object.assign(
        { "Content-Type": "application/json" },
        (isOpenAI && effectiveKey) ? { "Authorization": `Bearer ${effectiveKey}` } : {}
      ),
      body: JSON.stringify(payload)
    });

    // Always capture raw body for better diagnostics
    const bodyText = await res.text();
    let data;
    try {
      data = bodyText ? JSON.parse(bodyText) : {};
    } catch (err) {
      throw new Error(`OpenAI returned non-JSON body (status ${res.status}): ${bodyText}`);
    }

    if (!res.ok) {
      // include the parsed body for debugging
      // [401 DIAGNOSTICS] Provide clearer error with key presence/endpoint info (no key value exposure)
      const hint = (res.status === 401)
        ? 'Unauthorized: Check API key validity and endpoint. Key present: ' + (effectiveKey ? 'yes' : 'no')
        : `HTTP ${res.status}`;
      throw new Error(`OpenAI request failed (${hint}): ${JSON.stringify(data)}`);
    }

    // Extract content per Chat Completions spec
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      console.warn("OpenAI chat.completions response received but no message content found:", data);
      throw new Error("No content returned from model.");
    }
    return content.trim();
  }

  // Section utilities
  // Required section ids: exactly 19 numbered sections (1-1 .. 1-19)
  const REQUIRED_SECTION_IDS = Array.from({ length: 19 }, (_, i) => `1-${i + 1}`);
  const DEFAULT_SECTION_TITLES = {
    "1-1": "Introduction",
    "1-2": "Project Concept Analysis",
    "1-3": "Market Feasibility Study",
    "1-4": "Marketing Strategy Analysis",
    "1-5": "Technical Feasibility Assessment",
    "1-6": "Technology Infrastructure Analysis",
    "1-7": "Operational Requirements Analysis",
    "1-8": "Organizational Structure Design",
    "1-9": "Legal and Regulatory Compliance",
    "1-10": "Environmental Impact Assessment",
    "1-11": "Social Impact Analysis",
    "1-12": "Cultural Context Analysis",
    "1-13": "Consumer Behavior Analysis",
    "1-14": "Political and Regulatory Environment",
    "1-15": "Project Timeline and Milestones",
    "1-16": "Risk Assessment and Mitigation",
    "1-17": "Economic Viability Analysis",
    "1-18": "Financial Feasibility Study",
    "1-19": "Additional Investment Requirements"
  };

  // Convert structured financial statements to section tables
  function financialStatementsToTables(financial) {
    if (!financial || typeof financial !== "object") return [];
    const tables = [];
    const pushTable = (title, table) => {
      if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) return;
      tables.push({ title, headers: table.headers, rows: table.rows });
    };
    pushTable("Income Statement", financial.incomeStatement);
    pushTable("Balance Sheet", financial.balanceSheet);
    pushTable("Cash Flow Statement", financial.cashFlow);
    if (Array.isArray(financial.ratios)) {
      const headers = ["Metric", "Value"];
      const rows = financial.ratios.map((r) => [String(r.metric || ""), String(r.value ?? "")]);
      tables.push({ title: "Key Ratios", headers, rows });
    }
    if (financial.roi && (financial.roi.npv !== undefined || financial.roi.irr !== undefined || financial.roi.paybackPeriod !== undefined)) {
      const headers = ["Metric", "Value"];
      const rows = [
        ["NPV", String(financial.roi.npv ?? "")],
        ["IRR", String(financial.roi.irr ?? "")],
        ["Payback Period", String(financial.roi.paybackPeriod ?? "")]
      ];
      tables.push({ title: "Return on Investment (ROI)", headers, rows });
    }
    return tables;
  }

  // Sanitize table headers and rows to avoid undefined cells and mismatched lengths
  function sanitizeTableData(headers, rows) {
    const safeHeader = Array.isArray(headers)
      ? headers.map((h) => (h === undefined || h === null) ? "—" : String(h))
      : [];
    const colCount = safeHeader.length;
    const safeRows = Array.isArray(rows) ? rows.map((r) => {
      const arr = Array.isArray(r) ? r.slice(0, colCount) : [];
      // Pad or sanitize cells
      for (let i = 0; i < colCount; i++) {
        const cell = arr[i];
        arr[i] = (cell === undefined || cell === null) ? "—" : String(cell);
      }
      return arr;
    }) : [];
    return { headers: safeHeader, rows: safeRows };
  }

  function ensureNoData(val, _lang) {
    // Return undefined for missing/empty values to avoid placeholder strings in reports
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'string' && val.trim() === '') return undefined;
    return val;
  }

  // Build ordered per-section inputs, excluding unanswered fields entirely
  function buildSectionInputsOrdered(survey, basicInfo, lang) {
    // Use provided params or fall back to empty objects
    const basicInfoData = basicInfo || {};
    const s = survey || {};
    const include = (obj) => deepFilter(obj);

    // Access descriptive generators exposed by surveyLogic.js
    const G = (typeof window !== "undefined" && window.feasibilityGenerators) ? window.feasibilityGenerators : null;
    const gen = (fnName, ...args) => {
      try {
        if (!G || typeof G[fnName] !== "function") return undefined;
        const out = G[fnName](...args);
        if (typeof out === "string") {
          const t = out.trim();
          return t ? t : undefined;
        }
        return out;
      } catch (_) { return undefined; }
    };

    const sectionInputs = {
      "1-1": include({
        projectName: basicInfoData?.projectName,
        sector: basicInfoData?.sector,
        projectType: basicInfoData?.projectType || basicInfoData?.specifiedProjectType,
        specifiedProjectType: basicInfoData?.specifiedProjectType,
        projectDescription: basicInfoData?.projectDescription,
        targetAudience: basicInfoData?.targetAudience,
        projectStatus: basicInfoData?.projectStatus,
        duration: basicInfoData?.duration,
        durationUnit: basicInfoData?.durationUnit
      }),
      "1-2": include({
        projectName: basicInfoData?.projectName,
        description: basicInfoData?.projectDescription,
        visionMission: basicInfoData?.visionMission || basicInfoData?.notes,
        projectIdea: gen("generateBusinessIdea", s.projectIdea),
        problemSolution: gen("generateProblemSolution", s.problemSolution),
        businessModel: gen("generateBusinessModel", s.businessModel),
        distributionChannels: gen("generateDistributionChannels", s.distributionChannels),
        businessType: ensureNoData(s.businessType, lang) // [MAPPING FIX - 1-2] Include Pre-Commercial business type
      }),
      "1-3": include({
        marketSize: ensureNoData(gen("generateMarketSize", s.marketSize), lang),
        potentialCustomers: ensureNoData(gen("generatePotentialCustomers", s.potentialCustomers), lang),
        growthRate: ensureNoData(gen("generateGrowthRate", s.growthRate), lang),
        growthFactors: ensureNoData(gen("generateGrowthFactors", s.growthFactors), lang),
        competitorsCount: ensureNoData(gen("generateCompetitorCount", s.competitorsCount), lang),
        marketGap: ensureNoData(gen("generateMarketGap", s.marketGap, s.gapExplanation), lang),
        marketFeasibility: ensureNoData(gen("generateMarketFeasibility", s.marketFeasibility), lang),
        marketNotes: ensureNoData(gen("generateMarketNotes", s.marketNotes), lang)
      }),
      "1-4": include({
        targetAge: gen("generateTargetAge", s.targetAge),
        customerIncome: gen("generateCustomerIncome", s.customerIncome),
        marketingChannels: gen(
          "generateMarketingChannels",
          Array.isArray(s.marketingChannels) ? s.marketingChannels : [],
          s.marketingChannelsOther || ""
        ),
        marketingPlan: (function(){
          try {
            if (Array.isArray(s.marketingPlan) && s.marketingPlan.length) return s.marketingPlan;
            if (Array.isArray(s.marketingChannels) && s.marketingChannels.length) return s.marketingChannels;
          } catch(_) {}
          return undefined;
        })(),
        marketingCost: gen("generateMarketingCost", s.marketingCost),
        competitiveAdvantage: gen("generateCompetitiveAdvantage", s.competitiveAdvantage),
        reachability: gen("generateReachability", s.reachability),
        marketingNotes: gen("generateMarketingNotes", s.marketingNotes),
        // [MAPPING FIX - 1-4] Surface Pre-Commercial brand identity/positioning selections
        brandIdentityFeatures: (function(){
          const features = [];
          try {
            if (s.sustainableFocus) features.push("Sustainable fashion");
            if (s.ecoFriendly) features.push("Eco-friendly materials");
            if (s.localArtisans) features.push("Local artisans");
            if (s.organicMaterials) features.push("Organic materials");
            if (s.recycledMaterials) features.push("Recycled materials");
            if (s.limitedEditions) features.push("Limited editions");
            if (s.socialMediaFocus) features.push("Social-media-focused marketing");
            if (s.influencerCollaborations) features.push("Influencer collaborations");
            if (s.popupEvents) features.push("Pop-up events");
            if (s.communityWorkshops) features.push("Community workshops");
            if (s.brandStorytelling) features.push("Brand storytelling");
          } catch (_) {}
          return features.length ? features : undefined;
        })(),
        // Provide a concise positioning string if brand features exist
        positioning: (function(){
          try {
            const feat = [];
            if (s.sustainableFocus) feat.push("sustainable");
            if (s.ecoFriendly) feat.push("eco-friendly");
            if (s.localArtisans) feat.push("local artisans");
            if (s.organicMaterials) feat.push("organic materials");
            if (s.recycledMaterials) feat.push("recycled materials");
            if (s.limitedEditions) feat.push("limited editions");
            if (s.socialMediaFocus) feat.push("social-media-focused");
            if (s.influencerCollaborations) feat.push("influencer collaborations");
            if (s.popupEvents) feat.push("pop-up events");
            if (s.communityWorkshops) feat.push("community workshops");
            if (s.brandStorytelling) feat.push("brand storytelling");
            if (feat.length) return `Brand positioning focused on ${feat.join(", ")}.`;
          } catch(_) {}
          // Fallback to competitive advantage as positioning proxy
          return ensureNoData(gen("generateCompetitiveAdvantage", s.competitiveAdvantage), lang);
        })()
      }),
      "1-5": include({
        equipmentList: gen("generateEquipmentSummary", s.equipmentList),
        inventoryValue: gen("generateInventoryValue", s.inventoryValue),
        goodsTypes: gen("generateGoodsTypes", s.goodsTypes),
        propertySummary: gen("generatePropertySummary", s.requiredArea, s.ownershipType, s.propertyPrice),
        locationTraffic: gen("generateLocationTraffic", s.locationTraffic),
        parkingAvailability: gen("generateParkingAvailability", s.parkingAvailability),
        attractionPoints: gen("generateAttractionPoints", s.attractionPoints, s.otherAttractionsText)
      }),
      "1-6": include({
        technologySummary: gen("generateTechnologySummary", s.technologyTable),
        technologyTable: gen("generateTechnologyTable", s.technologyTable),
        technologyModernity: gen("generateTechnologyModernity", s.technologyMaturity || s.technologyModernity),
        maintenanceDifficulties: gen("generateMaintenanceDifficulties", s.maintenanceDifficulties, s.maintenanceExplanation),
        supplierDependence: gen("generateSupplierDependence", s.supplierDependence),
        technologySafety: gen("generateTechnologySafety", s.technologySafety),
        technologyNotes: gen("generateTechnologyNotes", s.technologyNotes)
      }),
      "1-7": include({
        staffingSummary: gen("generateStaffingSummary", s.totalEmployees, s.staffTable),
        payrollTable: gen("generatePayrollTable", s.staffTable),
        dailyOperations: gen("generateDailyOperations", s.dailyOperations),
        operationalEfficiency: gen("generateOperationalEfficiency", s.operationalEfficiency),
        operationalNotes: gen("generateOperationalNotes", s.operationalNotes)
      }),
      "1-8": include({
        adminStructure: gen("generateAdminStructure", s.adminStructure, s.otherStructureText),
        decisionMaking: gen("generateDecisionMaking", s.decisionMaking),
        governanceRequirements: gen("generateGovernanceRequirements", s.governanceRequirements || s.governance, s.governanceExplanation),
        organizationalEffectiveness: gen("generateOrganizationalEffectiveness", s.organizationalEffectiveness),
        organizationalNotes: gen("generateOrganizationalNotes", s.organizationalNotes)
      }),
      "1-9": include({
        projectLegality: gen("generateProjectLegality", s.projectLegality),
        licensesSummary: gen("generateLicensesSummary", s.licensesTable),
        licensesTable: gen("generateLicensesTable", s.licensesTable),
        legalRisks: gen("generateLegalRisks", s.legalRisks, s.risksExplanation),
        legalObstacles: gen("generateLegalObstacles", s.legalObstacles),
        legalNotes: gen("generateLegalNotes", s.legalNotes)
      }),
      "1-10": include({
        environmentalImpact: gen("generateEnvironmentalImpact", s.environmentalImpact || s.environmentExplained, s.impactExplanation),
        environmentalApprovals: gen("generateEnvironmentalApprovals", s.environmentalApprovals),
        environmentalFriendliness: gen("generateEnvironmentalFriendliness", s.environmentalFriendliness),
        environmentalNotes: gen("generateEnvironmentalNotes", s.environmentalNotes)
      }),
      "1-11": include({
        communityImpact: gen("generateCommunityImpact", s.communityImpact),
        jobOpportunities: gen("generateJobOpportunities", s.jobOpportunities),
        socialImpactAlignment: gen("generateSocialImpactAlignment", s.socialImpactAlignment),
        socialNotes: gen("generateSocialNotes", s.socialNotes)
      }),
      "1-12": include({
        culturalAlignment: gen("generateCulturalAlignment", s.culturalAlignment, s.alignmentExplanation),
        culturalRejection: gen("generateCulturalRejection", s.culturalRejection, s.rejectionExplanation),
        culturalAcceptability: gen("generateCulturalAcceptability", s.culturalAcceptability),
        culturalNotes: gen("generateCulturalNotes", s.culturalNotes)
      }),
      "1-13": include({
        behaviorAlignment: gen("generateBehaviorAlignment", s.behaviorAlignment, s.behaviorExplanation || s.alignmentExplanation),
        behaviorResistance: gen("generateBehaviorResistance", s.behaviorResistance, s.resistanceExplanation),
        customerSupport: gen("generateCustomerSupport", s.customerSupport),
        behavioralNotes: gen("generateBehavioralNotes", s.behavioralNotes)
      }),
      "1-14": include({
        politicalStability: gen("generatePoliticalStability", s.politicalStability, s.politicalStabilityExplanation),
        regulatoryExposure: gen("generateRegulatoryExposure", s.regulatoryExposure, s.regulatoryExplanation),
        politicalRisk: gen("generatePoliticalRisk", s.politicalRisk),
        politicalNotes: gen("generatePoliticalNotes", s.politicalNotes)
      }),
      "1-15": include({
        marketTiming: gen("generateMarketTiming", s.marketTiming),
        implementationTiming: gen("generateImplementationTiming", s.implementationTiming),
        timeNotes: gen("generateTimeNotes", s.timeNotes)
      }),
      "1-16": include({
        risksSummary: gen("generateRisksSummary", s.risksTable),
        risksTable: gen("generateRisksTable", s.risksTable),
        contingencyPlan: gen("generateContingencyPlan", s.contingencyPlan, s.planExplanation),
        riskControl: gen("generateRiskControl", s.riskControl),
        riskNotes: gen("generateRiskNotes", s.riskNotes)
      }),
      "1-17": include({
        economicValue: gen("generateEconomicValue", s.economicValue, s.economicValueOtherText),
        gdpImpact: gen("generateGdpImpact", s.gdpImpact || s.gdpContribution, s.gdpImpactExplanation),
        economicFeasibility: gen("generateEconomicFeasibility", s.economicFeasibility),
        economicNotes: gen("generateEconomicNotes", s.economicNotes)
      }),
      "1-18": include({
        totalCapital: gen("generateTotalCapital", s.totalCapital),
        // Prefer assessment if present; fallback to old key for backward compatibility
        operationalCosts: gen("generateOperationalCosts", s.operationalCostsAssessment || s.operationalCosts),
        paybackPeriod: gen("generatePaybackPeriod", s.paybackPeriod),
        roiExpectation: gen("generateRoiExpectation", s.roiExpectation),
        financialFeasibility: gen("generateFinancialFeasibility", s.financialFeasibility),
        financialNotes: gen("generateFinancialNotes", s.financialNotes),
        // Keep a descriptive currency string to avoid raw synthesis later
        currency: ensureNoData((function(){
          const cur = s.selectedCurrency || s.currency || basicInfoData?.currency;
          return cur ? `Currency used: ${cur}` : "";
        })(), lang)
      }),
      "1-19": include({
        additionalInvestments: gen(
          "generateAdditionalInvestments",
          s.needsAdditionalInvestments || s.hasAdditionalInvestments,
          s.investmentsTable,
          s.investmentsPurpose
        ),
        investmentsTable: gen("generateInvestmentsTable", s.investmentsTable)
      })
    };
    return sectionInputs;
  }

  // Build the full, untrimmed payload for APL with exact order and formatting flags
  function buildAplPayload(coverPage, sectionInputs, surveyRaw, authorRaw, comparisonRaw, lang) {
    const requiredSectionIds = REQUIRED_SECTION_IDS;
    return {
      order: {
        pages: [
          "coverPage",
          "executiveSummary", // Page 2 includes executive summary and keywords
          "tableOfContents",
          ...requiredSectionIds.map((id) => `section:${id}`)
        ],
        requiredSectionIds
      },
      formatting: {
        paragraphsAlignment: "justify",
        coverPageAlignment: "center"
      },
      coverPage,
      sectionInputs,
      rawSurvey: surveyRaw || {},
      author: { fullName: authorRaw?.fullName || "", email: authorRaw?.email || "" },
      additionalInvestments: sectionInputs?.["1-19"]?.additionalInvestments || null,
      comparison: Array.isArray(comparisonRaw) || (comparisonRaw && typeof comparisonRaw === "object") ? comparisonRaw : null,
      language: lang,
      constraints: {
        forceFinancialSectionId: "1-18",
        includeAllFields: true,
        disallowTruncation: true
      }
    };
  }

  async function sendToApl(aplEndpoint, payload) {
    const res = await fetch(aplEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch (e) { throw new Error(`APL returned non-JSON body (status ${res.status}): ${text}`); }
    if (!res.ok) throw new Error(`APL request failed (status ${res.status}): ${JSON.stringify(json)}`);
    return json;
  }
  function humanizeStudyType(val) {
    const map = {
      preliminary: "Preliminary Feasibility Study",
      brief: "Brief Feasibility Study",
      comprehensive: "Comprehensive Feasibility Study"
    };
    if (!val) return val;
    const key = String(val).toLowerCase();
    return map[key] || val;
  }

  function reorderAndFillSections(sections, lang) {
    const byId = new Map();
    (Array.isArray(sections) ? sections : []).forEach((s) => {
      if (s && s.id) byId.set(s.id, s);
    });
    const out = [];
    for (const id of REQUIRED_SECTION_IDS) {
      if (byId.has(id)) {
        const section = byId.get(id);
        // ENFORCE correct title only
        section.title = DEFAULT_SECTION_TITLES[id] || section.title;
        // Ensure basic structure without adding content
        if (typeof section.content !== "string") section.content = "";
        if (!Array.isArray(section.tables)) section.tables = [];
        if (typeof section.wordCount !== "number") {
          section.wordCount = section.content ? section.content.trim().split(/\s+/).length : 0;
        }
        out.push(section);
      } else {
        // Create EMPTY section with correct title only
        const sec = {
          id,
          title: DEFAULT_SECTION_TITLES[id],
          content: "", // EMPTY - let AI fill it
          tables: [],  // EMPTY - let AI fill it
          wordCount: 0
        };
        out.push(sec);
      }
    }
    return out;
  }

  function safeParseJSON(text) {
    try {
      return JSON.parse(text);
    } catch (_) {
      const m = text && typeof text === "string" ? text.match(/\{[\s\S]*\}/) : null;
      if (m) {
        try { return JSON.parse(m[0]); } catch (_) {}
      }
      return null;
    }
  }

  function stripCodeFences(text) {
    if (typeof text !== "string") return text;
    const match = text.match(/```(?:json)?([\s\S]*?)```/i);
    if (match) return match[1].trim();
    return text;
  }

  function extractFirstJsonObjectString(text) {
    if (typeof text !== "string") return null;
    const cleaned = stripCodeFences(text).trim();
    const start = cleaned.indexOf("{");
    if (start === -1) return null;
    let inString = false;
    let escape = false;
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
      } else {
        if (ch === '"') {
          inString = true;
        } else if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth === 0) {
            return cleaned.slice(start, i + 1);
          }
        }
      }
    }
    return null;
  }

  function parseModelJsonOrThrow(text) {
    // Quick check: if response is a plain JSON object string, parse directly
    if (typeof text === "string") {
      const trimmed = text.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try { return JSON.parse(trimmed); } catch (_) { /* fallthrough to robust parse */ }
      }
    }
    const candidate = extractFirstJsonObjectString(text);
    if (!candidate) {
      throw new Error("AI response did not contain a JSON object." + (typeof text === "string" ? ` Raw: ${text.slice(0, 400)}...` : ""));
    }
    try {
      const obj = JSON.parse(candidate);
      // Basic validation for required structure, fill missing with placeholders
      if (!obj.sections || !Array.isArray(obj.sections)) obj.sections = [];
      return obj;
    } catch (err) {
      throw new Error(`Failed to parse AI JSON: ${(err && err.message) || err}. Raw JSON candidate: ${candidate.slice(0, 400)}...`);
    }
  }

  function renderReportView(report, lang) {
    try {
      if (typeof document === "undefined") return;
      // Clear any previous transient error once we have a report to show
      try {
        const ds = document.getElementById('data-status');
        if (ds) ds.innerHTML = '';
      } catch (_) {}
      const container = document.getElementById("report-view");
      if (!container) return;

      const title = (report && report.title) ? String(report.title) : "Feasibility Study";
      const cp = (report && report.coverPage) || {};
      const metaLines = [];
      if (cp.studyType) metaLines.push(String(cp.studyType));
      if (cp.projectName) metaLines.push(String(cp.projectName));
      if (cp.basicInfo && (cp.basicInfo.country || cp.basicInfo.city)) {
        const loc = [cp.basicInfo.country, cp.basicInfo.city].filter(Boolean).join(", ");
        if (loc) metaLines.push(`Location: ${loc}`);
      }
      const metaInfo = metaLines.join(" | ");

      const sections = Array.isArray(report?.sections) ? report.sections : [];
      const firstThree = sections.slice(0, 3).map((s) => {
        const sid = s && s.id ? String(s.id) : "";
        const st = s && s.title ? String(s.title) : "Section";
        return `<li>${sid ? sid + " - " : ""}${st}</li>`;
      }).join("");

      const escape = (s) => String(s).replace(/[&<>"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch] || ch));

      const html = [
        `<div style="background:#ffffff;color:#222;padding:16px;border-radius:8px;">`,
        `<h3 style="margin:0 0 8px 0;">${escape(title)}</h3>`,
        metaInfo ? `<div style="color:#555;margin-bottom:10px;">${escape(metaInfo)}</div>` : "",
        report && typeof report.executiveSummary === "string" && report.executiveSummary.trim()
          ? `<div style="margin:10px 0; line-height:1.5;"><strong>Summary (preview):</strong><br>${escape(report.executiveSummary.slice(0, 320))}${report.executiveSummary.length > 320 ? "…" : ""}</div>`
          : "",
        firstThree ? `<div style="margin-top:8px;"><strong>Sections (first 3):</strong><ul style="margin:6px 0 0 18px;">${firstThree}</ul></div>` : "",
        `</div>`
      ].join("");

      container.innerHTML = html;

      // Enable download button if present
      const dl = document.getElementById("download-pdf");
      if (dl) dl.disabled = false;
    } catch (_) {
      // non-fatal
    }
  }

  async function loadImageAsDataUrl(path) {
    try {
      const res = await fetch(path);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      return null;
    }
  }

  function toLocalizedNoData(lang) {
    switch ((lang || "en").toLowerCase()) {
      // Professional integration/refactor: shift to a gentle, actionable phrase
      // (Part of professional integration/refactor task)
      case "ar": return "البيانات مطلوبة";
      case "fr": return "Données requises";
      case "es": return "Se requieren datos";
      case "zh": return "需要数据";
      default: return "Data required";
    }
  }

  // Localized small helpers per requirements
  function localizedIssueDate(lang, dateObj) {
    const d = dateObj || new Date();
    const fmt = new Intl.DateTimeFormat(lang || 'en', { year: 'numeric', month: 'long', day: 'numeric' });
    return fmt.format(d);
  }

  function localizedConfidentialNote(lang) {
    const l = (lang || 'en').toLowerCase();
    if (l === 'ar') {
      return "سري: هذا المستند مخصص فقط لمالك المشروع والجهات ذات الصلة. يُحظر النسخ أو المشاركة دون إذن مسبق.";
    }
    // English default
    return "Confidential: This document is intended solely for the project owner and relevant stakeholders. Do not copy or distribute without prior permission.";
  }

  // --- Default content generators and validators ---
  function isNoDataString(val, lang) {
    if (typeof val !== "string") return false;
    const nd = toLocalizedNoData(lang);
    const t = val.trim();
    return t.toLowerCase() === nd.toLowerCase() || /\bno\s*data\s*provided\b/i.test(t);
  }

  function generateDefaultExecutiveSummary(lang) {
    // Aim for ~500-700 words synthesized overview when data is insufficient
    return "This executive summary provides a comprehensive, professionally structured overview of the project, covering the market opportunity, proposed solution, and the logical path from concept to implementation. It contextualizes the project within its sector and geographic setting, outlines core assumptions used in the preliminary analysis, and highlights the strategic rationale behind the initiative. The summary also previews the technical and operational configuration, the organizational model, and the financial logic used to evaluate viability, ensuring decision‑makers can grasp the key points quickly.\n\nMarket feasibility is assessed in terms of addressable demand, competitive intensity, and growth drivers. Based on the provided inputs, the summary discusses potential differentiation strategies and the expected positioning in relation to incumbent and emerging competitors. It outlines the intended marketing strategy and the channels most likely to reach the target audience effectively given cost constraints, expected customer behavior, and brand objectives.\n\nOn the technical and operational fronts, the summary introduces the technology stack and infrastructure considerations, identifies operational requirements and staffing needs, and flags dependencies that could affect business continuity. It also references regulatory and compliance factors relevant to licensing and permitting, as well as environmental and social considerations with potential impact on public acceptance and long‑term sustainability.\n\nFrom a risk perspective, the summary enumerates key uncertainties, including demand variability, cost overruns, regulatory changes, and execution hurdles. Where inputs are limited, conservative assumptions are applied and clearly stated. The initial economic view highlights expected value added and possible contributions to local GDP or trade, framing the project’s broader economic implications.\n\nFinancial feasibility is summarized with a high‑level view of revenue and cost assumptions, currency considerations, and the structure of capital requirements. The summary previews the financial projections presented later in the report—namely the income statement, balance sheet, cash flow, and key ratios—along with return metrics such as NPV, IRR, and payback period. Overall, the executive summary integrates these dimensions into a coherent narrative that supports informed decision‑making and guides subsequent due diligence.";
  }

  /* Removed to eliminate template content generation.
  function generateDefaultSectionContent(sectionId, lang, title) {
    const tt = title || `Section ${sectionId}`;
    return [
      `${tt}: This section frames the topic, clarifies the purpose of the analysis, and describes the lens used to interpret available information.`,
      `Analytical discussion: The narrative explores data relevance, drivers, and constraints.`,
      `Implications: The section distills insights into practical implications.`
    ].join("\n\n");
  }
  */

  /* Removed to eliminate template table generation.
  function defaultTablesForSection(sectionId, lang) {
    return [];
  }
  */

  /* Removed to eliminate template completion logic.
  function ensureSectionCompleteness(section, lang) {
    return section;
  }
  */

  function buildComparisonIfEnabled(existingComparison, comparisonSelection, lang) {
    const enabled = Array.isArray(comparisonSelection) && comparisonSelection.length > 0;
    if (!enabled) return null;
    const comp = existingComparison && typeof existingComparison === "object" ? existingComparison : {};
    comp.enabled = true;
    if (!comp.table || !Array.isArray(comp.table.headers) || !Array.isArray(comp.table.rows)) {
      const headers = ["Option", "Key Metric", "Est. Return", "Risk Level", "Liquidity"];
      const rows = comparisonSelection.map((opt) => [String(opt).replace(/_/g, " "), "Representative Index", "Est.", "Medium", "Medium"]);
      comp.table = { headers, rows };
    }
    if (!comp.notes || isNoDataString(comp.notes, lang)) {
      comp.notes = "Comparison analysis: The table contrasts alternative investment/placement options on return profile, risk exposure, and liquidity. Estimates are indicative and should be calibrated with current market data.";
    }
    return comp;
  }

  async function buildPdfDefinition(report, meta) {
    const lang = meta.language;
    const rtl = isRTL(lang);
    const logoPath = CONFIG?.BRAND?.LOGO_PATH || "/images/LOGO PH.png";
    const logoDataUrl = await loadImageAsDataUrl(logoPath);

    const watermarkText = CONFIG?.BRAND?.WATERMARK_TEXT || "PhoenixRizze.com\nFeasibility Study Simulator";

    const noDataText = toLocalizedNoData(lang);

    // Build content with TOC
    const tocItems = [];
    const content = [];

    // First page block (cover page)
    const cp = report.coverPage || {};
    const firstPage = {
      alignment: "center",
      margin: [0, 40, 0, 20],
      stack: [
        logoDataUrl ? { image: logoDataUrl, width: 120, margin: [0, 0, 0, 10] } : { text: "", margin: [0, 0, 0, 10] },
        { text: report.title || "Feasibility Study", style: "title" },
        { text: cp.studyType ? `${cp.studyType}` : (meta.projectInfo || ""), margin: [0, 6, 0, 6] },
        { text: cp.projectName ? `${cp.projectName}` : (meta.projectName || ""), margin: [0, 2, 0, 2] },
        { text: cp.projectDescription || "", margin: [0, 4, 0, 4] },
        { text: cp.visionMission || "", margin: [0, 2, 0, 8] },
        { text: (cp.basicInfo && Object.values(cp.basicInfo).filter(Boolean).join(" | ")) || meta.projectInfo || "", margin: [0, 4, 0, 4] },
        { text: (cp.author && cp.author.fullName) ? `Author: ${cp.author.fullName}${cp.author.email ? " | " + cp.author.email : ""}` : (meta.authorInfo || ""), margin: [0, 4, 0, 4] },
        { text: cp.timestamp ? `Timestamp: ${cp.timestamp.date} ${cp.timestamp.time}` : `Timestamp: ${meta.timestamp.date} ${meta.timestamp.time}`, margin: [0, 4, 0, 4] },
        { text: cp.confidentiality || meta.confidentiality || "Confidential – For internal analysis only", italics: true, color: "#666" },
        { text: "\n\n" }
      ]
    };

    content.push(firstPage);

    // Executive summary (Page 2) with keywords on the same page
    content.push({ text: "Summary", style: "h1", pageBreak: "before" });
    const execText = (typeof report.executiveSummary === "string") ? report.executiveSummary : "";
    content.push({ text: execText, style: "body" });
    if (Array.isArray(report.keywords) && report.keywords.length > 0) {
      content.push({ text: "\nKeywords:", style: "h3", margin: [0, 8, 0, 4] });
      content.push({ text: report.keywords.join(", "), style: "body" });
    }

    // Table of contents (simple manual TOC)
    const tocHeading = { text: "Table of Contents", style: "h1", pageBreak: "before" };
    content.push(tocHeading);
    const tocList = { ul: [], margin: [0, 8, 0, 16] };
    content.push(tocList);

    // Sections
    if (Array.isArray(report.sections)) {
      report.sections.forEach((sec, idx) => {
        const destId = (sec.id || `sec-${idx}`).replace(/\s+/g, "-");
        tocItems.push({ text: `${sec.id ? sec.id + " " : ""}${sec.title || "Section"}`, linkToDestination: destId, style: "tocItem" });
        content.push({ text: `${sec.id ? sec.id + " " : ""}${sec.title || "Section"}`, id: destId, style: "h2", pageBreak: "before" });
        // Do not synthesize section content; leave empty if missing
        const sectionBody = (typeof sec?.content === "string" && !/\bno\s*data\s*provided\b/i.test(sec.content)) ? sec.content : "";
        content.push({ text: sectionBody, style: "body" });
        if (Array.isArray(sec.tables)) {
          sec.tables.forEach((t) => {
            if (!t || !Array.isArray(t.headers) || !Array.isArray(t.rows)) return;
            const sanitized = sanitizeTableData(t.headers, t.rows);
            const table = {
              table: {
                headerRows: 1,
                widths: Array(sanitized.headers.length).fill("*"),
                body: [
                  sanitized.headers,
                  ...sanitized.rows
                ]
              },
              layout: "lightHorizontalLines",
              margin: [0, 8, 0, 12]
            };
            content.push({ text: t.title || "", style: "h3" });
            content.push(table);
          });
        }
      });
    }

    // Comparison
    if (report.comparison && report.comparison.enabled) {
      const destId = "comparison-2-1";
      tocItems.push({ text: "2-1 Comparison", linkToDestination: destId, style: "tocItem" });
      content.push({ text: "2-1 Comparison", id: destId, style: "h2", pageBreak: "before" });
      // Ensure comparison table exists; synthesize if missing
      const fallBackComp = buildComparisonIfEnabled(report.comparison, [], lang) || report.comparison;
      const tableDef = (fallBackComp && fallBackComp.table) || report.comparison.table;
      if (tableDef && Array.isArray(tableDef.headers) && Array.isArray(tableDef.rows)) {
        const sanitized = sanitizeTableData(tableDef.headers, tableDef.rows);
        content.push({
          table: {
            headerRows: 1,
            widths: Array(sanitized.headers.length).fill("*"),
            body: [sanitized.headers, ...sanitized.rows]
          },
          layout: "lightHorizontalLines"
        });
      }
      const compNotes = (fallBackComp && fallBackComp.notes) || report.comparison.notes || "Comparison analysis generated based on selected options.";
      content.push({ text: compNotes, style: "body", margin: [0, 6, 0, 0] });
    }

    // Disclaimers at the end
    if (Array.isArray(report.disclaimers) && report.disclaimers.length > 0) {
      content.push({ text: "Disclaimers", style: "h1", pageBreak: "before" });
      report.disclaimers.forEach((d) => {
        if (!d) return;
        content.push({ text: String(d), style: "body", margin: [0, 2, 0, 2] });
      });
    }

    // Populate ToC list
    tocList.ul = tocItems;

    const doc = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: CONFIG?.PDF?.DEFAULT_FONT || "Roboto",
        alignment: "justify"
      },
      styles: {
        title: { fontSize: 20, bold: true, alignment: "center", color: CONFIG?.PDF?.PRIMARY_COLOR || "#2c3e50" },
        h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
        h2: { fontSize: 14, bold: true, margin: [0, 6, 0, 6] },
        h3: { fontSize: 12, bold: true, margin: [0, 6, 0, 4] },
        body: { fontSize: 10, lineHeight: 1.3 },
        tocItem: { fontSize: 10, color: CONFIG?.PDF?.SECONDARY_COLOR || "#3498db" }
      },
      // Header with logo on subsequent pages
      header: function (currentPage) {
        if (currentPage === 1) return null;
        const logo = logoDataUrl ? { image: logoDataUrl, width: 70 } : { text: "" };
        return {
          columns: rtl ? [ { text: "", width: "*" }, logo ] : [ logo, { text: "", width: "*" } ],
          margin: [40, 15, 40, 0]
        };
      },
      // Footer with page numbers (not on first page)
      footer: function (currentPage, pageCount) {
        if (currentPage === 1) return null;
        return { text: `${currentPage} / ${pageCount}`, alignment: "center", margin: [0, 0, 0, 20], fontSize: 9, color: "#666" };
      },
      // Watermark on all pages
      background: function () {
        return {
          text: watermarkText,
          color: "#cccccc",
          opacity: 0.15,
          bold: true,
          italics: true,
          fontSize: 40,
          alignment: "center",
          margin: [0, 250, 0, 0]
        };
      },
      content
    };

    // Note: For Arabic or RTL languages, you may need an Arabic-capable font in VFS.
    // Where to update fonts/design: Replace vfs_fonts.js and set defaultStyle.font accordingly.

    return doc;
  }

  function fileNameFromProject(projectName) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    // {YYYYMMDD-HHMM}
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const base = (projectName || "Project").replace(/[^\w\-]+/g, "-");
    return `${base}-Feasibility-Report-${stamp}.pdf`;
  }

  async function generateAIReport() {
    const lang = await getPreferredLanguage();
    const timestamp = nowTimestamp();

    // [BUGFIX DOC] Canonical key retrieval ensures consistent data across pages; replaces legacy aliases. Change exclusive to this file.
    let projectName = '';
    let projectType = '';
    let projectSector = '';
    let userName = '';
    let userEmail = '';
    let userPhone = '';
    try {
      projectName = await readStringLoose('projectName', '') || '';
    } catch (_) { projectName = ''; }
    try {
      projectType = await readStringLoose('projectType', '') || '';
    } catch (_) { projectType = ''; }
    try {
      projectSector = await readStringLoose('projectSector', '') || '';
    } catch (_) { projectSector = ''; }
    try { userName = await getCanonicalUserName() || ''; } catch (_) { userName = ''; }
    try { userEmail = await readStringLoose('userEmail', '') || ''; } catch (_) { userEmail = ''; }
    try { userPhone = await readStringLoose('userPhone', '') || ''; } catch (_) { userPhone = ''; }

    // [BUGFIX DOC] Robust null/undefined handling for parallel survey texts. Change exclusive to this file.
    let aiReportData;
    try {
      aiReportData = await readJSON('surveyData', []);
    } catch (e) {
      aiReportData = [];
      try { alert('Survey data is corrupt or missing'); } catch (_) {}
    }

    const basicInfoRaw = await readStartForm();
    const surveyRaw = await collectSurveyData();
    const authorRaw = await collectAuthorFromDashboard();
    const userInfo = await readJSON('userInfo', {});
    // [MAPPING CONSISTENCY & DATA INTEGRATION FIX] Pre-validation debug of required fields and surveyData length
    try {
      console.debug('INTEGRATION CHECK', {
        projectName,
        projectType,
        projectSector,
        userName,
        userEmail,
        surveyDataLength: Array.isArray(aiReportData) ? aiReportData.length : 0
      });
    } catch (_) {}

    // [AI PROMPT VALIDATION & FORMATTING]
    // Validate completeness and warn; do not block generation to allow best-effort output
    try {
      const hasAllStrings = [projectName, projectType, projectSector, userName, userEmail].every(function(v){ return typeof v === 'string' && v.trim().length > 0; });
      const hasSurvey = Array.isArray(aiReportData) && aiReportData.length > 0;
      if (!hasAllStrings || !hasSurvey) {
        showDataStatusWarning('Some required fields are missing. The report will be generated with available data.');
      }
    } catch (_) {}

    // Comparison selection: respect user's picks from the UI if available
    const comparisonRaw = await (async function(){
      try {
        // Preferred: read pre-saved comparison answers from IndexedDB if available
        const saved = await readJSON('comparisonAnswers', null);
        if (Array.isArray(saved)) return saved;
        if (Array.isArray(window.__lastComparisonSelection)) {
          return window.__lastComparisonSelection.slice();
        }
        // Fallback: read from DOM if checkboxes exist
        if (typeof document !== 'undefined') {
          const ids = ['compare-cryptocurrencies','compare-stocks','compare-metals','compare-bonds','compare-deposits','compare-real-estate','compare-mutual-funds'];
          const selected = ids.map(id => {
            const el = document.getElementById(id);
            return el && el.checked ? id.replace('compare-','') : null;
          }).filter(Boolean);
          return selected;
        }
      } catch(_) {}
      return [];
    })();

    // Normalize and enrich
    const coverPage = {
      studyType: ensureNoData(humanizeStudyType(basicInfoRaw?.studyType), lang),
      // [BUGFIX DOC] Prefer canonical localStorage values with fallback to form to ensure unification. Change exclusive to this file.
      projectName: ensureNoData(projectName || basicInfoRaw?.projectName, lang),
      projectDescription: ensureNoData(basicInfoRaw?.projectDescription, lang),
      visionMission: ensureNoData(basicInfoRaw?.visionMission || basicInfoRaw?.notes, lang),
      basicInfo: {
        // [BUGFIX DOC] Use canonical 'projectSector' and 'projectType' unified keys. Change exclusive to this file.
        sector: ensureNoData(projectSector || basicInfoRaw?.projectSector || basicInfoRaw?.sector, lang),
        projectType: ensureNoData(projectType || basicInfoRaw?.projectType || basicInfoRaw?.specifiedProjectType, lang),
        specifiedProjectType: ensureNoData(basicInfoRaw?.specifiedProjectType, lang),
        country: ensureNoData(basicInfoRaw?.country || userInfo?.country || userInfo?.userCountry, lang),
        city: ensureNoData(basicInfoRaw?.city || userInfo?.city || userInfo?.userCity, lang),
        area: ensureNoData(basicInfoRaw?.area, lang),
        fundingMethod: ensureNoData(basicInfoRaw?.fundingMethod, lang),
        personalContribution: ensureNoData(basicInfoRaw?.personalContribution, lang),
        loanAmount: ensureNoData(basicInfoRaw?.loanAmount, lang),
        interestValue: ensureNoData(basicInfoRaw?.interestValue, lang),
        currency: ensureNoData(basicInfoRaw?.currency, lang),
        totalCapital: ensureNoData(basicInfoRaw?.totalCapital, lang),
        loanMonths: ensureNoData(basicInfoRaw?.loanMonths, lang),
        targetAudience: ensureNoData(basicInfoRaw?.targetAudience, lang),
        projectStatus: ensureNoData(basicInfoRaw?.projectStatus, lang),
        duration: ensureNoData(basicInfoRaw?.duration, lang),
        durationUnit: ensureNoData(basicInfoRaw?.durationUnit, lang)
      },
      author: { fullName: ensureNoData(userName || authorRaw?.fullName, lang), email: ensureNoData(userEmail || authorRaw?.email, lang) },
      timestamp: Object.assign({}, timestamp, { formatted: ensureNoData(timestamp?.formatted, lang), issueDate: localizedIssueDate(lang) }),
      confidentiality: localizedConfidentialNote(lang)
    };

  const sectionInputs = buildSectionInputsOrdered(surveyRaw, basicInfoRaw, lang);
  try { console.debug('Section inputs (canonicalized):', sectionInputs); } catch (_) {}

    // Read structured financial statements saved by pre-feasibility logic (if available)
    const financialMirror = (function () {
      const fs = surveyRaw && surveyRaw.financialStatements;
      if (!fs || typeof fs !== "object") return null;
      const out = {};
      if (Array.isArray(fs.assumptions)) out.assumptions = fs.assumptions;
      if (fs.incomeStatement && Array.isArray(fs.incomeStatement.headers)) out.incomeStatement = fs.incomeStatement;
      if (fs.balanceSheet && Array.isArray(fs.balanceSheet.headers)) out.balanceSheet = fs.balanceSheet;
      if (fs.cashFlow && Array.isArray(fs.cashFlow.headers)) out.cashFlow = fs.cashFlow;
      if (Array.isArray(fs.ratios)) out.ratios = fs.ratios;
      if (fs.roi) out.roi = fs.roi;
      return Object.keys(out).length ? out : null;
    })();

    // Attach financial mirror to section inputs for 1-18 so the AI sees and uses exact data
    try {
      if (financialMirror && sectionInputs && sectionInputs["1-18"]) {
        sectionInputs["1-18"].financialStatements = Object.assign({}, sectionInputs["1-18"].financialStatements || {}, financialMirror);
      }
    } catch (_) {}

    // If an APL endpoint is configured, send FULL untrimmed payload without any truncation (preferred)
    if (CONFIG.APL_ENDPOINT) {
      const aplPayload = buildAplPayload(coverPage, sectionInputs, surveyRaw, authorRaw, comparisonRaw, lang);
      try {
        const aplResponse = await sendToApl(CONFIG.APL_ENDPOINT, aplPayload);
        let aplReport = aplResponse && (aplResponse.report || aplResponse);
        if (!aplReport || typeof aplReport !== "object") throw new Error("APL response missing report object");
        // Enforce required order locally just in case
        aplReport.sections = reorderAndFillSections(aplReport.sections, lang);
        if (!aplReport.coverPage) aplReport.coverPage = coverPage;

        window.__generatedReport = {
          report: aplReport,
          meta: {
            language: lang,
            timestamp,
            projectName: coverPage?.projectName || aplReport?.title || "Project",
            projectInfo: [
              coverPage?.projectName ? `Project: ${coverPage.projectName}` : null,
              coverPage?.basicInfo?.sector ? `Sector: ${coverPage.basicInfo.sector}` : null,
              coverPage?.basicInfo?.projectType ? `Type: ${coverPage.basicInfo.projectType}` : null,
              (coverPage?.basicInfo?.country || coverPage?.basicInfo?.city) ? `Location: ${[coverPage.basicInfo.country, coverPage.basicInfo.city].filter(Boolean).join(", ")}` : null
            ].filter(Boolean).join(" | "),
            authorInfo: [
              coverPage?.author?.fullName ? `Author: ${coverPage.author.fullName}` : null,
              coverPage?.author?.email ? `Email: ${coverPage.author.email}` : null
            ].filter(Boolean).join(" | "),
            confidentiality: "Confidential – For internal analysis only"
          }
        };
        renderReportView(aplReport, lang);
        return;
      } catch (aplErr) {
        const errMsg = "AI service is currently unavailable. Please contact support to enable the report generator.";
        console.error(errMsg, aplErr);
        try { showDataStatusWarning(errMsg); } catch (_) {}
        try { alert(errMsg); } catch (_) {}
        return;
      }
    }

    // No APL? Fall back to direct OpenAI calls from the browser if a key is available.
    // NOTE: This client-side call path is intended for local/testing only and is NOT secure for production.
    (function(){ try { /* doc comment only */ } catch(_){} })();
    let hasDirectKey = false;
    try {
      const k = (CONFIG && typeof CONFIG.OPENAI_API_KEY === 'string') ? CONFIG.OPENAI_API_KEY.trim() : '';
      hasDirectKey = k.length > 0;
    } catch(_) { hasDirectKey = false; }
    if (!hasDirectKey) {
      const errMsg = "AI service is not configured. Please contact support to enable the report generator.";
      try { showDataStatusWarning(errMsg); } catch (_) {}
      try { alert(errMsg); } catch (_) {}
      return;
    }

    // Validate presence of core datasets; synthesize minimal estimates if gaps exist
    function synthesizeEstimates(si, start) {
      // Do not inject hardcoded placeholders; only ensure currency presence if available
      try {
        const out = {};
        const s118 = si && si["1-18"] ? { ...si["1-18"] } : {};
        if (!s118.currency) {
          const cur = (start && start.currency) ? start.currency : undefined;
          if (cur) s118.currency = `Currency used: ${cur}`;
        }
        if (Object.keys(s118).length) out["1-18"] = s118;
        return Object.assign({}, si, out);
      } catch (_) {
        return si || {};
      }
    }

    const sectionInputsSynth = synthesizeEstimates(sectionInputs, basicInfoRaw);

    const data = deepFilter({
      coverPage,
      sectionInputs: sectionInputsSynth,
      rawSurvey: surveyRaw,
      comparison: comparisonRaw,
      language: lang,
      financial: financialMirror
    });

    // Persist comparison selection for downstream synthesis
    try { window.__lastComparisonSelection = Array.isArray(comparisonRaw) ? comparisonRaw.slice() : []; } catch (_) {}

    // Prepare sanitized datasets and prompts
    const cleanFull = fitDataToLimit(data, 40000);
    const expert = sanitizeString(CONFIG.EXPERT_PROMPT_TEXT || "", 800);

    // Try a small dataset first to validate JSON-only behavior
    const smallSubset = deepFilter({
      coverPage: {
        studyType: cleanFull.coverPage?.studyType,
        projectName: cleanFull.coverPage?.projectName,
        projectDescription: cleanFull.coverPage?.projectDescription,
        visionMission: cleanFull.coverPage?.visionMission,
        basicInfo: cleanFull.coverPage?.basicInfo,
        author: cleanFull.coverPage?.author,
        timestamp: cleanFull.coverPage?.timestamp,
        confidentiality: cleanFull.coverPage?.confidentiality
      },
      requestedOrder: [
        "coverPage",
        "executiveSummary",
        "tableOfContents",
        ...REQUIRED_SECTION_IDS.map((id) => `section:${id}`)
      ],
      sectionInputs: cleanFull.sectionInputs,
      comparison: Array.isArray(cleanFull.comparison) ? cleanFull.comparison.slice(0, 5) : [],
      language: cleanFull.language
    });

    // Do not use or require frontend API keys; backend must handle provider auth
    const apiKey = undefined;

    let initialReport;
    try {
      const smallPrompt = buildPrompt(lang, expert, fitDataToLimit(smallSubset, 12000), { includeMeta: true, includeComparison: false });
      const smallContent = await callOpenAI(apiKey, smallPrompt, buildPlainContextStrings(coverPage, aiReportData));
      initialReport = parseModelJsonOrThrow(smallContent);
    } catch (err) {
      // If tiny parse fails, attempt chunked generation immediately
      const chunked = await (async () => {
        // split into three chunks
        const ids = [];
        for (let i = 1; i <= 19; i++) ids.push(`1-${i}`);
        const size = Math.ceil(ids.length / 3);
        const chunks = [ids.slice(0, size), ids.slice(size, size * 2), ids.slice(size * 2)];
        const parts = [];
        for (let i = 0; i < chunks.length; i++) {
          const partPrompt = buildPrompt(lang, expert, fitDataToLimit(cleanFull, 30000), { requestedSectionIds: chunks[i], includeMeta: i === 0, includeComparison: i === chunks.length - 1 });
          const raw = await callOpenAI(apiKey, partPrompt, buildPlainContextStrings(coverPage, aiReportData));
          parts.push(parseModelJsonOrThrow(raw));
        }
        const merged = { title: "", language: lang, executiveSummary: "", sections: [], comparison: null, keywords: [], disclaimers: [] };
        parts.forEach((p, idx) => {
          if (idx === 0) {
            merged.title = p.title || merged.title;
            merged.language = p.language || merged.language;
            merged.executiveSummary = p.executiveSummary || merged.executiveSummary;
            if (Array.isArray(p.keywords)) merged.keywords = p.keywords;
            if (Array.isArray(p.disclaimers)) merged.disclaimers = p.disclaimers;
          } else {
            if (Array.isArray(p.keywords)) merged.keywords = Array.from(new Set([...(merged.keywords||[]), ...p.keywords]));
            if (Array.isArray(p.disclaimers)) merged.disclaimers = Array.from(new Set([...(merged.disclaimers||[]), ...p.disclaimers]));
          }
          if (Array.isArray(p.sections)) {
            const existing = new Set(merged.sections.map(s => s.id));
            p.sections.forEach(s => { if (s && s.id && !existing.has(s.id)) { merged.sections.push(s); existing.add(s.id); } });
          }
          if (p.comparison && p.comparison.enabled) merged.comparison = p.comparison;
        });
        return merged;
      })();
      initialReport = chunked;
    }

    // Try with full clean data; fall back to 2 or 3 chunk merge if needed
    let finalReportObj = initialReport;
    try {
      const fullPrompt = buildPrompt(lang, expert, cleanFull, { includeMeta: true, includeComparison: true });
      // [AI PROMPT FORMAT FIX] Ensure extraUserStrings are plain strings only (already enforced by buildPlainContextStrings)
      const fullContent = await callOpenAI(apiKey, fullPrompt, buildPlainContextStrings(coverPage, aiReportData));
      finalReportObj = parseModelJsonOrThrow(fullContent);
    } catch (_) {
      try {
        // two chunks
        const ids = [];
        for (let i = 1; i <= 19; i++) ids.push(`1-${i}`);
        const size = Math.ceil(ids.length / 2);
        const chunks = [ids.slice(0, size), ids.slice(size)];
        const parts = [];
        for (let i = 0; i < chunks.length; i++) {
          const partPrompt = buildPrompt(lang, expert, fitDataToLimit(cleanFull, 30000), { requestedSectionIds: chunks[i], includeMeta: i === 0, includeComparison: i === chunks.length - 1 });
          const raw = await callOpenAI(apiKey, partPrompt, buildPlainContextStrings(coverPage, aiReportData));
          parts.push(parseModelJsonOrThrow(raw));
        }
        const merged = { title: "", language: lang, executiveSummary: "", sections: [], comparison: null, keywords: [], disclaimers: [] };
        parts.forEach((p, idx) => {
          if (idx === 0) {
            merged.title = p.title || merged.title;
            merged.language = p.language || merged.language;
            merged.executiveSummary = p.executiveSummary || merged.executiveSummary;
            if (Array.isArray(p.keywords)) merged.keywords = p.keywords;
            if (Array.isArray(p.disclaimers)) merged.disclaimers = p.disclaimers;
          } else {
            if (Array.isArray(p.keywords)) merged.keywords = Array.from(new Set([...(merged.keywords||[]), ...p.keywords]));
            if (Array.isArray(p.disclaimers)) merged.disclaimers = Array.from(new Set([...(merged.disclaimers||[]), ...p.disclaimers]));
          }
          if (Array.isArray(p.sections)) {
            const existing = new Set(merged.sections.map(s => s.id));
            p.sections.forEach(s => { if (s && s.id && !existing.has(s.id)) { merged.sections.push(s); existing.add(s.id); } });
          }
          if (p.comparison && p.comparison.enabled) merged.comparison = p.comparison;
        });
        finalReportObj = merged;
      } catch (e2) {
        // three chunks
        const ids = [];
        for (let i = 1; i <= 19; i++) ids.push(`1-${i}`);
        const size = Math.ceil(ids.length / 3);
        const chunks = [ids.slice(0, size), ids.slice(size, size * 2), ids.slice(size * 2)];
        const parts = [];
        for (let i = 0; i < chunks.length; i++) {
          const partPrompt = buildPrompt(lang, expert, fitDataToLimit(cleanFull, 30000), { requestedSectionIds: chunks[i], includeMeta: i === 0, includeComparison: i === chunks.length - 1 });
          const raw = await callOpenAI(apiKey, partPrompt, buildPlainContextStrings(coverPage, aiReportData));
          parts.push(parseModelJsonOrThrow(raw));
        }
        const merged = { title: "", language: lang, executiveSummary: "", sections: [], comparison: null, keywords: [], disclaimers: [] };
        parts.forEach((p, idx) => {
          if (idx === 0) {
            merged.title = p.title || merged.title;
            merged.language = p.language || merged.language;
            merged.executiveSummary = p.executiveSummary || merged.executiveSummary;
            if (Array.isArray(p.keywords)) merged.keywords = p.keywords;
            if (Array.isArray(p.disclaimers)) merged.disclaimers = p.disclaimers;
          } else {
            if (Array.isArray(p.keywords)) merged.keywords = Array.from(new Set([...(merged.keywords||[]), ...p.keywords]));
            if (Array.isArray(p.disclaimers)) merged.disclaimers = Array.from(new Set([...(merged.disclaimers||[]), ...p.disclaimers]));
          }
          if (Array.isArray(p.sections)) {
            const existing = new Set(merged.sections.map(s => s.id));
            p.sections.forEach(s => { if (s && s.id && !existing.has(s.id)) { merged.sections.push(s); existing.add(s.id); } });
          }
          if (p.comparison && p.comparison.enabled) merged.comparison = p.comparison;
        });
        finalReportObj = merged;
      }
    }

    // Enforce required structure and section order; ensure justified content expectations
    try {
      // Enforce comparison presence when enabled by user selection
      const comparisonSelection = Array.isArray(data?.comparison) ? data.comparison : Array.isArray((window.__lastComparisonSelection)) ? window.__lastComparisonSelection : [];
      if (Array.isArray(comparisonSelection)) {
        finalReportObj.comparison = buildComparisonIfEnabled(finalReportObj.comparison, comparisonSelection, lang);
      }

      // Reorder and auto-complete all sections with intros, tables, and analysis
      finalReportObj.sections = reorderAndFillSections(finalReportObj.sections, lang);

      // Ensure financial mirror is present on the final report for downstream consumers
      if (financialMirror) {
        finalReportObj.financial = financialMirror;
      }

      // Inject structured financial statements into Section 1-18 as tables if available
      if (financialMirror) {
        const tables = financialStatementsToTables(financialMirror);
        if (tables && tables.length) {
          const idx = finalReportObj.sections.findIndex((s) => s && s.id === "1-18");
          if (idx >= 0) {
            const sec = finalReportObj.sections[idx] || { id: "1-18", title: DEFAULT_SECTION_TITLES["1-18"], content: "", tables: [] };
            if (!Array.isArray(sec.tables)) sec.tables = [];
            // Prefer appending our structured tables, preserving any AI-provided ones
            sec.tables = [...sec.tables, ...tables];
            finalReportObj.sections[idx] = sec;
          }
        }
      }

      // Ensure coverPage exists (coverPage may include localized no-data strings; allowed only here)
      if (!finalReportObj.coverPage) finalReportObj.coverPage = coverPage;

      // Executive summary must be present and target 500–700 words; if short, synthesize
      const execWords = typeof finalReportObj.executiveSummary === "string" ? finalReportObj.executiveSummary.trim().split(/\s+/).length : 0;
      if (typeof finalReportObj.executiveSummary !== "string" || isNoDataString(finalReportObj.executiveSummary, lang) || execWords < 300) {
        finalReportObj.executiveSummary = generateDefaultExecutiveSummary(lang);
      }

      // Guarantee Section 1-1 exists and uses the correct title; avoid injecting template content
      const introIdx = finalReportObj.sections.findIndex(s => s && s.id === "1-1");
      if (introIdx >= 0) {
        const introSec = finalReportObj.sections[introIdx] || { id: "1-1" };
        introSec.title = DEFAULT_SECTION_TITLES["1-1"];
        if (typeof introSec.content !== "string") introSec.content = introSec.content ? String(introSec.content) : "";
        if (!Array.isArray(introSec.tables)) introSec.tables = [];
        if (typeof introSec.wordCount !== "number") introSec.wordCount = introSec.content ? introSec.content.trim().split(/\s+/).length : 0;
        finalReportObj.sections[introIdx] = introSec;
      }

      // Do not replace missing content with templates; leave as-is for AI to fill
    } catch (_) { /* non-fatal */ }

    // Store for PDF generation
      window.__generatedReport = {
      report: finalReportObj,
      meta: {
        language: lang,
        timestamp,
        projectName: coverPage?.projectName || finalReportObj?.title || "Project",
        projectInfo: [
          coverPage?.projectName ? `Project: ${coverPage.projectName}` : null,
          coverPage?.basicInfo?.sector ? `Sector: ${coverPage.basicInfo.sector}` : null,
          coverPage?.basicInfo?.projectType ? `Type: ${coverPage.basicInfo.projectType}` : null,
          (coverPage?.basicInfo?.country || coverPage?.basicInfo?.city) ? `Location: ${[coverPage.basicInfo.country, coverPage.basicInfo.city].filter(Boolean).join(", ")}` : null
          ].filter(Boolean).join(" | "),
        authorInfo: [
          coverPage?.author?.fullName ? `Author: ${coverPage.author.fullName}` : null,
          coverPage?.author?.email ? `Email: ${coverPage.author.email}` : null
        ].filter(Boolean).join(" | "),
        confidentiality: "Confidential – For internal analysis only"
      }
    };

    renderReportView(finalReportObj, lang);
  }

  async function downloadPDF() {
    if (!window.__generatedReport || !window.__generatedReport.report) {
      alert("Please generate the report first.");
      return;
    }
    const { report, meta } = window.__generatedReport;
    // Try to enforce justified alignment across the document
    const docDef = await buildPdfDefinition(report, meta);
    if (docDef && docDef.defaultStyle) {
      docDef.defaultStyle.alignment = "justify";
    }

    // Where to add report saving logic if needed:
    // If later you want to save a report copy to a server/database, add upload logic here
    // (e.g., send docDef or the generated blob to your backend).

    if (typeof pdfMake === "undefined") {
      alert("pdfmake is not loaded.");
      return;
    }

    const fname = fileNameFromProject(window.__generatedReport?.meta?.projectName || report?.title || "Project");
    pdfMake.createPdf(docDef).download(fname);
  }

  // Expose API
  window.AIReport = {
    generateReport: (typeof generateAIReport !== "undefined") ? generateAIReport : undefined,
    downloadPDF: (typeof downloadPDF !== "undefined") ? downloadPDF : undefined,
    // Optional: expose APL_KEY if provided by another module
    APL_KEY: (typeof APL_KEY !== "undefined") ? APL_KEY : undefined
  };

  // Wire buttons if present (removed DOM access; integrate UI externally)

  // If web browsing is not available via GPT-4o mini, add external API integration here
  // for comparison data (e.g., Yahoo Finance, Trading APIs). Then merge results into
  // the report before PDF generation.
  // Ensure only unified interface is used; remove legacy exposure

// Unified DOMContentLoaded listener for initializing UI logic

document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('generate-report');
  var agreeTerms = document.getElementById('agree-terms');
  var reportView = document.getElementById('report-view');
  if (btn) {
    btn.addEventListener('click', async function() {
      if (agreeTerms && !agreeTerms.checked) {
        alert('Please agree to the terms and conditions before generating the report.');
        return;
      }
      btn.disabled = true;
      var originalText = btn.textContent;
      btn.textContent = 'Generating...';
      if (reportView) {
        reportView.innerHTML = `
          <div style="padding:12px; color:#444; font-size:1.1em; text-align:center;">
            <strong>Report is being generated.</strong><br>
            Please wait until the process is complete.<br>
            This may take a few minutes.
          </div>
        `;
      }
      try {
        if (window.AIReport && typeof window.AIReport.generateReport === 'function') {
          await window.AIReport.generateReport();
        } else {
          alert('AI report module is not loaded.');
        }
      } catch (err) {
        const msg = (err && err.message) ? err.message : 'An unexpected error occurred while generating the report.';
        alert(`Sorry, we couldn't generate the report right now.\n\nDetails: ${msg}`);
        console.error('Generate report failed:', err);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }
  const dlBtn = document.getElementById('download-pdf');
  if (dlBtn) {
      dlBtn.addEventListener('click', function() {
          if (window.AIReport && typeof window.AIReport.downloadPDF === 'function') {
              window.AIReport.downloadPDF();
          }
      });
  }

  // Professional integration/refactor: live UI synchronization when storage changes
  // (Part of professional integration/refactor task)
  try {
    window.addEventListener('storage', function(e) {
      if (!e || !e.key) return;
      if (['feasibilityStudyAnswers','simulatedFeasibilityAnswers','startFeasibilityForm','comparisonAnswers'].includes(e.key)) {
        try {
          // If a report is already generated, keep the preview updated
          if (window.__generatedReport && window.__generatedReport.report) {
            renderReportView(window.__generatedReport.report, getPreferredLanguage());
          } else if (typeof window.__refreshPreFeasibilityUI === 'function') {
            window.__refreshPreFeasibilityUI();
          }
        } catch (_) {}
      }
    });
  } catch (_) {}
});
