(() => {
    const STORAGE_KEY = 'feasibilityStudyAnswers';

    /*
     * STORAGE MIGRATION: LocalStorage -> IndexedDB (Dexie.js)
     * This file now persists and reads all data via `FeasibilityDB` (see feasibility-db.js),
     * using async/await. All prior localStorage usages have been refactored.
     * Important: Any new storage operations MUST use the async DB helpers below.
     */
    const DB = {
        // Ensure FeasibilityDB is initialized before any operation
        ensureReady: async () => {
            if (typeof window === 'undefined' || !window) throw new Error('Window unavailable');
            if (!window.FeasibilityDB) throw new Error('FeasibilityDB unavailable');
            try {
                if (typeof window.FeasibilityDB.whenReady === 'function') {
                    await window.FeasibilityDB.whenReady();
                }
            } catch (_) {}
        },
        getJSON: async (key, fallback) => {
            try {
                await DB.ensureReady();
                return await window.FeasibilityDB.getJSON(key, fallback);
            } catch (_) {
                try { console.warn('[storage] getJSON failed for', key); } catch(_) {}
                return (fallback === undefined ? null : fallback);
            }
        },
        setJSON: async (key, value) => {
            try {
                await DB.ensureReady();
                await window.FeasibilityDB.setJSON(key, value);
            } catch (e) {
                try { alert('Unable to save your data.'); } catch(_) {}
                throw e;
            }
        },
        getString: async (key, fallback) => {
            try {
                await DB.ensureReady();
                return await window.FeasibilityDB.getString(key, fallback);
            } catch (_) {
                try { console.warn('[storage] getString failed for', key); } catch(_) {}
                return (fallback === undefined ? null : fallback);
            }
        },
        setString: async (key, value) => {
            try {
                await DB.ensureReady();
                await window.FeasibilityDB.setString(key, value);
            } catch (e) {
                try { alert('Unable to save your data.'); } catch(_) {}
                throw e;
            }
        },
        remove: async (key) => {
            try {
                await DB.ensureReady();
                await window.FeasibilityDB.remove(key);
            } catch (_) {}
        }
    };
    let __feasibilityUnifiedSchemaCache = null;

    // ===== CENTRAL FIELD MAPPING SYSTEM =====
    // Maps HTML field names to JavaScript field names
    const FIELD_MAPPING = {
        // [BUGFIX DOC] Data key mapping gaps allowed inconsistent, lossy keys across pages. We add canonical keys and unify aliases to guarantee lossless, synchronized data. Change limited to this file only.

        // === Project Idea Description ===
        'main-product': 'projectIdea',
        'problem-solved': 'problemSolution',
        'business-model': 'businessModel',
        'bm-other-text': 'businessModelOther',
        'distribution-channels': 'distributionChannels',

        // === Market Data ===
        'market-size': 'marketSize',
        'customer-count': 'potentialCustomers',
        'growth-rate': 'growthRate',
        'growth-factors': 'growthFactors',
        'competitors': 'competitorsCount',
        'market-gap': 'marketGap',
        'gap-explanation': 'gapExplanation',
        'market-demand': 'marketFeasibility',
        'demand-notes': 'marketNotes',

        // === Marketing Data ===
        'min-age': 'targetAgeMin',
        'max-age': 'targetAgeMax',
        'customer-income': 'customerIncome',
        'marketing-channels': 'marketingChannels',
        // Canonical additions for plan/channels mirrors
        'marketing-plan': 'marketingPlan',
        'marketing-cost': 'marketingCost',
        'competitive-advantage': 'competitiveAdvantage',
        'customer-reach': 'reachability',
        'reach-notes': 'marketingNotes',

        // === Technical & Operational Data ===
        'traffic': 'locationTraffic',
        'parking': 'parkingAvailability',
        'attraction-points': 'attractionPoints',
        'attr-other-text': 'otherAttractionsText',
        'required-area': 'requiredArea',
        'property': 'ownershipType',
        'property-cost': 'propertyPrice',
        'initial-inventory': 'inventoryValue',
        'main-products': 'goodsTypes',
        'tech-feasibility': 'technicalFeasibility',
        'tech-notes': 'technicalNotes',

        // === Equipment List ===
        'equipment-name': 'equipmentList',

        // === Operational Costs ===
        'utilityCosts': 'utilitiesCost',
        'operationalCosts': 'operationsCost',
        'depreciationCosts': 'depreciationCost',

        // === Technological Data ===
        'technology-list': 'technologyTable',
        'technology-type': 'technologyList',
        'tech-modern': 'technologyModernity',
        'maintenance': 'maintenanceDifficulties',
        'maintenance-explanation': 'maintenanceExplanation',
        'dependency': 'supplierDependence',
        'tech-safety': 'technologySafety',
        'tech-safe-notes': 'technologyNotes',

        // === Operational Data ===
        'employees-list': 'staffTable',
        'employee-title': 'staffTable',
        'daily-operations': 'dailyOperations',
        'operations': 'operationalEfficiency',
        'operations-notes': 'operationalNotes',

        // === Organizational Data ===
        'structure': 'adminStructure',
        'decision': 'decisionMaking',
        'governance': 'governanceRequirements',
        'governance-explanation': 'governanceExplanation',
        'organized': 'organizationalEffectiveness',
        'organized-notes': 'organizationalNotes',

        // === Legal Data ===
        'licenses-list': 'licensesTable',
        'legal': 'projectLegality',
        'license-type': 'licensesTable',
        'risks': 'legalRisks',
        'risks-explanation': 'risksExplanation',
        'obstacles': 'legalObstacles',
        'obstacles-notes': 'legalNotes',

        // === Environmental Data ===
        'environment': 'environmentalImpact',
        'environment-explanation': 'impactExplanation',
        'assessment': 'environmentalApprovals',
        'friendly': 'environmentalFriendliness',
        'friendly-notes': 'environmentalNotes',

        // === Social Data ===
        'social-impact': 'communityImpact',
        'job-opportunities': 'jobOpportunities',
        'impact': 'socialImpactAlignment',
        'impact-notes': 'socialNotes',

        // === Cultural Data ===
        'culture': 'culturalAlignment',
        'culture-explanation': 'alignmentExplanation',
        'rejection': 'culturalRejection',
        'rejection-explanation': 'rejectionExplanation',
        'acceptable': 'culturalAcceptability',
        'acceptable-notes': 'culturalNotes',

        // === Behavioral Data ===
        'behavior': 'behaviorAlignment',
        'behavior-explanation': 'alignmentExplanation',
        'resistance': 'behaviorResistance',
        'resistance-explanation': 'resistanceExplanation',
        'support': 'customerSupport',
        'support-notes': 'behavioralNotes',

        // === Political Data ===
        'stability': 'politicalStability',
        'stability-explanation': 'stabilityExplanation',
        'changes': 'regulatoryExposure',
        'changes-explanation': 'exposureExplanation',
        'risk': 'politicalRisk',
        'risk-notes': 'politicalNotes',

        // === Time Data ===
        'timeframe': 'marketTiming',
        'timing': 'implementationTiming',
        'timing-notes': 'timeNotes',

        // === Risk Data ===
        'risks-list': 'risksTable',
        'risk-name': 'risksTable',
        'contingency': 'contingencyPlan',
        'contingency-explanation': 'planExplanation',
        'control': 'riskControl',
        'control-notes': 'riskNotes',

        // === Economic Data ===
        'added-value': 'economicValue',
        'av-other-text': 'economicValueOtherText',
        'gdp': 'gdpImpact',
        'gdp-explanation': 'gdpImpactExplanation',
        'feasibility': 'economicFeasibility',
        'feasibility-notes': 'economicNotes',

        // === Financial Data ===
        'capital': 'totalCapital',
        // Rename to avoid conflict with operational costs object
        'costs': 'operationalCostsAssessment',
        'payback': 'paybackPeriod',
        'roi': 'roiExpectation',
        'financial': 'financialFeasibility',
        'financial-notes': 'financialNotes',

        // === Additional Investments ===
        'investments-list': 'investmentsTable',
        'additional-investments': 'needsAdditionalInvestments',
        'investment-type': 'investmentsTable',
        'investments-purpose': 'investmentsPurpose'
        ,
        // ---------------------------------------------------------------------
        // === PRE-COMMERCIAL SECTOR.HTML FIELDS (12) ===
        // ---------------------------------------------------------------------
        'business-type': 'businessType',
        'sustainable-fashion': 'sustainableFocus',
        'eco-friendly': 'ecoFriendly',
        'local-artisans': 'localArtisans',
        'organic-materials': 'organicMaterials',
        'recycled-materials': 'recycledMaterials',
        'limited-editions': 'limitedEditions',
        'social-media-focused': 'socialMediaFocus',
        'influencer-collabs': 'influencerCollaborations',
        'pop-up-events': 'popupEvents',
        'community-workshops': 'communityWorkshops',
        'brand-storytelling': 'brandStorytelling',

        // ---------------------------------------------------------------------
        // === START-FEASIBILITY.HTML FIELDS (18) ===
        // ---------------------------------------------------------------------
        'project-name': 'projectName',
        'project-description': 'projectDescription',
        'vision-mission': 'visionMission',
        'project-type': 'projectType',
        'specified-type': 'specifiedProjectType',
        // [DATA KEY UNIFICATION FIX] Map legacy 'sector' HTML id to canonical 'projectSector'
        'sector': 'projectSector',
        'country': 'country',
        'city': 'city',
        'area': 'area',
        'funding-method': 'fundingMethod',
        'personal-contribution': 'personalContribution',
        'loan-amount': 'loanAmount',
        'interest-value': 'interestValue',
        'currency': 'currency',
        'total-capital': 'totalCapital',
        'loan-months': 'loanMonths',
        'target-audience': 'targetAudience',
        'project-status': 'projectStatus',

        // === START-FEASIBILITY.HTML CANONICAL KEYS (self-mapping) ===
        // [BUGFIX DOC] Ensure canonical keys map to themselves for idempotent remapping. Change limited to this file only.
        'projectName': 'projectName',
        'projectType': 'projectType',
        'projectSector': 'projectSector',

        // ---------------------------------------------------------------------
        // === DASHBOARD.HTML FIELDS (8) ===
        // ---------------------------------------------------------------------
        'full-name': 'fullName',
        'user-email': 'userEmail',
        'user-country': 'userCountry',
        'user-city': 'userCity',
        'company-name': 'companyName',
        'phone-number': 'phoneNumber',
        'industry-type': 'industryType',
        'business-size': 'businessSize',

        // === DASHBOARD.HTML CANONICAL KEYS (self-mapping) ===
        // [BUGFIX DOC] Persist user identity under unified keys for AI reports. Change limited to this file only.
        'userName': 'userName',
        'userEmail': 'userEmail',
        'userPhone': 'userPhone',

        // ---------------------------------------------------------------------
        // === FINANCIAL FIELDS (9) ===
        // ---------------------------------------------------------------------
        'monthly-rent': 'monthlyRent',
        'employee-count': 'employeeCount',
        'salary-amount': 'salaryAmount',
        'utility-costs': 'utilityCosts',
        'marketing-budget': 'marketingBudget',
        'inventory-value': 'inventoryValue',
        'equipment-cost': 'equipmentCost',
        'license-fees': 'licenseFees',
        'insurance-cost': 'insuranceCost',

        // ---------------------------------------------------------------------
        // === PRE-COMMERCIAL SECTOR PARALLEL TEXT STORAGE ===
        // ---------------------------------------------------------------------
        // [BUGFIX DOC] Reserve canonical storage key for AI parallel texts. Change limited to this file only.
        'surveyData': 'surveyData'
    };

    // Field mapping functions
    function mapHtmlToJsField(htmlId) {
        // [BUGFIX DOC] Ensure every key from HTML or storage maps to canonical JS keys;
        // preserves 'operationalCosts' and canonical keys as-is. Change limited to this file only.
        if (htmlId === 'operationalCosts') return 'operationalCosts';
        // If already canonical per our required schema, return as-is
        if (htmlId === 'projectName' || htmlId === 'projectType' || htmlId === 'projectSector' || htmlId === 'userName' || htmlId === 'userEmail' || htmlId === 'userPhone' || htmlId === 'surveyData') {
            return htmlId;
        }
        return FIELD_MAPPING[htmlId] || htmlId;
    }

    function mapJsToHtmlField(jsKey) {
        const reverseMap = {};
        Object.keys(FIELD_MAPPING).forEach(htmlKey => {
            reverseMap[FIELD_MAPPING[htmlKey]] = htmlKey;
        });
        return reverseMap[jsKey] || jsKey;
    }

    // --- Canonicalization & Schema Persistence ---
    // Some pages historically used alternate names for the same concept.
    // This alias map guarantees one canonical key is used in storage.
    const ALIAS_TO_CANONICAL = {
        // Technology
        technologyMaturity: 'technologyModernity',
        // Politics & regulation
        politicalStabilityExplanation: 'stabilityExplanation',
        regulatoryExplanation: 'exposureExplanation',
        // Behavior & culture
        behaviorExplanation: 'alignmentExplanation',
        // Environment
        environmentExplained: 'environmentalImpact',
        // GDP naming variant
        gdpContribution: 'gdpImpact',
        // Ops wording variant
        operations: 'operationalEfficiency',
        // Additional investments historical name
        hasAdditionalInvestments: 'needsAdditionalInvestments'
    };

    function computeUnifiedKeyList() {
        const base = new Set(Object.values(FIELD_MAPPING));
        // Add derived and processed fields that appear in the app/report
        [
            'targetAge',
            'licensesTotal',
            'riskAvgProbability',
            'riskAvgImpact',
            'totalEmployees',
            'annualOperationalCosts',
            'annualOperationalCostsSummary',
            'marketingChannelsSummary',
            'marketingChannelsOther',
            'financialStatements',
            'investmentsTotal',
            'rentOption'
        ].forEach(k => base.add(k));
        return Array.from(base);
    }

    async function persistUnifiedSchema() {
        try {
            const schema = {
                version: 1,
                canonicalKeys: computeUnifiedKeyList(),
                aliasToCanonical: ALIAS_TO_CANONICAL
            };
            await DB.setJSON('feasibilityUnifiedSchema', schema);
            __feasibilityUnifiedSchemaCache = schema;
        } catch (_) { /* non-fatal */ }
    }

    // Normalize an answers object to use only canonical keys
    function canonicalizeAnswerKeys(obj) {
        const out = {};
        const src = obj || {};
        Object.keys(src).forEach((key) => {
            const val = src[key];
            // First, map HTML id -> JS key if needed
            const mapped = mapHtmlToJsField(key);
            // Then, collapse any aliases to canonical
            const canonical = ALIAS_TO_CANONICAL[mapped] || mapped;
            // Skip empty values to avoid noise
            out[canonical] = val;
        });
        // Derive unified targetAge if only min/max provided
        if (!out.targetAge && (out.targetAgeMin || out.targetAgeMax)) {
            const min = (out.targetAgeMin !== undefined && out.targetAgeMin !== null) ? String(out.targetAgeMin).trim() : '';
            const max = (out.targetAgeMax !== undefined && out.targetAgeMax !== null) ? String(out.targetAgeMax).trim() : '';
            if (min || max) out.targetAge = [min || '?', max || '?'].join(' - ');
            // Do not persist the split variants once unified
            delete out.targetAgeMin;
            delete out.targetAgeMax;
        }
        // Consolidate legacy standalone cost keys into annualOperationalCosts object
        const hasStandaloneUtilities = Object.prototype.hasOwnProperty.call(out, 'utilitiesCost');
        const hasStandaloneOps = Object.prototype.hasOwnProperty.call(out, 'operationsCost');
        const hasStandaloneDepr = Object.prototype.hasOwnProperty.call(out, 'depreciationCost');
        if (hasStandaloneUtilities || hasStandaloneOps || hasStandaloneDepr) {
            const base = (out.annualOperationalCosts && typeof out.annualOperationalCosts === 'object') ? { ...out.annualOperationalCosts } : {};
            if (hasStandaloneUtilities && base.utilities === undefined) base.utilities = out.utilitiesCost;
            if (hasStandaloneOps && base.operations === undefined) base.operations = out.operationsCost;
            if (hasStandaloneDepr && base.depreciation === undefined) base.depreciation = out.depreciationCost;
            out.annualOperationalCosts = base;
            delete out.utilitiesCost;
            delete out.operationsCost;
            delete out.depreciationCost;
        }
        // [REQUIRED FIELD TYPE FIX]
        // Ensure numeric required fields are stored as numbers (not strings) to avoid
        // cross-module validation mismatches. Minimal, targeted normalization.
        ['marketSize', 'competitorsCount', 'marketingCost'].forEach((numKey) => {
            if (Object.prototype.hasOwnProperty.call(out, numKey)) {
                const raw = out[numKey];
                if (typeof raw === 'string' && raw.trim() !== '') {
                    const parsed = parseFloat(raw);
                    if (Number.isFinite(parsed)) out[numKey] = parsed;
                }
            }
        });
        return out;
    }

    // Persist schema immediately so ai-report.js can stay synchronized
    (async () => { try { await persistUnifiedSchema(); } catch(_) {} })();

    // Expose mapping utilities for external validation monitors
    try {
        if (typeof window !== 'undefined') {
            window.mapHtmlToJsField = mapHtmlToJsField;
            window.mapJsToHtmlField = mapJsToHtmlField;
            // Integration fix (pre-feasibility/Pre-feasibility Study.html only):
            // Also expose FIELD_MAPPING so the pre-feasibility page can align UI fields
            // to canonical JS keys when aggregating and rendering data.
            window.FIELD_MAPPING = FIELD_MAPPING;
            window.__feasibilityUnifiedSchema = async function() {
                if (__feasibilityUnifiedSchemaCache) return __feasibilityUnifiedSchemaCache;
                const v = await DB.getJSON('feasibilityUnifiedSchema', {});
                __feasibilityUnifiedSchemaCache = v || {};
                return __feasibilityUnifiedSchemaCache;
            };
        }
    } catch (_) {}

    // Dynamic fields processor used by saveAnswers
    function processDynamicFields(containerId, type) {
        try {
            if (typeof document === 'undefined') return (type === 'equipment') ? '' : [];
            // Support primary container id and alternate container ids used in some sector pages
            const getContainer = (primary, ...alts) => {
                return document.getElementById(primary) || alts.map(id => document.getElementById(id)).find(Boolean) || null;
            };

            if (type === 'equipment') {
                const container = getContainer(containerId);
                if (!container) return '';
                const names = container.querySelectorAll('.equipment-name');
                const values = container.querySelectorAll('.equipment-value');
                const parts = [];
                const len = Math.max(names.length, values.length);
                for (let i = 0; i < len; i++) {
                    const n = (names[i] && String(names[i].value || '').trim()) || '';
                    const v = (values[i] && String(values[i].value || '').trim()) || '';
                    if (!n) continue;
                    parts.push(v ? `${n}: ${v}` : n);
                }
                return parts.join('; ');
            }

            if (type === 'staff') {
                const container = getContainer(containerId);
                if (!container) return [];
                const items = [];
                const rows = container.querySelectorAll('.dynamic-field');
                rows.forEach(row => {
                    const t = row.querySelector('.employee-title');
                    const c = row.querySelector('.employee-count');
                    const s = row.querySelector('.employee-salary');
                    const jobTitle = String(t && t.value || '').trim();
                    const employeeCount = parseFloat(String(c && c.value || '').trim());
                    const monthlySalary = parseFloat(String(s && s.value || '').trim());
                    if (!jobTitle || !Number.isFinite(employeeCount) || !Number.isFinite(monthlySalary)) return;
                    items.push({ jobTitle, employeeCount, monthlySalary });
                });
                return items;
            }

            if (type === 'technology') {
                const container = getContainer(containerId);
                if (!container) return [];
                const items = [];
                const rows = container.querySelectorAll('.dynamic-field');
                rows.forEach(row => {
                    const t = row.querySelector('.technology-type');
                    const v = row.querySelector('.technology-value');
                    const typeVal = String(t && t.value || '').trim();
                    const costNum = parseFloat(String(v && v.value || '').trim());
                    if (!typeVal || !Number.isFinite(costNum)) return;
                    items.push({ type: typeVal, cost: costNum });
                });
                return items;
            }

            if (type === 'licenses') {
                const container = getContainer(containerId);
                if (!container) return [];
                const items = [];
                const rows = container.querySelectorAll('.dynamic-field');
                rows.forEach(row => {
                    const t = row.querySelector('.license-type');
                    const v = row.querySelector('.license-value');
                    const typeVal = String(t && t.value || '').trim();
                    const costNum = parseFloat(String(v && v.value || '').trim());
                    if (!typeVal || !Number.isFinite(costNum)) return;
                    items.push({ type: typeVal, cost: costNum });
                });
                return items;
            }

            if (type === 'risks') {
                const container = getContainer(containerId);
                if (!container) return [];
                const items = [];
                const rows = container.querySelectorAll('.dynamic-field');
                rows.forEach(row => {
                    const n = row.querySelector('.risk-name');
                    const p = row.querySelector('.risk-probability');
                    const i = row.querySelector('.risk-impact');
                    const typeVal = String(n && n.value || '').trim();
                    const prob = String(p && p.value || '').trim();
                    const imp = String(i && i.value || '').trim();
                    if (!typeVal) return;
                    const probability = prob === '' ? '' : parseFloat(prob);
                    const impact = imp === '' ? '' : parseFloat(imp);
                    if (prob !== '' && !Number.isFinite(probability)) return;
                    if (imp !== '' && !Number.isFinite(impact)) return;
                    items.push({ type: typeVal, probability, impact });
                });
                return items;
            }

            if (type === 'investments') {
                const container = getContainer(containerId, 'investmentsDetails');
                if (!container) return [];
                const rowSelector = container.matches('#investmentsDetails') ? '.dynamic-field, .item-row' : '.dynamic-field';
                const rows = container.querySelectorAll(rowSelector);
                const items = [];
                rows.forEach(row => {
                    const t = row.querySelector('.investment-type');
                    const v = row.querySelector('.investment-value');
                    const r = row.querySelector('.investment-return');
                    const typeVal = String(t && t.value || '').trim();
                    const valueNum = parseFloat(String(v && v.value || '').trim());
                    const retVal = String(r && r.value || '').trim();
                    if (!typeVal || !Number.isFinite(valueNum)) return;
                    items.push({ type: typeVal, value: valueNum, return: retVal || '-' });
                });
                return items;
            }

            return [];
        } catch (_) {
            return (type === 'equipment') ? '' : [];
        }
    }

	const StructuredSections = (function() {
		try {
			if (typeof globalThis !== 'undefined') {
				const existing = globalThis.StructuredSections;
				if (existing && typeof existing.buildStructuredSections === 'function' && typeof existing.computeSectionCompleteness === 'function') {
					return existing;
				}
				if (typeof globalThis.__createStructuredSectionsModule === 'function') {
					const created = globalThis.__createStructuredSectionsModule();
					if (created && typeof created.buildStructuredSections === 'function' && typeof created.computeSectionCompleteness === 'function') {
						globalThis.StructuredSections = created;
						return created;
					}
				}
			}
		} catch (_) {}
		function createModule() {
			const BRAND_LABELS = {
				sustainableFocus: 'Sustainable fashion',
				ecoFriendly: 'Eco-friendly',
				localArtisans: 'Supports local artisans',
				organicMaterials: 'Uses organic materials',
				recycledMaterials: 'Uses recycled materials',
				limitedEditions: 'Limited editions',
				socialMediaFocus: 'Social media focused',
				influencerCollaborations: 'Influencer collaborations',
				popupEvents: 'Pop-up events',
				communityWorkshops: 'Community workshops',
				brandStorytelling: 'Brand storytelling'
			};
			const HUMAN_LABELS = {
				projectOverview: 'Project Overview',
				market: 'Market Analysis',
				marketing: 'Marketing Strategy',
				technical: 'Technical & Operational',
				financial: 'Financial Feasibility'
			};
			const FINANCIAL_TABLE_KEYS = ['incomeStatement', 'balanceSheet', 'cashFlow'];
			function toStringOrNull(value) {
				if (value === undefined || value === null) return null;
				if (typeof value === 'string') {
					const trimmed = value.trim();
					return trimmed ? trimmed : null;
				}
				if (typeof value === 'number' && Number.isFinite(value)) return String(value);
				if (typeof value === 'boolean') return value ? 'true' : 'false';
				if (Array.isArray(value)) {
					const parts = value
						.map((v) => (v === null || v === undefined ? '' : String(v).trim()))
						.filter(Boolean);
					return parts.length ? parts.join(', ') : null;
				}
				return String(value).trim() || null;
			}
			function toNumberOrNull(value) {
				if (value === undefined || value === null || value === '') return null;
				if (typeof value === 'number') return Number.isFinite(value) ? value : null;
				const parsed = parseFloat(String(value).replace(/,/g, ''));
				return Number.isFinite(parsed) ? parsed : null;
			}
			function ensureArrayOfStrings(value) {
				if (value === undefined || value === null) return [];
				if (Array.isArray(value)) {
					return value
						.map((item) => {
							if (item === undefined || item === null) return null;
							if (typeof item === 'string') {
								const trimmed = item.trim();
								return trimmed ? trimmed : null;
							}
							return String(item).trim() || null;
						})
						.filter(Boolean);
				}
				if (typeof value === 'string') {
					return value
						.split(/[,;]+/)
						.map((part) => part.trim())
						.filter(Boolean);
				}
				return [String(value).trim()].filter(Boolean);
			}
			function dedupeStrings(values) {
				const seen = new Set();
				const out = [];
				(values || []).forEach((val) => {
					if (!val) return;
					const key = String(val).toLowerCase();
					if (!seen.has(key)) {
						seen.add(key);
						out.push(typeof val === 'string' ? val : String(val));
					}
				});
				return out;
			}
			function truthy(value) {
				if (value === true) return true;
				if (typeof value === 'string') {
					const normalized = value.trim().toLowerCase();
					return normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'on';
				}
				if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
				return false;
			}
			function pickBrandAttributes(source) {
				const out = [];
				Object.keys(BRAND_LABELS).forEach((key) => {
					if (truthy(source[key])) {
						out.push(BRAND_LABELS[key]);
					}
				});
				return out;
			}
			function parseEquipmentList(value) {
				if (Array.isArray(value)) {
					return value
						.map((item) => {
							if (!item || typeof item !== 'object') {
								const label = toStringOrNull(item);
								return label ? { name: label } : null;
							}
							const name = toStringOrNull(item.name || item.type || item.title || item.label);
							const cost = toNumberOrNull(item.cost || item.value || item.price);
							const result = {};
							if (name) result.name = name;
							if (cost !== null) result.cost = cost;
							return Object.keys(result).length ? result : null;
						})
						.filter(Boolean);
				}
				const raw = toStringOrNull(value);
				if (!raw) return [];
				return raw
					.split(';')
					.map((chunk) => {
						const part = chunk.trim();
						if (!part) return null;
						const segments = part.split(':');
						const name = segments.shift().trim();
						const amount = segments.join(':');
						const cost = toNumberOrNull(amount);
						const result = {};
						if (name) result.name = name;
						if (cost !== null) result.cost = cost;
						return Object.keys(result).length ? result : null;
					})
					.filter(Boolean);
			}
			function normalizeTechnologyTable(entries) {
				if (!Array.isArray(entries)) return [];
				return entries
					.map((item) => {
						if (!item || typeof item !== 'object') return null;
						const type = toStringOrNull(item.type || item.name || item.technology);
						const cost = toNumberOrNull(item.cost || item.value || item.price);
						const out = {};
						if (type) out.type = type;
						if (cost !== null) out.cost = cost;
						return Object.keys(out).length ? out : null;
					})
					.filter(Boolean);
			}
			function normalizeLicenseTable(entries) {
				if (!Array.isArray(entries)) return [];
				return entries
					.map((item) => {
						if (!item || typeof item !== 'object') return null;
						const type = toStringOrNull(item.type || item.name);
						const cost = toNumberOrNull(item.cost || item.value || item.price);
						const out = {};
						if (type) out.type = type;
						if (cost !== null) out.cost = cost;
						return Object.keys(out).length ? out : null;
					})
					.filter(Boolean);
			}
			function normalizeStaffTable(entries) {
				if (!Array.isArray(entries)) return [];
				return entries
					.map((item) => {
						if (!item || typeof item !== 'object') return null;
						const jobTitle = toStringOrNull(item.jobTitle || item.title || item.role);
						const employeeCount = toNumberOrNull(item.employeeCount || item.count || item.quantity);
						const monthlySalary = toNumberOrNull(item.monthlySalary || item.salary || item.monthlyCost);
						const result = {};
						if (jobTitle) result.jobTitle = jobTitle;
						if (employeeCount !== null) result.employeeCount = employeeCount;
						if (monthlySalary !== null) result.monthlySalary = monthlySalary;
						return Object.keys(result).length ? result : null;
					})
					.filter(Boolean);
			}
			function normalizeRiskTable(entries) {
				if (!Array.isArray(entries)) return [];
				return entries
					.map((item) => {
						if (!item || typeof item !== 'object') return null;
						const name = toStringOrNull(item.type || item.name || item.risk);
						const probability = toNumberOrNull(item.probability);
						const impact = toNumberOrNull(item.impact);
						const result = {};
						if (name) result.name = name;
						if (probability !== null) result.probability = probability;
						if (impact !== null) result.impact = impact;
						return Object.keys(result).length ? result : null;
					})
					.filter(Boolean);
			}
			function normalizeInvestmentTable(entries) {
				if (!Array.isArray(entries)) return [];
				return entries
					.map((item) => {
						if (!item || typeof item !== 'object') return null;
						const type = toStringOrNull(item.type || item.name);
						const value = toNumberOrNull(item.value || item.amount || item.cost);
						const expectedReturn = toStringOrNull(item.return || item.expectedReturn);
						const result = {};
						if (type) result.type = type;
						if (value !== null) result.value = value;
						if (expectedReturn) result.return = expectedReturn;
						return Object.keys(result).length ? result : null;
					})
					.filter(Boolean);
			}
			function normalizeCostObject(obj) {
				const out = {};
				if (!obj || typeof obj !== 'object') return out;
				['utilities', 'operations', 'depreciation'].forEach((key) => {
					const val = toNumberOrNull(obj[key]);
					if (val !== null) out[key] = val;
				});
				return out;
			}
			function sanitizeTable(table) {
				if (!table || typeof table !== 'object') return null;
				const headers = Array.isArray(table.headers)
					? table.headers.map((cell) => toStringOrNull(cell) || '?')
					: [];
				const rows = Array.isArray(table.rows)
					? table.rows.map((row) => {
						if (!Array.isArray(row)) return [];
						return row.map((cell) => toStringOrNull(cell) || '?');
					})
					: [];
				if (!headers.length && !rows.length) return null;
				return { headers, rows };
			}
			function normalizeFinancialStatements(fs) {
				const sanitized = {};
				if (!fs || typeof fs !== 'object') return sanitized;
				FINANCIAL_TABLE_KEYS.forEach((key) => {
					const table = sanitizeTable(fs[key]);
					if (table) sanitized[key] = table;
				});
				sanitized.assumptions = Array.isArray(fs.assumptions)
					? fs.assumptions.map((item) => toStringOrNull(item)).filter(Boolean)
					: [];
				if (Array.isArray(fs.ratios)) sanitized.ratios = fs.ratios;
				if (fs.roi && typeof fs.roi === 'object') {
					sanitized.roi = {
						npv: fs.roi.npv ?? null,
						irr: fs.roi.irr ?? null,
						paybackPeriod: fs.roi.paybackPeriod ?? null
					};
				}
				sanitized.currency = toStringOrNull(fs.currency);
				return sanitized;
			}
			function hasFinancialTableData(financial) {
				if (!financial || typeof financial !== 'object') return false;
				return FINANCIAL_TABLE_KEYS.some((key) => {
					const table = financial[key];
					return table && Array.isArray(table.headers) && table.headers.length && Array.isArray(table.rows) && table.rows.length;
				});
			}
			function buildStructuredSections(flat) {
				const source = (flat && typeof flat === 'object') ? flat : {};
				const structured = {};
				const businessModelOther = source.businessModelOther || source['bm-other-text'];
				const marketingChannels = dedupeStrings(
					ensureArrayOfStrings(source.marketingChannels)
				);
				const marketingPlan = ensureArrayOfStrings(source.marketingPlan);
				const brandIdentity = pickBrandAttributes(source);
				structured.projectOverview = {
					mainProduct: toStringOrNull(source.projectIdea),
					problemSolved: toStringOrNull(source.problemSolution),
					businessModel: {
						models: ensureArrayOfStrings(source.businessModel),
						other: toStringOrNull(businessModelOther)
					},
					distributionChannels: ensureArrayOfStrings(source.distributionChannels),
					brandIdentity: {
						businessType: toStringOrNull(source.businessType),
						attributes: brandIdentity
					}
				};
				structured.market = {
					marketSize: toNumberOrNull(source.marketSize),
					potentialCustomers: toNumberOrNull(source.potentialCustomers),
					growthRate: toNumberOrNull(source.growthRate),
					growthFactors: toStringOrNull(source.growthFactors),
					competitorsCount: toNumberOrNull(source.competitorsCount),
					marketGap: {
						status: toStringOrNull(source.marketGap),
						explanation: toStringOrNull(source.gapExplanation)
					},
					feasibility: {
						assessment: toStringOrNull(source.marketFeasibility),
						notes: toStringOrNull(source.marketNotes)
					}
				};
				structured.marketing = {
					targetAge: toStringOrNull(source.targetAge),
					customerIncome: toNumberOrNull(source.customerIncome),
					channels: marketingChannels,
					channelsOther: toStringOrNull(source.marketingChannelsOther),
					marketingPlan,
					marketingCost: toNumberOrNull(source.marketingCost),
					competitiveAdvantage: toStringOrNull(source.competitiveAdvantage),
					reachability: toStringOrNull(source.reachability),
					notes: toStringOrNull(source.marketingNotes),
					brandIdentityFeatures: brandIdentity
				};
				structured.technical = {
					property: {
						requiredArea: toNumberOrNull(source.requiredArea),
						ownershipType: toStringOrNull(source.ownershipType),
						propertyPrice: toNumberOrNull(source.propertyPrice)
					},
					site: {
						traffic: toStringOrNull(source.locationTraffic),
						parking: toStringOrNull(source.parkingAvailability),
						attractionPoints: ensureArrayOfStrings(source.attractionPoints),
						otherAttractions: toStringOrNull(source.otherAttractionsText)
					},
					equipment: {
						items: parseEquipmentList(source.equipmentList)
					},
					inventory: {
						inventoryValue: toNumberOrNull(source.inventoryValue),
						goodsTypes: toStringOrNull(source.goodsTypes)
					},
					feasibility: toStringOrNull(source.technicalFeasibility),
					notes: toStringOrNull(source.technicalNotes)
				};
				structured.technology = {
					stack: normalizeTechnologyTable(source.technologyTable),
					modernity: toStringOrNull(source.technologyModernity || source.technologyMaturity),
					maintenance: {
						difficulties: toStringOrNull(source.maintenanceDifficulties),
						explanation: toStringOrNull(source.maintenanceExplanation)
					},
					supplierDependence: toStringOrNull(source.supplierDependence),
					safety: toStringOrNull(source.technologySafety),
					notes: toStringOrNull(source.technologyNotes)
				};
				structured.operations = {
					staff: {
						totalEmployees: toNumberOrNull(source.totalEmployees),
						table: normalizeStaffTable(source.staffTable),
						monthlyTotal: toNumberOrNull(source.staffMonthlyTotal),
						annualTotal: toNumberOrNull(source.staffAnnualTotal)
					},
					dailyOperations: toStringOrNull(source.dailyOperations),
					efficiency: toStringOrNull(source.operationalEfficiency),
					notes: toStringOrNull(source.operationalNotes)
				};
				structured.organization = {
					structure: ensureArrayOfStrings(source.adminStructure),
					otherStructure: toStringOrNull(source.otherStructureText),
					decisionMaking: toStringOrNull(source.decisionMaking),
					governance: {
						requirements: toStringOrNull(source.governanceRequirements || source.governance),
						explanation: toStringOrNull(source.governanceExplanation)
					},
					effectiveness: toStringOrNull(source.organizationalEffectiveness),
					notes: toStringOrNull(source.organizationalNotes)
				};
				structured.legal = {
					projectLegality: toStringOrNull(source.projectLegality),
					licenses: {
						items: normalizeLicenseTable(source.licensesTable),
						total: toNumberOrNull(source.licensesTotal)
					},
					risks: {
						summary: toStringOrNull(source.legalRisks),
						explanation: toStringOrNull(source.risksExplanation)
					},
					obstacles: toStringOrNull(source.legalObstacles),
					notes: toStringOrNull(source.legalNotes)
				};
				structured.environmental = {
					impact: toStringOrNull(source.environmentalImpact),
					explanation: toStringOrNull(source.impactExplanation),
					approvals: toStringOrNull(source.environmentalApprovals),
					friendliness: toStringOrNull(source.environmentalFriendliness),
					notes: toStringOrNull(source.environmentalNotes)
				};
				structured.social = {
					communityImpact: toStringOrNull(source.communityImpact),
					jobOpportunities: toNumberOrNull(source.jobOpportunities),
					alignment: toStringOrNull(source.socialImpactAlignment),
					notes: toStringOrNull(source.socialNotes)
				};
				structured.cultural = {
					alignment: toStringOrNull(source.culturalAlignment),
					alignmentExplanation: toStringOrNull(source.alignmentExplanation),
					rejection: toStringOrNull(source.culturalRejection),
					rejectionExplanation: toStringOrNull(source.rejectionExplanation),
					acceptability: toStringOrNull(source.culturalAcceptability),
					notes: toStringOrNull(source.culturalNotes)
				};
				structured.behavioral = {
					alignment: toStringOrNull(source.behaviorAlignment),
					explanation: toStringOrNull(source.behaviorExplanation || source.alignmentExplanation),
					resistance: toStringOrNull(source.behaviorResistance),
					resistanceExplanation: toStringOrNull(source.resistanceExplanation),
					customerSupport: toStringOrNull(source.customerSupport),
					notes: toStringOrNull(source.behavioralNotes)
				};
				structured.political = {
					stability: toStringOrNull(source.politicalStability),
					stabilityExplanation: toStringOrNull(source.stabilityExplanation || source.politicalStabilityExplanation),
					regulatoryExposure: toStringOrNull(source.regulatoryExposure),
					exposureExplanation: toStringOrNull(source.exposureExplanation || source.regulatoryExplanation),
					risk: toStringOrNull(source.politicalRisk),
					notes: toStringOrNull(source.politicalNotes)
				};
				structured.timing = {
					marketTiming: toStringOrNull(source.marketTiming),
					implementationTiming: toStringOrNull(source.implementationTiming),
					notes: toStringOrNull(source.timeNotes)
				};
				structured.risk = {
					items: normalizeRiskTable(source.risksTable),
					averages: {
						probability: toNumberOrNull(source.riskAvgProbability),
						impact: toNumberOrNull(source.riskAvgImpact)
					},
					contingencyPlan: {
						plan: toStringOrNull(source.contingencyPlan),
						explanation: toStringOrNull(source.planExplanation)
					},
					control: toStringOrNull(source.riskControl),
					notes: toStringOrNull(source.riskNotes)
				};
				structured.economic = {
					addedValue: ensureArrayOfStrings(source.economicValue),
					otherValue: toStringOrNull(source.economicValueOtherText),
					gdpImpact: toStringOrNull(source.gdpImpact || source.gdpContribution),
					gdpExplanation: toStringOrNull(source.gdpImpactExplanation),
					feasibility: toStringOrNull(source.economicFeasibility),
					notes: toStringOrNull(source.economicNotes)
				};
			const financialStatements = normalizeFinancialStatements(source.financialStatements || {});
			const annualOperationalCosts = normalizeCostObject(source.annualOperationalCosts);

			structured.financial = {
				capital: {
					totalCapital: toStringOrNull(source.totalCapital),
					operationalCosts: toStringOrNull(source.operationalCostsAssessment || source.operationalCosts),
					paybackPeriod: toStringOrNull(source.paybackPeriod),
					roiExpectation: toStringOrNull(source.roiExpectation),
					feasibility: toStringOrNull(source.financialFeasibility),
					notes: toStringOrNull(source.financialNotes)
				},
				assumptions: {
					currency: toStringOrNull(source.selectedCurrency || source.currency)
				},
				annualOperationalCosts,
				financialStatements
			};
				structured.investments = {
					required: toStringOrNull(source.needsAdditionalInvestments),
					purpose: toStringOrNull(source.investmentsPurpose),
					items: normalizeInvestmentTable(source.investmentsTable),
					total: toNumberOrNull(source.investmentsTotal)
				};
				return structured;
			}
			const COMPLETENESS_RULES = {
				projectOverview: (section) => !!section && !!toStringOrNull(section.mainProduct),
				market: (section) => !!section && section.marketSize !== null && section.marketSize !== undefined && section.competitorsCount !== null && section.competitorsCount !== undefined,
				marketing: (section) => !!section && ((Array.isArray(section.channels) && section.channels.length > 0) || (Array.isArray(section.marketingPlan) && section.marketingPlan.length > 0) || section.marketingCost !== null),
				technical: (section) => {
					if (!section) return false;
					const property = section.property || {};
					const site = section.site || {};
					const equipment = section.equipment || {};
					const hasProperty = property.requiredArea !== null || property.propertyPrice !== null || !!toStringOrNull(property.ownershipType);
					const hasSite = !!toStringOrNull(site.traffic) || !!toStringOrNull(site.parking) || (Array.isArray(site.attractionPoints) && site.attractionPoints.length > 0);
					const hasEquipment = Array.isArray(equipment.items) && equipment.items.length > 0;
					return hasProperty || hasSite || hasEquipment;
				},
				financial: (section) => {
					if (!section) return false;
					const capital = section.capital || {};
					const hasCapital = !!toStringOrNull(capital.totalCapital) || !!toStringOrNull(capital.operationalCosts) || !!toStringOrNull(capital.paybackPeriod) || !!toStringOrNull(capital.roiExpectation);
					const hasStatements = hasFinancialTableData(section.financialStatements);
					const hasCosts = section.annualOperationalCosts && Object.keys(section.annualOperationalCosts).length > 0;
					return hasCapital || hasStatements || hasCosts;
				}
			};
			function computeSectionCompleteness(structured, rawAnswers) {
				const result = {
					sections: {},
					missing: [],
					missingLabels: [],
					isComplete: true
				};
				const structuredData = structured && typeof structured === 'object' ? structured : {};
				Object.keys(COMPLETENESS_RULES).forEach((key) => {
					let complete = false;
					try {
						complete = !!COMPLETENESS_RULES[key](structuredData[key], structuredData, rawAnswers || {});
					} catch (_) {
						complete = false;
					}
					result.sections[key] = { complete };
					if (!complete) {
						result.missing.push(key);
						if (HUMAN_LABELS[key]) result.missingLabels.push(HUMAN_LABELS[key]);
						result.isComplete = false;
					}
				});
				return result;
			}
			return {
				buildStructuredSections,
				computeSectionCompleteness
			};
		}
		const fallback = createModule();
		try {
			if (typeof globalThis !== 'undefined') {
				globalThis.StructuredSections = fallback;
				if (typeof globalThis.__createStructuredSectionsModule !== 'function') {
					globalThis.__createStructuredSectionsModule = createModule;
				}
			}
		} catch (_) {}
		return fallback;
	})();

	const buildStructuredSections = StructuredSections.buildStructuredSections;
	const computeSectionCompleteness = StructuredSections.computeSectionCompleteness;

    /**
     * Extract structured financial statements from existing financial analysis
     */
    let __warnedNoFinancialAnalysis = false;
    function extractStructuredFinancialStatements() {
        try {
            const financialAnalysis = generateFinancialAnalysis();

            if (!financialAnalysis) {
                // Warn only once to avoid repeated console noise during typing
                if (!__warnedNoFinancialAnalysis) {
                    __warnedNoFinancialAnalysis = true;
                    console.warn('No financial analysis generated');
                }
                // Professional integration/refactor: always return a valid object with headers
                // (Part of professional integration/refactor task)
                return {
                    incomeStatement: { headers: ["Year","Revenue","COGS","Gross Profit","Operating Expenses","EBIT","Net Profit"], rows: [["Year 1","?","?","?","?","?","?"]] },
                    balanceSheet: { headers: ["Year","Assets","Liabilities","Equity","Total Liabilities & Equity"], rows: [["Year 1","?","?","?","?"]] },
                    cashFlow: { headers: ["Year","Operating Activities","Investing Activities","Financing Activities","Net Cash Flow"], rows: [["Year 1","?","?","?","?"]] },
                    ratios: [],
                    roi: { npv: '?', irr: '?', paybackPeriod: '?' },
                    assumptions: []
                };
            }

            const statements = {
                incomeStatement: extractIncomeStatementFromAnalysis(financialAnalysis),
                balanceSheet: extractBalanceSheetFromAnalysis(financialAnalysis),
                cashFlow: extractCashFlowFromAnalysis(financialAnalysis),
                ratios: extractRatiosFromAnalysis(financialAnalysis),
                roi: extractROIFromAnalysis(financialAnalysis),
                assumptions: extractAssumptionsFromAnalysis(financialAnalysis)
            };

            // console.debug('Structured financial statements extracted successfully'); // reduce console noise
            return statements;

        } catch (error) {
            console.error('Error extracting financial statements:', error);
            // Professional integration/refactor: return defaults instead of null
            return {
                incomeStatement: { headers: ["Year","Revenue","COGS","Gross Profit","Operating Expenses","EBIT","Net Profit"], rows: [["Year 1","?","?","?","?","?","?"]] },
                balanceSheet: { headers: ["Year","Assets","Liabilities","Equity","Total Liabilities & Equity"], rows: [["Year 1","?","?","?","?"]] },
                cashFlow: { headers: ["Year","Operating Activities","Investing Activities","Financing Activities","Net Cash Flow"], rows: [["Year 1","?","?","?","?"]] },
                ratios: [],
                roi: { npv: '?', irr: '?', paybackPeriod: '?' },
                assumptions: []
            };
        }
    }

    // Expose extractor for external validation monitors
    try {
        if (typeof window !== 'undefined') {
            window.extractStructuredFinancialStatements = extractStructuredFinancialStatements;
        }
    } catch (_) {}

    function extractIncomeStatementFromAnalysis(analysis) {
        const incomeStatement = {
            headers: ["Year", "Revenue", "COGS", "Gross Profit", "Operating Expenses", "EBIT", "Net Profit"],
            rows: []
        };

        if (analysis.includes("Income Statement") || analysis.includes("Projected Income Statement")) {
            const lines = analysis.split('\n');
            let inIncomeStatement = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.includes("Income Statement") || line.includes("Projected Income Statement")) {
                    inIncomeStatement = true;
                    continue;
                }

                if (inIncomeStatement && line.includes('|') && !line.includes('---')) {
                    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                    if (cells.length >= 3 && !isNaN(cells[1])) {
                        incomeStatement.rows.push(cells);
                    }
                }

                if (inIncomeStatement && line.includes('---')) {
                    break;
                }
            }
        }

        return incomeStatement;
    }

    function extractBalanceSheetFromAnalysis(analysis) {
        const balanceSheet = {
            headers: ["Year", "Assets", "Liabilities", "Equity", "Total Liabilities & Equity"],
            rows: []
        };

        if (analysis.includes("Balance Sheet") || analysis.includes("Estimated Balance Sheet")) {
            const lines = analysis.split('\n');
            let inBalanceSheet = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.includes("Balance Sheet") || line.includes("Estimated Balance Sheet")) {
                    inBalanceSheet = true;
                    continue;
                }

                if (inBalanceSheet && line.includes('|') && !line.includes('---')) {
                    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                    if (cells.length >= 3 && !isNaN(cells[1])) {
                        balanceSheet.rows.push(cells);
                    }
                }

                if (inBalanceSheet && line.includes('---')) {
                    break;
                }
            }
        }

        return balanceSheet;
    }

    function extractCashFlowFromAnalysis(analysis) {
        const cashFlow = {
            headers: ["Year", "Operating Activities", "Investing Activities", "Financing Activities", "Net Cash Flow"],
            rows: []
        };

        if (analysis.includes("Cash Flow") || analysis.includes("Estimated Cash Flow")) {
            const lines = analysis.split('\n');
            let inCashFlow = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.includes("Cash Flow") || line.includes("Estimated Cash Flow")) {
                    inCashFlow = true;
                    continue;
                }

                if (inCashFlow && line.includes('|') && !line.includes('---')) {
                    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                    if (cells.length >= 3 && !isNaN(cells[1])) {
                        cashFlow.rows.push(cells);
                    }
                }

                if (inCashFlow && line.includes('---')) {
                    break;
                }
            }
        }

        return cashFlow;
    }

    function extractRatiosFromAnalysis(analysis) {
        const ratios = [];

        if (analysis.includes("Performance Indicators")) {
            const lines = analysis.split('\n');
            let inRatios = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.includes("Performance Indicators")) {
                    inRatios = true;
                    continue;
                }

                if (inRatios && line.includes('-')) {
                    const match = line.match(/-\s*(.+?):\s*(.+)/);
                    if (match) {
                        ratios.push({
                            metric: match[1].trim(),
                            value: match[2].trim()
                        });
                    }
                }

                if (inRatios && line.includes('===')) {
                    break;
                }
            }
        }

        return ratios;
    }

    function extractROIFromAnalysis(analysis) {
        const roi = {
            npv: "N/A",
            irr: "N/A",
            paybackPeriod: "N/A"
        };

        if (analysis.includes("NPV") || analysis.includes("IRR") || analysis.includes("Payback")) {
            const lines = analysis.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.includes("NPV")) {
                    const match = line.match(/NPV[^:]*:\s*([^,\n]+)/);
                    if (match) roi.npv = match[1].trim();
                }

                if (line.includes("IRR")) {
                    const match = line.match(/IRR[^:]*:\s*([^,\n]+)/);
                    if (match) roi.irr = match[1].trim();
                }

                if (line.includes("Payback")) {
                    const match = line.match(/Payback[^:]*:\s*([^,\n]+)/);
                    if (match) roi.paybackPeriod = match[1].trim();
                }
            }
        }

        return roi;
    }

    function extractAssumptionsFromAnalysis(analysis) {
        const assumptions = [];

        if (analysis.includes("Assumptions") || analysis.includes("assumptions")) {
            const lines = analysis.split('\n');
            let inAssumptions = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.includes("Assumptions") || line.includes("assumptions")) {
                    inAssumptions = true;
                    continue;
                }

                if (inAssumptions && line.includes('-')) {
                    assumptions.push(line.replace('-', '').trim());
                }

                if (inAssumptions && line.includes('===')) {
                    break;
                }
            }
        }

        return assumptions;
    }
    // Legacy simulatedAnswersStore removed. Dexie/FeasibilityDB is the single source of truth.
    function ensureSimulatedAnswersStore() { return null; }

	async function getInitialAnswers() {
		const defaults = {
			projectIdea: '',
			problemSolution: '',
			businessModel: [],
			distributionChannels: [],
			// Market Data defaults
			marketSize: '',
			potentialCustomers: '',
			growthRate: '',
			growthFactors: '',
			competitorsCount: '',
			marketGap: '',
			gapExplanation: '',
			marketFeasibility: '',
			marketNotes: '',
			// Marketing Data defaults
			targetAge: '',
			customerIncome: '',
			marketingChannels: [],
			marketingCost: '',
			competitiveAdvantage: '',
			reachability: '',
			marketingNotes: '',
			marketingChannelsOther: '',
			// Economic Data defaults
			economicValue: [],
			economicValueOtherText: '',
			gdpImpact: '',
			gdpImpactExplanation: '',
			economicFeasibility: '',
			economicNotes: '',
			// Technical & Operational defaults
			locationTraffic: '',
			parkingAvailability: '',
			attractionPoints: [],
			otherAttractionsText: '',
			requiredArea: '',
			ownershipType: '',
			propertyPrice: '',
			equipmentList: '',
			inventoryValue: '',
			goodsTypes: '',
			technicalFeasibility: '',
			technicalNotes: '',
			// Operational Data defaults
			totalEmployees: '',
			staffTable: [],
			dailyOperations: '',
			operationalEfficiency: '',
			operationalNotes: '',
			staffMonthlyTotal: '',
			staffAnnualTotal: '',
			// Technological Data defaults
			technologyTable: [],
			technologyModernity: '',
			maintenanceDifficulties: '',
			maintenanceExplanation: '',
			supplierDependence: '',
			technologySafety: '',
			technologyNotes: '',
			// Organizational Data defaults
			adminStructure: [],
			otherStructureText: '',
			decisionMaking: '',
			governanceRequirements: '',
			governanceExplanation: '',
			organizationalEffectiveness: '',
			organizationalNotes: '',
			// Environmental Data defaults
			environmentalImpact: '',
			impactExplanation: '',
			environmentalApprovals: '',
			environmentalFriendliness: '',
			environmentalNotes: '',
			// Legal Data defaults
			projectLegality: '',
			licensesTable: [],
			legalRisks: '',
			risksExplanation: '',
			legalObstacles: '',
			legalNotes: '',
			// Social Data defaults
			communityImpact: '',
			jobOpportunities: '',
			socialImpactAlignment: '',
			socialNotes: '',
			// Cultural Data defaults
			culturalAlignment: '',
			alignmentExplanation: '',
			culturalRejection: '',
			rejectionExplanation: '',
			culturalAcceptability: '',
			culturalNotes: '',
			// Behavioral Data defaults
			behaviorAlignment: '',
			behaviorResistance: '',
			resistanceExplanation: '',
			customerSupport: '',
			behavioralNotes: '',
			// Political Data defaults
			politicalStability: '',
			stabilityExplanation: '',
			regulatoryExposure: '',
			exposureExplanation: '',
			politicalRisk: '',
			politicalNotes: '',
			// Time Data defaults
			marketTiming: '',
			implementationTiming: '',
			timeNotes: '',
			// Risk Data defaults
			risksTable: [],
			contingencyPlan: '',
			planExplanation: '',
			riskControl: '',
			riskNotes: '',
			riskAvgProbability: '',
			riskAvgImpact: '',
			// Financial Data defaults
			totalCapital: '',
			operationalCosts: '',
			paybackPeriod: '',
			roiExpectation: '',
			financialFeasibility: '',
			financialNotes: '',
			// Additional Investments
			needsAdditionalInvestments: '',
			investmentsTable: [],
			investmentsPurpose: '',
			investmentsTotal: 0,
			licensesTotal: 0
		};
		try {
			const data = await DB.getJSON(STORAGE_KEY, null);
			if (data && typeof data === 'object') {
				return Object.assign({}, defaults, data);
			}
		} catch (_) {}
		return defaults;
	}

    // --- Processed answers helpers (persist FULL answers + processed data) ---
    // Deprecated: previously restricted keys. Now we preserve everything for mirror storage.
    function getAllowedSimulatedKeys() { return null; }

    // No-op: retain for backward compatibility; returns input object unchanged.
    function pruneToAllowedSimulatedKeys(obj) { return (obj && typeof obj === 'object') ? { ...obj } : {}; }

    // Heuristic mapper: dynamically map an answer key to a section id without hardcoding question lists
    function mapKeyToSectionId(key) {
        const k = String(key || '').toLowerCase();
        const patterns = [
            { id: '1-2', tests: [/projectidea/, /problemsolution/, /businessmodel/, /distributionchannels/] },
            { id: '1-3', tests: [/^market/, /competitor/, /growth(rate|factors)?/, /marketgap/, /marketfeasibility/, /marketnotes/] },
            { id: '1-4', tests: [/^marketing/, /targetage/, /customerincome/, /competitiveadvantage/, /reachability/] },
            { id: '1-5', tests: [/locationtraffic/, /parkingavailability/, /attraction/, /requiredarea/, /ownershiptype/, /propertyprice/, /equipment/, /inventory/, /goodstypes/, /^technical(?!\w)/] },
            { id: '1-6', tests: [/^technology/, /technolog/, /supplierdependence/] },
            { id: '1-7', tests: [/^staff/, /dailyoperations/, /operational(?!costs)/, /totalemployees/] },
            { id: '1-8', tests: [/^adminstructure/, /organizational/, /governance/, /decisionmaking/, /otherstructure/] },
            { id: '1-9', tests: [/^legal/, /^licenses?/, /risks?explanation/] },
            { id: '1-10', tests: [/^environment/, /impactexpl(ain|an)ation/] },
            { id: '1-11', tests: [/^communityimpact/, /^jobopportunities/, /^social/] },
            { id: '1-12', tests: [/^cultural/, /alignment(explanation)?/, /rejection/, /acceptability/] },
            { id: '1-13', tests: [/^behavior/, /customersupport/, /resistance/] },
            { id: '1-14', tests: [/^political/, /regulatory/, /stability/, /exposure\b/] },
            { id: '1-15', tests: [/^time(notes)?$/, /^market(timing)$/, /^implementation(timing)$/] },
            { id: '1-16', tests: [/^risks?table$/, /^contingencyplan$/, /^planexplanation$/, /^riskcontrol$/, /^risknotes$/, /riskavg(probability|impact)/] },
            { id: '1-17', tests: [/^economic/, /gdp/] },
			{ id: '1-18', tests: [
				/^financial/,
				/^totalcapital$/,
				/^operationalcosts$/,
				/^operationalcostsassessment$/,
				/^payback(period)?$/,
				/^roi(expecting|expectation)?$/,
				/^currency$/,
				/^selectedcurrency$/
			] },
            { id: '1-19', tests: [/^needsadditionalinvestments$/, /^investments/, /^licenses(total)?$/] }
        ];
        for (const p of patterns) {
            for (const re of p.tests) {
                if (re.test(k)) return p.id;
            }
        }
        // Fallback bucket for uncategorized fields
        return '1-1';
    }

    function groupAnswersBySection(allAnswers) {
        const sectionIds = Array.from({ length: 19 }, (_, i) => `1-${i + 1}`);
        const bySection = Object.create(null);
        sectionIds.forEach((id) => { bySection[id] = {}; });
        if (allAnswers && typeof allAnswers === 'object') {
            for (const [key, value] of Object.entries(allAnswers)) {
                const sid = mapKeyToSectionId(key);
                bySection[sid][key] = value;
            }
        }
        return bySection;
    }

    function buildProcessedFieldsFromAnswers(answers) {
        // Derive updated processed fields from current answers snapshot
        const processed = {};

        try {
            // Numeric totals (if finite)
            const maybeNum = (v) => (v !== null && v !== undefined && Number.isFinite(v)) ? v : undefined;
            const invTot = maybeNum(answers && answers.investmentsTotal);
            if (invTot !== undefined) processed.investmentsTotal = invTot;
            const licTot = maybeNum(answers && answers.licensesTotal);
            if (licTot !== undefined) processed.licensesTotal = licTot;
            const staffMonthly = maybeNum(answers && answers.staffMonthlyTotal);
            if (staffMonthly !== undefined) processed.staffMonthlyTotal = staffMonthly;
            const staffAnnual = maybeNum(answers && answers.staffAnnualTotal);
            if (staffAnnual !== undefined) processed.staffAnnualTotal = staffAnnual;
            const totalEmps = maybeNum(answers && answers.totalEmployees);
            if (totalEmps !== undefined) processed.totalEmployees = totalEmps;
            const riskAvgP = maybeNum(answers && answers.riskAvgProbability);
            if (riskAvgP !== undefined) processed.riskAvgProbability = riskAvgP;
            const riskAvgI = maybeNum(answers && answers.riskAvgImpact);
            if (riskAvgI !== undefined) processed.riskAvgImpact = riskAvgI;

            // Section summaries (lightweight, derived from current answers)
            if (answers && answers.annualOperationalCosts) {
                try { processed.annualOperationalCostsSummary = generateAnnualOperationalCosts(answers.annualOperationalCosts) || ''; } catch (_) {}
            }
            if (answers && (Array.isArray(answers.marketingChannels) || answers.marketingChannelsOther)) {
                try { processed.marketingChannelsSummary = generateMarketingChannels(answers.marketingChannels || [], answers.marketingChannelsOther || '') || ''; } catch (_) {}
            }
            // If answers already carries structured financial statements, keep them
            if (answers && answers.financialStatements && typeof answers.financialStatements === 'object') {
                processed.financialStatements = answers.financialStatements;
            }
        } catch (_) { /* non-fatal */ }

        return processed;
    }

    async function buildCompleteSimulatedSnapshot(partialUpdate) {
        // Build a CLEAN simulated snapshot that contains only descriptive (simulated) texts
        // for survey answers, plus structured financial statements if available.
        let basePrimary = {};
        try {
            const obj = await DB.getJSON(STORAGE_KEY, {});
            basePrimary = obj || {};
        } catch (_) { basePrimary = {}; }

        const answers = Object.assign({}, basePrimary, (partialUpdate || {}));

        // Ensure we always have a current financialStatements block if one exists
        let financial = answers && answers.financialStatements ? answers.financialStatements : null;
        if (!financial) {
            const processedTmp = buildProcessedFieldsFromAnswers(answers);
            if (processedTmp && processedTmp.financialStatements) {
                financial = processedTmp.financialStatements;
            }
        }

        // Use generator functions to convert raw inputs into descriptive texts
        // Only include keys with non-empty simulated strings
        const sim = {};
        try {
            // 1-2 Project Idea & Concept
            if (answers.projectIdea) sim.projectIdea = generateBusinessIdea(answers.projectIdea) || '';
            if (answers.problemSolution) sim.problemSolution = generateProblemSolution(answers.problemSolution) || '';
            if (answers.businessModel) sim.businessModel = generateBusinessModel(answers.businessModel) || '';
            if (answers.distributionChannels) sim.distributionChannels = generateDistributionChannels(answers.distributionChannels) || '';

            // 1-3 Market
            if (answers.marketSize != null) sim.marketSize = generateMarketSize(answers.marketSize) || '';
            if (answers.potentialCustomers != null) sim.potentialCustomers = generatePotentialCustomers(answers.potentialCustomers) || '';
            if (answers.growthRate != null) sim.growthRate = generateGrowthRate(answers.growthRate) || '';
            if (answers.growthFactors) sim.growthFactors = generateGrowthFactors(answers.growthFactors) || '';
            if (answers.competitorsCount != null) sim.competitorsCount = generateCompetitorCount(answers.competitorsCount) || '';
            if (answers.marketGap != null || answers.gapExplanation) sim.marketGap = generateMarketGap(answers.marketGap, answers.gapExplanation) || '';
            if (answers.marketFeasibility) sim.marketFeasibility = generateMarketFeasibility(answers.marketFeasibility) || '';
            if (answers.marketNotes) sim.marketNotes = generateMarketNotes(answers.marketNotes) || '';

            // 1-4 Marketing
            if (answers.targetAge) sim.targetAge = generateTargetAge(answers.targetAge) || '';
            if (answers.customerIncome != null) sim.customerIncome = generateCustomerIncome(answers.customerIncome) || '';
            if (answers.marketingChannels || answers.marketingChannelsOther) sim.marketingChannels = generateMarketingChannels(answers.marketingChannels || [], answers.marketingChannelsOther || '') || '';
            if (answers.marketingCost != null) sim.marketingCost = generateMarketingCost(answers.marketingCost) || '';
            if (answers.competitiveAdvantage) sim.competitiveAdvantage = generateCompetitiveAdvantage(answers.competitiveAdvantage) || '';
            if (answers.reachability) sim.reachability = generateReachability(answers.reachability) || '';
            if (answers.marketingNotes) sim.marketingNotes = generateMarketingNotes(answers.marketingNotes) || '';

            // 1-5 Technical & Operational (site/properties)
            if (answers.requiredArea != null || answers.ownershipType || answers.propertyPrice != null) sim.propertySummary = generatePropertySummary(answers.requiredArea, answers.ownershipType, answers.propertyPrice) || '';
            if (answers.equipmentList) sim.equipmentList = generateEquipmentSummary(answers.equipmentList) || '';
            if (answers.inventoryValue != null) sim.inventoryValue = generateInventoryValue(answers.inventoryValue) || '';
            if (answers.goodsTypes) sim.goodsTypes = generateGoodsTypes(answers.goodsTypes) || '';
            if (answers.locationTraffic) sim.locationTraffic = generateLocationTraffic(answers.locationTraffic) || '';
            if (answers.parkingAvailability) sim.parkingAvailability = generateParkingAvailability(answers.parkingAvailability) || '';
            if (answers.attractionPoints || answers.otherAttractionsText) sim.attractionPoints = generateAttractionPoints(answers.attractionPoints || [], answers.otherAttractionsText || '') || '';

            // 1-6 Technology
            if (answers.technologyTable) sim.technologyTable = generateTechnologyTable(answers.technologyTable) || '';
            if (answers.technologyMaturity || answers.technologyModernity) sim.technologyModernity = generateTechnologyModernity(answers.technologyMaturity || answers.technologyModernity) || '';
            if (answers.maintenanceDifficulties || answers.maintenanceExplanation) sim.maintenanceDifficulties = generateMaintenanceDifficulties(answers.maintenanceDifficulties, answers.maintenanceExplanation) || '';
            if (answers.supplierDependence) sim.supplierDependence = generateSupplierDependence(answers.supplierDependence) || '';
            if (answers.technologySafety) sim.technologySafety = generateTechnologySafety(answers.technologySafety) || '';
            if (answers.technologyNotes) sim.technologyNotes = generateTechnologyNotes(answers.technologyNotes) || '';

            // 1-7 Operations
            if (answers.totalEmployees != null || answers.staffTable) sim.staffingSummary = generateStaffingSummary(answers.totalEmployees, answers.staffTable) || '';
            if (answers.staffTable) sim.payrollTable = generatePayrollTable(answers.staffTable) || '';
            if (answers.dailyOperations) sim.dailyOperations = generateDailyOperations(answers.dailyOperations) || '';
            if (answers.operationalEfficiency) sim.operationalEfficiency = generateOperationalEfficiency(answers.operationalEfficiency) || '';
            if (answers.operationalNotes) sim.operationalNotes = generateOperationalNotes(answers.operationalNotes) || '';

            // 1-8 Organization & Governance
            if (answers.adminStructure || answers.otherStructureText) sim.adminStructure = generateAdminStructure(answers.adminStructure, answers.otherStructureText) || '';
            if (answers.decisionMaking) sim.decisionMaking = generateDecisionMaking(answers.decisionMaking) || '';
            if (answers.governanceRequirements || answers.governance || answers.governanceExplanation) sim.governanceRequirements = generateGovernanceRequirements(answers.governanceRequirements || answers.governance, answers.governanceExplanation) || '';
            if (answers.organizationalEffectiveness) sim.organizationalEffectiveness = generateOrganizationalEffectiveness(answers.organizationalEffectiveness) || '';
            if (answers.organizationalNotes) sim.organizationalNotes = generateOrganizationalNotes(answers.organizationalNotes) || '';

            // 1-9 Legal
            if (answers.projectLegality) sim.projectLegality = generateProjectLegality(answers.projectLegality) || '';
            if (answers.licensesTable) sim.licensesTable = generateLicensesTable(answers.licensesTable) || '';
            if (answers.licensesTable) sim.licensesSummary = generateLicensesSummary(answers.licensesTable) || '';
            if (answers.legalRisks || answers.risksExplanation) sim.legalRisks = generateLegalRisks(answers.legalRisks, answers.risksExplanation) || '';
            if (answers.legalObstacles) sim.legalObstacles = generateLegalObstacles(answers.legalObstacles) || '';
            if (answers.legalNotes) sim.legalNotes = generateLegalNotes(answers.legalNotes) || '';

            // 1-10 Environmental
            if (answers.environmentalImpact || answers.environmentExplained || answers.impactExplanation) sim.environmentalImpact = generateEnvironmentalImpact(answers.environmentalImpact || answers.environmentExplained, answers.impactExplanation) || '';
            if (answers.environmentalApprovals) sim.environmentalApprovals = generateEnvironmentalApprovals(answers.environmentalApprovals) || '';
            if (answers.environmentalFriendliness) sim.environmentalFriendliness = generateEnvironmentalFriendliness(answers.environmentalFriendliness) || '';
            if (answers.environmentalNotes) sim.environmentalNotes = generateEnvironmentalNotes(answers.environmentalNotes) || '';

            // 1-11 Social
            if (answers.communityImpact) sim.communityImpact = generateCommunityImpact(answers.communityImpact) || '';
            if (answers.jobOpportunities != null) sim.jobOpportunities = generateJobOpportunities(answers.jobOpportunities) || '';
            if (answers.socialImpactAlignment) sim.socialImpactAlignment = generateSocialImpactAlignment(answers.socialImpactAlignment) || '';
            if (answers.socialNotes) sim.socialNotes = generateSocialNotes(answers.socialNotes) || '';

            // 1-12 Cultural
            if (answers.culturalAlignment || answers.alignmentExplanation) sim.culturalAlignment = generateCulturalAlignment(answers.culturalAlignment, answers.alignmentExplanation) || '';
            if (answers.culturalRejection || answers.rejectionExplanation) sim.culturalRejection = generateCulturalRejection(answers.culturalRejection, answers.rejectionExplanation) || '';
            if (answers.culturalAcceptability) sim.culturalAcceptability = generateCulturalAcceptability(answers.culturalAcceptability) || '';
            if (answers.culturalNotes) sim.culturalNotes = generateCulturalNotes(answers.culturalNotes) || '';

            // 1-13 Behavioral
            if (answers.behaviorAlignment || answers.behaviorExplanation || answers.alignmentExplanation) sim.behaviorAlignment = generateBehaviorAlignment(answers.behaviorAlignment, answers.behaviorExplanation || answers.alignmentExplanation) || '';
            if (answers.behaviorResistance || answers.resistanceExplanation) sim.behaviorResistance = generateBehaviorResistance(answers.behaviorResistance, answers.resistanceExplanation) || '';
            if (answers.customerSupport) sim.customerSupport = generateCustomerSupport(answers.customerSupport) || '';
            if (answers.behavioralNotes) sim.behavioralNotes = generateBehavioralNotes(answers.behavioralNotes) || '';

            // 1-14 Political/Regulatory
            if (answers.politicalStability || answers.politicalStabilityExplanation) sim.politicalStability = generatePoliticalStability(answers.politicalStability, answers.politicalStabilityExplanation) || '';
            if (answers.regulatoryExposure || answers.regulatoryExplanation) sim.regulatoryExposure = generateRegulatoryExposure(answers.regulatoryExposure, answers.regulatoryExplanation) || '';
            if (answers.politicalRisk) sim.politicalRisk = generatePoliticalRisk(answers.politicalRisk) || '';
            if (answers.politicalNotes) sim.politicalNotes = generatePoliticalNotes(answers.politicalNotes) || '';

            // 1-15 Timing
            if (answers.marketTiming) sim.marketTiming = generateMarketTiming(answers.marketTiming) || '';
            if (answers.implementationTiming) sim.implementationTiming = generateImplementationTiming(answers.implementationTiming) || '';
            if (answers.timeNotes) sim.timeNotes = generateTimeNotes(answers.timeNotes) || '';

            // 1-16 Risks
            if (answers.risksTable) sim.risksTable = generateRisksTable(answers.risksTable) || '';
            if (answers.risksTable) sim.risksSummary = generateRisksSummary(answers.risksTable) || '';
            if (answers.contingencyPlan || answers.planExplanation) sim.contingencyPlan = generateContingencyPlan(answers.contingencyPlan, answers.planExplanation) || '';
            if (answers.riskControl) sim.riskControl = generateRiskControl(answers.riskControl) || '';
            if (answers.riskNotes) sim.riskNotes = generateRiskNotes(answers.riskNotes) || '';

            // 1-17 Economic
            if (answers.economicValue || answers.economicValueOtherText) sim.economicValue = generateEconomicValue(answers.economicValue, answers.economicValueOtherText) || '';
            if (answers.gdpImpact || answers.gdpContribution || answers.gdpImpactExplanation) sim.gdpImpact = generateGdpImpact(answers.gdpImpact || answers.gdpContribution, answers.gdpImpactExplanation) || '';
            if (answers.economicFeasibility) sim.economicFeasibility = generateEconomicFeasibility(answers.economicFeasibility) || '';
            if (answers.economicNotes) sim.economicNotes = generateEconomicNotes(answers.economicNotes) || '';

            // 1-18 Financial
            if (answers.totalCapital != null) sim.totalCapital = generateTotalCapital(answers.totalCapital) || '';
            if (answers.operationalCostsAssessment || answers.operationalCosts) sim.operationalCosts = generateOperationalCosts(answers.operationalCostsAssessment || answers.operationalCosts) || '';
            if (answers.paybackPeriod) sim.paybackPeriod = generatePaybackPeriod(answers.paybackPeriod) || '';
            if (answers.roiExpectation) sim.roiExpectation = generateRoiExpectation(answers.roiExpectation) || '';
            if (answers.financialFeasibility) sim.financialFeasibility = generateFinancialFeasibility(answers.financialFeasibility) || '';
            if (answers.financialNotes) sim.financialNotes = generateFinancialNotes(answers.financialNotes) || '';
            if (answers.selectedCurrency || answers.currency) {
                const cur = answers.selectedCurrency || answers.currency;
                if (cur) sim.currency = `Currency used: ${cur}`;
            }

            // 1-19 Additional Investments
            if (answers.needsAdditionalInvestments != null || answers.hasAdditionalInvestments != null || answers.investmentsPurpose || answers.investmentsTable) {
                sim.additionalInvestments = generateAdditionalInvestments(
                    answers.needsAdditionalInvestments != null ? answers.needsAdditionalInvestments : answers.hasAdditionalInvestments,
                    answers.investmentsTable,
                    answers.investmentsPurpose
                ) || '';
                if (answers.investmentsTable) sim.investmentsTable = generateInvestmentsTable(answers.investmentsTable) || '';
            }
        } catch (e) {
            try { console.error('[surveyLogic] Failed to build simulated texts:', e); } catch (_) {}
        }

        // Attach financial statements as structured data if available
        if (financial && typeof financial === 'object') {
            sim.financialStatements = financial;
        }

        // Include a minimal sections map with 1-18 financial mirror if present
        try {
            const sections = groupAnswersBySection({});
            if (sim.financialStatements && sections && typeof sections['1-18'] === 'object') {
                sections['1-18'].financialStatements = sim.financialStatements;
            }
            // Persist sections only if they carry content
            if (sections && Object.keys(sections['1-18'] || {}).length) {
                sim.sections = sections;
            }
        } catch (_) { /* non-fatal */ }

		try {
			const structuredSections = buildStructuredSections(answers);
			if (structuredSections && typeof structuredSections === 'object' && Object.keys(structuredSections).length) {
				sim.structuredSections = structuredSections;
			}
			const completenessSummary = computeSectionCompleteness(structuredSections, answers);
			if (completenessSummary && typeof completenessSummary === 'object') {
				sim.sectionCompleteness = completenessSummary;
			}
		} catch (_) { /* non-fatal */ }

        // Remove empty strings to keep the snapshot concise
        try {
            Object.keys(sim).forEach((k) => {
                // Do NOT drop essential fields, even if empty; keep them to ensure presence downstream
                if (k === 'projectIdea' || k === 'marketSize') return;
                const v = sim[k];
                if (v === '' || v === undefined || v === null) delete sim[k];
            });
        } catch (_) {}

        return sim;
    }

    // (Replaced by buildProcessedFieldsFromAnswers and buildCompleteSimulatedSnapshot)

    // Throttled saver to avoid excessive writes/logs from minor input events
    // Moved validation/integration to major events (submit/navigation) to prevent repeated console logs
    let __saveThrottleLast = 0;
    let __saveThrottleTimer = null;
    let __saveThrottlePending = null;
    const MIN_SAVE_INTERVAL_MS = 1500;

    async function saveAnswers(answers) {
        // Rate-limit saves: collapse bursts of calls into one write
        const now = Date.now();
        if (now - __saveThrottleLast < MIN_SAVE_INTERVAL_MS) {
            __saveThrottlePending = { ...(answers || {}) };
            if (__saveThrottleTimer) clearTimeout(__saveThrottleTimer);
            __saveThrottleTimer = setTimeout(() => {
                const pending = __saveThrottlePending; __saveThrottlePending = null; __saveThrottleTimer = null;
                // Fire the actual save after interval
                saveAnswers(pending);
            }, MIN_SAVE_INTERVAL_MS);
            return;
        }
        __saveThrottleLast = now;
        try {
            // 1. Map and canonicalize all keys
            const mappedAnswersRaw = {};
            Object.keys(answers || {}).forEach(key => {
                const mappedKey = mapHtmlToJsField(key);
                mappedAnswersRaw[mappedKey] = answers[key];
            });
            const mappedAnswers = canonicalizeAnswerKeys(mappedAnswersRaw);

            // 2. Save basic data (initial write)
            await DB.setJSON(STORAGE_KEY, mappedAnswers);

            // 3. Process dynamic fields
            const dynamicFields = {
                equipmentList: processDynamicFields('equipment-list', 'equipment'),
                staffTable: processDynamicFields('employees-list', 'staff'),
                technologyTable: processDynamicFields('technology-list', 'technology'),
                licensesTable: processDynamicFields('licenses-list', 'licenses'),
                risksTable: processDynamicFields('risks-list', 'risks'),
                investmentsTable: processDynamicFields('investments-list', 'investments')
            };

			// 4. Merge dynamic fields
			// Canonicalize again after merging dynamics to eliminate any accidental aliases.
			const completeAnswers = canonicalizeAnswerKeys(Object.assign({}, mappedAnswers, dynamicFields));

            // 5. Extract financial statements from existing financial analysis
			const financialStatements = extractStructuredFinancialStatements();
			if (financialStatements) {
				completeAnswers.financialStatements = financialStatements;
				// console.debug('Financial statements added to answers'); // noisy in frequent saves
			} else {
                // Surface a clear UI message when financial extraction fails
                try {
                    const el = document.getElementById('data-status');
                    if (el) {
                        el.innerHTML = '<div class="error-message">Unable to extract detailed financial statements from current inputs. You can still generate the report; Section 1-18 will mark missing tables as Data required.</div>';
                    }
                } catch (_) { /* non-fatal */ }
            }

			// 5a. Build structured section data and completeness metrics
			try {
				const structuredSections = buildStructuredSections(completeAnswers);
				const completenessSummary = computeSectionCompleteness(structuredSections, completeAnswers);
				if (structuredSections && typeof structuredSections === 'object') {
					completeAnswers.structuredSections = structuredSections;
				}
				if (completenessSummary && typeof completenessSummary === 'object') {
					completeAnswers.sectionCompleteness = completenessSummary;
				}
			} catch (structureError) {
				try { console.error('[surveyLogic] structured sections build failed:', structureError); } catch (_) {}
			}

			// 5b. Persist complete answers snapshot (including structured data)
			await DB.setJSON(STORAGE_KEY, completeAnswers);

            // 6. Build complete snapshot
            const fullSnapshot = await buildCompleteSimulatedSnapshot(completeAnswers);
            // [FAIL-SAFE] Ensure essential fields are explicitly mirrored on the snapshot
            // This guards against accidental dropping during aliasing or later filtering.
            try {
                if (completeAnswers && (completeAnswers.projectIdea !== undefined)) {
                    fullSnapshot.projectIdea = fullSnapshot.projectIdea || generateBusinessIdea(completeAnswers.projectIdea) || '';
                }
                if (completeAnswers && (completeAnswers.marketSize !== undefined)) {
                    fullSnapshot.marketSize = fullSnapshot.marketSize || generateMarketSize(completeAnswers.marketSize) || '';
                }
            } catch (_) { /* non-fatal */ }
            await DB.setJSON('simulatedFeasibilityAnswers', fullSnapshot);
            // Also persist a plain-text context array for AI prompts (simulated paragraphs only)
            try {
                const surveyStrings = [];
                Object.keys(fullSnapshot || {}).forEach((key) => {
                    const val = fullSnapshot[key];
                    if (typeof val === 'string') {
                        const t = val.trim();
                        if (t) surveyStrings.push(t);
                    }
                });
                // Limit to a reasonable count for stability; AI module will further sanitize
                if (surveyStrings.length) await DB.setJSON('surveyData', surveyStrings.slice(0, 400));
            } catch (_) { /* non-fatal */ }
            // Keep last snapshot in memory for any synchronous consumers
            try { window.__latestFeasibilityStudyAnswers = completeAnswers; window.__latestSimulatedFeasibilityAnswers = fullSnapshot; } catch(_) {}

            // Preserve existing behavior: update external simulated store if available
            const store = ensureSimulatedAnswersStore();
            if (store && typeof store.saveSimulatedAnswers === 'function') {
                store.saveSimulatedAnswers(fullSnapshot);
            }
            // console.debug('[surveyLogic] All answers saved with mapped fields and financial statements'); // reduce console noise

        } catch (e) {
            console.error('[surveyLogic] saveAnswers failed:', e);
        }
        // Keep any other consumers in sync
        try { await syncToSimulatedAnswers(); } catch (_) {}
        // Keep schema fresh
        try { await persistUnifiedSchema(); } catch (_) {}
    }

    // Debounce wrapper for saveAnswers to avoid heavy writes on minor input events
    // Ensures heavy processing waits until the user pauses typing; business logic unchanged.
    const __originalSaveAnswers = saveAnswers;
    let __saveDebounceTimer = null;
    let __saveDebouncePending = null;
    const INPUT_DEBOUNCE_MS = 600;
    // Replace saveAnswers with debounced aggregator; internal throttle still applies
    saveAnswers = function(answers) {
        __saveDebouncePending = Object.assign({}, __saveDebouncePending || {}, answers || {});
        if (__saveDebounceTimer) clearTimeout(__saveDebounceTimer);
        __saveDebounceTimer = setTimeout(() => {
            const payload = __saveDebouncePending;
            __saveDebouncePending = null;
            __saveDebounceTimer = null;
            __originalSaveAnswers(payload);
        }, INPUT_DEBOUNCE_MS);
    };

    // [EXTERNAL SAVE API FIX]
    // Problem: Some pages (e.g., Pre-Commercial sector) saved raw values directly to storage,
    // bypassing the processing pipeline that builds the canonical + simulated snapshot
    // (including financial tables and derived summaries). That led to stale or raw data being
    // merged later for AI/PDF generation.
    // Solution: Expose safe wrappers that route partial updates through the same internal
    // save path used by this module, guaranteeing that 'simulatedFeasibilityAnswers' is kept
    // in sync and ONLY processed/canonical data is consumed by the report.
    try {
        if (typeof window !== 'undefined') {
            /**
             * Accepts a partial answers object (HTML ids or canonical keys) and persists it
             * via the internal save pipeline, ensuring processed fields and the simulated
             * snapshot are updated together.
             */
            window.updateFeasibilityAnswers = async function(partial) {
                try { flushPendingSavesNow(); } catch (_) {}
                // Use the non-debounced internal saver to persist immediately for reliability
                try { await __originalSaveAnswers(partial || {}); } catch (_) { /* non-fatal */ }
            };
            /**
             * Forces any pending debounced changes to be saved immediately.
             */
            window.flushPendingFeasibilitySaves = function() {
                try { flushPendingSavesNow(); } catch (_) {}
            };
        }
    } catch (_) {}

    // Immediately persist any pending changes on major events (submit/navigation/report)
    function flushPendingSavesNow() {
        try {
            if (__saveDebounceTimer) {
                clearTimeout(__saveDebounceTimer);
                __saveDebounceTimer = null;
                const payload = __saveDebouncePending || {};
                __saveDebouncePending = null;
                __originalSaveAnswers(payload);
            }
        } catch (_) {}
    }

    // Flush on form submissions and navigation to avoid losing last keystrokes
    try { document.addEventListener('submit', function() { flushPendingSavesNow(); }, true); } catch (_) {}
    try { window.addEventListener('beforeunload', function() { flushPendingSavesNow(); }); } catch (_) {}

    // Persist processed financial statements to both feasibility and simulated stores
    async function saveProcessedFinancialData(financialData) {
        try {
            // Always persist processed financial statements to primary
            const primary = (await DB.getJSON(STORAGE_KEY, {})) || {};
            const primaryWithFS = canonicalizeAnswerKeys(Object.assign({}, primary, { financialStatements: financialData }));
            await DB.setJSON(STORAGE_KEY, primaryWithFS);

            // Build FULL snapshot (raw + processed + sections) and mirror to simulated store
            const fullSnapshot = await buildCompleteSimulatedSnapshot({ financialStatements: financialData });
            await DB.setJSON('simulatedFeasibilityAnswers', fullSnapshot);

            // Refresh plain-text context array for AI prompts
            try {
                const surveyStrings = [];
                Object.keys(fullSnapshot || {}).forEach((key) => {
                    const val = fullSnapshot[key];
                    if (typeof val === 'string') {
                        const t = val.trim();
                        if (t) surveyStrings.push(t);
                    }
                });
                if (surveyStrings.length) await DB.setJSON('surveyData', surveyStrings.slice(0, 400));
            } catch (_) { /* non-fatal */ }

            const store = ensureSimulatedAnswersStore();
            if (store && typeof store.saveSimulatedAnswers === 'function') {
                store.saveSimulatedAnswers(fullSnapshot);
            }
            // try { console.debug('[surveyLogic] financialStatements persisted to simulatedFeasibilityAnswers (FULL data)', { hasData: !!financialData }); } catch (_) {}
        } catch (err) {
            try { console.error('[surveyLogic] Failed to persist financial statements:', err); } catch (_) {}
        }
        // Optionally keep any other consumers in sync
        try { await syncToSimulatedAnswers(); } catch (_) {}
    }

    // Synchronize processed simulated answers into the global simulated store (no raw merging)
    async function syncToSimulatedAnswers() {
        try {
            // No-op: legacy external store removed; data already persisted in FeasibilityDB
            await DB.getJSON('simulatedFeasibilityAnswers', {});
        } catch (error) {
            console.error('Failed to sync data:', error);
        }
    }

    // Load processed dataset and persist into the simulated answers store only
    async function syncDataFromAllSources() {
        try {
            // No-op: legacy external store removed; data already persisted in FeasibilityDB
            await DB.getJSON('simulatedFeasibilityAnswers', {});
        } catch (error) {
            console.error('Data sync failed:', error);
        }
    }

    // Diagnostic function to verify integration at runtime
    async function checkDataIntegration() {
        const checks = {
            surveyData: !!(await DB.getJSON('feasibilityStudyAnswers', null)),
            simulatedData: !!(await DB.getJSON('simulatedFeasibilityAnswers', null)),
            userInfo: !!(await DB.getJSON('userInfo', null))
        };
        // console.log('Data Integration Check:', checks); // keep silent unless explicitly invoked for debugging
        return checks;
    }

    // Hook sync before report generation and run diagnostics on load
    try {
        document.addEventListener('DOMContentLoaded', async function() {
            try { await checkDataIntegration(); } catch (_) {}
            const btn = document.getElementById('generate-report');
            if (btn) {
                // Use capture to run before other bubble-phase listeners (e.g., in modules)
                btn.addEventListener('click', async function(e) {
                    try { flushPendingSavesNow(); } catch (_) {}
                    try { await syncDataFromAllSources(); } catch (_) {}
                    try {
                        const ok = await __validateRequiredBeforeGenerate();
                        if (!ok) {
                            // Block generating the report until required fields are filled
                            if (e && typeof e.preventDefault === 'function') e.preventDefault();
                            if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
                            else if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                            return false;
                        }
                    } catch (_) {}
                }, true);
            }
        });
    } catch (_) {}

    function normalizeString(value) {
        return (value || '').toString().trim();
    }

    // ===== Required fields validation (projectIdea, marketSize) =====
    async function __validateRequiredBeforeGenerate() {
        try {
            // Read latest saved snapshot (already canonicalized by save pipeline)
			const answers = await DB.getJSON(STORAGE_KEY, {}) || {};

			let structuredForValidation = answers.structuredSections;
			let completenessSummary = answers.sectionCompleteness;
			try {
				if (!structuredForValidation || typeof structuredForValidation !== 'object') {
					structuredForValidation = buildStructuredSections(answers);
				}
			} catch (_) {
				structuredForValidation = null;
			}
			try {
				if (!completenessSummary || !Array.isArray(completenessSummary.missing)) {
					completenessSummary = computeSectionCompleteness(structuredForValidation, answers);
				}
			} catch (_) {
				completenessSummary = null;
			}

			const missing = [];
			if (completenessSummary && completenessSummary.sections) {
				const sections = completenessSummary.sections;
				const projectComplete = sections.projectOverview && sections.projectOverview.complete === true;
				const marketComplete = sections.market && sections.market.complete === true;
				if (!projectComplete) missing.push({ key: 'projectOverview', htmlId: 'main-product', label: 'Project overview' });
				if (!marketComplete) missing.push({ key: 'market', htmlId: 'marketSize', label: 'Market data' });
			} else {
				// Fallback to legacy validation if structured completeness unavailable
				const hasProjectIdea = !!normalizeString(answers.projectIdea);
				const marketSizeNum = (answers.marketSize === 0) ? 0 : parseFloat(String(answers.marketSize ?? ''));
				const hasMarketSize = Number.isFinite(marketSizeNum) && marketSizeNum > 0;
				if (!hasProjectIdea) missing.push({ key: 'projectOverview', htmlId: 'main-product', label: 'Project overview' });
				if (!hasMarketSize) missing.push({ key: 'market', htmlId: 'marketSize', label: 'Market data' });
			}

            // Clear previous inline errors
            function clearInlineError(id) {
                try {
                    const el = document.getElementById(id);
                    if (el) {
                        el.removeAttribute('aria-invalid');
                        const nxt = el.nextElementSibling;
                        if (nxt && nxt.classList && nxt.classList.contains('error-hint')) nxt.remove();
                        el.style.borderColor = '';
                    }
                } catch (_) {}
            }
            // Show inline error near field if present on this page
            function inlineError(id, msg) {
                try {
                    const el = document.getElementById(id);
                    if (!el) return false;
                    el.setAttribute('aria-invalid', 'true');
                    el.style.borderColor = '#ff4d4f';
                    const hint = document.createElement('div');
                    hint.className = 'error-hint';
                    hint.style.cssText = 'color:#a8071a;font-size:12px;margin-top:4px;';
                    hint.textContent = msg;
                    if (el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains('error-hint')) {
                        el.nextElementSibling.remove();
                    }
                    el.parentNode && el.parentNode.insertBefore(hint, el.nextSibling);
                    return true;
                } catch (_) { return false; }
            }

            // Clear previous hints for our required fields if present
            // Clear hints for both canonical and legacy ids if present
            ['main-product','marketSize','market-size'].forEach(clearInlineError);

            if (missing.length === 0) return true;

            // Emit status box at top of report page if present
            try {
                const status = (typeof document !== 'undefined') ? document.getElementById('data-status') : null;
                if (status) {
                    const en = 'Please fill all required fields before generating the report: ' + missing.map(m => m.label).join(', ') + '.';
                    const box = document.createElement('div');
                    box.className = 'error-message';
                    box.style.cssText = 'background:#fff2f0;color:#a8071a;padding:10px;border-radius:6px;margin:8px 0;border:1px solid #ffccc7;';
                    box.textContent = en;
                    status.appendChild(box);
                }
            } catch (_) {}

            // Also try to show inline messages if these fields exist on the current page
            missing.forEach((m) => {
                const en = `${m.label} is required.`;
                inlineError(m.htmlId, en);
            });

            try { alert('Required fields are missing. Please complete the required fields before generating the report.'); } catch (_) {}
            return false;
        } catch (_) {
            // Fail-open if validation cannot run
            return true;
        }
    }

    // Generators
    function generateBusinessIdea(userDescription) {
        const text = normalizeString(userDescription);
        if (!text) return '';

        const lower = text.toLowerCase();
        const isRetailLike = /(retail store|shop|storefront|physical product|sell(ing)?\s+goods|boutique|market|supermarket|grocery|pharmacy|electronics|fashion|cosmetics|hardware|appliance|furniture)/.test(lower);

        const productPhrase = text;
        const features = [];
        if (/(wide|variety|range|selection)/.test(lower)) features.push('a wide selection');
        if (/(quality|high-quality|premium|reliable)/.test(lower)) features.push('high quality');
        if (/(price|afford|competitive|cheap|low cost)/.test(lower)) features.push('competitive prices');
        if (features.length === 0) features.push('high quality and competitive prices');

        let salesMethod = 'direct sales through a physical store';
        if (/online|e-commerce|ecommerce|website|app/.test(lower)) salesMethod = 'online sales via an e-commerce presence';
        else if (!isRetailLike) salesMethod = 'direct customer engagement and sales';

        return `The project is centered on creating ${productPhrase}. This venture is distinguished by offering ${features.join(' and ')} and aims to meet a specific customer need in the market. The project will operate on a business model based on ${salesMethod}, with a focus on providing a unique and exceptional shopping experience.`;
    }

	// Market Data Generators
	function generateMarketSize(value) {
		if (!value && value !== 0) return '';
		return `Data indicates that the target market size is estimated at approximately ${value} annually. This figure represents the total estimated financial value of transactions within the project's target market and can be used as a basis for estimating potential revenue.`;
	}

	// Economic Data Generators
	function generateEconomicValue(selectedValues, otherText = "") {
		const valueTexts = {
			"newJobs": "creating new job opportunities",
			"contributeGDP": "contributing to GDP",
			"supportSupplyChains": "supporting local supply chains"
		};

		const arr = Array.isArray(selectedValues) ? selectedValues : [];
		const selectedDescriptions = arr
			.map(value => valueTexts[value])
			.filter(desc => desc);

		const other = (otherText || '').toString().trim();
		if (other) {
			selectedDescriptions.push(other);
		}

		if (selectedDescriptions.length === 0) return '';

		if (selectedDescriptions.length === 1) {
			return `The project is expected to add economic and social value by ${selectedDescriptions[0]}. This added value enhances the project's importance and its positive impact on comprehensive development.`;
		}

		const lastItem = selectedDescriptions.pop();
		const itemsList = selectedDescriptions.join(', ') + ' and ' + lastItem;

		return `The project is expected to add economic and social value by ${itemsList}. This added value enhances the project's importance and its positive impact on comprehensive development.`;
	}

	function generateGdpImpact(impact, explanation = "") {
		const baseResponses = {
			"Yes": "The project owner assumes that the project is expected to have a positive impact on GDP or exports/imports.",
			"No": "The project owner assumes that the project is not expected to have a positive impact on GDP or exports/imports in the initial phase, but it serves other commercial goals.",
			"Limited effect": "The project owner assumes that the project's impact on GDP or exports/imports will be limited, but it may increase with the project's growth and expansion."
		};

		let response = baseResponses[impact] || '';

		const exp = (explanation || '').toString().trim();
		if (exp) {
			response += ` ${exp}`;
		}

		response += " This impact reflects the project's contribution to the national economy.";

		return response;
	}

	function generateEconomicFeasibility(feasibility) {
		const responses = {
			"High economic feasibility": "The project has high economic feasibility, which means it effectively contributes to achieving economic development and is considered a promising investment.",
			"Medium economic feasibility": "The project has medium economic feasibility, which requires careful planning to ensure the achievement of the desired financial and economic goals.",
			"Limited economic feasibility": "The economic feasibility of the project is limited, which indicates that it may not significantly contribute to economic development."
		};
		return responses[feasibility] || '';
	}

	function generateEconomicNotes(notes) {
		const n = (notes || '').toString().trim();
		if (!n) return '';
		return `Additional notes regarding the project's economic aspects have been included, which are: ${n}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Additional Investments Generators
	function generateAdditionalInvestments(hasInvestments, investmentsData = [], purpose = "") {
		if (hasInvestments === "No") {
			return "The project will not rely on any additional investments in its initial stages. It will be entirely dependent on the available initial capital, which reflects its preliminary financial independence.";
		} else if (hasInvestments === "Yes" && purpose) {
			return `The project will rely on additional investments to finance specific needs. These investments are essential for ${purpose}. The financial details of these investments are shown in the table below.`;
		} else if (hasInvestments === "Yes") {
			return "The project will rely on additional investments to finance specific needs. The financial details of these investments are shown in the table below.";
		}
		return '';
	}

	function generateInvestmentsTable(investmentsData) {
		if (!investmentsData || investmentsData.length === 0) return '';

		let table = "| Type of Investment | Investment Value | Expected Annual Return |\n";
		table += "|---|---|---|\n";

		let totalValue = 0;

		investmentsData.forEach(investment => {
			if (investment.type && investment.value) {
				table += `| ${investment.type} | ${investment.value} | ${investment.return || '-'} |\n`;
				totalValue += parseFloat(investment.value) || 0;
			}
		});

		if (totalValue > 0) {
			table += `| **Total** | **${totalValue.toFixed(2)}** | **-** |`;
		}

		return table;
	}

	// Social Data Generators
	function generateCommunityImpact(impactDescription) {
		if (!impactDescription) return '';
		return `The project is expected to have a positive impact on the surrounding community by contributing to ${impactDescription}. This impact enhances the project's value and makes it an active part of the social fabric of the area.`;
	}

	// Time Data Generators
	function generateMarketTiming(timing) {
		const responses = {
			"Yes, appropriate": "The proposed timeframe for the project is perfectly suited to exploit the current market opportunity. This indicates that the timing for market entry is ideal, which enhances the project's chances of success.",
			"May be late": "The proposed timeframe may be too late to exploit the current market opportunity, which means the project may lose its competitive advantage or enter an already saturated market.",
			"No effect": "The proposed timeframe has no significant effect on the market opportunity, which indicates that the demand for the product/service is continuous regardless of the entry timing."
		};
		return responses[timing] || '';
	}

	function generateImplementationTiming(timing) {
		const responses = {
			"Very appropriate": "The timing for project implementation is considered very appropriate to ensure its success, as it aligns with production plans, marketing, and market needs.",
			"Needs acceleration": "The project's implementation timing needs to be accelerated to ensure success. This indicates that there is time pressure to capitalize on available opportunities before competitors enter.",
			"Not appropriate": "The timing for project implementation is not appropriate, which may lead to its failure. This requires a complete re-evaluation of the timeline."
		};
		return responses[timing] || '';
	}

	function generateTimeNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's time aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	function generateJobOpportunities(jobCount) {
		if (!jobCount) return '';
		return `The project is estimated to generate around ${jobCount} job opportunities in its initial phase. These opportunities will contribute to supporting the local economy and reducing unemployment rates, reflecting the project's positive social impact.`;
	}

	function generateSocialImpactAlignment(alignment) {
		const responses = {
			"Significant positive impact": "The project has a significant positive social impact that aligns with community development goals. The project contributes to meeting community needs and providing added value beyond the commercial aspect.",
			"Limited positive impact": "The social impact of the project is limited, but it still contributes to supporting the community in a certain way.",
			"Unclear": "The social impact of the project is unclear, and a deeper assessment is needed to understand how it will affect the local community."
		};
		return responses[alignment] || '';
	}

	function generateSocialNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's social aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Cultural Data Generators
	function generateCulturalAlignment(alignment, explanation = "") {
		const baseResponses = {
			"Yes": "The project's idea, products, and presentation method are fully compatible with the local values and culture of the target community. This alignment increases the project's chances of acceptance and success, as no cultural barriers are expected.",
			"No": "The project's idea or its presentation method is not compatible with local values and culture, which may lead to its rejection by the target community.",
			"Partially": "The project is partially compatible with local cultural values. Some aspects require modification or adaptation to ensure full acceptance by the community."
		};
		let response = baseResponses[alignment] || '';
		if (explanation && (alignment === "No" || alignment === "Partially")) {
			response += ` ${explanation}`;
		}
		return response;
	}

	function generateCulturalRejection(hasRejection, explanation = "") {
		if (hasRejection === "No") {
			return "There is no possibility of community or cultural rejection of the project, which reflects its acceptance by the local community.";
		} else if (hasRejection === "Yes" && explanation) {
			return `There is a possibility of community or cultural rejection of the project's idea. The potential reason for this is ${explanation}. This rejection poses a real risk to the project.`;
		} else if (hasRejection === "Yes") {
			return "There is a possibility of community or cultural rejection of the project's idea, which poses a real risk to the project.";
		} else if (hasRejection === "Not expected") {
			return "Community or cultural rejection of the project is not expected, based on an initial analysis of community trends.";
		}
		return '';
	}

	function generateCulturalAcceptability(acceptability) {
		const responses = {
			"Highly acceptable": "The project is considered highly culturally acceptable in the target implementation environment, which facilitates market entry and success.",
			"Acceptable with challenges": "The project is culturally acceptable but with some challenges that must be addressed. This may require modifications to the product or marketing strategies.",
			"Not acceptable": "The project is not culturally acceptable in the target implementation environment, which constitutes a major obstacle to its implementation and success."
		};
		return responses[acceptability] || '';
	}

	function generateCulturalNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's cultural aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Behavioral Data Generators
	function generateBehaviorAlignment(alignment, explanation = "") {
		const baseResponses = {
			"Yes": "The proposed product fully aligns with the current purchasing behavior and consumption habits of the target customers. This alignment reduces the need for customers to change their behavior, which facilitates product adoption and contributes to quick sales.",
			"No": "The product does not align with customers' current purchasing behavior or consumption habits. This requires a significant investment in awareness and marketing to persuade customers to adopt the product, which presents a major challenge.",
			"Partially": "The product partially aligns with customer behaviors. Some aspects require a change in customer habits, but this can be overcome through an effective marketing strategy that focuses on highlighting the product's added value."
		};
		let response = baseResponses[alignment] || '';
		if (explanation) {
			response += ` ${explanation}`;
		}
		return response;
	}

	function generateBehaviorResistance(hasResistance, explanation = "") {
		if (hasResistance === "No") {
			return "No significant behavioral resistance to the new product is expected. This indicates that customers are willing to try new products, which facilitates the adoption process.";
		} else if (hasResistance === "Yes" && explanation) {
			return `Behavioral resistance to adopting the new product is expected. The potential reason for this is ${explanation}. This resistance poses a risk to the market entry process.`;
		} else if (hasResistance === "Yes") {
			return "Behavioral resistance to adopting the new product is expected. This resistance poses a risk to the market entry process.";
		} else if (hasResistance === "Not expected") {
			return "No significant behavioral resistance to the new product is expected, which reflects the target audience's openness to change.";
		}
		return '';
	}

	function generateCustomerSupport(supportLevel) {
		const responses = {
			"Strongly supports": "The general behavior of target customers strongly supports the project idea, which ensures an easy and quick product adoption process.",
			"Needs effort": "Product adoption requires additional effort to change customer behaviors or persuade them of the added value, which calls for a strong marketing strategy.",
			"High resistance": "There is high resistance from target customers, which makes the adoption process very difficult and requires a comprehensive re-evaluation of the project idea."
		};
		return responses[supportLevel] || '';
	}

	function generateBehavioralNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's behavioral aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Political Data Generators
	function generatePoliticalStability(stability, explanation = "") {
		const baseResponses = {
			"Yes": "There is sufficient political stability in the target region, which provides a secure environment for the project and ensures continuity of operations without interruption.",
			"No": "There is not sufficient political stability in the target region. This poses a significant risk to the project's continuity.",
			"Partially": "There is partial political stability in the region, which may affect the project at times. This requires continuous monitoring of the political landscape."
		};
		let response = baseResponses[stability] || '';
		if (explanation) {
			response += ` ${explanation}`;
		}
		return response;
	}

	function generateRegulatoryExposure(exposure, explanation = "") {
		if (exposure === "No") {
			return "The project is not expected to be exposed to negative changes in government laws or policies. This gives the project a significant degree of operational certainty.";
		} else if (exposure === "Yes" && explanation) {
			return `The project is likely to be negatively affected by potential changes in regulations or laws. The most prominent of these potential changes include ${explanation}. These risks require a plan to adapt to any future developments.`;
		} else if (exposure === "Yes") {
			return "The project is likely to be negatively affected by potential changes in regulations or laws. These risks require a plan to adapt to any future developments.";
		} else if (exposure === "Not expected") {
			return "The project is not expected to be negatively affected by changes in regulations or laws, which reflects the stability of the legislative environment in the target region.";
		}
		return '';
	}

	function generatePoliticalRisk(riskLevel) {
		const responses = {
			"Low risk": "The political risks that may affect the project's sustainability are low, which provides a stable investment environment.",
			"Medium risk": "There is a medium political risk to the project's sustainability, which requires continuous monitoring of the political landscape.",
			"High risk": "There is a high political risk to the project's sustainability, which constitutes a major obstacle to achieving long-term success and necessitates a re-evaluation of the project's feasibility."
		};
		return responses[riskLevel] || '';
	}

	function generatePoliticalNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's political aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Financial Data Generators
	function generateTotalCapital(capital) {
		const responses = {
			"Yes": "The total capital required to start and operate the project in its initial phases is sufficiently excellent, which provides the project with strong financial liquidity and the ability to handle any unexpected costs.",
			"No": "The total capital required to start the project is not sufficient, which may expose the project to significant financial risks in its early stages and requires a re-evaluation of funding.",
			"At minimum required": "The capital required is at the minimum necessary to start the project, but it may not provide enough flexibility to handle any unexpected financial challenges."
		};
		return `The project owner assumes that ${responses[capital] || ''}`;
	}

	function generateOperationalCosts(costs) {
		const responses = {
			"Yes": "The expected monthly operational costs are appropriate, which indicates that the project's financial plan is realistic and acceptable.",
			"No": "The expected monthly operational costs are not appropriate, as they may be unrealistically high or low, which calls for a comprehensive re-evaluation of the budget.",
			"At minimum required": "The monthly operational costs meet the minimum requirements, which necessitates careful monitoring of expenses to ensure the budget is not exceeded."
		};
		return `The project owner assumes that ${responses[costs] || ''}`;
	}

	function generateAnnualOperationalCosts(costsData) {
		if (!costsData) return '';
		const utilities = (parseFloat(costsData.utilities) || 0);
		const operations = (parseFloat(costsData.operations) || 0);
		const depreciation = (parseFloat(costsData.depreciation) || 0);
		const total = utilities + operations + depreciation;
		return `Expected annual operational costs include: utility expenses (${utilities}), other operational expenses (${operations}), and depreciation/amortization expenses (${depreciation}). Total annual operational costs amount to ${total}.`;
	}

	function generatePaybackPeriod(period) {
		const responses = {
			"Yes": "The estimated payback period for invested capital is feasible and realistic, which makes the project an attractive investment.",
			"No": "The estimated payback period for invested capital is not feasible, which indicates that the project may take too long to achieve profitability, reducing its investment attractiveness."
		};
		return `The project owner assumes that ${responses[period] || ''}`;
	}

	function generateRoiExpectation(roi) {
		const responses = {
			"Yes": "The project is expected to achieve a feasible and profitable return on investment (ROI) or internal rate of return (IRR), which reflects the project's initial financial feasibility.",
			"No": "The project is not expected to achieve a feasible return on investment, which makes it a risky investment.",
			"Not sure": "It is unclear whether the project will achieve a feasible return on investment, which requires a more detailed financial study."
		};
		return `The project owner assumes that ${responses[roi] || ''}`;
	}

	function generateFinancialFeasibility(feasibility) {
		const responses = {
			"Highly feasible": "The project has high financial feasibility and the ability to achieve the required profits, which makes it a promising investment.",
			"Feasible with some challenges": "The project has financial feasibility, but with some challenges that must be addressed to ensure profitability.",
			"Not financially feasible": "The project is not financially feasible and is not expected to achieve the required profits, which necessitates not moving forward with it."
		};
		return `The project owner assumes that ${responses[feasibility] || ''}`;
	}

	function generateFinancialNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's financial aspects have been added, which include: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Operational Data Generators
	function calculateTotalEmployees(staffData) {
		if (!Array.isArray(staffData)) return 0;
		return staffData.reduce((total, staff) => {
			const cnt = parseFloat(staff && staff.employeeCount);
			return total + (Number.isFinite(cnt) ? cnt : 0);
		}, 0);
	}

	function generateStaffingSummary(totalEmployees, staffData) {
		if (!totalEmployees && (!staffData || staffData.length === 0)) return '';

		const employeeCount = (totalEmployees && totalEmployees !== '') ? totalEmployees : calculateTotalEmployees(staffData);

		return `The project requires a team of ${employeeCount} to manage initial operational activities. Roles and tasks are distributed based on the project's operational needs to ensure performance efficiency and achieve desired goals. The following table provides a breakdown of the proposed positions and their monthly and annual salary costs.`;
	}

	function generatePayrollTable(staffData) {
		if (!Array.isArray(staffData) || staffData.length === 0) return '';

		let table = "| Job Title | Number of Employees | Monthly Salary (per employee) | Total Monthly Salary | Total Annual Salary |\n";
		table += "|---|---|---|---|---|\n";

		let totalEmployees = 0;
		let totalMonthly = 0;
		let totalAnnual = 0;

		staffData.forEach(staff => {
			const title = staff && staff.jobTitle;
			const count = parseFloat(staff && staff.employeeCount);
			const salary = parseFloat(staff && staff.monthlySalary);
			if (title && Number.isFinite(count) && Number.isFinite(salary)) {
				const monthlyTotal = count * salary;
				const annualTotal = monthlyTotal * 12;

				table += `| ${title} | ${count} | ${salary} | ${monthlyTotal.toFixed(2)} | ${annualTotal.toFixed(2)} |\n`;

				totalEmployees += count;
				totalMonthly += monthlyTotal;
				totalAnnual += annualTotal;
			}
		});

		if (totalEmployees > 0) {
			table += `| **Total** | **${totalEmployees}** | **-** | **${totalMonthly.toFixed(2)}** | **${totalAnnual.toFixed(2)}** |`;
		}

		return table;
	}

	function generateDailyOperations(operations) {
		const ops = normalizeString(operations);
		if (!ops) return '';
		return `The project's main daily operations include ${ops}. These operations are the foundation upon which the project relies to deliver its products and services effectively and continuously.`;
	}

	function generateOperationalEfficiency(efficiency) {
		const responses = {
			"Yes, possible": "Initial planning shows that the project can operate efficiently and with continuity. The plan indicates that the proposed human resources and operations are sufficient to achieve the operational goals.",
			"Potential challenges": "The project may face potential challenges in its operational processes, which requires a review of current plans and the development of alternative strategies to ensure business continuity.",
			"Unclear": "The efficiency of operational processes remains unclear, and a deeper assessment of the proposed plans and capabilities is needed to ensure the project's success."
		};
		return responses[efficiency] || '';
	}

	function generateOperationalNotes(notes) {
		const n = normalizeString(notes);
		if (!n) return '';
		return `Additional notes regarding the project's operational aspects have been included, which are: ${n}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	function generatePotentialCustomers(count) {
		if (!count && count !== 0) return '';
		return `The number of potential customers in the target area is estimated at approximately ${count} per month. This figure represents the estimated size of the customer segment that can be targeted with sales or marketing campaigns within the specified geographical scope.`;
	}

	function generateGrowthRate(rate) {
		if (!rate && rate !== 0) return '';
		return `The market's estimated annual growth rate is around ${rate}%. This figure reflects the growth or decline rate of the market size over a yearly period and can be used to estimate future demand trends in the targeted sector.`;
	}

	function generateGrowthFactors(factors) {
		if (!factors) return '';
		return `Market changes are linked to factors such as ${factors}. Identifying these factors helps in understanding the reasons for market growth or decline and assessing their potential impact on the project's opportunities.`;
	}

	function generateCompetitorCount(count) {
		if (!count && count !== 0) return '';
		return `The number of main competitors in the market is estimated at approximately ${count}. This figure indicates the level of presence of other companies or projects offering similar products or services within the same target sector.`;
	}

	function generateMarketGap(choice, explanation = "") {
		if (choice === "Yes") {
			return `Available data suggests there is an exploitable market gap, which is defined by ${explanation}. This indicates a currently unmet demand within the target market.`;
		} else if (choice === "No") {
			return `Available data indicates that the target market has a sufficient number of similar products or services from current competitors, and that the current supply covers the needs of the target customers.`;
		} else if (choice === "Not sure") {
			return `There is insufficient data to determine if an exploitable market gap exists. It is necessary to collect additional data on customer behavior, demand trends, and the level of competition to accurately identify any untapped opportunities.`;
		}
		return '';
	}

	function generateMarketFeasibility(choice) {
		const responses = {
			"Yes, sufficient demand": "Available data indicates a level of demand that can support a new project's entry into the market, suggesting the potential for sales within the target sector.",
			"No, market is saturated": "Available data suggests that the target market has a high level of supply compared to demand, which may limit the opportunities for a new project to enter without offering clear distinguishing features.",
			"Needs deeper study": "Insufficient data is available to accurately assess the level of demand or market feasibility. It requires collecting additional information on customer behavior, market trends, and competitor strategies before a final judgment can be made."
		};
		return responses[choice] || '';
	}

	function generateMarketNotes(notes) {
		if (!notes) return '';
		return `Additional notes related to the market data have been included, which are: ${notes}. These notes help provide additional context for the quantitative and qualitative data used in the assessment.`;
	}

    function generateProblemSolution(problemDescription) {
        const text = normalizeString(problemDescription);
        if (!text) return '';
        const lower = text.toLowerCase();

        let specificProblem = text;
        if (/(scarcity|lack|unavailable|shortage)/.test(lower)) specificProblem = 'scarcity and lack of product availability';
        else if (/(low quality|poor quality|inferior)/.test(lower)) specificProblem = 'difficulty finding high?quality products';
        else if (/(high price|expensive|overpriced|costly)/.test(lower)) specificProblem = 'the high cost of available items';

        let solution = 'superior?quality products at competitive prices';
        if (/(scarcity|lack|unavailable|shortage)/.test(lower)) solution = 'consistent product availability with reliable stock levels';
        else if (/(low quality|poor quality|inferior)/.test(lower)) solution = 'premium, quality?assured products';
        else if (/(high price|expensive|overpriced|costly)/.test(lower)) solution = 'value?driven pricing and attractive offers';

        let benefit = 'time and effort';
        if (/(high price|expensive|overpriced|costly)/.test(lower)) benefit = 'money';

        return `This project aims to solve the problem of ${specificProblem}. By offering ${solution}, the project will save customers ${benefit}, which helps satisfy their needs more effectively than current market alternatives.`;
    }

    function generateBusinessModel(selectedOptionsArray) {
        const arr = Array.isArray(selectedOptionsArray) ? selectedOptionsArray : [];
        if (arr.length === 0) return '';

        const map = {
            'product-sales': 'The project?s financial model is primarily based on product sales, focusing on turnover and healthy margins to ensure sustainable revenue.',
            'service-provision': 'The project?s financial model relies on service provision, generating recurring income through installations, maintenance, or value?added services.',
            'subscription': 'The project adopts a subscription model that ensures predictable, recurring revenue while deepening customer relationships.',
            'advertising': 'The project leverages advertising revenue by monetizing audience reach and engagement.',
            'commissions-fees': 'The project earns commissions and fees by facilitating transactions and providing intermediary services.',
            'leasing-renting': 'The project generates revenue through leasing and renting, converting assets into steady cash flows.',
            'licensing': 'The project licenses its brand or IP to partners, creating scalable, low?overhead revenue streams.',
            'other': 'The project utilizes an alternative revenue approach tailored to its market context.'
        };

        if (arr.length === 1) {
            const single = arr[0];
            return map[single] || 'The project?s financial model is clearly defined to support sustainable growth.';
        }

        const pieces = arr.map(v => map[v]).filter(Boolean);
        return `The project combines multiple financial models. ${pieces.join(' ')} This diversified approach helps increase overall revenue and mitigate risk.`;
    }

	function generateDistributionChannels(channelsArray) {
		const arr = Array.isArray(channelsArray) ? channelsArray : [];
        if (arr.length === 0) return '';

        const map = {
            'physical-store': 'The project will rely on a physical store to provide direct customer interaction and immediate access to products.',
            'online-store': 'The project will operate an online store to reach wider audiences and enable convenient 24/7 purchasing.',
            'mobile-app': 'The project will provide a mobile app to streamline browsing, ordering, and engagement on the go.',
            'sales-reps': 'The project will utilize sales representatives to build relationships and handle tailored, consultative sales.'
        };

        if (arr.length === 1) {
            const single = arr[0];
            return map[single] || 'The project will rely on a focused distribution channel to reach its customers effectively.';
        }

        const allKeys = ['physical-store', 'online-store', 'mobile-app', 'sales-reps'];
        const isAll = allKeys.every(k => arr.includes(k));
        if (isAll) {
            return 'The project will implement a comprehensive multi-channel distribution strategy encompassing a physical store, an online store, a dedicated mobile app, and direct outreach through sales representatives. This integrated approach maximizes reach, improves convenience, and strengthens customer relationships across touchpoints.';
        }

        const pieces = arr.map(v => map[v]).filter(Boolean);
        return `The project will use a multi-channel approach. ${pieces.join(' ')} This strategy ensures access to a broad customer base and enhances resilience against channel-specific fluctuations.`;
    }

	// Marketing Data Generators
	function generateTargetAge(ageRange) {
		if (!ageRange) return '';
		return `The target age group ranges between ${ageRange} years, which is suitable for the nature of the product/service and the needs of this segment.`;
	}

	function generateCustomerIncome(income) {
		if (!income && income !== 0) return '';
		return `The estimated average monthly income of the target customer is ${income}. This income level is compatible with the proposed pricing of the product, ensuring the purchasing power of the target customers.`;
	}

	function generateMarketingChannels(channels, otherText = "") {
		const raw = Array.isArray(channels) ? channels : [];
    // Normalize HTML values (e.g., 'social-media') to internal keys used by generators
    const keyMap = {
        'social-media': 'socialMediaAds',
        'content-marketing': 'contentMarketing',
        'tv-radio': 'tvRadioAds',
        'billboards': 'billboards',
        'public-relations': 'publicRelations',
        'other': 'otherChannels'
    };
    const arr = raw.map(v => keyMap[v] || v);
    const channelTexts = [];

    if (arr.includes('socialMediaAds')) {
        channelTexts.push("The project will rely on paid social media advertising as a primary marketing channel. This channel allows for direct and targeted access to the intended audience based on their interests and behaviors, ensuring high promotional efficiency.");
    }

    if (arr.includes('contentMarketing')) {
        channelTexts.push("The project will focus on content marketing to attract potential customers and build a trusting relationship with them. This includes creating valuable and useful content through blogs, videos, or social media, which enhances the project's position as an expert in its field.");
    }

    if (arr.includes('tvRadioAds')) {
        channelTexts.push("The project plans to use traditional advertising via TV or radio to reach a wide audience in the targeted geographical area, which quickly increases brand awareness.");
    }

    if (arr.includes('billboards')) {
        channelTexts.push("Billboard advertising will be used in key high-traffic areas to increase brand visibility and capture attention near the point of purchase.");
    }

    if (arr.includes('publicRelations')) {
        channelTexts.push("Public relations activities will be leveraged to build credibility and strengthen the brand through events, media coverage, and partnerships.");
    }

    if (arr.includes('otherChannels') && otherText) {
        channelTexts.push(`The project will use alternative marketing channels based on ${otherText}. This approach allows for a flexible and customized marketing strategy beyond traditional methods.`);
    }

    if (channelTexts.length === 0) return '';
    if (channelTexts.length === 1) return channelTexts[0];

    return `The project will adopt an integrated marketing strategy that combines ${raw.join(' and ')}. This mix ensures reaching customers through multiple channels, which enhances the effectiveness of marketing campaigns and achieves maximum possible reach.`;
	}

	function generateMarketingCost(cost) {
		if (!cost && cost !== 0) return '';
		return `The estimated initial monthly marketing cost is ${cost}. This budget is appropriate for implementing the proposed marketing strategies and achieving the set goals in the project's early stages.`;
	}

	function generateCompetitiveAdvantage(advantage) {
		if (!advantage) return '';
		return `The project's main competitive advantage lies in ${advantage}. This advantage distinguishes the project from competitors and attracts customers, giving it a strong market position.`;
	}

	function generateReachability(choice) {
		const responses = {
			"Yes, possible": "Initial analysis shows that reaching target customers through the proposed marketing channels is feasible and effective, and it is expected to be profitable.",
			"Major challenges": "The project faces significant challenges in reaching target customers efficiently and profitably, which requires a re-evaluation of the proposed marketing strategies or competitive advantage.",
			"Unclear": "It remains unclear whether target customers can be reached profitably. This point requires deeper study and a better understanding of the target audience's behavior before moving forward."
		};
		return responses[choice] || '';
	}

	function generateMarketingNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's marketing aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Technical & Operational Generators
	function generateLocationTraffic(trafficLevel) {
		const responses = {
			"High": "The location has high pedestrian and vehicle traffic, which ensures a large flow of potential customers and easy access to the project.",
			"Medium": "The location has medium traffic, which provides a balance between good customer access and avoiding severe congestion.",
			"Low": "The location has low traffic, which may present a challenge in attracting customers and requires additional marketing efforts to increase project awareness."
		};
		return responses[trafficLevel] || '';
	}

	function generateParkingAvailability(parking) {
		const responses = {
			"Easily available": "Parking is easily available at the location, which enhances the customer experience and encourages them to visit the store.",
			"Limited": "Parking is available but limited, which may cause some inconvenience for customers during peak hours.",
			"Not available": "Parking is not available at the location, which could be a significant barrier for customers who use their cars."
		};
		return responses[parking] || '';
	}

	function generateAttractionPoints(selectedPoints, otherText = "") {
		const pointDescriptions = {
			"residentialAreas": "residential areas, which ensures a large and geographically close potential customer base",
			"commercialCenters": "commercial centers and malls, which allows it to benefit from the high traffic of potential customers visiting these places",
			"universities": "universities and schools, making it an ideal destination for students and staff, and ensuring a continuous flow of customers",
			"markets": "major markets and shopping districts, which makes it part of an active commercial environment and enhances the chances of attracting shoppers",
			"transportHubs": "public transportation hubs, which facilitates access for customers who rely on public transport and increases its accessibility",
			"hospitals": "hospitals and clinics, making it suitable for customers who frequent these places and opening an opportunity to serve a specific segment of the public",
			"entertainment": "entertainment venues, which ensures a large customer flow during peak hours and helps integrate the project into a vibrant environment"
		};

		if (!Array.isArray(selectedPoints) || selectedPoints.length === 0) return '';

		const descriptions = selectedPoints.map(point => pointDescriptions[point] || '').filter(desc => desc);
		if (otherText) {
			descriptions.push(`other attraction points such as ${otherText}`);
		}

		if (descriptions.length === 1) {
			return `The project's location is strategically close to ${descriptions[0]}.`;
		}

		return `The project's location is strategically close to ${descriptions.join(', ')}. This ensures comprehensive access to diverse customer segments and enhances the project's visibility.`;
	}

	function generatePropertySummary(area, ownership, price) {
		if (!area && area !== 0) return '';

		let summary = `The required area for the project is approximately ${area} square meters. This space has been determined to meet the project's operational needs. `;

		if (ownership === "Rented") {
			summary += `This location will be rented at an annual value of ${price}. This decision gives the project high financial flexibility and reduces the burden of initial capital.`;
		} else if (ownership === "Owned") {
			summary += `This location will be purchased at an estimated value of ${price}. This investment represents a fixed asset for the project and provides long-term stability, though it requires a larger initial capital investment.`;
		}

		return summary;
	}

	function generateEquipmentSummary(equipmentList) {
		if (!equipmentList) return '';
		return `The project requires a set of basic equipment and furnishings as specified. These tools are essential to ensure efficient operations and provide an excellent customer experience.`;
	}

	function generateInventoryValue(value) {
		if (!value && value !== 0) return '';
		return `The initial inventory value is estimated at ${value}. This value was calculated based on the types and quantities of proposed goods to ensure sufficient stock to meet demand in the early stages.`;
	}

	function generateGoodsTypes(types) {
		if (!types) return '';
		return `The main inventory includes types of goods such as ${types}. These goods were selected based on the expected demand and the needs of the target customers.`;
	}

	function generateTechnicalFeasibility(choice) {
		const responses = {
			"Yes, possible": "The project appears to be technically and operationally feasible, as the necessary capabilities and resources are available.",
			"Technical challenges": "The project faces some technical challenges that may affect its implementation, requiring innovative solutions or an adjustment of initial plans.",
			"Unclear": "The technical and operational aspects of the project remain unclear, and a deeper assessment is needed to confirm its feasibility."
		};
		return responses[choice] || '';
	}

	function generateTechnicalNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the technical and operational aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Technological Data Generators
	function generateTechnologySummary(technologyData) {
		if (!technologyData || technologyData.length === 0) return '';
		return "The project relies on a set of core technologies that form the cornerstone of its operational processes. These technologies contribute to increasing operational efficiency, improving customer experience, and supporting the project's competitive capability.";
	}

	function generateTechnologyTable(technologyData) {
		if (!technologyData || technologyData.length === 0) return '';
		let table = "| Type of Technology Used | Estimated Cost |\n|---|---|\n";
		technologyData.forEach(tech => {
			if (tech.type && tech.cost) {
				table += `| ${tech.type} | ${tech.cost} |\n`;
			}
		});
		return table;
	}

	function generateTechnologyModernity(modernity) {
		const responses = {
			"Yes": "The proposed technology is modern and compatible with current market requirements. This ensures the project will be able to compete effectively and benefit from the latest security and operational features.",
			"No": "The technology used is outdated or incompatible with current requirements, which may lead to operational challenges and hinder the project's ability to evolve or adapt to future changes.",
			"Partially": "The technology is partially modern but may need future updates or adjustments to keep pace with market developments."
		};
		return responses[modernity] || '';
	}

	function generateMaintenanceDifficulties(choice, explanation = "") {
		if (choice === "No") {
			return "No difficulties are expected in technology maintenance or obtaining technical support, which ensures the smooth continuity of operational processes.";
		} else if (choice === "Yes" && explanation) {
			return `Difficulties are expected in technology maintenance or obtaining technical support, due to ${explanation}. This poses a potential operational risk that needs to be planned for.`;
		} else if (choice === "Yes") {
			return "Difficulties are expected in technology maintenance or obtaining technical support, which may pose operational risks that need to be addressed.";
		} else if (choice === "Not sure") {
			return "Insufficient information is available to assess maintenance and technical support difficulties, requiring additional research to determine potential risks.";
		}
		return '';
	}

	function generateSupplierDependence(dependence) {
		const responses = {
			"Full dependence": "The project is fully dependent on external suppliers to provide and maintain the technology. This dependence may expose the project to risks related to service availability, cost increases, or support disruptions.",
			"Partial dependence": "The project is partially dependent on external suppliers, which reduces risks compared to full dependence but still requires good management of supplier relationships.",
			"No dependence": "The project is not dependent on external suppliers, which gives it complete autonomy in managing and maintaining the technology."
		};
		return responses[dependence] || '';
	}

	function generateTechnologySafety(safety) {
		const responses = {
			"Yes, sustainable": "The proposed technology is safe and sustainable, and it effectively meets the project's needs.",
			"Technical risks": "The proposed technology carries potential technical risks that may affect its sustainability or the safety of operational processes.",
			"Needs evaluation": "The technology still requires a comprehensive evaluation to ensure it meets safety and sustainability requirements and fulfills all project needs."
		};
		return responses[safety] || '';
	}

	function generateTechnologyNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's technological aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Legal Data Generators
	function generateProjectLegality(legality) {
		const responses = {
			"Yes": "The project appears to be legal in the concerned country, which indicates that the general idea does not conflict with applicable laws and regulations.",
			"No": "The project is not legal in the concerned country, which presents a significant obstacle to its implementation and requires fundamental changes to the idea or location.",
			"Not sure": "There is insufficient information to confirm the project's legal status, and specialized legal consultation is needed to ensure compliance with all laws."
		};
		return responses[legality] || '';
	}

	// Environmental Data Generators
	function generateEnvironmentalImpact(hasImpact, explanation = "") {
		if (hasImpact === "No") {
			return "The project is not expected to have any direct or indirect impact on the environment, which makes it an eco-friendly project in terms of its nature of work.";
		} else if (hasImpact === "Yes" && explanation) {
			return `The project has a direct or indirect impact on the environment. This impact is particularly focused on aspects such as ${explanation}. This requires developing clear strategies to reduce the environmental footprint.`;
		} else if (hasImpact === "Yes") {
			return "The project has a direct or indirect impact on the environment, which requires developing clear strategies to reduce the environmental footprint.";
		} else if (hasImpact === "Not sure") {
			return "There is insufficient information to determine whether the project will affect the environment, which calls for a preliminary assessment to identify the potential impact.";
		}
		return '';
	}

	function generateEnvironmentalApprovals(approvalsNeeded) {
		const responses = {
			"Yes": "The project requires an environmental impact assessment and/or special environmental approvals from the relevant authorities. This procedure is essential to ensure compliance with local and international regulations.",
			"No": "The project does not need an environmental impact assessment or special environmental approvals, which facilitates the implementation process and speeds up the acquisition of licenses.",
			"Not sure": "It remains unclear whether the project requires environmental assessments or approvals. There is a need to consult official bodies to clarify these requirements."
		};
		return responses[approvalsNeeded] || '';
	}

	function generateEnvironmentalFriendliness(friendliness) {
		const responses = {
			"Environmentally friendly": "The project is generally environmentally friendly, as it adopts sustainable practices in its operational activities, which contributes to protecting the environment and enhancing the project's positive image.",
			"Needs treatment": "The project faces some environmental issues that require treatment, which calls for developing an action plan to reduce the negative impact and ensure compliance with environmental standards.",
			"Significant negative impact": "The project is expected to have a significant negative impact on the environment, which poses a major risk and requires re-evaluating its feasibility or seeking more sustainable alternatives."
		};
		return responses[friendliness] || '';
	}

	function generateEnvironmentalNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's environmental aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	function generateLicensesSummary(licensesData) {
		if (!licensesData || licensesData.length === 0) return '';
		const licenseTypes = licensesData.map(license => license.type).filter(type => type).join(', ');
		return `The project needs a set of basic licenses and permits to begin operations, which include ${licenseTypes}. Obtaining these licenses is a prerequisite to ensuring compliance with government regulations. The following table shows the estimated costs for these licenses.`;
	}

	function generateLicensesTable(licensesData) {
		if (!licensesData || licensesData.length === 0) return '';
		let table = "| Type of License | Estimated Value |\n";
		table += "|---|---|\n";
		let totalCost = 0;
		licensesData.forEach(license => {
			if (license.type && license.cost !== undefined && license.cost !== '') {
				table += `| ${license.type} | ${license.cost} |\n`;
				totalCost += parseFloat(license.cost) || 0;
			}
		});
		if (totalCost > 0) {
			table += `| **Total** | **${totalCost.toFixed(2)}** |`;
		}
		return table;
	}

	function generateLegalRisks(hasRisks, explanation = "") {
		if (hasRisks === "No") {
			return "The project is not expected to face potential legal risks, which reflects full compliance with local regulations.";
		} else if (hasRisks === "Yes" && explanation) {
			return `The project may face potential legal risks. These risks are related to ${explanation}. These risks require continuous monitoring and proactive steps to mitigate their impact.`;
		} else if (hasRisks === "Yes") {
			return "The project may face potential legal risks that require continuous monitoring and proactive steps to mitigate their impact.";
		}
		return '';
	}

	function generateLegalObstacles(obstacles) {
		const responses = {
			"No obstacles": "There are no real legal obstacles or major challenges preventing the project from being implemented.",
			"Obstacles can be overcome": "The project faces some legal obstacles that can be overcome, which requires careful planning and specialized legal consultation.",
			"Major obstacles": "The project faces major legal obstacles that may hinder its implementation, necessitating a re-evaluation of the project's feasibility from a legal standpoint."
		};
		return responses[obstacles] || '';
	}

	function generateLegalNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's legal aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Risk Data Generators
	function generateRisksSummary(risksData) {
		if (!risksData || risksData.length === 0) return '';
		return "The project faces a set of key risks that have been identified outside the scope of previous sections. These risks require a careful assessment of their probability and impact on the project. The following table provides a breakdown of these risks.";
	}

	function generateRisksTable(risksData) {
		if (!risksData || risksData.length === 0) return '';
		let table = "| Type of Risk | Probability of Occurrence (1-5) | Impact on Project (1-5) |\n";
		table += "|---|---|---|\n";
		let totalProbability = 0;
		let totalImpact = 0;
		let validEntries = 0;
		risksData.forEach(risk => {
			if (risk.type && risk.probability && risk.impact) {
				table += `| ${risk.type} | ${risk.probability} | ${risk.impact} |\n`;
				totalProbability += parseFloat(risk.probability) || 0;
				totalImpact += parseFloat(risk.impact) || 0;
				validEntries++;
			}
		});
		if (validEntries > 0) {
			const avgProbability = (totalProbability / validEntries).toFixed(2);
			const avgImpact = (totalImpact / validEntries).toFixed(2);
			table += `| **Average Assessment** | **${avgProbability}** | **${avgImpact}** |`;
		}
		return table;
	}

	function generateContingencyPlan(plan, explanation = "") {
		if (plan === "Yes" && explanation) {
			return `A preliminary contingency plan exists to address the identified risks. This plan includes ${explanation}.`;
		} else if (plan === "Yes") {
			return "A preliminary contingency plan exists to address the identified risks.";
		} else if (plan === "No") {
			return "There is no preliminary contingency plan to address the identified risks, which increases the project's risk level.";
		} else if (plan === "Partially") {
			return "There is a partial contingency plan, but it may not adequately cover all potential risks.";
		}
		return '';
	}

	function generateRiskControl(control) {
		const responses = {
			"Yes, can be controlled": "The main risks can be controlled and mitigated effectively, which enhances the project's chances of success and increases its investment attractiveness.",
			"Major challenges": "The project faces major challenges in controlling risks, which requires a larger investment in contingency plans or a re-evaluation of the project's feasibility.",
			"Very high risk": "The main risks are very high and difficult to control, which poses a direct threat to the project's sustainability."
		};
		return responses[control] || '';
	}

	function generateRiskNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the risk-related aspects of the project have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

	// Table Generators
	function generatePropertyTable(ownership, price) {
		if (!ownership || !price) return '';
		if (ownership === "Rented") {
			return `| Type of Ownership | Annual Value |\n|---|---|\n| Rental | ${price} |`;
		} else {
			return `| Type of Ownership | Total Value |\n|---|---|\n| Owned | ${price} |`;
		}
	}

	function generateInventoryTable(value) {
		if (!value && value !== 0) return '';
		return `| Item | Value |\n|---|---|\n| Initial Inventory | ${value} |`;
	}

	// Organizational Data Generators
	function generateAdminStructure(selectedStructures, otherText = "") {
		const structureTexts = {
			"ownerManager": "The project's administrative structure is proposed to rely on an Owner/Store manager. This is suitable for small, initial-stage projects, where one person takes on the responsibility for overall operational management.",
			"salesStaff": "The proposed administrative structure focuses on a specialized sales team, reflecting the priority given to sales management and direct customer interaction.",
			"customerService": "The administrative structure includes a dedicated customer service team. This highlights the project's commitment to ensuring a high level of customer satisfaction and after-sales support.",
			"adminStaff": "The project's structure includes administrative staff to handle daily operational tasks and ensure the efficiency of internal processes.",
			"techSupport": "The administrative structure features a technical support team, which is crucial for projects that rely on technology and require specialized maintenance and support.",
			"marketingStaff": "The project will have dedicated marketing staff. This shows a focus on promoting the brand and achieving growth by reaching a wider audience."
		};

		const arr = Array.isArray(selectedStructures) ? selectedStructures : [];
		const selectedDescriptions = arr
			.map(structure => structureTexts[structure])
			.filter(desc => desc);

		if (otherText) {
			selectedDescriptions.push(`The administrative structure also includes additional roles such as ${otherText}.`);
		}

		if (selectedDescriptions.length === 0) return '';

		if (selectedDescriptions.length === 1) {
			return selectedDescriptions[0];
		}

		const structureNames = arr.map(structure => {
			const names = {
				"ownerManager": "Owner/Store manager",
				"salesStaff": "sales team",
				"customerService": "customer service team",
				"adminStaff": "administrative staff",
				"techSupport": "technical support team",
				"marketingStaff": "marketing staff"
			};
			return names[structure] || structure;
		});

		return `The project will adopt an administrative structure that combines ${structureNames.join(', ')}. This structure provides a balance between general management and specialized roles, contributing to the efficiency of operational activities.`;
	}

	function generateDecisionMaking(mechanism) {
		const responses = {
			"Central decisions from owner": "The main decision-making mechanism is centralized with the owner. This approach ensures consistent and quick decisions but may limit management flexibility.",
			"Delegated to store manager": "The responsibility for daily decision-making is delegated to the store manager. This approach allows for greater flexibility in handling operational challenges and reduces the burden on the owner.",
			"Team-based decisions": "The decision-making mechanism is team-based, where employees are involved in making relevant decisions. This approach fosters a sense of shared responsibility and contributes to collective problem-solving."
		};
		return responses[mechanism] || '';
	}

	function generateGovernanceRequirements(choice, explanation = "") {
		if (choice === "Yes" && explanation) {
			return `Specific governance requirements will be applied to ensure operational efficiency and transparency. This includes ${explanation}. This helps in monitoring performance and making data-driven decisions.`;
		} else if (choice === "Yes") {
			return "Specific governance requirements will be applied to ensure operational efficiency and transparency, helping in monitoring performance and making data-driven decisions.";
		} else if (choice === "No") {
			return "There are no specific governance requirements in the project's initial phase. This may allow for greater flexibility but could reduce transparency and the ability to systematically monitor performance.";
		} else if (choice === "Not sure") {
			return "Governance requirements have not yet been determined, and a later assessment of their importance is needed to ensure effective management.";
		}
		return '';
	}

	function generateOrganizationalEffectiveness(effectiveness) {
		const responses = {
			"Yes, effective": "The proposed administrative structure appears suitable and appropriate for the project's initial phase, ensuring the efficiency of administrative operations.",
			"Needs improvement": "The proposed administrative structure needs improvement to ensure its effectiveness. This may require a re-evaluation of roles or the addition of new tasks.",
			"Unclear": "The project's administrative aspects remain unclear, and a deeper assessment is needed to determine whether the organizational structure is appropriate."
		};
		return responses[effectiveness] || '';
	}

	function generateOrganizationalNotes(notes) {
		if (!notes) return '';
		return `Additional notes regarding the project's organizational aspects have been included, which are: ${notes}. These notes provide additional context and help in understanding factors not mentioned in previous questions, adding depth to the initial analysis.`;
	}

    // Expose for button click usage
    window.feasibilityGenerators = {
        generateBusinessIdea,
        generateProblemSolution,
        generateBusinessModel,
		generateDistributionChannels,
		// Social Data
		generateCommunityImpact,
		generateJobOpportunities,
		generateSocialImpactAlignment,
		generateSocialNotes,
		// Cultural Data
		generateCulturalAlignment,
		generateCulturalRejection,
		generateCulturalAcceptability,
		generateCulturalNotes,
		// Behavioral Data
		generateBehaviorAlignment,
		generateBehaviorResistance,
		generateCustomerSupport,
		generateBehavioralNotes,
		// Operational Data
		calculateTotalEmployees,
		generateStaffingSummary,
		generatePayrollTable,
		generateDailyOperations,
		generateOperationalEfficiency,
		generateOperationalNotes,
		generateAnnualOperationalCosts,
		// Market Data
		generateMarketSize,
		generatePotentialCustomers,
		generateGrowthRate,
		generateGrowthFactors,
		generateCompetitorCount,
		generateMarketGap,
		generateMarketFeasibility,
		generateMarketNotes,
		// Marketing Data
		generateTargetAge,
		generateCustomerIncome,
		generateMarketingChannels,
		generateMarketingCost,
		generateCompetitiveAdvantage,
		generateReachability,
		generateMarketingNotes,
		// Technical & Operational
		generateLocationTraffic,
		generateParkingAvailability,
		generateAttractionPoints,
		generatePropertySummary,
		generateEquipmentSummary,
		generateInventoryValue,
		generateGoodsTypes,
		generateTechnicalFeasibility,
		generateTechnicalNotes,
		// Tables
		generatePropertyTable,
		generateInventoryTable,
		// Technological Data
		generateTechnologySummary,
		generateTechnologyTable,
		generateTechnologyModernity,
		generateMaintenanceDifficulties,
		generateSupplierDependence,
		generateTechnologySafety,
		generateTechnologyNotes,
		// Risk Data
		generateRisksSummary,
		generateRisksTable,
		generateContingencyPlan,
		generateRiskControl,
		generateRiskNotes,
		// Time Data
		generateMarketTiming,
		generateImplementationTiming,
		generateTimeNotes,
		// Political Data
		generatePoliticalStability,
		generateRegulatoryExposure,
		generatePoliticalRisk,
		generatePoliticalNotes,
		// Legal Data
		generateProjectLegality,
		generateLicensesSummary,
		generateLicensesTable,
		generateLegalRisks,
		generateLegalObstacles,
		generateLegalNotes,
		// Financial Data
		generateTotalCapital,
		generateOperationalCosts,
		generatePaybackPeriod,
		generateRoiExpectation,
		generateFinancialFeasibility,
		generateFinancialNotes,
		// Environmental Data
		generateEnvironmentalImpact,
		generateEnvironmentalApprovals,
		generateEnvironmentalFriendliness,
		generateEnvironmentalNotes,
		// Economic Data
		generateEconomicValue,
		generateGdpImpact,
		generateEconomicFeasibility,
		generateEconomicNotes,
		// Organizational Data
		generateAdminStructure,
		generateDecisionMaking,
		generateGovernanceRequirements,
		generateOrganizationalEffectiveness,
		generateOrganizationalNotes,
		// Additional Investments
		generateAdditionalInvestments,
		generateInvestmentsTable,
		// Financial Data
		generateTotalCapital,
		generateOperationalCosts,
		generatePaybackPeriod,
		generateRoiExpectation,
		generateFinancialFeasibility,
		generateFinancialNotes
	};

	// ==================== FINANCIAL ANALYSIS SIMULATION ====================

	// 1. STRICT Data Validation - Use ONLY user-provided data
    function getStrictUserData() {
		const startData = {
            // These will be overridden at runtime from IndexedDB when used in async flows if needed elsewhere
            taxRate: safeParseFloat((typeof window !== 'undefined' && window.FeasibilityDB && window.FeasibilityDB.__lastProjectTaxRate) || null),
            loanAmount: safeParseFloat((typeof window !== 'undefined' && window.FeasibilityDB && window.FeasibilityDB.__lastLoanAmount) || null),
            interestRate: safeParseFloat((typeof window !== 'undefined' && window.FeasibilityDB && window.FeasibilityDB.__lastInterestValue) || null),
			// Accept both naming variants from start-feasibility.html and other pages
			personalAmount: (function() {
                const primary = (typeof window !== 'undefined' && window.FeasibilityDB) ? window.FeasibilityDB.__lastPersonalAmount : null;
                const fallback = (typeof window !== 'undefined' && window.FeasibilityDB) ? window.FeasibilityDB.__lastPersonalContribution : null;
				return safeParseFloat(primary !== null && primary !== undefined ? primary : fallback);
			})(),
			repaymentMonths: (function() {
                const primary = (typeof window !== 'undefined' && window.FeasibilityDB) ? window.FeasibilityDB.__lastRepaymentMonths : null;
                const fallback = (typeof window !== 'undefined' && window.FeasibilityDB) ? window.FeasibilityDB.__lastLoanMonths : null;
				return safeParseInt(primary !== null && primary !== undefined ? primary : fallback);
			})()
		};

        // Note: financial analysis generation is synchronous by design; ensure latest snapshot is mirrored synchronously if available
        const surveyData = (typeof window !== 'undefined' && window.__latestFeasibilityStudyAnswers) ? window.__latestFeasibilityStudyAnswers : {};

		return {
			startData: removeNullValues(startData),
			surveyData,
			// Market Data - ONLY if user provided
			marketSize: safeParseFloat(surveyData.marketSize),
			marketGrowth: safeParseFloat(surveyData.growthRate),
			customerCount: safeParseFloat(surveyData.potentialCustomers),
			competitorsCount: safeParseFloat(surveyData.competitorsCount), // ? ?????
			marketGap: surveyData.marketGap,
			
			// Operational Data - ONLY if user provided
			annualSalaries: calculateTotalAnnualSalaries(surveyData.staffTable),
			propertyCost: safeParseFloat(surveyData.propertyPrice),
			rentOption: surveyData.rentOption, // ? ?????
			marketingCost: safeParseFloat(surveyData.marketingCost),
			
			// Cost Data - ONLY if user provided
			operationalCosts: surveyData.annualOperationalCosts || {},
			inventoryValue: safeParseFloat(surveyData.inventoryValue)
		};
	}

	// 1.1 Safe parsing functions
	function safeParseFloat(value) {
		if (value === null || value === undefined || value === '') return null;
		const parsed = parseFloat(value);
		return isNaN(parsed) ? null : parsed;
	}

	function safeParseInt(value) {
		if (value === null || value === undefined || value === '') return null;
		const parsed = parseInt(value);
		return isNaN(parsed) ? null : parsed;
	}

	// 1.2 Remove null values from object
	function removeNullValues(obj) {
		const result = {};
		for (const [key, value] of Object.entries(obj)) {
			if (value !== null && value !== undefined) {
				result[key] = value;
			}
		}
		return result;
	}

	// 1.3 Calculate salaries ONLY if valid data exists
	function calculateTotalAnnualSalaries(staffTable) {
		if (!staffTable || !Array.isArray(staffTable) || staffTable.length === 0) {
			return null;
		}
		
		let hasValidData = false;
		const total = staffTable.reduce((sum, staff) => {
			const count = safeParseFloat(staff.employeeCount);
			const monthly = safeParseFloat(staff.monthlySalary);
			
			if (count && monthly) {
				hasValidData = true;
				return sum + (count * monthly * 12);
			}
			return sum;
		}, 0);
		
		return hasValidData && total > 0 ? total : null;
	}

	// 2. Calculation Functions - Only calculate with available data
	function calculateAnnualSales(year, marketSize, marketGrowth, competitorsCount, marketGap) {
		if (!marketSize) return null;
		
		const marketShare = calculateMarketShare(competitorsCount, marketGap);
		const baseSales = marketSize * marketShare;
		
		const annualGrowth = marketGrowth ? 1 + (marketGrowth / 100) : 1;
		return baseSales * Math.pow(annualGrowth, year - 1);
	}

	function calculateMarketShare(competitorsCount, marketGap) {
		if (competitorsCount === 0) return 0.15;
		if (marketGap === 'Yes') return 0.08;
		if (marketGap === 'No') return 0.02;
		return 0.03;
	}

	function calculateCOGS(sales, inventoryValue) {
		if (!sales) return null;
		
		if (inventoryValue && sales > 0) {
			const cogsRatio = Math.min(0.7, Math.max(0.3, inventoryValue / sales));
			return sales * cogsRatio;
		}
		return null;
	}

	function calculateOperatingExpenses(year, baseAmount) {
		if (!baseAmount) return null;
		return baseAmount;
	}

	/**
	 * Build an ANNUAL amortization schedule using only user-provided inputs.
	 *
	 * Assumptions per requirements:
	 * - All figures are strictly annual (no monthly compounding/payments).
	 * - Number of years = ceil(repaymentMonths / 12).
	 * - Payment is constant per year using standard amortization:
	 *     payment = r * L / (1 - (1 + r)^(-n))
	 *   where r = annualInterestRateDecimal, n = number of annual payments (years)
	 * - If interest rate is 0, principal is repaid evenly by year.
	 * - No defaults or hidden assumptions beyond user inputs.
	 *
	 * Returns an array of years with: { year, payment, interest, principal, remainingPrincipal }
	 */
	function buildAnnualAmortizationSchedule(loanAmount, interestRatePercent, repaymentMonths) {
		const amount = Number(loanAmount);
		const ratePercent = interestRatePercent === null || interestRatePercent === undefined ? null : Number(interestRatePercent);
		const months = Number(repaymentMonths);
		if (!Number.isFinite(amount) || amount <= 0) return [];
		if (!Number.isFinite(months) || months <= 0) return [];
		if (ratePercent === null || !Number.isFinite(ratePercent) || ratePercent < 0) return [];

		const years = Math.ceil(months / 12);
		const r = ratePercent / 100; // annual rate as decimal
		let remaining = amount;
		let payment;
		if (r === 0) {
			payment = amount / years;
		} else {
			const denom = 1 - Math.pow(1 + r, -years);
			payment = (r * amount) / denom;
		}

		const schedule = [];
		for (let y = 1; y <= years; y++) {
			const interest = r === 0 ? 0 : remaining * r;
			let principal = payment - interest;
			// Ensure last year closes out any rounding residuals
			if (y === years) {
				principal = remaining;
			}
			const newRemaining = Math.max(0, remaining - principal);
			schedule.push({
				year: y,
				payment,
				interest,
				principal,
				remainingPrincipal: newRemaining
			});
			remaining = newRemaining;
		}
		return schedule;
	}

	function calculateIncomeTax(profitBeforeTax, taxRate) {
		if (!taxRate || !profitBeforeTax || profitBeforeTax <= 0) return null;
		return profitBeforeTax * (taxRate / 100);
	}

	// 3. Main Financial Analysis Function
	function generateFinancialAnalysis() {
		const userData = getStrictUserData();
		
		const missingEssential = checkMissingEssentialData(userData);
		if (missingEssential.length > 0) {
			// Clear any stale financial statements so mirrors stay accurate
			try { saveProcessedFinancialData(null); } catch (_) {}
			return `## Financial Analysis\n\n*Cannot generate complete financial analysis. Missing essential data:*\n- ${missingEssential.join('\n- ')}`;
		}

		const financialData = { years: [], missingFields: [] };

		// Determine dynamic projection period from user-provided repayment months
		const loanAmount = userData.startData.loanAmount;
		const interestRate = userData.startData.interestRate;
		const repaymentMonths = userData.startData.repaymentMonths;
		const amortSchedule = buildAnnualAmortizationSchedule(loanAmount, interestRate, repaymentMonths);
		const projectionYears = amortSchedule.length;
        if (projectionYears === 0) {
        financialData.missingFields.push(
        !loanAmount || loanAmount <= 0 ? "Loan amount" : null,
        interestRate === null || interestRate === undefined ? "Interest rate (%)" : null,
        !repaymentMonths || repaymentMonths <= 0 ? "Repayment period (months)" : null
        );
        financialData.missingFields = financialData.missingFields.filter(Boolean);
        // Persist an empty/null financial statements block to reflect state
        try { saveProcessedFinancialData(null); } catch (_) {}
        return formatFinancialReport(financialData, userData, amortSchedule);
        }

		for (let year = 1; year <= projectionYears; year++) {
			const yearData = { year };
			
			// REVENUES
			yearData.sales = calculateAnnualSales(
				year, 
				userData.marketSize, 
				userData.marketGrowth,
				userData.competitorsCount,
				userData.marketGap
			);
			
			yearData.cogs = calculateCOGS(yearData.sales, userData.inventoryValue);
			yearData.grossProfit = yearData.sales && yearData.cogs ? 
				yearData.sales - yearData.cogs : null;

			// OPERATING EXPENSES
			yearData.salaries = calculateOperatingExpenses(year, userData.annualSalaries);
			yearData.rent = calculateOperatingExpenses(year, userData.propertyCost);
			yearData.marketing = userData.marketingCost ? 
				calculateOperatingExpenses(year, userData.marketingCost * 12) : null;
			
			yearData.utilities = userData.operationalCosts.utilities ? 
				calculateOperatingExpenses(year, safeParseFloat(userData.operationalCosts.utilities)) : null;
			yearData.otherOps = userData.operationalCosts.operations ? 
				calculateOperatingExpenses(year, safeParseFloat(userData.operationalCosts.operations)) : null;
			
			yearData.totalOperatingExpenses = calculateSum([
				yearData.salaries, yearData.rent, yearData.marketing, 
				yearData.utilities, yearData.otherOps
			]);

			// DEPRECIATION
			yearData.depreciation = userData.operationalCosts.depreciation ? 
				calculateOperatingExpenses(year, safeParseFloat(userData.operationalCosts.depreciation)) : null;

			// EBIT
			yearData.ebit = yearData.grossProfit && yearData.totalOperatingExpenses ? 
				yearData.grossProfit - yearData.totalOperatingExpenses - (yearData.depreciation || 0) : null;

			// FINANCING (Loan) - strict annual amortization
			const amort = amortSchedule[year - 1];
			yearData.loanPaymentAnnual = amort ? amort.payment : null; // total annual cash out (P+I)
			yearData.interestExpense = amort ? amort.interest : null; // used for P&L
			yearData.principalPayment = amort ? amort.principal : null; // for reporting details if needed
			yearData.remainingPrincipal = amort ? amort.remainingPrincipal : null;
			// Remove any non-user-based assumptions
			yearData.interestIncome = null;

			// FINAL CALCULATIONS
			yearData.profitBeforeTax = calculateProfitBeforeTax(
				yearData.ebit, 
				null, 
				yearData.loanPaymentAnnual
			);
			
			yearData.incomeTax = calculateIncomeTax(yearData.profitBeforeTax, userData.startData.taxRate);
			yearData.netProfit = yearData.profitBeforeTax !== null && yearData.incomeTax !== null ? 
				yearData.profitBeforeTax - (yearData.incomeTax || 0) : null;
				
			yearData.netProfitMargin = yearData.sales && yearData.netProfit ? 
				(yearData.netProfit / yearData.sales) * 100 : null;

			financialData.years.push(yearData);
		}

		return formatFinancialReport(financialData, userData, amortSchedule);
	}

	// 4. Helper Functions
	function calculateSum(values) {
		const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
		return validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) : null;
	}

	function calculateProfitBeforeTax(ebit, interestIncome, interestExpense) {
		const validValues = [ebit, interestIncome, interestExpense].filter(v => v !== null && !isNaN(v));
		if (validValues.length === 0) return null;
		
		return (ebit || 0) + (interestIncome || 0) - (interestExpense || 0);
	}

	// ==================== CASH FLOW HELPERS ====================
    /**
     * Attempt to read user's selected currency from unified survey data
     * Only uses user-provided values; if not present, returns null.
     */
    function getUserCurrency(userData) {
        try {
            const mem = (typeof window !== 'undefined' && window.FeasibilityDB && window.FeasibilityDB.__lastCurrency);
            if (mem) {
                const s = normalizeString(mem);
                if (s) return s;
            }
        } catch(_) {}
		const survey = userData && userData.surveyData ? userData.surveyData : {};
		return normalizeString(survey && (survey.projectCurrency || survey.selectedCurrency || survey.currency)) || null;
	}

	/**
	 * Format a number as localized string. If currency provided, append as suffix.
	 * If value is null/undefined/NaN, return "Data required".
	 */
	function formatCurrencyValue(value, currencyCode) {
		if (value === null || value === undefined || isNaN(value)) return "Data required";
		const base = Math.round(value).toLocaleString();
		return currencyCode ? `${base} ${currencyCode}` : base;
	}

	function sumArrayNumbers(values) {
		const valid = (values || []).filter(v => v !== null && v !== undefined && Number.isFinite(v));
		return valid.length ? valid.reduce((a, b) => a + b, 0) : 0;
	}

	function parsePercent(text) {
		if (!text && text !== 0) return null;
		const s = ('' + text).trim();
		if (!s) return null;
		const m = s.match(/-?\d+(?:\.\d+)?/);
		if (!m) return null;
		const num = parseFloat(m[0]);
		return Number.isFinite(num) ? (num / 100) : null;
	}

	/**
	 * Compute annual interest income from additional investments table.
	 * Expects user-provided rows with value and expected return (e.g., "8%")
	 */
	function computeInterestIncomeFromInvestments(investmentsTable) {
		if (!Array.isArray(investmentsTable) || investmentsTable.length === 0) return 0;
		let total = 0;
		investmentsTable.forEach(row => {
			const valueNum = safeParseFloat(row && row.value);
			const rate = parsePercent(row && row.return);
			if (Number.isFinite(valueNum) && rate !== null) {
				total += valueNum * rate;
			}
		});
		return total;
	}

	/**
	 * Parse a free-text equipment list string like "Item A: 1000; Item B: 2500"
	 * and sum numeric values. Uses only numbers explicitly provided by user.
	 */
	function parseEquipmentTotalFromString(equipmentListString) {
		if (!equipmentListString) return 0;
		const nums = ('' + equipmentListString).match(/-?\d+(?:\.\d+)?/g);
		if (!nums) return 0;
		return nums.map(n => parseFloat(n)).filter(Number.isFinite).reduce((a, b) => a + b, 0);
	}

	/**
	 * Compute annual cash flows strictly from user-provided inputs.
	 * Investing and Financing activities are recorded only in Year 0.
	 * Operating activities are annual and exclude non-cash items (e.g., depreciation).
	 * Returns an object with per-year arrays and performance metrics.
	 */
	function computeCashFlowData(financialData, userData, amortSchedule) {
		const yearsCount = financialData.years ? financialData.years.length : 0;
		const currency = getUserCurrency(userData);
		const notes = [];

		// Gather user inputs for year 0 investing/financing
		const survey = userData && userData.surveyData ? userData.surveyData : {};
		const propertyPrice = safeParseFloat(survey.propertyPrice);
		const licensesTotal = safeParseFloat(survey.licensesTotal);
		const inventoryValue = safeParseFloat(userData.inventoryValue);
		const equipmentListString = survey.equipmentList;
		const equipmentTotal = parseEquipmentTotalFromString(equipmentListString);
		const additionalInvestmentsTotal = safeParseFloat(survey.investmentsTotal);
		const investmentsTable = Array.isArray(survey.investmentsTable) ? survey.investmentsTable : [];
		const personalAmount = safeParseFloat(userData.startData && userData.startData.personalAmount);
		const loanAmount = safeParseFloat(userData.startData && userData.startData.loanAmount);
		const taxRate = safeParseFloat(userData.startData && userData.startData.taxRate);

		if (!currency) notes.push('Currency not provided. Amounts shown without currency code.');
		if (!Number.isFinite(taxRate)) notes.push('Tax rate not provided. Income tax cannot be computed.');

		// Interest income from additional investments (annual)
		const annualInterestIncome = computeInterestIncomeFromInvestments(investmentsTable);

		// Per-year arrays including Year 0
		const operatingCF = new Array(yearsCount + 1).fill(null); // index 0 => Year 0
		const investingCF = new Array(yearsCount + 1).fill(0);
		const financingCF = new Array(yearsCount + 1).fill(0);
		const dividends = new Array(yearsCount + 1).fill(0); // always present; zero unless user input provided (none in current survey)
		const netCF = new Array(yearsCount + 1).fill(null);

		// Year 0 Investing/Financing strictly from user inputs
		const year0InvestingOut = sumArrayNumbers([
			propertyPrice,
			licensesTotal,
			inventoryValue,
			equipmentTotal,
			additionalInvestmentsTotal
		]) * -1; // outflow as negative
		investingCF[0] = year0InvestingOut;

		const year0FinancingIn = sumArrayNumbers([
			personalAmount,
			loanAmount
		]);
		financingCF[0] = year0FinancingIn;

		// Operating CF per year (Years 1..N). Direct method: cash revenues - cash operating expenses - tax + interest income (if any)
		for (let y = 1; y <= yearsCount; y++) {
			const yd = financialData.years[y - 1] || {};
			const cashRevenues = safeParseFloat(yd.sales);
			const cashOperatingOut = sumArrayNumbers([
				safeParseFloat(yd.cogs),
				safeParseFloat(yd.salaries),
				safeParseFloat(yd.rent),
				safeParseFloat(yd.marketing),
				safeParseFloat(yd.utilities),
				safeParseFloat(yd.otherOps)
			]);
			let taxPaid = null;
			if (Number.isFinite(taxRate)) {
				// Tax on operating profit before interest: (Sales - COGS - cash OPEX)
				const taxable = (cashRevenues || 0) - (cashOperatingOut || 0);
				taxPaid = taxable > 0 ? taxable * (taxRate / 100) : 0;
			}
			const opCf = (cashRevenues || 0) - (cashOperatingOut || 0) - (taxPaid === null ? 0 : taxPaid) + (annualInterestIncome || 0);
			// If core components missing, mark as null
			if (cashRevenues === null || cashRevenues === undefined || isNaN(cashRevenues)) {
				operatingCF[y] = null;
			} else if (!Number.isFinite(cashOperatingOut)) {
				operatingCF[y] = null;
			} else if (taxPaid === null) {
				operatingCF[y] = null;
			} else {
				operatingCF[y] = opCf;
			}
		}

		// Financing/Investing are only recorded at Year 0 per requirements; other years remain 0

		// Net cash flow per year
		for (let i = 0; i < netCF.length; i++) {
			const op = operatingCF[i];
			const inv = investingCF[i];
			const fin = financingCF[i] - (dividends[i] || 0);
			netCF[i] = (op === null ? null : op) + inv + fin;
			if (op === null && (inv === 0) && (fin === 0)) {
				netCF[i] = null;
			}
		}

		// Performance metrics
		const cashFlowsForMetrics = netCF.map(v => (v === null || v === undefined || isNaN(v)) ? 0 : v);
		const cumulativeOperatingCF = operatingCF.reduce((acc, v) => acc + ((v && Number.isFinite(v)) ? v : 0), 0);
		const npv10 = computeNPV(cashFlowsForMetrics, 0.10);
		const irr = computeIRR(cashFlowsForMetrics);
		const payback = computePaybackPeriod(cashFlowsForMetrics);

		return {
			currency,
			notes,
			operatingCF,
			investingCF,
			financingCF,
			dividends,
			netCF,
			metrics: {
				cumulativeOperatingCF,
				npv10,
				irr,
				payback
			}
		};
	}

	function computeNPV(cashFlows, rate) {
		if (!Array.isArray(cashFlows) || !Number.isFinite(rate)) return null;
		let total = 0;
		for (let t = 0; t < cashFlows.length; t++) {
			const cf = cashFlows[t];
			if (!Number.isFinite(cf)) continue;
			total += cf / Math.pow(1 + rate, t);
		}
		return total;
	}

	function computeIRR(cashFlows) {
		if (!Array.isArray(cashFlows) || cashFlows.length === 0) return null;
		const hasPos = cashFlows.some(v => v > 0);
		const hasNeg = cashFlows.some(v => v < 0);
		if (!hasPos || !hasNeg) return null;
		let guess = 0.1;
		for (let i = 0; i < 50; i++) {
			const npv = computeNPV(cashFlows, guess);
			// derivative approximation via finite difference
			const npv2 = computeNPV(cashFlows, guess + 1e-6);
			const deriv = (npv2 - npv) / 1e-6;
			if (!Number.isFinite(deriv) || Math.abs(deriv) < 1e-9) break;
			const newGuess = guess - npv / deriv;
			if (!Number.isFinite(newGuess)) break;
			if (Math.abs(newGuess - guess) < 1e-7) return newGuess;
			guess = Math.max(-0.9999, newGuess);
		}
		return guess;
	}

	function computePaybackPeriod(cashFlows) {
		if (!Array.isArray(cashFlows) || cashFlows.length === 0) return null;
		let cumulative = 0;
		for (let t = 0; t < cashFlows.length; t++) {
			const cf = cashFlows[t];
			if (!Number.isFinite(cf)) continue;
			const prev = cumulative;
			cumulative += cf;
			if (cumulative >= 0) {
				if (t === 0) return 0;
				// Linear interpolation within the year
				const needed = -prev;
				const within = cf !== 0 ? needed / cf : 0;
				return (t - 1) + within;
			}
		}
		return null; // not paid back within horizon
	}

	// ==================== BALANCE SHEET HELPERS ====================
	/**
	 * Compute annual estimated balance sheet for 5 years using ONLY user-entered data.
	 * - Classification follows standard IAS structure: Current Assets, Non-Current Assets, Liabilities, Equity
	 * - Receivables/Payables default to 0 unless user provided explicit values (none in current survey)
	 * - Inventory uses initial user-entered value unless updated in survey
	 * - All investments/financing recognized in Year 0 only
	 * - Depreciation: straight-line, 5-year useful life, applied to equipment and startup costs (licenses)
	 * - Property (if provided) is included in PPE (not depreciated to avoid assuming useful life for land)
	 * - Additional investments are treated as non-depreciable non-current assets
	 * - Retained earnings accumulate annual net profit after dividends (no dividends input ? treated as 0)
	 */
	function computeBalanceSheetData(financialData, userData, amortSchedule) {
		const currency = getUserCurrency(userData);
		const notes = [];
		if (!currency) notes.push('Currency not provided. Amounts shown without currency code.');
		
		const survey = userData && userData.surveyData ? userData.surveyData : {};
		const propertyPrice = safeParseFloat(survey.propertyPrice);
		const licensesTotal = safeParseFloat(survey.licensesTotal);
		const equipmentTotal = parseEquipmentTotalFromString(survey.equipmentList);
		const additionalInvestmentsTotal = safeParseFloat(survey.investmentsTotal);
		const inventoryValue = safeParseFloat(userData && userData.inventoryValue);
		const personalAmount = safeParseFloat(userData && userData.startData && userData.startData.personalAmount);
		
		// PPE cost aggregates equipment and property price (PPE). Property is included but not depreciated.
		const hasAnyPpe = Number.isFinite(equipmentTotal) || Number.isFinite(propertyPrice);
		const ppeCost = hasAnyPpe ? sumArrayNumbers([equipmentTotal, propertyPrice]) : null;
		// Startup costs (licenses) are amortized over 5 years
		const startupCosts = Number.isFinite(licensesTotal) ? licensesTotal : null;
		// Additional investments: non-depreciable by default (treated as financial assets)
		const addlInvestments = Number.isFinite(additionalInvestmentsTotal) ? additionalInvestmentsTotal : null;
		
		// Depreciation base: equipment + licenses only (avoid depreciating property to comply with IAS for land)
		const depreciationBase = sumArrayNumbers([
			Number.isFinite(equipmentTotal) ? equipmentTotal : null,
			Number.isFinite(licensesTotal) ? licensesTotal : null
		]);
		const useDepreciation = Number.isFinite(depreciationBase) && depreciationBase > 0;
		const annualDep = useDepreciation ? (depreciationBase / 5) : null;
		
		const years = 5;
		const currentAssetsCash = new Array(years).fill(null); // require explicit cash inputs (none currently)
		const receivables = new Array(years).fill(0); // operations are strictly cash-based, no AR unless provided
		const inventory = new Array(years).fill(Number.isFinite(inventoryValue) ? inventoryValue : null);
		const totalCurrentAssets = new Array(years).fill(null);
		
		const ppe = new Array(years).fill(ppeCost);
		const startup = new Array(years).fill(startupCosts);
		const addlInv = new Array(years).fill(addlInvestments);
		const accumulatedDep = new Array(years).fill(null);
		const totalNonCurrentAssets = new Array(years).fill(null);
		const totalAssets = new Array(years).fill(null);
		
		const payables = new Array(years).fill(0);
		const shortTermLoan = new Array(years).fill(null);
		const totalCurrentLiabilities = new Array(years).fill(null);
		const longTermLoan = new Array(years).fill(null);
		const totalLiabilities = new Array(years).fill(null);
		
		const paidInCapital = new Array(years).fill(Number.isFinite(personalAmount) ? personalAmount : null);
		const retainedEarnings = new Array(years).fill(null);
		const totalEquity = new Array(years).fill(null);
		const totalLiabilitiesAndEquity = new Array(years).fill(null);
		
		// Notes for missing inputs
		if (!Number.isFinite(inventoryValue)) notes.push('Initial inventory value not provided. Inventory shown as Data required.');
		if (!Number.isFinite(personalAmount)) notes.push('Paid-in capital (personal amount) not provided. Equity cannot be fully computed.');
		if (!hasAnyPpe && !Number.isFinite(startupCosts) && !Number.isFinite(addlInvestments)) notes.push('Non-current assets not provided (equipment/property/licenses/additional investments).');
		notes.push('Receivables and payables set to 0 due to cash-based operations and no user-provided values.');
		notes.push('Cash balance requires explicit user input; shown as Data required.');
		
		// Accumulated Depreciation over 5 years
		for (let y = 0; y < years; y++) {
			accumulatedDep[y] = useDepreciation ? annualDep * (y + 1) : null;
			// Non-current = (PPE + Startup) - AccDep + Additional Investments
			const grossDepreciable = sumArrayNumbers([
				Number.isFinite(ppeCost) ? ppeCost : null,
				Number.isFinite(startupCosts) ? startupCosts : null
			]);
			const dep = accumulatedDep[y];
			const netDepreciable = (grossDepreciable !== 0 && Number.isFinite(grossDepreciable)) && Number.isFinite(dep)
				? Math.max(0, grossDepreciable - dep) : (Number.isFinite(grossDepreciable) ? grossDepreciable : null);
			const nonDepreciable = Number.isFinite(addlInvestments) ? addlInvestments : null;
			const nonCurrent = calculateSum([netDepreciable, nonDepreciable]);
			totalNonCurrentAssets[y] = nonCurrent;
			// Current assets total
			totalCurrentAssets[y] = calculateSum([currentAssetsCash[y], receivables[y], inventory[y]]);
			// Total assets
			totalAssets[y] = calculateSum([totalCurrentAssets[y], totalNonCurrentAssets[y]]);
		}
		
		// Liabilities from amortization schedule
		for (let y = 0; y < years; y++) {
			const amortIdxCurrentYear = y; // year 1 ? index 0
			const amortIdxNextYear = y + 1;
			const amortCurrent = amortSchedule && amortSchedule[amortIdxCurrentYear];
			const amortNext = amortSchedule && amortSchedule[amortIdxNextYear];
			// Current portion of long-term debt at year-end = principal due next year
			const nextPrincipal = amortNext && Number.isFinite(amortNext.principal) ? amortNext.principal : 0;
			shortTermLoan[y] = Number.isFinite(nextPrincipal) ? nextPrincipal : null;
			// Remaining principal after current year payment (year-end balance)
			const remainingAfterYear = amortCurrent && Number.isFinite(amortCurrent.remainingPrincipal) ? amortCurrent.remainingPrincipal : null;
			// Non-current portion = remaining principal - next year's principal
			longTermLoan[y] = (remainingAfterYear !== null) ? Math.max(0, remainingAfterYear - (nextPrincipal || 0)) : null;
			// Totals
			totalCurrentLiabilities[y] = calculateSum([payables[y], shortTermLoan[y]]);
			totalLiabilities[y] = calculateSum([totalCurrentLiabilities[y], longTermLoan[y]]);
		}
		
		// Equity: Paid-in capital + retained earnings (cumulative net profit, dividends assumed 0 unless provided)
		let cumulativeRE = 0;
		for (let y = 0; y < years; y++) {
			const yearData = (financialData && financialData.years && financialData.years[y]) || {};
			const netProfit = safeParseFloat(yearData.netProfit);
			if (Number.isFinite(netProfit)) {
				cumulativeRE += netProfit; // dividends not captured in survey ? remain 0
			}
			retainedEarnings[y] = Number.isFinite(cumulativeRE) && cumulativeRE !== 0 ? cumulativeRE : (cumulativeRE === 0 ? 0 : null);
			totalEquity[y] = calculateSum([paidInCapital[y], retainedEarnings[y]]);
			totalLiabilitiesAndEquity[y] = calculateSum([totalLiabilities[y], totalEquity[y]]);
		}
		
		// Performance indicators per year
		const returnOnTotalInvestment = new Array(years).fill(null);
		const returnOnEquity = new Array(years).fill(null);
		const liquidityRatio = new Array(years).fill(null);
		const debtRatio = new Array(years).fill(null);
		const accountingCheck = new Array(years).fill(null);
		for (let y = 0; y < years; y++) {
			const yd = (financialData && financialData.years && financialData.years[y]) || {};
			const netProfit = safeParseFloat(yd.netProfit);
			const ta = totalAssets[y];
			const teq = totalEquity[y];
			const tcl = totalCurrentLiabilities[y];
			const tliab = totalLiabilities[y];
			returnOnTotalInvestment[y] = (Number.isFinite(netProfit) && Number.isFinite(ta) && ta !== 0) ? (netProfit / ta) : null;
			returnOnEquity[y] = (Number.isFinite(netProfit) && Number.isFinite(teq) && teq !== 0) ? (netProfit / teq) : null;
			liquidityRatio[y] = (Number.isFinite(totalCurrentAssets[y]) && Number.isFinite(tcl) && tcl !== 0) ? (totalCurrentAssets[y] / tcl) : null;
			debtRatio[y] = (Number.isFinite(tliab) && Number.isFinite(teq) && teq !== 0) ? (tliab / teq) : null;
			if (Number.isFinite(ta) && Number.isFinite(totalLiabilitiesAndEquity[y])) {
				const diff = Math.round((ta - totalLiabilitiesAndEquity[y]) * 100) / 100;
				accountingCheck[y] = Math.abs(diff) < 1e-6 ? 0 : diff; // 0 means OK, else difference amount
			} else {
				accountingCheck[y] = null;
			}
		}
		
		return {
			currency,
			notes,
			headers: Array.from({ length: years }, (_, i) => `Year ${i + 1}`),
			currentAssetsCash,
			receivables,
			inventory,
			totalCurrentAssets,
			ppe,
			startup,
			addlInv,
			accumulatedDep,
			totalNonCurrentAssets,
			totalAssets,
			payables,
			shortTermLoan,
			totalCurrentLiabilities,
			longTermLoan,
			totalLiabilities,
			paidInCapital,
			retainedEarnings,
			totalEquity,
			totalLiabilitiesAndEquity,
			metrics: { returnOnTotalInvestment, returnOnEquity, liquidityRatio, debtRatio, accountingCheck }
		};
	}

	function checkMissingEssentialData(userData) {
		const missing = [];
		if (!userData.marketSize) missing.push("Market size data");
		if (!userData.annualSalaries) missing.push("Staff salary data");
		if (!userData.propertyCost) missing.push("Property cost data");
		if (!userData.marketingCost) missing.push("Marketing cost data");
		return missing;
	}

	// ==================== APPENDICES HELPERS ====================
	/**
	 * Break-even point (revenue) per year using accounting break-even:
	 *   BEP Revenue = Fixed Operating Costs / Contribution Margin Ratio
	 * where:
	 *   Fixed Operating Costs = totalOperatingExpenses + depreciation (excludes financing and taxes)
	 *   Contribution Margin Ratio = (Sales - COGS) / Sales
	 * Notes:
	 * - Uses only values computed from user-provided inputs.
	 * - If any component is missing or CM ratio <= 0, returns null.
	 */
	function computeBreakEvenRevenueForYear(yearData) {
		if (!yearData) return null;
		const sales = safeParseFloat(yearData.sales);
		const cogs = safeParseFloat(yearData.cogs);
		const opex = safeParseFloat(yearData.totalOperatingExpenses);
		const dep = safeParseFloat(yearData.depreciation) || 0;
		if (!Number.isFinite(sales) || sales <= 0) return null;
		if (!Number.isFinite(cogs)) return null;
		if (!Number.isFinite(opex)) return null;
		const cmr = (sales - cogs) / sales;
		if (!Number.isFinite(cmr) || cmr <= 0) return null;
		const fixedCosts = opex + dep; // accounting break-even includes depreciation
		return fixedCosts / cmr;
	}

	function averageNumeric(values) {
		const nums = (values || []).map(v => (v === null || v === undefined || isNaN(v)) ? null : Number(v)).filter(v => Number.isFinite(v));
		if (nums.length === 0) return null;
		const sum = nums.reduce((a, b) => a + b, 0);
		return sum / nums.length;
	}

	/**
	 * Build annual financial years with optional adjustments:
	 * - salesMultiplier: scale computed sales (e.g., 0.95 for -5% price proxy)
	 * - opexMultiplier: scale cash operating costs (salaries, rent, marketing, utilities, otherOps)
	 * Notes: Uses the same formulas as generateFinancialAnalysis and only user data.
	 */
	function buildFinancialYearsWithAdjustments(userData, amortSchedule, projectionYears, adjustments) {
		const years = [];
		const salesMult = adjustments && Number.isFinite(adjustments.salesMultiplier) ? adjustments.salesMultiplier : 1;
		const opexMult = adjustments && Number.isFinite(adjustments.opexMultiplier) ? adjustments.opexMultiplier : 1;
		for (let year = 1; year <= projectionYears; year++) {
			const yd = { year };
			// Sales
			const baseSales = calculateAnnualSales(year, userData.marketSize, userData.marketGrowth, userData.competitorsCount, userData.marketGap);
			yd.sales = Number.isFinite(baseSales) ? baseSales * salesMult : null;
			// COGS and Gross Profit
			yd.cogs = calculateCOGS(yd.sales, userData.inventoryValue);
			yd.grossProfit = (Number.isFinite(yd.sales) && Number.isFinite(yd.cogs)) ? (yd.sales - yd.cogs) : null;
			// Operating expenses (cash), scaled by opexMult
			yd.salaries = calculateOperatingExpenses(year, userData.annualSalaries);
			yd.rent = calculateOperatingExpenses(year, userData.propertyCost);
			yd.marketing = userData.marketingCost ? calculateOperatingExpenses(year, userData.marketingCost * 12) : null;
			yd.utilities = userData.operationalCosts.utilities ? calculateOperatingExpenses(year, safeParseFloat(userData.operationalCosts.utilities)) : null;
			yd.otherOps = userData.operationalCosts.operations ? calculateOperatingExpenses(year, safeParseFloat(userData.operationalCosts.operations)) : null;
			['salaries','rent','marketing','utilities','otherOps'].forEach(k => {
				if (Number.isFinite(yd[k])) yd[k] = yd[k] * opexMult;
			});
			yd.totalOperatingExpenses = calculateSum([yd.salaries, yd.rent, yd.marketing, yd.utilities, yd.otherOps]);
			// Depreciation unchanged under opex scenario (treat as non-cash)
			yd.depreciation = userData.operationalCosts.depreciation ? calculateOperatingExpenses(year, safeParseFloat(userData.operationalCosts.depreciation)) : null;
			// EBIT
			yd.ebit = (Number.isFinite(yd.grossProfit) && Number.isFinite(yd.totalOperatingExpenses)) ? (yd.grossProfit - yd.totalOperatingExpenses - (yd.depreciation || 0)) : null;
			// Loan impacts from amort schedule
			const amort = amortSchedule[year - 1];
			yd.loanPaymentAnnual = amort ? amort.payment : null;
			yd.interestExpense = amort ? amort.interest : null;
			yd.principalPayment = amort ? amort.principal : null;
			yd.remainingPrincipal = amort ? amort.remainingPrincipal : null;
			// Profit before tax and after tax
			yd.profitBeforeTax = calculateProfitBeforeTax(yd.ebit, null, yd.loanPaymentAnnual);
			yd.incomeTax = calculateIncomeTax(yd.profitBeforeTax, userData.startData.taxRate);
			yd.netProfit = (yd.profitBeforeTax !== null && yd.incomeTax !== null) ? (yd.profitBeforeTax - (yd.incomeTax || 0)) : null;
			yd.netProfitMargin = (Number.isFinite(yd.sales) && Number.isFinite(yd.netProfit) && yd.sales !== 0) ? (yd.netProfit / yd.sales) * 100 : null;
			years.push(yd);
		}
		return years;
	}

	/**
	 * Compute cash flows with optional project cost multiplier for Year 0.
	 * Reuses existing formulas; only modifies Year 0 investing outflows.
	 */
	function computeCashFlowDataWithAdjustments(financialData, userData, amortSchedule, adjustments) {
		const yearsCount = financialData.years ? financialData.years.length : 0;
		const currency = getUserCurrency(userData);
		const notes = [];
		if (!currency) notes.push('Currency not provided. Amounts shown without currency code.');

		const survey = userData && userData.surveyData ? userData.surveyData : {};
		const projectCostMult = adjustments && Number.isFinite(adjustments.projectCostsMultiplier) ? adjustments.projectCostsMultiplier : 1;
		const propertyPrice = safeParseFloat(survey.propertyPrice);
		const licensesTotal = safeParseFloat(survey.licensesTotal);
		const inventoryValue = safeParseFloat(userData.inventoryValue);
		const equipmentListString = survey.equipmentList;
		const equipmentTotal = parseEquipmentTotalFromString(equipmentListString);
		const additionalInvestmentsTotal = safeParseFloat(survey.investmentsTotal);
		const personalAmount = safeParseFloat(userData.startData && userData.startData.personalAmount);
		const loanAmount = safeParseFloat(userData.startData && userData.startData.loanAmount);
		const taxRate = safeParseFloat(userData.startData && userData.startData.taxRate);
		if (!Number.isFinite(taxRate)) notes.push('Tax rate not provided. Income tax cannot be computed.');

		const annualInterestIncome = 0; // keep zero: interest income not captured in survey for scenarios

		const operatingCF = new Array(yearsCount + 1).fill(null);
		const investingCF = new Array(yearsCount + 1).fill(0);
		const financingCF = new Array(yearsCount + 1).fill(0);
		const dividends = new Array(yearsCount + 1).fill(0);
		const netCF = new Array(yearsCount + 1).fill(null);

		// Year 0 investing/financing (apply project cost multiplier)
		const year0InvestingOut = sumArrayNumbers([
			propertyPrice,
			licensesTotal,
			inventoryValue,
			equipmentTotal,
			additionalInvestmentsTotal
		]) * -1 * projectCostMult;
		investingCF[0] = year0InvestingOut;
		financingCF[0] = sumArrayNumbers([personalAmount, loanAmount]);

		// Operating CF per year from adjusted financialData years
		for (let y = 1; y <= yearsCount; y++) {
			const yd = financialData.years[y - 1] || {};
			const cashRevenues = safeParseFloat(yd.sales);
			const cashOperatingOut = sumArrayNumbers([
				safeParseFloat(yd.cogs),
				safeParseFloat(yd.salaries),
				safeParseFloat(yd.rent),
				safeParseFloat(yd.marketing),
				safeParseFloat(yd.utilities),
				safeParseFloat(yd.otherOps)
			]);
			let taxPaid = null;
			if (Number.isFinite(taxRate)) {
				const taxable = (cashRevenues || 0) - (cashOperatingOut || 0);
				taxPaid = taxable > 0 ? taxable * (taxRate / 100) : 0;
			}
			const opCf = (cashRevenues || 0) - (cashOperatingOut || 0) - (taxPaid === null ? 0 : taxPaid) + (annualInterestIncome || 0);
			if (cashRevenues === null || cashRevenues === undefined || isNaN(cashRevenues)) {
				operatingCF[y] = null;
			} else if (!Number.isFinite(cashOperatingOut)) {
				operatingCF[y] = null;
			} else if (taxPaid === null) {
				operatingCF[y] = null;
			} else {
				operatingCF[y] = opCf;
			}
		}

		// Net CF per year
		for (let i = 0; i < netCF.length; i++) {
			const op = operatingCF[i];
			const inv = investingCF[i];
			const fin = financingCF[i] - (dividends[i] || 0);
			netCF[i] = (op === null ? null : op) + inv + fin;
			if (op === null && (inv === 0) && (fin === 0)) {
				netCF[i] = null;
			}
		}

		const cashFlowsForMetrics = netCF.map(v => (v === null || v === undefined || isNaN(v)) ? 0 : v);
		const npv10 = computeNPV(cashFlowsForMetrics, 0.10);
		const irr = computeIRR(cashFlowsForMetrics);
		const payback = computePaybackPeriod(cashFlowsForMetrics);

		return { currency, notes, operatingCF, investingCF, financingCF, dividends, netCF, metrics: { npv10, irr, payback } };
	}

	/**
	 * Benefit/Cost Ratio at a discount rate: PV(benefits) / |PV(costs)| where
	 * benefits are positive cash flows and costs are negative cash flows.
	 * Returns null if denominator is zero or inputs invalid.
	 */
	function computeBenefitCostRatio(cashFlows, rate) {
		if (!Array.isArray(cashFlows) || !Number.isFinite(rate)) return null;
		let pvBenefits = 0;
		let pvCosts = 0;
		for (let t = 0; t < cashFlows.length; t++) {
			const cf = cashFlows[t];
			if (!Number.isFinite(cf)) continue;
			const pv = cf / Math.pow(1 + rate, t);
			if (pv >= 0) pvBenefits += pv; else pvCosts += pv;
		}
		const denom = Math.abs(pvCosts);
		if (!Number.isFinite(denom) || denom === 0) return null;
		return pvBenefits / denom;
	}

	// 5. Report Formatting
	function formatFinancialReport(financialData, userData, amortSchedule) {
		const totalYears = financialData.years ? financialData.years.length : 0;
		let report = `## Financial Analysis - Projected Income Statement (${totalYears} Years)\n\n`;
		
		if (financialData.missingFields && financialData.missingFields.length > 0) {
			report += `*Note: Missing required data: ${financialData.missingFields.join(', ')}*\n\n`;
		}
		
		const yearHeaders = Array.from({ length: totalYears }, (_, i) => `Year ${i + 1}`);
		report += `| Item | ${yearHeaders.join(' | ')} |\n`;
		report += `|------|${yearHeaders.map(() => '--------').join('|')}|\n`;
		
		const rows = [
			{ label: "**Operating Revenues**", key: "" },
			{ label: "Sales", key: "sales", format: "currency" },
			{ label: "(-) Cost of Goods Sold", key: "cogs", format: "currency" },
			{ label: "**Gross Profit**", key: "grossProfit", format: "currency" },
			{ label: "", key: "" },
			{ label: "**Operating Expenses**", key: "" },
			{ label: " - Salaries", key: "salaries", format: "currency" },
			{ label: " - Rent", key: "rent", format: "currency" },
			{ label: " - Marketing", key: "marketing", format: "currency" },
			{ label: " - Utilities", key: "utilities", format: "currency" },
			{ label: " - Other Operational", key: "otherOps", format: "currency" },
			{ label: "**Total Operating Expenses**", key: "totalOperatingExpenses", format: "currency" },
			{ label: "", key: "" },
			{ label: "(-) Depreciation & Amortization", key: "depreciation", format: "currency" },
			{ label: "**EBIT**", key: "ebit", format: "currency" },
			{ label: "", key: "" },
			{ label: "**Non-Operating Items**", key: "" },
			{ label: " - Loan Payment (Principal + Interest)", key: "loanPaymentAnnual", format: "currency" },
			{ label: "", key: "" },
			{ label: "**Profit Before Tax**", key: "profitBeforeTax", format: "currency" },
			{ label: "(-) Income Tax", key: "incomeTax", format: "currency" },
			{ label: "**NET PROFIT/LOSS**", key: "netProfit", format: "currency" },
			{ label: "", key: "" },
			{ label: "**Net Profit Margin %**", key: "netProfitMargin", format: "percent" }
		];

		rows.forEach(row => {
			if (row.key === "") {
				report += `| ${row.label} | ${new Array(totalYears).fill('').join(' | ')} |\n`;
			} else {
				const yearValues = financialData.years.map(yearData => {
					const value = yearData[row.key];
					if (value === null || value === undefined || isNaN(value)) {
						return "Data required";
					}
					
					if (row.format === "percent") {
						return `${value.toFixed(1)}%`;
					}
					if (row.format === "currency") {
						return Math.round(value).toLocaleString();
					}
					
					return Math.round(value).toLocaleString();
				});
				report += `| ${row.label} | ${yearValues.join(" | ")} |\n`;
			}
		});

		// ==================== Estimated Cash Flow Statement (Annual) ====================
		const cf = computeCashFlowData(financialData, userData, amortSchedule);
		const cfYears = totalYears + 1; // include Year 0
		const cfHeaders = Array.from({ length: cfYears }, (_, i) => `Year ${i}`);
		report += `\n\n### Estimated Cash Flow Statement${cf.currency ? ` (${cf.currency})` : ''}\n\n`;
		if (cf.notes && cf.notes.length) {
			report += `*Notes: ${cf.notes.join('; ')}*\n\n`;
		}
		report += `| Item | ${cfHeaders.join(' | ')} |\n`;
		report += `|------|${cfHeaders.map(() => '--------').join('|')}|\n`;
		// Operating Activities
		report += `| **Operating Activities** | ${new Array(cfYears).fill('').join(' | ')} |\n`;
		report += `| Net cash from operating activities | ${cf.operatingCF.map(v => formatCurrencyValue(v, cf.currency)).join(' | ')} |\n`;
		// Investing Activities (Year 0)
		report += `| **Investing Activities (Year 0)** | ${new Array(cfYears).fill('').join(' | ')} |\n`;
		report += `| Net cash used in investing activities | ${cf.investingCF.map(v => formatCurrencyValue(v, cf.currency)).join(' | ')} |\n`;
		// Financing Activities (Year 0)
		report += `| **Financing Activities (Year 0)** | ${new Array(cfYears).fill('').join(' | ')} |\n`;
		report += `| Net cash from financing activities | ${cf.financingCF.map(v => formatCurrencyValue(v, cf.currency)).join(' | ')} |\n`;
		report += `| Dividend payments | ${cf.dividends.map(v => formatCurrencyValue(v, cf.currency)).join(' | ')} |\n`;
		// Net Cash Flow
		report += `| **Net Cash Flow** | ${cf.netCF.map(v => formatCurrencyValue(v, cf.currency)).join(' | ')} |\n`;
		// Opening/Closing balances (require explicit opening cash input; if not provided, show Data required)
		report += `| **Opening Cash Balance** | ${new Array(cfYears).fill('Data required').join(' | ')} |\n`;
		report += `| **Closing Cash Balance** | ${new Array(cfYears).fill('Data required').join(' | ')} |\n`;
		// Performance Indicators
		report += `\n**Performance Indicators**\n\n`;
		report += `- Cumulative Operating Cash Flow: ${formatCurrencyValue(cf.metrics.cumulativeOperatingCF, cf.currency)}\n`;
		report += `- Payback Period (years): ${cf.metrics.payback === null ? 'Data required' : cf.metrics.payback.toFixed(2)}\n`;
		report += `- NPV at 10%: ${formatCurrencyValue(cf.metrics.npv10, cf.currency)}\n`;
		report += `- IRR: ${cf.metrics.irr === null ? 'Data required' : (cf.metrics.irr * 100).toFixed(2) + '%'}\n`;

		// ==================== Estimated Balance Sheet (Annual) ====================
		const bs = computeBalanceSheetData(financialData, userData, amortSchedule);
		report += `\n\n### Estimated Balance Sheet${bs.currency ? ` (${bs.currency})` : ''}\n\n`;
		if (bs.notes && bs.notes.length) {
			report += `*Notes: ${bs.notes.join('; ')}*\n\n`;
		}
		// Header
		report += `| Item | ${bs.headers.join(' | ')} |\n`;
		report += `|------|${bs.headers.map(() => '--------').join('|')}|\n`;
		// Current Assets
		report += `| **Current Assets** | ${new Array(bs.headers.length).fill('').join(' | ')} |\n`;
		report += `| Cash and cash equivalents | ${bs.currentAssetsCash.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| Accounts receivable | ${bs.receivables.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| Inventory | ${bs.inventory.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| **Total Current Assets** | ${bs.totalCurrentAssets.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		// Non-Current Assets
		report += `| **Non-Current Assets** | ${new Array(bs.headers.length).fill('').join(' | ')} |\n`;
		report += `| Property, plant and equipment (at cost) | ${bs.ppe.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| Startup costs (licenses) | ${bs.startup.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| Additional investments | ${bs.addlInv.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| Accumulated depreciation/amortization | ${bs.accumulatedDep.map(v => (v===null||v===undefined||isNaN(v))? 'Data required' : ('-' + formatCurrencyValue(v, bs.currency))).join(' | ')} |\n`;
		report += `| **Total Non-Current Assets** | ${bs.totalNonCurrentAssets.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| **Total Assets** | ${bs.totalAssets.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		// Liabilities
		report += `| **Current Liabilities** | ${new Array(bs.headers.length).fill('').join(' | ')} |\n`;
		report += `| Accounts payable | ${bs.payables.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| Current portion of long-term debt | ${bs.shortTermLoan.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| **Total Current Liabilities** | ${bs.totalCurrentLiabilities.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| **Non-Current Liabilities** | ${new Array(bs.headers.length).fill('').join(' | ')} |\n`;
		report += `| Long-term debt (net of current portion) | ${bs.longTermLoan.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| **Total Liabilities** | ${bs.totalLiabilities.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		// Equity
		report += `| **Equity** | ${new Array(bs.headers.length).fill('').join(' | ')} |\n`;
		report += `| Paid-in capital | ${bs.paidInCapital.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| Retained earnings | ${bs.retainedEarnings.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| **Total Equity** | ${bs.totalEquity.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		report += `| **Total Liabilities and Equity** | ${bs.totalLiabilitiesAndEquity.map(v => formatCurrencyValue(v, bs.currency)).join(' | ')} |\n`;
		// Performance Indicators
		report += `\n**Performance Indicators**\n\n`;
		report += `- Return on Total Investment: ${bs.metrics.returnOnTotalInvestment.map(v => v===null? 'Data required' : (v*100).toFixed(2)+'%').join(' | ')}\n`;
		report += `- Return on Equity: ${bs.metrics.returnOnEquity.map(v => v===null? 'Data required' : (v*100).toFixed(2)+'%').join(' | ')}\n`;
		report += `- Liquidity Ratio (Current Assets / Current Liabilities): ${bs.metrics.liquidityRatio.map(v => v===null? 'Data required' : v.toFixed(2)).join(' | ')}\n`;
		report += `- Debt Ratio (Total Liabilities / Equity): ${bs.metrics.debtRatio.map(v => v===null? 'Data required' : v.toFixed(2)).join(' | ')}\n`;
		report += `- Accounting Check (Assets - Liabilities - Equity): ${bs.metrics.accountingCheck.map(v => v===null? 'Data required' : formatCurrencyValue(v, bs.currency)).join(' | ')}\n`;

		// ==================== APPENDIX A: Financial Results (5 Years + Average) ====================
		const headers5 = Array.from({ length: 5 }, (_, i) => `Year ${i + 1}`).concat('Average');
		report += `\n\n### Appendix A: Financial Results (5 Years + Average)${bs.currency ? ` (${bs.currency})` : ''}\n\n`;
		report += `| Item | ${headers5.join(' | ')} |\n`;
		report += `|------|${headers5.map(() => '--------').join('|')}|\n`;
		const currencyCode = bs.currency || cf.currency || getUserCurrency(userData) || '';
		function addRow(label, values, isCurrency, isPercent) {
			const avg = averageNumeric(values);
			const rowVals = values.slice(0, 5).map(v => {
				if (v === null || v === undefined || isNaN(v)) return 'Data required';
				if (isPercent) return `${(v).toFixed(2)}%`;
				if (isCurrency) return formatCurrencyValue(v, currencyCode);
				return Number(v).toFixed(2);
			});
			rowVals.push((avg === null || isNaN(avg)) ? 'Data required' : (isPercent ? `${avg.toFixed(2)}%` : (isCurrency ? formatCurrencyValue(avg, currencyCode) : avg.toFixed(2))));
			report += `| ${label} | ${rowVals.join(' | ')} |\n`;
		}
		// Collect 5-year arrays from available data
		const npYears = Array.from({ length: 5 }, (_, i) => (financialData.years && financialData.years[i]) ? financialData.years[i].netProfit : null);
		const gpmYears = Array.from({ length: 5 }, (_, i) => {
			const y = (financialData.years && financialData.years[i]) || null;
			if (!y) return null;
			const sales = safeParseFloat(y.sales);
			const gp = safeParseFloat(y.grossProfit);
			if (!Number.isFinite(sales) || sales === 0 || !Number.isFinite(gp)) return null;
			return (gp / sales) * 100;
		});
		const roiYears = Array.from({ length: 5 }, (_, i) => {
			const v = bs.metrics.returnOnTotalInvestment[i];
			return (v === null || v === undefined || isNaN(v)) ? null : (v * 100);
		});
		const roeYears = Array.from({ length: 5 }, (_, i) => {
			const v = bs.metrics.returnOnEquity[i];
			return (v === null || v === undefined || isNaN(v)) ? null : (v * 100);
		});
		const liquidityYears = Array.from({ length: 5 }, (_, i) => bs.metrics.liquidityRatio[i] ?? null);
		const debtEqYears = Array.from({ length: 5 }, (_, i) => bs.metrics.debtRatio[i] ?? null);
		const beYears = Array.from({ length: 5 }, (_, i) => computeBreakEvenRevenueForYear((financialData.years && financialData.years[i]) || null));
		addRow('Net profit after tax', npYears, true, false);
		addRow('Gross profit margin %', gpmYears, false, true);
		addRow('Return on investment %', roiYears, false, true);
		addRow('Return on equity %', roeYears, false, true);
		addRow('Current assets : current liabilities', liquidityYears, false, false);
		addRow('Debt : equity ratio', debtEqYears, false, false);
		addRow('Break-even point (revenue)', beYears, true, false);
		report += `\n*Note: Items showing 'Data required' reflect missing user inputs necessary for calculation.*\n`;

		// ==================== APPENDIX B: Financial Standards and Sensitivity Analysis ====================
		report += `\n\n### Appendix B: Financial Standards and Sensitivity Analysis${currencyCode ? ` (${currencyCode})` : ''}\n\n`;
		const scenarios = [
			{ key: 'base', label: 'Base case', adj: {} },
			{ key: 'capex10', label: '10% increase in project costs', adj: { projectCostsMultiplier: 1.10 } },
			{ key: 'capex20', label: '20% increase in project costs', adj: { projectCostsMultiplier: 1.20 } },
			{ key: 'price5', label: '5% decrease in sales price', adj: { salesMultiplier: 0.95 } },
			{ key: 'price10', label: '10% decrease in sales price', adj: { salesMultiplier: 0.90 } },
			{ key: 'opex10', label: '10% increase in operating costs', adj: { opexMultiplier: 1.10 } },
			{ key: 'opex20', label: '20% increase in operating costs', adj: { opexMultiplier: 1.20 } }
		];
		const headersSc = ['Indicator'].concat(scenarios.map(s => s.label));
		report += `| ${headersSc.join(' | ')} |\n`;
		report += `|${headersSc.map(() => '--------').join('|')}|\n`;
		// Build adjusted years and cash flows per scenario
		const projectionYears = totalYears;
		const scenarioResults = scenarios.map(s => {
			const yearsAdj = buildFinancialYearsWithAdjustments(userData, amortSchedule, projectionYears, s.adj);
			const fdAdj = { years: yearsAdj };
			const cfAdj = computeCashFlowDataWithAdjustments(fdAdj, userData, amortSchedule, s.adj);
			const cashFlowsForMetrics = cfAdj.netCF.map(v => (v === null || v === undefined || isNaN(v)) ? 0 : v);
			const npv = computeNPV(cashFlowsForMetrics, 0.10);
			const irr = computeIRR(cashFlowsForMetrics);
			const bcr = computeBenefitCostRatio(cashFlowsForMetrics, 0.10);
			const pb = computePaybackPeriod(cashFlowsForMetrics);
			return { npv, irr, bcr, pb };
		});
		function formatMetricRow(label, fmt) {
			const cells = scenarioResults.map(r => {
				const v = r[fmt.key];
				if (v === null || v === undefined || isNaN(v)) return 'Data required';
				if (fmt.type === 'currency') return formatCurrencyValue(v, currencyCode);
				if (fmt.type === 'percent') return `${(v * 100).toFixed(2)}%`;
				if (fmt.type === 'years') return Number(v).toFixed(2);
				if (fmt.type === 'ratio') return Number(v).toFixed(2);
				return Number(v).toFixed(2);
			});
			report += `| ${label} | ${cells.join(' | ')} |\n`;
		}
		formatMetricRow('Net Present Value (NPV, 10%)', { key: 'npv', type: 'currency' });
		formatMetricRow('Internal Rate of Return (IRR)', { key: 'irr', type: 'percent' });
		formatMetricRow('Benefit/Cost Ratio (B/C, 10%)', { key: 'bcr', type: 'ratio' });
		formatMetricRow('Payback Period (years)', { key: 'pb', type: 'years' });
		report += `\n*Note: Scenarios adjust only the specified inputs while keeping other user data unchanged. Operating cost scenarios scale cash OPEX (salaries, rent, marketing, utilities, other ops) and exclude depreciation.*\n`;

		// Build and persist structured financial statements for AI payload
		try {
			const fsObject = (function buildFinancialStatements() {
				// Helpers
				function toHeaders(prefix, count, startAt = 1) {
					const arr = ["Item"];
					for (let i = 0; i < count; i++) arr.push(`${prefix} ${startAt + i}`);
					return arr;
				}
				function stringify(val) {
					if (val === null || val === undefined || isNaN(val)) return "Data required";
					return String(Math.round(val));
				}
				function avg(values) {
					const nums = (values || []).filter(v => v !== null && v !== undefined && !isNaN(v));
					if (!nums.length) return null;
					return nums.reduce((a, b) => a + b, 0) / nums.length;
				}

				// Income Statement (Years 1..N)
				const incomeHeaders = toHeaders("Year", totalYears);
				const incomeRows = [];
				const incomeRowDefs = [
					{ label: "Sales", key: "sales" },
					{ label: "(-) Cost of Goods Sold", key: "cogs" },
					{ label: "Gross Profit", key: "grossProfit" },
					{ label: "Salaries", key: "salaries" },
					{ label: "Rent", key: "rent" },
					{ label: "Marketing", key: "marketing" },
					{ label: "Utilities", key: "utilities" },
					{ label: "Other Operational", key: "otherOps" },
					{ label: "Total Operating Expenses", key: "totalOperatingExpenses" },
					{ label: "Depreciation & Amortization", key: "depreciation" },
					{ label: "EBIT", key: "ebit" },
					{ label: "Loan Payment (P+I)", key: "loanPaymentAnnual" },
					{ label: "Profit Before Tax", key: "profitBeforeTax" },
					{ label: "Income Tax", key: "incomeTax" },
					{ label: "NET PROFIT/LOSS", key: "netProfit" }
				];
				incomeRowDefs.forEach(def => {
					const row = [def.label];
					for (let i = 0; i < totalYears; i++) {
						const yearData = financialData.years[i] || {};
						row.push(stringify(yearData[def.key]));
					}
					incomeRows.push(row);
				});

				// Cash Flow (Year 0..N)
				const cfYears = (cf && Array.isArray(cf.netCF)) ? (cf.netCF.length) : (totalYears + 1);
				const cashHeaders = toHeaders("Year", cfYears, 0);
				const cashRows = [];
				function rowsFromSeries(label, arr) {
					const r = [label];
					for (let i = 0; i < cfYears; i++) {
						r.push(stringify(arr && arr[i]));
					}
					cashRows.push(r);
				}
				rowsFromSeries("Net cash from operating activities", cf ? cf.operatingCF : []);
				rowsFromSeries("Net cash used in investing activities", cf ? cf.investingCF : []);
				rowsFromSeries("Net cash from financing activities", cf ? cf.financingCF : []);
				rowsFromSeries("Dividend payments", cf ? cf.dividends : []);
				rowsFromSeries("Net Cash Flow", cf ? cf.netCF : []);

				// Balance Sheet (Years 1..N) using bs.headers and arrays
				const bsHeaders = Array.isArray(bs && bs.headers) ? ["Item"].concat(bs.headers) : toHeaders("Year", totalYears);
				const bsRows = [];
				function rowFrom(bsLabel, series) {
					const r = [bsLabel];
					const arr = series || [];
					for (let i = 0; i < (bsHeaders.length - 1); i++) r.push(stringify(arr[i]));
					bsRows.push(r);
				}
				rowFrom("Cash and cash equivalents", bs ? bs.currentAssetsCash : []);
				rowFrom("Accounts receivable", bs ? bs.receivables : []);
				rowFrom("Inventory", bs ? bs.inventory : []);
				rowFrom("Total Current Assets", bs ? bs.totalCurrentAssets : []);
				rowFrom("Property, plant and equipment (at cost)", bs ? bs.ppe : []);
				rowFrom("Startup costs (licenses)", bs ? bs.startup : []);
				rowFrom("Additional investments", bs ? bs.addlInv : []);
				rowFrom("Accumulated depreciation/amortization", bs ? bs.accumulatedDep : []);
				rowFrom("Total Non-Current Assets", bs ? bs.totalNonCurrentAssets : []);
				rowFrom("Total Assets", bs ? bs.totalAssets : []);
				rowFrom("Accounts payable", bs ? bs.payables : []);
				rowFrom("Current portion of long-term debt", bs ? bs.shortTermLoan : []);
				rowFrom("Total Current Liabilities", bs ? bs.totalCurrentLiabilities : []);
				rowFrom("Long-term debt (net of current portion)", bs ? bs.longTermLoan : []);
				rowFrom("Total Liabilities", bs ? bs.totalLiabilities : []);
				rowFrom("Paid-in capital", bs ? bs.paidInCapital : []);
				rowFrom("Retained earnings", bs ? bs.retainedEarnings : []);
				rowFrom("Total Equity", bs ? bs.totalEquity : []);
				rowFrom("Total Liabilities and Equity", bs ? bs.totalLiabilitiesAndEquity : []);

				// Ratios (averages across years)
				const ratios = (function () {
					const out = [];
					const roiAvg = avg(bs && bs.metrics && bs.metrics.returnOnTotalInvestment ? bs.metrics.returnOnTotalInvestment : []);
					const roeAvg = avg(bs && bs.metrics && bs.metrics.returnOnEquity ? bs.metrics.returnOnEquity : []);
					const liqAvg = avg(bs && bs.metrics && bs.metrics.liquidityRatio ? bs.metrics.liquidityRatio : []);
					const debtAvg = avg(bs && bs.metrics && bs.metrics.debtRatio ? bs.metrics.debtRatio : []);
					if (roiAvg !== null) out.push({ metric: "Return on Total Investment (avg %)", value: `${(roiAvg * 100).toFixed(2)}%` });
					if (roeAvg !== null) out.push({ metric: "Return on Equity (avg %)", value: `${(roeAvg * 100).toFixed(2)}%` });
					if (liqAvg !== null) out.push({ metric: "Liquidity Ratio (avg)", value: `${liqAvg.toFixed(2)}` });
					if (debtAvg !== null) out.push({ metric: "Debt Ratio (avg)", value: `${debtAvg.toFixed(2)}` });
					return out;
				})();

				// ROI metrics
				const currencyCode = bs && bs.currency ? bs.currency : (cf && cf.currency ? cf.currency : (getUserCurrency(userData) || ""));
				function fmtCurrency(v) { return v === null || v === undefined || isNaN(v) ? "Data required" : (currencyCode ? `${Math.round(v).toLocaleString()} ${currencyCode}` : `${Math.round(v).toLocaleString()}`); }
				const roi = {
					npv: fmtCurrency(cf && cf.metrics ? cf.metrics.npv10 : null),
					irr: (cf && cf.metrics && cf.metrics.irr !== null && cf.metrics.irr !== undefined && !isNaN(cf.metrics.irr)) ? `${(cf.metrics.irr * 100).toFixed(2)}%` : "Data required",
					paybackPeriod: (cf && cf.metrics && cf.metrics.payback !== null && cf.metrics.payback !== undefined && !isNaN(cf.metrics.payback)) ? `${Number(cf.metrics.payback).toFixed(2)} years` : "Data required"
				};

				// Assumptions
				const a = [];
				const sd = userData && userData.startData ? userData.startData : {};
				if (Number.isFinite(sd.loanAmount)) a.push(`Loan amount: ${Math.round(sd.loanAmount)}`);
				if (Number.isFinite(sd.interestRate)) a.push(`Interest rate: ${sd.interestRate}%`);
				if (Number.isFinite(sd.repaymentMonths)) a.push(`Repayment period: ${sd.repaymentMonths} months`);
				if (Number.isFinite(sd.taxRate)) a.push(`Tax rate: ${sd.taxRate}%`);
				if (currencyCode) a.push(`Currency: ${currencyCode}`);

				return {
					assumptions: a,
					incomeStatement: { headers: incomeHeaders, rows: incomeRows },
					balanceSheet: { headers: bsHeaders, rows: bsRows },
					cashFlow: { headers: cashHeaders, rows: cashRows },
					ratios,
					roi
				};
			})();

			try { saveProcessedFinancialData(fsObject); } catch (_) {}
		} catch (_) {}

		return report;
	}

	// 6. Integration with existing report system
	// Add this line to the existing generateFullReport() function in surveyLogic.js:
	// reportSections.push(generateFinancialAnalysis());

	// ==================== END FINANCIAL ANALYSIS ====================

    // Wiring
    document.addEventListener('DOMContentLoaded', () => {
        // Ensure async initialization before using answers-dependent wiring
        let answers = {};
        (async () => { answers = await getInitialAnswers(); initWiring(); })();

        function initWiring() {

        const q1 = document.getElementById('main-product');
        const q2 = document.getElementById('problem-solved');
        const bmInputs = document.querySelectorAll('input[name="business-model"]');
        const distInputs = document.querySelectorAll('input[name="distribution-channels"]');
			const reportBtn = document.getElementById('generateReportBtn');
			const reportOut = document.getElementById('reportOutput');

			// Marketing Data elements (prefer canonical IDs; fallback to legacy dashed IDs)
			const elTargetAge = document.getElementById('targetAge');
			const elMinAge = document.getElementById('min-age');
			const elMaxAge = document.getElementById('max-age');
			const elCustomerIncome = document.getElementById('customer-income');
			// Prefer canonical marketing-channels group and fall back to legacy ID-based checkboxes
			const marketingChannelCheckboxes = document.querySelectorAll('input[name="marketing-channels"]');
			const cbSocialMediaAds = document.getElementById('socialMediaAds');
			const cbContentMarketing = document.getElementById('contentMarketing');
			const cbTvRadioAds = document.getElementById('tvRadioAds');
			const cbOtherChannels = document.getElementById('otherChannels');
			const elOtherChannelsText = document.getElementById('otherChannelsText');
			const elMarketingCost = document.getElementById('marketingCost') || document.getElementById('marketing-cost');
			const elCompetitiveAdvantage = document.getElementById('competitiveAdvantage') || document.getElementById('competitive-advantage');
			// Support radio group for reachability on this page
			const reachRadios = document.querySelectorAll('input[name="reachability"], input[name="customer-reach"]');
			const elReachability = document.getElementById('reachability');
			const elMarketingNotes = document.getElementById('marketingNotes') || document.getElementById('reach-notes');

			// Economic Data elements (support assumed IDs on the same Commercial page)
			const econNewJobs = document.getElementById('newJobs');
			const econContributeGDP = document.getElementById('contributeGDP');
			const econSupportSupplyChains = document.getElementById('supportSupplyChains');
			const econOtherValue = document.getElementById('otherValue');
			const econOtherValueText = document.getElementById('otherValueText');
			const elGdpImpact = document.getElementById('gdpImpact');
			const elGdpExplanation = document.getElementById('impactExplanation') || document.getElementById('gdp-explanation');
			const elEconomicFeasibility = document.getElementById('economicFeasibility');
			const elEconomicNotes = document.getElementById('economicNotes') || document.getElementById('feasibility-notes');

			// Additional Investments elements
			const needsInvestRadios = document.querySelectorAll('input[name="additional-investments"]');
			const needsInvestSelect = document.getElementById('needsAdditionalInvestments');
			const additionalInvestmentsContainer = document.getElementById('additional-investments-container');
			const additionalInvestmentsContainerAlt = document.getElementById('investmentsDetails');
			const investmentsListContainer = document.getElementById('investments-list');
			const investmentsPurposeInput = document.getElementById('investments-purpose');
			const investmentsTotalEl = document.getElementById('investments-total');

			// Environmental Data elements (unified with Pre-Commercial sector.html)
			const environmentRadios = document.querySelectorAll('input[name="environment"]');
			const environmentExplanationContainer = document.getElementById('environment-explanation-container');
			const elEnvironmentExplanation = document.getElementById('environment-explanation');
			const assessmentRadios = document.querySelectorAll('input[name="assessment"]');
			const friendlyRadios = document.querySelectorAll('input[name="friendly"]');
			const elEnvironmentalNotes = document.getElementById('friendly-notes');

			// Time Data elements (support assumed IDs and actual radios in page)
			const elMarketTiming = document.getElementById('marketTiming'); // optional select
			const elImplementationTiming = document.getElementById('implementationTiming'); // optional select
			const timeframeRadios = document.querySelectorAll('input[name="timeframe"]');
			const implementationRadios = document.querySelectorAll('input[name="timing"]');
			const elTimeNotes = document.getElementById('timeNotes') || document.getElementById('timing-notes');

			// Financial Data elements (existing page uses radios; support optional selects if present)
			const capitalRadios = document.querySelectorAll('input[name="capital"]');
			const costsRadios = document.querySelectorAll('input[name="costs"]');
			const paybackRadios = document.querySelectorAll('input[name="payback"]');
			const roiRadios = document.querySelectorAll('input[name="roi"]');
			const financialRadios = document.querySelectorAll('input[name="financial"]');
			const elFinancialNotes = document.getElementById('financial-notes') || document.getElementById('financialNotes');

			// Annual Operational Costs elements (Commercial page)
			const elUtilityCosts = document.getElementById('utilityCosts');
			const elOperationalCosts = document.getElementById('operationalCosts');
			const elDepreciationCosts = document.getElementById('depreciationCosts');

			// Social Data elements (support assumed IDs and actual IDs in page)
			const elCommunityImpact = document.getElementById('communityImpact') || document.getElementById('social-impact');
			const elJobOpportunities = document.getElementById('jobOpportunities') || document.getElementById('job-opportunities');
			const elSocialImpactAlignment = document.getElementById('socialImpactAlignment');
			const socialImpactRadios = document.querySelectorAll('input[name="impact"]');
			const elSocialNotes = document.getElementById('socialNotes') || document.getElementById('impact-notes');

			// Political Data elements (existing page uses radios; support optional select IDs if present)
			const elPoliticalStability = document.getElementById('politicalStability'); // optional select
			const stabilityRadios = document.querySelectorAll('input[name="stability"]');
			const elStabilityExplanation = document.getElementById('stability-explanation') || document.getElementById('stabilityExplanation');
			const elRegulatoryExposure = document.getElementById('regulatoryExposure'); // optional select
			const changesRadios = document.querySelectorAll('input[name="changes"]');
			const changesExplanationContainer = document.getElementById('changes-explanation-container');
			const elExposureExplanation = document.getElementById('changes-explanation') || document.getElementById('exposureExplanation');
			const elPoliticalRisk = document.getElementById('politicalRisk'); // optional select
			const riskRadios = document.querySelectorAll('input[name="risk"]');
			const elPoliticalNotes = document.getElementById('risk-notes') || document.getElementById('politicalNotes');

			// --- Additional Investments wiring ---
			function collectInvestmentsTable() {
				const items = [];
				if (investmentsListContainer) {
					const rows = investmentsListContainer.querySelectorAll('.dynamic-field');
					rows.forEach(row => {
						const typeEl = row.querySelector('.investment-type');
						const valueEl = row.querySelector('.investment-value');
						const returnEl = row.querySelector('.investment-return');
						const type = normalizeString(typeEl ? typeEl.value : '');
						const valueRaw = normalizeString(valueEl ? valueEl.value : '');
						const retRaw = normalizeString(returnEl ? returnEl.value : '');
						if (!type && !valueRaw && !retRaw) return; // empty row
						const valueNum = parseFloat(valueRaw);
						if (!type) return; // require type
						if (!Number.isFinite(valueNum)) return; // numeric validation
						items.push({ type, value: valueNum, return: retRaw || '-' });
					});
				} else {
					// Fallback for id-based inputs: investmentTypeN, investmentValueN, expectedReturnN
					for (let i = 1; i <= 50; i++) {
						const typeEl = document.getElementById('investmentType' + i);
						const valueEl = document.getElementById('investmentValue' + i);
						const returnEl = document.getElementById('expectedReturn' + i);
						if (!typeEl && !valueEl && !returnEl) {
							if (i === 1) break; // no table present
							continue;
						}
						const type = normalizeString(typeEl ? typeEl.value : '');
						const valueRaw = normalizeString(valueEl ? valueEl.value : '');
						const retRaw = normalizeString(returnEl ? returnEl.value : '');
						if (!type && !valueRaw && !retRaw) continue;
						const valueNum = parseFloat(valueRaw);
						if (!type) continue;
						if (!Number.isFinite(valueNum)) continue;
						items.push({ type, value: valueNum, return: retRaw || '-' });
					}
				}
				return items;
			}

			function computeInvestmentsTotal(investmentsData) {
				let total = 0;
				if (Array.isArray(investmentsData)) {
					investmentsData.forEach(i => {
						const v = parseFloat(i && i.value);
						if (Number.isFinite(v)) total += v;
					});
				}
				return total;
			}

			function updateInvestmentsFromDOM() {
				const data = collectInvestmentsTable();
				answers.investmentsTable = data;
				answers.investmentsTotal = computeInvestmentsTotal(data);
				if (investmentsTotalEl) {
					investmentsTotalEl.textContent = answers.investmentsTotal ? answers.investmentsTotal.toFixed(2) : '';
				}
				saveAnswers(answers);
			}

			function setAdditionalInvestmentsVisibility(val) {
				if (!additionalInvestmentsContainer) return;
				const show = val === 'yes' || val === 'Yes';
				const containerEl = additionalInvestmentsContainer || additionalInvestmentsContainerAlt;
				if (containerEl) containerEl.style.display = show ? 'block' : 'none';
				if (!show) {
					// clear details when hidden
					if (investmentsPurposeInput) investmentsPurposeInput.value = '';
					answers.investmentsPurpose = '';
					answers.investmentsTable = [];
					answers.investmentsTotal = 0;
					saveAnswers(answers);
				}
			}

			// Initialize from saved answers for Additional Investments
			if ((needsInvestRadios && needsInvestRadios.length) || needsInvestSelect) {
				if (answers.needsAdditionalInvestments) {
					const mapped = (answers.needsAdditionalInvestments === 'Yes') ? 'yes' : (answers.needsAdditionalInvestments === 'No') ? 'no' : '';
					if (mapped && needsInvestRadios && needsInvestRadios.length) { needsInvestRadios.forEach(r => { r.checked = r.value === mapped; }); }
					if (needsInvestSelect) needsInvestSelect.value = answers.needsAdditionalInvestments;
					setAdditionalInvestmentsVisibility(mapped || answers.needsAdditionalInvestments);
				}
				if (needsInvestRadios && needsInvestRadios.length) {
					needsInvestRadios.forEach(r => {
						r.addEventListener('change', () => {
							const mapBack = { 'yes': 'Yes', 'no': 'No' };
							answers.needsAdditionalInvestments = mapBack[r.value] || '';
							setAdditionalInvestmentsVisibility(r.value);
							saveAnswers(answers);
						});
					});
				}
				if (needsInvestSelect) {
					needsInvestSelect.addEventListener('change', () => {
						const v = normalizeString(needsInvestSelect.value);
						answers.needsAdditionalInvestments = v;
						setAdditionalInvestmentsVisibility(v);
						saveAnswers(answers);
					});
				}
			}

			if (investmentsListContainer) {
				// Rebuild rows from saved answers
				if (Array.isArray(answers.investmentsTable) && answers.investmentsTable.length) {
					investmentsListContainer.innerHTML = '';
					answers.investmentsTable.forEach(({ type, value, return: ret }) => {
						const row = document.createElement('div');
						row.className = 'dynamic-field';
                        try {
                            const idx = (investmentsListContainer.querySelectorAll('.dynamic-field').length || 0) + 1;
                            row.innerHTML = (
                                '<label class="sr-only" for="investment-type-' + idx + '">Investment type</label>' +
                                '<input type="text" id="investment-type-' + idx + '" name="investment-type-' + idx + '" placeholder="Type of investment" class="investment-type">' +
                                '<label class="sr-only" for="investment-value-' + idx + '">Investment value</label>' +
                                '<input type="number" id="investment-value-' + idx + '" name="investment-value-' + idx + '" placeholder="Investment value" class="investment-value">' +
                                '<label class="sr-only" for="investment-return-' + idx + '">Expected annual return</label>' +
                                '<input type="number" id="investment-return-' + idx + '" name="investment-return-' + idx + '" placeholder="Expected annual return" class="investment-return">' +
                                '<button class="remove-btn" onclick="removeField(this)">?</button>'
                            );
                        } catch (_) {
                            row.innerHTML = '<input type="text" placeholder="Type of investment" class="investment-type">\n\t\t\t\t\t\t<input type="number" placeholder="Investment value" class="investment-value">\n\t\t\t\t\t\t<input type="number" placeholder="Expected annual return" class="investment-return">\n\t\t\t\t\t\t<button class="remove-btn" onclick="removeField(this)">?</button>';
                        }
						const t = row.querySelector('.investment-type');
						const v = row.querySelector('.investment-value');
						const rr = row.querySelector('.investment-return');
						if (t) t.value = type;
						if (v) v.value = value;
						if (rr) rr.value = ret;
						investmentsListContainer.appendChild(row);
					});
				}
				// Save on input changes
				investmentsListContainer.addEventListener('input', updateInvestmentsFromDOM);
				// Listen for remove clicks
				investmentsListContainer.addEventListener('click', (e) => {
					const target = e.target;
					if (target && target.classList && target.classList.contains('remove-btn')) {
						setTimeout(updateInvestmentsFromDOM, 0);
					}
				});
				// Initial compute
				updateInvestmentsFromDOM();
			}

			if (investmentsPurposeInput) {
				if (answers.investmentsPurpose || answers.investmentsPurpose === '') investmentsPurposeInput.value = answers.investmentsPurpose;
				investmentsPurposeInput.addEventListener('input', () => {
					answers.investmentsPurpose = normalizeString(investmentsPurposeInput.value);
					saveAnswers(answers);
				});
			}
			// --- Financial Data wiring ---
            function setFinancialRadiosFromSaved() {
				if (capitalRadios && capitalRadios.length && answers.totalCapital) {
					const map = { 'Yes': 'yes', 'No': 'no', 'At minimum required': 'minimum' };
					const v = map[answers.totalCapital];
					capitalRadios.forEach(r => { r.checked = r.value === v; });
				}
                // Support both legacy 'operationalCosts' (assessment wording) and new 'operationalCostsAssessment'
                const costsAssessment = answers.operationalCostsAssessment || answers.operationalCosts;
                if (costsRadios && costsRadios.length && costsAssessment) {
					const map = { 'Yes': 'yes', 'No': 'no', 'At minimum required': 'minimum' };
                    const v = map[costsAssessment];
					costsRadios.forEach(r => { r.checked = r.value === v; });
				}
				if (paybackRadios && paybackRadios.length && answers.paybackPeriod) {
					const map = { 'Yes': 'yes', 'No': 'no' };
					const v = map[answers.paybackPeriod];
					paybackRadios.forEach(r => { r.checked = r.value === v; });
				}
				if (roiRadios && roiRadios.length && answers.roiExpectation) {
					const map = { 'Yes': 'yes', 'No': 'no', 'Not sure': 'unsure' };
					const v = map[answers.roiExpectation];
					roiRadios.forEach(r => { r.checked = r.value === v; });
				}
				if (financialRadios && financialRadios.length && answers.financialFeasibility) {
					const map = { 'Highly feasible': 'high', 'Feasible with some challenges': 'challenges', 'Not financially feasible': 'not' };
					const v = map[answers.financialFeasibility];
					financialRadios.forEach(r => { r.checked = r.value === v; });
				}
				if (elFinancialNotes && (answers.financialNotes || answers.financialNotes === '')) {
					elFinancialNotes.value = answers.financialNotes;
				}
			}

			setFinancialRadiosFromSaved();

			// --- Annual Operational Costs wiring ---
			function saveOperationalCosts() {
				const costsData = {
					utilities: elUtilityCosts ? elUtilityCosts.value : '',
					operations: elOperationalCosts ? elOperationalCosts.value : '',
					depreciation: elDepreciationCosts ? elDepreciationCosts.value : ''
				};
				answers.annualOperationalCosts = costsData;
				saveAnswers(answers);
			}

			// Initialize from saved values
			if (answers.annualOperationalCosts) {
				const a = answers.annualOperationalCosts || {};
				if (elUtilityCosts && (a.utilities || a.utilities === '')) elUtilityCosts.value = a.utilities;
				if (elOperationalCosts && (a.operations || a.operations === '')) elOperationalCosts.value = a.operations;
				if (elDepreciationCosts && (a.depreciation || a.depreciation === '')) elDepreciationCosts.value = a.depreciation;
			}

			if (elUtilityCosts) {
				elUtilityCosts.addEventListener('input', saveOperationalCosts);
			}
			if (elOperationalCosts) {
				elOperationalCosts.addEventListener('input', saveOperationalCosts);
			}
			if (elDepreciationCosts) {
				elDepreciationCosts.addEventListener('input', saveOperationalCosts);
			}

			if (capitalRadios && capitalRadios.length) {
				capitalRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const mapBack = { 'yes': 'Yes', 'no': 'No', 'minimum': 'At minimum required' };
						answers.totalCapital = mapBack[radio.value] || '';
						saveAnswers(answers);
					});
				});
			}
			if (costsRadios && costsRadios.length) {
                costsRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const mapBack = { 'yes': 'Yes', 'no': 'No', 'minimum': 'At minimum required' };
                        // Store under the non-conflicting assessment key; keep legacy for backward compatibility
                        answers.operationalCostsAssessment = mapBack[radio.value] || '';
                        answers.operationalCosts = answers.operationalCostsAssessment;
						saveAnswers(answers);
					});
				});
			}
			if (paybackRadios && paybackRadios.length) {
				paybackRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const mapBack = { 'yes': 'Yes', 'no': 'No' };
						answers.paybackPeriod = mapBack[radio.value] || '';
						saveAnswers(answers);
					});
				});
			}
			if (roiRadios && roiRadios.length) {
				roiRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const mapBack = { 'yes': 'Yes', 'no': 'No', 'unsure': 'Not sure' };
						answers.roiExpectation = mapBack[radio.value] || '';
						saveAnswers(answers);
					});
				});
			}
			if (financialRadios && financialRadios.length) {
				financialRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const mapBack = { 'high': 'Highly feasible', 'challenges': 'Feasible with some challenges', 'not': 'Not financially feasible' };
						answers.financialFeasibility = mapBack[radio.value] || '';
						saveAnswers(answers);
					});
				});
			}
			if (elFinancialNotes) {
				elFinancialNotes.addEventListener('input', () => {
					answers.financialNotes = normalizeString(elFinancialNotes.value);
					saveAnswers(answers);
				});
			}

			// Market Data elements (prefer canonical IDs; fallback to legacy dashed IDs)
			const elMarketSize = document.getElementById('marketSize') || document.getElementById('market-size');
			const elPotentialCustomers = document.getElementById('potentialCustomers') || document.getElementById('customer-count');
			const elGrowthRate = document.getElementById('growthRate') || document.getElementById('growth-rate');
			const elGrowthFactors = document.getElementById('growthFactors') || document.getElementById('growth-factors');
			const elCompetitors = document.getElementById('competitorsCount') || document.getElementById('competitors');
			const marketGapRadios = document.querySelectorAll('input[name="marketGap"], input[name="market-gap"]');
			const elGapExplanation = document.getElementById('gapExplanation') || document.getElementById('gap-explanation');
			const elGapExplanationContainer = document.getElementById('gap-explanation-container');
			const marketDemandRadios = document.querySelectorAll('input[name="marketFeasibility"], input[name="market-demand"]');
			const elDemandNotes = document.getElementById('marketNotes') || document.getElementById('demand-notes');

			// Risk Data elements (on same page)
			const risksListContainer = document.getElementById('risks-list');
			const contingencyRadios = document.querySelectorAll('input[name="contingency"]');
			const contingencyExplanationContainer = document.getElementById('contingency-explanation-container');
			const elContingencyExplanation = document.getElementById('contingency-explanation');
			const riskControlRadios = document.querySelectorAll('input[name="control"]');
			const elRiskNotes = document.getElementById('control-notes');

		function parseNumberOrEmpty(val) {
				const num = typeof val === 'number' ? val : parseFloat((val || '').toString().trim());
				return Number.isFinite(num) ? num : '';
			}

		function getSelectedMarketingChannels() {
			// Prefer the native checkbox group values if present
			if (marketingChannelCheckboxes && marketingChannelCheckboxes.length) {
				const vals = [];
				marketingChannelCheckboxes.forEach(cb => { if (cb && cb.checked) vals.push(cb.value); });
				return vals;
			}
			// Fallback to legacy ID-based checkboxes
			const selected = [];
			if (cbSocialMediaAds && cbSocialMediaAds.checked) selected.push('socialMediaAds');
			if (cbContentMarketing && cbContentMarketing.checked) selected.push('contentMarketing');
			if (cbTvRadioAds && cbTvRadioAds.checked) selected.push('tvRadioAds');
			if (cbOtherChannels && cbOtherChannels.checked) selected.push('otherChannels');
			return selected;
		}

		function updateOtherChannelsVisibility() {
			if (!elOtherChannelsText || !cbOtherChannels) return;
			elOtherChannelsText.style.display = cbOtherChannels.checked ? 'block' : 'none';
		}

		// --- Economic helpers ---
		function getSelectedEconomicValueKeys() {
			const keys = [];
			if (econNewJobs && econNewJobs.checked) keys.push('newJobs');
			if (econContributeGDP && econContributeGDP.checked) keys.push('contributeGDP');
			if (econSupportSupplyChains && econSupportSupplyChains.checked) keys.push('supportSupplyChains');
			if (econOtherValue && econOtherValue.checked) keys.push('other');
			return keys;
		}

		function updateOtherEconomicValueVisibility() {
			if (!econOtherValueText) return;
			const show = !!(econOtherValue && econOtherValue.checked);
			econOtherValueText.style.display = show ? 'block' : 'none';
			if (!show) {
				econOtherValueText.value = '';
				answers.economicValueOtherText = '';
				saveAnswers(answers);
			}
		}

		function clampToScale(value) {
			const num = parseFloat((value || '').toString());
			if (!Number.isFinite(num)) return '';
			if (num < 1) return 1;
			if (num > 5) return 5;
			return num;
		}

        if (q1) {
            if (answers.projectIdea) q1.value = answers.projectIdea;
            q1.addEventListener('input', () => {
                answers.projectIdea = normalizeString(q1.value);
                saveAnswers(answers);
            });
        }

        if (q2) {
            if (answers.problemSolution) q2.value = answers.problemSolution;
            q2.addEventListener('input', () => {
                answers.problemSolution = normalizeString(q2.value);
                saveAnswers(answers);
            });
        }

		// Marketing Data wiring

		// Economic Data wiring
		const econValueCheckboxes = [econNewJobs, econContributeGDP, econSupportSupplyChains, econOtherValue].filter(Boolean);
		if (econValueCheckboxes.length) {
			// initialize from saved
			if (Array.isArray(answers.economicValue) && answers.economicValue.length) {
				if (econNewJobs) econNewJobs.checked = answers.economicValue.includes('newJobs');
				if (econContributeGDP) econContributeGDP.checked = answers.economicValue.includes('contributeGDP');
				if (econSupportSupplyChains) econSupportSupplyChains.checked = answers.economicValue.includes('supportSupplyChains');
				if (econOtherValue) econOtherValue.checked = answers.economicValue.includes('other');
			}
			if (econOtherValueText && (answers.economicValueOtherText || answers.economicValueOtherText === '')) {
				econOtherValueText.value = answers.economicValueOtherText;
			}
			updateOtherEconomicValueVisibility();
			econValueCheckboxes.forEach(cb => {
				cb.addEventListener('change', () => {
					answers.economicValue = getSelectedEconomicValueKeys();
					updateOtherEconomicValueVisibility();
					saveAnswers(answers);
				});
			});
		}

		if (econOtherValueText) {
			econOtherValueText.addEventListener('input', () => {
				answers.economicValueOtherText = normalizeString(econOtherValueText.value);
				saveAnswers(answers);
			});
		}

		// GDP Impact (support select id "gdpImpact"; fallback to radio group name="gdp")
		const gdpRadios = document.querySelectorAll('input[name="gdp"]');
		function mapGdpRadioToAnswer(val) {
			const mapBack = { 'yes': 'Yes', 'no': 'No', 'limited': 'Limited effect' };
			return mapBack[val] || '';
		}
		function mapGdpAnswerToRadio(val) {
			const map = { 'Yes': 'yes', 'No': 'no', 'Limited effect': 'limited' };
			return map[val] || '';
		}
		if (elGdpImpact) {
			if (answers.gdpImpact) elGdpImpact.value = answers.gdpImpact;
			elGdpImpact.addEventListener('change', () => {
				answers.gdpImpact = normalizeString(elGdpImpact.value);
				saveAnswers(answers);
			});
		} else if (gdpRadios && gdpRadios.length) {
			if (answers.gdpImpact) {
				const v = mapGdpAnswerToRadio(answers.gdpImpact);
				gdpRadios.forEach(r => { r.checked = r.value === v; });
			}
			gdpRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					answers.gdpImpact = mapGdpRadioToAnswer(radio.value);
					saveAnswers(answers);
				});
			});
		}

		if (elGdpExplanation) {
			if (answers.gdpImpactExplanation || answers.gdpImpactExplanation === '') elGdpExplanation.value = answers.gdpImpactExplanation;
			elGdpExplanation.addEventListener('input', () => {
				answers.gdpImpactExplanation = normalizeString(elGdpExplanation.value);
				saveAnswers(answers);
			});
		}

		// Economic feasibility (support select id "economicFeasibility"; fallback to radios name="feasibility")
		const feasibilityRadios = document.querySelectorAll('input[name="feasibility"]');
		function mapFeasRadioToAnswer(val) {
			const mapBack = { 'high': 'High economic feasibility', 'medium': 'Medium economic feasibility', 'limited': 'Limited economic feasibility' };
			return mapBack[val] || '';
		}
		function mapFeasAnswerToRadio(val) {
			const map = { 'High economic feasibility': 'high', 'Medium economic feasibility': 'medium', 'Limited economic feasibility': 'limited' };
			return map[val] || '';
		}
		if (elEconomicFeasibility) {
			if (answers.economicFeasibility) elEconomicFeasibility.value = answers.economicFeasibility;
			elEconomicFeasibility.addEventListener('change', () => {
				answers.economicFeasibility = normalizeString(elEconomicFeasibility.value);
				saveAnswers(answers);
			});
		} else if (feasibilityRadios && feasibilityRadios.length) {
			if (answers.economicFeasibility) {
				const v = mapFeasAnswerToRadio(answers.economicFeasibility);
				feasibilityRadios.forEach(r => { r.checked = r.value === v; });
			}
			feasibilityRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					answers.economicFeasibility = mapFeasRadioToAnswer(radio.value);
					saveAnswers(answers);
				});
			});
		}

		if (elEconomicNotes) {
			if (answers.economicNotes) elEconomicNotes.value = answers.economicNotes;
			elEconomicNotes.addEventListener('input', () => {
				answers.economicNotes = normalizeString(elEconomicNotes.value);
				saveAnswers(answers);
			});
		}

		// Political Data wiring
		function mapStabilityRadioToAnswer(val) {
			const mapBack = { 'yes': 'Yes', 'no': 'No', 'partial': 'Partially' };
			return mapBack[val] || '';
		}
		function mapExposureRadioToAnswer(val) {
			const mapBack = { 'yes': 'Yes', 'no': 'No', 'unexpected': 'Not expected' };
			return mapBack[val] || '';
		}
		function mapRiskRadioToAnswer(val) {
			const mapBack = { 'low': 'Low risk', 'medium': 'Medium risk', 'high': 'High risk' };
			return mapBack[val] || '';
		}

		// Initialize from saved answers to DOM for political section
		if (elPoliticalStability && answers.politicalStability) {
			elPoliticalStability.value = answers.politicalStability;
		}
		if ((!elPoliticalStability) && stabilityRadios && stabilityRadios.length && answers.politicalStability) {
			const map = { 'Yes': 'yes', 'No': 'no', 'Partially': 'partial' };
			const v = map[answers.politicalStability];
			stabilityRadios.forEach(r => { r.checked = r.value === v; });
		}
		if (elStabilityExplanation && (answers.stabilityExplanation || answers.stabilityExplanation === '')) {
			elStabilityExplanation.value = answers.stabilityExplanation;
		}

		if (elRegulatoryExposure && answers.regulatoryExposure) {
			elRegulatoryExposure.value = answers.regulatoryExposure;
		}
		if ((!elRegulatoryExposure) && changesRadios && changesRadios.length && answers.regulatoryExposure) {
			const map = { 'Yes': 'yes', 'No': 'no', 'Not expected': 'unexpected' };
			const v = map[answers.regulatoryExposure];
			changesRadios.forEach(r => { r.checked = r.value === v; });
			if (changesExplanationContainer) {
				const show = v === 'yes';
				changesExplanationContainer.style.display = show ? 'block' : 'none';
			}
		}
		if (elExposureExplanation && (answers.exposureExplanation || answers.exposureExplanation === '')) {
			elExposureExplanation.value = answers.exposureExplanation;
		}

		if (elPoliticalRisk && answers.politicalRisk) {
			elPoliticalRisk.value = answers.politicalRisk;
		}
		if ((!elPoliticalRisk) && riskRadios && riskRadios.length && answers.politicalRisk) {
			const map = { 'Low risk': 'low', 'Medium risk': 'medium', 'High risk': 'high' };
			const v = map[answers.politicalRisk];
			riskRadios.forEach(r => { r.checked = r.value === v; });
		}
		if (elPoliticalNotes && (answers.politicalNotes || answers.politicalNotes === '')) {
			elPoliticalNotes.value = answers.politicalNotes;
		}

		// Event listeners for political inputs
		if (elPoliticalStability) {
			elPoliticalStability.addEventListener('change', () => {
				answers.politicalStability = normalizeString(elPoliticalStability.value);
				saveAnswers(answers);
			});
		} else if (stabilityRadios && stabilityRadios.length) {
			stabilityRadios.forEach(r => {
				r.addEventListener('change', () => {
					answers.politicalStability = mapStabilityRadioToAnswer(r.value);
					saveAnswers(answers);
				});
			});
		}

		// Time Data wiring
		function mapTimeframeRadioToAnswer(val) {
			const mapBack = { 'yes': 'Yes, appropriate', 'late': 'May be late', 'no': 'No effect' };
			return mapBack[val] || '';
		}
		function mapImplementationRadioToAnswer(val) {
			const mapBack = { 'appropriate': 'Very appropriate', 'accelerate': 'Needs acceleration', 'not': 'Not appropriate' };
			return mapBack[val] || '';
		}

		// Initialize from saved answers (support both selects and radios)
		if (elMarketTiming && answers.marketTiming) {
			elMarketTiming.value = answers.marketTiming;
		}
		if ((!elMarketTiming) && timeframeRadios && timeframeRadios.length && answers.marketTiming) {
			const map = { 'Yes, appropriate': 'yes', 'May be late': 'late', 'No effect': 'no' };
			const v = map[answers.marketTiming];
			timeframeRadios.forEach(r => { r.checked = r.value === v; });
		}

		if (elImplementationTiming && answers.implementationTiming) {
			elImplementationTiming.value = answers.implementationTiming;
		}
		if ((!elImplementationTiming) && implementationRadios && implementationRadios.length && answers.implementationTiming) {
			const map = { 'Very appropriate': 'appropriate', 'Needs acceleration': 'accelerate', 'Not appropriate': 'not' };
			const v = map[answers.implementationTiming];
			implementationRadios.forEach(r => { r.checked = r.value === v; });
		}

		// Listeners
		if (elMarketTiming) {
			elMarketTiming.addEventListener('change', () => {
				answers.marketTiming = normalizeString(elMarketTiming.value);
				saveAnswers(answers);
			});
		} else if (timeframeRadios && timeframeRadios.length) {
			timeframeRadios.forEach(r => {
				r.addEventListener('change', () => {
					answers.marketTiming = mapTimeframeRadioToAnswer(r.value);
					saveAnswers(answers);
				});
			});
		}

		if (elImplementationTiming) {
			elImplementationTiming.addEventListener('change', () => {
				answers.implementationTiming = normalizeString(elImplementationTiming.value);
				saveAnswers(answers);
			});
		} else if (implementationRadios && implementationRadios.length) {
			implementationRadios.forEach(r => {
				r.addEventListener('change', () => {
					answers.implementationTiming = mapImplementationRadioToAnswer(r.value);
					saveAnswers(answers);
				});
			});
		}
		if (elTimeNotes) {
			if (answers.timeNotes || answers.timeNotes === '') elTimeNotes.value = answers.timeNotes;
			elTimeNotes.addEventListener('input', () => {
				answers.timeNotes = normalizeString(elTimeNotes.value);
				saveAnswers(answers);
			});
		}
		if (elStabilityExplanation) {
			elStabilityExplanation.addEventListener('input', () => {
				answers.stabilityExplanation = normalizeString(elStabilityExplanation.value);
				saveAnswers(answers);
			});
		}

		function updateChangesVisibility(val) {
			if (!changesExplanationContainer) return;
			const show = val === 'yes';
			changesExplanationContainer.style.display = show ? 'block' : 'none';
			if (!show && elExposureExplanation) {
				elExposureExplanation.value = '';
				answers.exposureExplanation = '';
			}
		}

		if (elRegulatoryExposure) {
			elRegulatoryExposure.addEventListener('change', () => {
				answers.regulatoryExposure = normalizeString(elRegulatoryExposure.value);
				saveAnswers(answers);
			});
		} else if (changesRadios && changesRadios.length) {
			changesRadios.forEach(r => {
				r.addEventListener('change', () => {
					const v = r.value;
					answers.regulatoryExposure = mapExposureRadioToAnswer(v);
					updateChangesVisibility(v);
					saveAnswers(answers);
				});
			});
		}
		if (elExposureExplanation) {
			elExposureExplanation.addEventListener('input', () => {
				answers.exposureExplanation = normalizeString(elExposureExplanation.value);
				saveAnswers(answers);
			});
		}

		if (elPoliticalRisk) {
			elPoliticalRisk.addEventListener('change', () => {
				answers.politicalRisk = normalizeString(elPoliticalRisk.value);
				saveAnswers(answers);
			});
		} else if (riskRadios && riskRadios.length) {
			riskRadios.forEach(r => {
				r.addEventListener('change', () => {
					answers.politicalRisk = mapRiskRadioToAnswer(r.value);
					saveAnswers(answers);
				});
			});
		}
		if (elPoliticalNotes) {
			elPoliticalNotes.addEventListener('input', () => {
				answers.politicalNotes = normalizeString(elPoliticalNotes.value);
				saveAnswers(answers);
			});
		}
			if (elTargetAge) {
				if (answers.targetAge) elTargetAge.value = answers.targetAge;
				elTargetAge.addEventListener('input', () => {
					answers.targetAge = normalizeString(elTargetAge.value);
					saveAnswers(answers);
				});
			} else if (elMinAge || elMaxAge) {
				// Derive unified targetAge from min/max inputs on the page
				function setTargetAgeFromMinMax() {
					const minVal = (elMinAge && elMinAge.value !== undefined) ? String(elMinAge.value).trim() : '';
					const maxVal = (elMaxAge && elMaxAge.value !== undefined) ? String(elMaxAge.value).trim() : '';
					const bothEmpty = (!minVal && !maxVal);
					answers.targetAge = bothEmpty ? '' : [minVal || '?', maxVal || '?'].join(' - ');
					saveAnswers(answers);
				}
				// Initialize from saved unified value if available
				if (answers.targetAge) {
					const m = String(answers.targetAge).match(/^(.*)\s*-\s*(.*)$/);
					if (m) {
						if (elMinAge) elMinAge.value = m[1].trim();
						if (elMaxAge) elMaxAge.value = m[2].trim();
					}
				}
				if (elMinAge) elMinAge.addEventListener('input', setTargetAgeFromMinMax);
				if (elMaxAge) elMaxAge.addEventListener('input', setTargetAgeFromMinMax);
			}

		if (elCustomerIncome) {
			if (answers.customerIncome !== undefined && answers.customerIncome !== '') elCustomerIncome.value = answers.customerIncome;
			elCustomerIncome.addEventListener('input', () => {
				const v = parseNumberOrEmpty(elCustomerIncome.value);
				answers.customerIncome = v;
				saveAnswers(answers);
			});
		}

		const legacyMarketingChannelCheckboxes = [cbSocialMediaAds, cbContentMarketing, cbTvRadioAds, cbOtherChannels].filter(Boolean);
		if ((marketingChannelCheckboxes && marketingChannelCheckboxes.length) || legacyMarketingChannelCheckboxes.length) {
			// initialize from saved marketing channels (supporting legacy ID-based checkboxes)
			const savedChannels = Array.isArray(answers.marketingChannels) ? answers.marketingChannels : [];
			if (savedChannels && savedChannels.length) {
				if (marketingChannelCheckboxes && marketingChannelCheckboxes.length) {
					marketingChannelCheckboxes.forEach(cb => { if (cb) cb.checked = savedChannels.includes(cb.value); });
				}
				// legacy fallbacks
				if (cbSocialMediaAds) cbSocialMediaAds.checked = savedChannels.includes('socialMediaAds');
				if (cbContentMarketing) cbContentMarketing.checked = savedChannels.includes('contentMarketing');
				if (cbTvRadioAds) cbTvRadioAds.checked = savedChannels.includes('tvRadioAds');
				if (cbOtherChannels) cbOtherChannels.checked = savedChannels.includes('otherChannels');
			}
			updateOtherChannelsVisibility();
			if (marketingChannelCheckboxes && marketingChannelCheckboxes.length) {
				marketingChannelCheckboxes.forEach(cb => {
					cb.addEventListener('change', () => {
						const arr = getSelectedMarketingChannels();
						answers.marketingChannels = arr;
						updateOtherChannelsVisibility();
						saveAnswers(answers);
					});
				});
			}
			legacyMarketingChannelCheckboxes.forEach(cb => {
				cb.addEventListener('change', () => {
					const arr = getSelectedMarketingChannels();
					answers.marketingChannels = arr;
					updateOtherChannelsVisibility();
					saveAnswers(answers);
				});
			});
		}

		if (elOtherChannelsText) {
			if (answers.marketingChannelsOther) elOtherChannelsText.value = answers.marketingChannelsOther;
			elOtherChannelsText.addEventListener('input', () => {
				answers.marketingChannelsOther = normalizeString(elOtherChannelsText.value);
				saveAnswers(answers);
			});
		}

		if (elMarketingCost) {
			if (answers.marketingCost !== undefined && answers.marketingCost !== '') elMarketingCost.value = answers.marketingCost;
			elMarketingCost.addEventListener('input', () => {
				const v = parseNumberOrEmpty(elMarketingCost.value);
				answers.marketingCost = v;
				saveAnswers(answers);
			});
		}

		if (elCompetitiveAdvantage) {
			if (answers.competitiveAdvantage) elCompetitiveAdvantage.value = answers.competitiveAdvantage;
			elCompetitiveAdvantage.addEventListener('input', () => {
				answers.competitiveAdvantage = normalizeString(elCompetitiveAdvantage.value);
				saveAnswers(answers);
			});
		}

		// Prefer radio group mapping for reachability on this page
		if (reachRadios && reachRadios.length) {
			if (answers.reachability) {
				const map = { 'Yes, possible': 'yes', 'Major challenges': 'challenges', 'Unclear': 'unclear' };
				const v = map[answers.reachability];
				reachRadios.forEach(r => { r.checked = r.value === v; });
			}
			reachRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { yes: 'Yes, possible', challenges: 'Major challenges', unclear: 'Unclear' };
					answers.reachability = mapBack[r.value] || '';
					saveAnswers(answers);
				});
			});
		} else if (elReachability) {
			// Legacy select support if present
			if (answers.reachability) elReachability.value = answers.reachability;
			elReachability.addEventListener('change', () => {
				const v = normalizeString(elReachability.value);
				answers.reachability = v;
				saveAnswers(answers);
			});
		}

		if (elMarketingNotes) {
			if (answers.marketingNotes) elMarketingNotes.value = answers.marketingNotes;
			elMarketingNotes.addEventListener('input', () => {
				answers.marketingNotes = normalizeString(elMarketingNotes.value);
				saveAnswers(answers);
			});
		}

		// Environmental Data wiring
		function updateEnvironmentExplanationVisibility(selectedValue) {
			if (!environmentExplanationContainer || !elEnvironmentExplanation) return;
			const show = selectedValue === 'yes';
			environmentExplanationContainer.style.display = show ? 'block' : 'none';
			if (!show) {
				elEnvironmentExplanation.value = '';
				answers.impactExplanation = '';
			}
		}

		if (environmentRadios && environmentRadios.length) {
			if (answers.environmentalImpact) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Not sure': 'unsure' };
				const v = map[answers.environmentalImpact];
				environmentRadios.forEach(r => { r.checked = r.value === v; });
				updateEnvironmentExplanationVisibility(v);
			}
			environmentRadios.forEach(r => {
				r.addEventListener('change', () => {
					const v = r.value; // 'yes' | 'no' | 'unsure'
					const mapBack = { yes: 'Yes', no: 'No', unsure: 'Not sure' };
					answers.environmentalImpact = mapBack[v] || '';
					updateEnvironmentExplanationVisibility(v);
					saveAnswers(answers);
				});
			});
		}

		if (elEnvironmentExplanation) {
			if (answers.impactExplanation) elEnvironmentExplanation.value = answers.impactExplanation;
			elEnvironmentExplanation.addEventListener('input', () => {
				answers.impactExplanation = normalizeString(elEnvironmentExplanation.value);
				saveAnswers(answers);
			});
		}

		if (assessmentRadios && assessmentRadios.length) {
			if (answers.environmentalApprovals) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Not sure': 'unsure' };
				const v = map[answers.environmentalApprovals];
				assessmentRadios.forEach(r => { r.checked = r.value === v; });
			}
			assessmentRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { yes: 'Yes', no: 'No', unsure: 'Not sure' };
					answers.environmentalApprovals = mapBack[r.value] || '';
					saveAnswers(answers);
				});
			});
		}

		if (friendlyRadios && friendlyRadios.length) {
			if (answers.environmentalFriendliness) {
				const map = { 'Yes': 'yes', 'Needs improvement': 'needs', 'Negative': 'negative' };
				const v = map[answers.environmentalFriendliness];
				friendlyRadios.forEach(r => { r.checked = r.value === v; });
			}
			friendlyRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { yes: 'Yes', needs: 'Needs improvement', negative: 'Negative' };
					answers.environmentalFriendliness = mapBack[r.value] || '';
					saveAnswers(answers);
				});
			});
		}

		if (elEnvironmentalNotes) {
			if (answers.environmentalNotes) elEnvironmentalNotes.value = answers.environmentalNotes;
			elEnvironmentalNotes.addEventListener('input', () => {
				answers.environmentalNotes = normalizeString(elEnvironmentalNotes.value);
				saveAnswers(answers);
			});
		}

			// Social Data wiring
			if (elCommunityImpact) {
				if (answers.communityImpact) elCommunityImpact.value = answers.communityImpact;
				elCommunityImpact.addEventListener('input', () => {
					// Preserve original formatting for community impact description
					const val = (elCommunityImpact.value || '').toString();
					answers.communityImpact = val;
					saveAnswers(answers);
				});
			}

			if (elJobOpportunities) {
				if (answers.jobOpportunities !== undefined && answers.jobOpportunities !== '') elJobOpportunities.value = answers.jobOpportunities;
				elJobOpportunities.addEventListener('input', () => {
					const raw = (elJobOpportunities.value || '').toString().trim();
					const num = parseFloat(raw);
					answers.jobOpportunities = Number.isFinite(num) ? num : '';
					saveAnswers(answers);
				});
			}

			if (elSocialImpactAlignment) {
				if (answers.socialImpactAlignment) elSocialImpactAlignment.value = answers.socialImpactAlignment;
				elSocialImpactAlignment.addEventListener('change', () => {
					answers.socialImpactAlignment = normalizeString(elSocialImpactAlignment.value);
					saveAnswers(answers);
				});
			} else if (socialImpactRadios && socialImpactRadios.length) {
				// Initialize from saved string to radio selection
				if (answers.socialImpactAlignment) {
					const mapToRadio = {
						"Significant positive impact": 'high',
						"Limited positive impact": 'limited',
						"Unclear": 'unclear'
					};
					const v = mapToRadio[answers.socialImpactAlignment];
					socialImpactRadios.forEach(r => { r.checked = r.value === v; });
				}
				socialImpactRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const mapBack = { 'high': "Significant positive impact", 'limited': "Limited positive impact", 'unclear': "Unclear" };
						answers.socialImpactAlignment = mapBack[radio.value] || '';
						saveAnswers(answers);
					});
				});
			}

			if (elSocialNotes) {
				if (answers.socialNotes) elSocialNotes.value = answers.socialNotes;
				elSocialNotes.addEventListener('input', () => {
					answers.socialNotes = normalizeString(elSocialNotes.value);
					saveAnswers(answers);
				});
			}

			// Cultural Data wiring (assumed IDs)
			const elCulturalAlignment = document.getElementById('culturalAlignment');
			const elAlignmentExplanation = document.getElementById('alignmentExplanation');
			const elCulturalRejection = document.getElementById('culturalRejection');
			const elRejectionExplanation = document.getElementById('rejectionExplanation');
			const elCulturalAcceptability = document.getElementById('culturalAcceptability');
			const elCulturalNotes = document.getElementById('culturalNotes');

			function updateRejectionExplanationVisibility() {
				if (!elCulturalRejection || !elRejectionExplanation) return;
				const val = normalizeString(elCulturalRejection.value);
				const show = val === 'Yes';
				elRejectionExplanation.style.display = show ? 'block' : 'none';
				// Toggle required/validation state
				if (typeof elRejectionExplanation.required !== 'undefined') {
					elRejectionExplanation.required = show;
				}
				if (!show) {
					if (elRejectionExplanation.setCustomValidity) elRejectionExplanation.setCustomValidity('');
					elRejectionExplanation.value = '';
					answers.rejectionExplanation = '';
				}
			}

			if (elCulturalAlignment) {
				if (answers.culturalAlignment) elCulturalAlignment.value = answers.culturalAlignment;
				elCulturalAlignment.addEventListener('change', () => {
					answers.culturalAlignment = normalizeString(elCulturalAlignment.value);
					saveAnswers(answers);
				});
			}

			if (elAlignmentExplanation) {
				if (answers.alignmentExplanation) elAlignmentExplanation.value = answers.alignmentExplanation;
				elAlignmentExplanation.addEventListener('input', () => {
					answers.alignmentExplanation = normalizeString(elAlignmentExplanation.value);
					saveAnswers(answers);
				});
			}

			if (elCulturalRejection) {
				if (answers.culturalRejection) elCulturalRejection.value = answers.culturalRejection;
				updateRejectionExplanationVisibility();
				elCulturalRejection.addEventListener('change', () => {
					answers.culturalRejection = normalizeString(elCulturalRejection.value);
					updateRejectionExplanationVisibility();
					saveAnswers(answers);
				});
			}

			if (elRejectionExplanation) {
				if (answers.rejectionExplanation) elRejectionExplanation.value = answers.rejectionExplanation;
				// Keep validation synced while typing
				elRejectionExplanation.addEventListener('input', () => {
					answers.rejectionExplanation = normalizeString(elRejectionExplanation.value);
					if (elCulturalRejection && normalizeString(elCulturalRejection.value) === 'Yes') {
						if (elRejectionExplanation.setCustomValidity) {
							elRejectionExplanation.setCustomValidity(answers.rejectionExplanation ? '' : 'Please provide an explanation.');
						}
					}
					saveAnswers(answers);
				});
			}

			if (elCulturalAcceptability) {
				if (answers.culturalAcceptability) elCulturalAcceptability.value = answers.culturalAcceptability;
				elCulturalAcceptability.addEventListener('change', () => {
					answers.culturalAcceptability = normalizeString(elCulturalAcceptability.value);
					saveAnswers(answers);
				});
			}

			if (elCulturalNotes) {
				if (answers.culturalNotes) elCulturalNotes.value = answers.culturalNotes;
				elCulturalNotes.addEventListener('input', () => {
					answers.culturalNotes = normalizeString(elCulturalNotes.value);
					saveAnswers(answers);
				});
			}

			// Behavioral Data wiring (existing page uses radios/textareas)
			const behaviorRadios = document.querySelectorAll('input[name="behavior"]');
			const elBehaviorExplanation = document.getElementById('behavior-explanation');
			const resistanceRadios = document.querySelectorAll('input[name="resistance"]');
			const resistanceExplanationContainer = document.getElementById('resistance-explanation-container');
			const elResistanceExplanation = document.getElementById('resistance-explanation');
			const supportRadios = document.querySelectorAll('input[name="support"]');
			const elSupportNotes = document.getElementById('support-notes');

			function mapBehaviorRadioToAnswer(val) {
				const mapBack = { 'yes': 'Yes', 'no': 'No', 'partial': 'Partially' };
				return mapBack[val] || '';
			}
			function mapResistanceRadioToAnswer(val) {
				const mapBack = { 'yes': 'Yes', 'no': 'No', 'unexpected': 'Not expected' };
				return mapBack[val] || '';
			}
			function mapSupportRadioToAnswer(val) {
				const mapBack = { 'strong': 'Strongly supports', 'effort': 'Needs effort', 'high': 'High resistance' };
				return mapBack[val] || '';
			}

			function setResistanceExplanationVisibility(val) {
				if (!resistanceExplanationContainer) return;
				const show = val === 'yes';
				resistanceExplanationContainer.style.display = show ? 'block' : 'none';
				if (!show && elResistanceExplanation) {
					elResistanceExplanation.value = '';
					answers.resistanceExplanation = '';
				}
				if (elResistanceExplanation && typeof elResistanceExplanation.required !== 'undefined') {
					elResistanceExplanation.required = show;
				}
				if (!show && elResistanceExplanation && elResistanceExplanation.setCustomValidity) {
					elResistanceExplanation.setCustomValidity('');
				}
			}

			// Initialize from saved answers
			if (behaviorRadios && behaviorRadios.length && answers.behaviorAlignment) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Partially': 'partial' };
				const v = map[answers.behaviorAlignment];
				behaviorRadios.forEach(r => { r.checked = r.value === v; });
			}
			if (elBehaviorExplanation && answers.alignmentExplanation) {
				elBehaviorExplanation.value = answers.alignmentExplanation;
			}
			if (resistanceRadios && resistanceRadios.length && answers.behaviorResistance) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Not expected': 'unexpected' };
				const v = map[answers.behaviorResistance];
				resistanceRadios.forEach(r => { r.checked = r.value === v; });
				setResistanceExplanationVisibility(v);
			}
			if (elResistanceExplanation && answers.resistanceExplanation) {
				elResistanceExplanation.value = answers.resistanceExplanation;
			}
			if (supportRadios && supportRadios.length && answers.customerSupport) {
				const map = { 'Strongly supports': 'strong', 'Needs effort': 'effort', 'High resistance': 'high' };
				const v = map[answers.customerSupport];
				supportRadios.forEach(r => { r.checked = r.value === v; });
			}
			if (elSupportNotes && answers.behavioralNotes) {
				elSupportNotes.value = answers.behavioralNotes;
			}

			// Event listeners
			if (behaviorRadios && behaviorRadios.length) {
				behaviorRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						answers.behaviorAlignment = mapBehaviorRadioToAnswer(radio.value);
						saveAnswers(answers);
					});
				});
			}
			if (elBehaviorExplanation) {
				elBehaviorExplanation.addEventListener('input', () => {
					answers.alignmentExplanation = normalizeString(elBehaviorExplanation.value);
					saveAnswers(answers);
				});
			}
			if (resistanceRadios && resistanceRadios.length) {
				resistanceRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const v = radio.value;
						answers.behaviorResistance = mapResistanceRadioToAnswer(v);
						if (v !== 'yes' && elResistanceExplanation) {
							elResistanceExplanation.value = '';
							answers.resistanceExplanation = '';
						}
						setResistanceExplanationVisibility(v);
						saveAnswers(answers);
					});
				});
			}
			if (elResistanceExplanation) {
				elResistanceExplanation.addEventListener('input', () => {
					answers.resistanceExplanation = normalizeString(elResistanceExplanation.value);
					if (resistanceRadios && [...resistanceRadios].some(r => r.checked && r.value === 'yes')) {
						if (elResistanceExplanation.setCustomValidity) {
							elResistanceExplanation.setCustomValidity(answers.resistanceExplanation ? '' : 'Please provide an explanation.');
						}
					}
					saveAnswers(answers);
				});
			}
			if (supportRadios && supportRadios.length) {
				supportRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						answers.customerSupport = mapSupportRadioToAnswer(radio.value);
						saveAnswers(answers);
					});
				});
			}
			if (elSupportNotes) {
				elSupportNotes.addEventListener('input', () => {
					answers.behavioralNotes = normalizeString(elSupportNotes.value);
					saveAnswers(answers);
				});
			}

		// Technical & Operational wiring
		const trafficRadios = document.querySelectorAll('input[name="traffic"]');
		if (trafficRadios && trafficRadios.length) {
			const saved = answers.locationTraffic; // "High" | "Medium" | "Low"
			if (saved) {
				const map = { 'High': 'high', 'Medium': 'medium', 'Low': 'low' };
				const v = map[saved];
				trafficRadios.forEach(r => { r.checked = r.value === v; });
			}
			trafficRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'high': 'High', 'medium': 'Medium', 'low': 'Low' };
					answers.locationTraffic = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}

		const parkingRadios = document.querySelectorAll('input[name="parking"]');
		if (parkingRadios && parkingRadios.length) {
			const saved = answers.parkingAvailability; // "Easily available" | "Limited" | "Not available"
			if (saved) {
				const map = { 'Easily available': 'easy', 'Limited': 'limited', 'Not available': 'none' };
				const v = map[saved];
				parkingRadios.forEach(r => { r.checked = r.value === v; });
			}
			parkingRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'easy': 'Easily available', 'limited': 'Limited', 'none': 'Not available' };
					answers.parkingAvailability = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}

		const attrCheckboxes = document.querySelectorAll('input[name="attraction-points"]');
		const elAttrOtherText = document.getElementById('attr-other-text');
		function domToAttractionKey(val) {
			const map = {
				'residential': 'residentialAreas',
				'commercial-centers': 'commercialCenters',
				'universities-schools': 'universities',
				'major-markets': 'markets',
				'transport-hubs': 'transportHubs',
				'hospitals-clinics': 'hospitals',
				'entertainment-venues': 'entertainment',
				'other': 'other'
			};
			return map[val] || '';
		}
		function attractionKeyToDom(key) {
			const map = {
				'residentialAreas': 'residential',
				'commercialCenters': 'commercial-centers',
				'universities': 'universities-schools',
				'markets': 'major-markets',
				'transportHubs': 'transport-hubs',
				'hospitals': 'hospitals-clinics',
				'entertainment': 'entertainment-venues',
				'other': 'other'
			};
			return map[key] || '';
		}
		function getSelectedAttractionKeys() {
			const keys = [];
			attrCheckboxes.forEach(cb => { if (cb && cb.checked) { const k = domToAttractionKey(cb.value); if (k) keys.push(k); } });
			return keys;
		}
		if (attrCheckboxes && attrCheckboxes.length) {
			// initialize from saved
			if (Array.isArray(answers.attractionPoints) && answers.attractionPoints.length) {
				const domVals = answers.attractionPoints.map(k => attractionKeyToDom(k)).filter(Boolean);
				attrCheckboxes.forEach(cb => { cb.checked = domVals.includes(cb.value); });
			}
			if (elAttrOtherText && answers.otherAttractionsText) elAttrOtherText.value = answers.otherAttractionsText;
			attrCheckboxes.forEach(cb => {
				cb.addEventListener('change', () => {
					answers.attractionPoints = getSelectedAttractionKeys();
					saveAnswers(answers);
				});
			});
		}
		if (elAttrOtherText) {
			elAttrOtherText.addEventListener('input', () => {
				answers.otherAttractionsText = normalizeString(elAttrOtherText.value);
				saveAnswers(answers);
			});
		}

		const elRequiredArea = document.getElementById('required-area');
		if (elRequiredArea) {
			if (answers.requiredArea !== undefined && answers.requiredArea !== '') elRequiredArea.value = answers.requiredArea;
			elRequiredArea.addEventListener('input', () => {
				const v = parseNumberOrEmpty(elRequiredArea.value);
				answers.requiredArea = v;
				saveAnswers(answers);
			});
		}

		const propertyRadios = document.querySelectorAll('input[name="property"]');
		if (propertyRadios && propertyRadios.length) {
			const saved = answers.ownershipType; // "Rented" | "Owned"
			if (saved) {
				const map = { 'Rented': 'rented', 'Owned': 'owned' };
				const v = map[saved];
				propertyRadios.forEach(r => { r.checked = r.value === v; });
			}
			propertyRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'rented': 'Rented', 'owned': 'Owned' };
					answers.ownershipType = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}

		const elPropertyCost = document.getElementById('property-cost');
		if (elPropertyCost) {
			if (answers.propertyPrice !== undefined && answers.propertyPrice !== '') elPropertyCost.value = answers.propertyPrice;
			elPropertyCost.addEventListener('input', () => {
				const v = parseNumberOrEmpty(elPropertyCost.value);
				answers.propertyPrice = v;
				saveAnswers(answers);
			});
		}

		const equipmentContainer = document.getElementById('equipment-list');
		function serializeEquipmentListToString() {
			const names = equipmentContainer ? equipmentContainer.querySelectorAll('.equipment-name') : [];
			const values = equipmentContainer ? equipmentContainer.querySelectorAll('.equipment-value') : [];
			const parts = [];
			for (let i = 0; i < names.length; i++) {
				const n = normalizeString(names[i].value);
				const v = normalizeString(values[i] ? values[i].value : '');
				if (n) parts.push(v ? `${n}: ${v}` : n);
			}
			return parts.join('; ');
		}
		if (equipmentContainer) {
			// save on any change within the container
			equipmentContainer.addEventListener('input', () => {
				answers.equipmentList = serializeEquipmentListToString();
				saveAnswers(answers);
			});
		}

		// Legal Data wiring
		const legalRadios = document.querySelectorAll('input[name="legal"]');
		if (legalRadios && legalRadios.length) {
			const saved = answers.projectLegality; // "Yes" | "No" | "Not sure"
			if (saved) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Not sure': 'unsure' };
				const v = map[saved];
				legalRadios.forEach(r => { r.checked = r.value === v; });
			}
			legalRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'yes': 'Yes', 'no': 'No', 'unsure': 'Not sure' };
					answers.projectLegality = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}

		const licensesListContainer = document.getElementById('licenses-list');
		function collectLicensesTable() {
			const items = [];
			if (!licensesListContainer) return items;
			const rows = licensesListContainer.querySelectorAll('.dynamic-field');
			rows.forEach(row => {
				const typeEl = row.querySelector('.license-type');
				const costEl = row.querySelector('.license-value');
				const type = normalizeString(typeEl ? typeEl.value : '');
				const costRaw = normalizeString(costEl ? costEl.value : '');
				if (!type && !costRaw) return; // empty row
				const costNum = parseFloat(costRaw);
				if (!type) return; // require type
				if (!Number.isFinite(costNum)) return; // numeric validation
				items.push({ type, cost: costNum });
			});
			return items;
		}

		function computeLicensesTotal(licensesData) {
			let total = 0;
			if (Array.isArray(licensesData)) {
				licensesData.forEach(item => {
					const c = parseFloat(item && item.cost);
					if (Number.isFinite(c)) total += c;
				});
			}
			return total;
		}

		function updateLicensesFromDOM() {
			const data = collectLicensesTable();
			answers.licensesTable = data;
			answers.licensesTotal = computeLicensesTotal(data);
			saveAnswers(answers);
		}

		if (licensesListContainer) {
			// Initialize from saved answers
			if (Array.isArray(answers.licensesTable) && answers.licensesTable.length) {
				licensesListContainer.innerHTML = '';
				answers.licensesTable.forEach(({ type, cost }) => {
					const row = document.createElement('div');
					row.className = 'dynamic-field';
                    try {
                        const idx = (licensesListContainer.querySelectorAll('.dynamic-field').length || 0) + 1;
                        row.innerHTML = (
                          '<label class="sr-only" for="license-type-' + idx + '">License type</label>' +
                          '<input type="text" id="license-type-' + idx + '" name="license-type-' + idx + '" placeholder="License type (e.g., Commercial license)" class="license-type">' +
                          '<label class="sr-only" for="license-value-' + idx + '">License value</label>' +
                          '<input type="number" id="license-value-' + idx + '" name="license-value-' + idx + '" placeholder="Value" class="license-value">' +
                          '<button class="remove-btn" onclick="removeField(this)">?</button>'
                        );
                    } catch (_) {
                        row.innerHTML = '<input type="text" placeholder="License type (e.g., Commercial license)" class="license-type">\n\t\t\t\t\t\t<input type="number" placeholder="Value" class="license-value">\n\t\t\t\t\t\t<button class="remove-btn" onclick="removeField(this)">?</button>';
                    }
					const t = row.querySelector('.license-type');
					const c = row.querySelector('.license-value');
					if (t) t.value = type;
					if (c) c.value = cost;
					licensesListContainer.appendChild(row);
				});
			}
			licensesListContainer.addEventListener('input', updateLicensesFromDOM);
			licensesListContainer.addEventListener('click', (e) => {
				const target = e.target;
				if (target && target.classList && target.classList.contains('remove-btn')) {
					setTimeout(updateLicensesFromDOM, 0);
				}
			});
			// Initial compute
			updateLicensesFromDOM();
		}

		// Legal risks
		const risksRadios = document.querySelectorAll('input[name="risks"]');
		const risksExplanationContainer = document.getElementById('risks-explanation-container');
		const risksExplanation = document.getElementById('risks-explanation');
		function setRisksVisibility(val) {
			if (!risksExplanationContainer) return;
			const show = val === 'yes';
			risksExplanationContainer.style.display = show ? 'block' : 'none';
			if (!show && risksExplanation) {
				risksExplanation.value = '';
				answers.risksExplanation = '';
			}
		}
		if (risksRadios && risksRadios.length) {
			const saved = answers.legalRisks; // "Yes" | "No"
			if (saved) {
				const map = { 'Yes': 'yes', 'No': 'no' };
				const v = map[saved];
				risksRadios.forEach(r => { r.checked = r.value === v; });
				setRisksVisibility(v);
			}
			risksRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const v = radio.value;
					const mapBack = { 'yes': 'Yes', 'no': 'No' };
					answers.legalRisks = mapBack[v] || '';
					setRisksVisibility(v);
					saveAnswers(answers);
				});
			});
		}
		if (risksExplanation) {
			if (answers.risksExplanation) risksExplanation.value = answers.risksExplanation;
			risksExplanation.addEventListener('input', () => {
				answers.risksExplanation = normalizeString(risksExplanation.value);
				saveAnswers(answers);
			});
		}

		// Legal obstacles and notes
		const obstaclesRadios = document.querySelectorAll('input[name="obstacles"]');
		const obstaclesNotes = document.getElementById('obstacles-notes');
		if (obstaclesRadios && obstaclesRadios.length) {
			const saved = answers.legalObstacles; // mapped label
			if (saved) {
				const map = { 'No obstacles': 'none', 'Obstacles can be overcome': 'overcome', 'Major obstacles': 'major' };
				const v = map[saved];
				obstaclesRadios.forEach(r => { r.checked = r.value === v; });
			}
			obstaclesRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'none': 'No obstacles', 'overcome': 'Obstacles can be overcome', 'major': 'Major obstacles' };
					answers.legalObstacles = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}
		if (obstaclesNotes) {
			if (answers.legalNotes) obstaclesNotes.value = answers.legalNotes;
			obstaclesNotes.addEventListener('input', () => {
				answers.legalNotes = normalizeString(obstaclesNotes.value);
				saveAnswers(answers);
			});
		}

		const elInventory = document.getElementById('initial-inventory');
		if (elInventory) {
			if (answers.inventoryValue !== undefined && answers.inventoryValue !== '') elInventory.value = answers.inventoryValue;
			elInventory.addEventListener('input', () => {
				const v = parseNumberOrEmpty(elInventory.value);
				answers.inventoryValue = v;
				saveAnswers(answers);
			});
		}

		const elGoodsTypes = document.getElementById('main-products');
		if (elGoodsTypes) {
			if (answers.goodsTypes) elGoodsTypes.value = answers.goodsTypes;
			elGoodsTypes.addEventListener('input', () => {
				answers.goodsTypes = normalizeString(elGoodsTypes.value);
				saveAnswers(answers);
			});
		}

		const techFeasibilityRadios = document.querySelectorAll('input[name="tech-feasibility"]');
		if (techFeasibilityRadios && techFeasibilityRadios.length) {
			const saved = answers.technicalFeasibility; // mapped label
			if (saved) {
				const map = { 'Yes, possible': 'yes', 'Technical challenges': 'challenges', 'Unclear': 'unclear' };
				const v = map[saved];
				techFeasibilityRadios.forEach(r => { r.checked = r.value === v; });
			}
			techFeasibilityRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { 'yes': 'Yes, possible', 'challenges': 'Technical challenges', 'unclear': 'Unclear' };
					answers.technicalFeasibility = mapBack[r.value] || '';
					saveAnswers(answers);
				});
			});
		}

		const elTechNotes = document.getElementById('tech-notes');
		if (elTechNotes) {
			if (answers.technicalNotes) elTechNotes.value = answers.technicalNotes;
			elTechNotes.addEventListener('input', () => {
				answers.technicalNotes = normalizeString(elTechNotes.value);
				saveAnswers(answers);
			});
		}

		// Operational Data wiring (elements exist in the same page)
		const employeesListContainer = document.getElementById('employees-list');
		const elDailyOperations = document.getElementById('daily-operations');
		const operationsRadios = document.querySelectorAll('input[name="operations"]');
		const elOperationsNotes = document.getElementById('operations-notes');

		function collectStaffTable() {
			const items = [];
			if (!employeesListContainer) return items;
			const rows = employeesListContainer.querySelectorAll('.dynamic-field');
			rows.forEach(row => {
				const titleEl = row.querySelector('.employee-title');
				const countEl = row.querySelector('.employee-count');
				const salaryEl = row.querySelector('.employee-salary');
				const jobTitle = normalizeString(titleEl ? titleEl.value : '');
				const countRaw = normalizeString(countEl ? countEl.value : '');
				const salaryRaw = normalizeString(salaryEl ? salaryEl.value : '');
				if (!jobTitle && !countRaw && !salaryRaw) return; // empty row
				const employeeCount = parseFloat(countRaw);
				const monthlySalary = parseFloat(salaryRaw);
				if (!jobTitle) return; // require title
				if (!Number.isFinite(employeeCount)) return; // numeric validation
				if (!Number.isFinite(monthlySalary)) return; // numeric validation
				items.push({ jobTitle, employeeCount, monthlySalary });
			});
			return items;
		}

		function computeStaffTotals(staffData) {
			let totalMonthly = 0;
			let totalAnnual = 0;
			if (Array.isArray(staffData)) {
				staffData.forEach(s => {
					const c = parseFloat(s && s.employeeCount);
					const m = parseFloat(s && s.monthlySalary);
					if (Number.isFinite(c) && Number.isFinite(m)) {
						totalMonthly += c * m;
					}
				});
			}
			totalAnnual = totalMonthly * 12;
			return { totalMonthly, totalAnnual };
		}

		function updateStaffAnswersFromDOM() {
			const data = collectStaffTable();
			answers.staffTable = data;
			// totalEmployees: use explicit saved if exists, else derive
			const derived = calculateTotalEmployees(data);
			if (!answers.totalEmployees && derived) {
				answers.totalEmployees = derived;
			}
			const totals = computeStaffTotals(data);
			answers.staffMonthlyTotal = totals.totalMonthly;
			answers.staffAnnualTotal = totals.totalAnnual;
			saveAnswers(answers);
		}

		if (employeesListContainer) {
			// Initialize from saved answers by rebuilding rows if saved data exists
			if (Array.isArray(answers.staffTable) && answers.staffTable.length) {
				employeesListContainer.innerHTML = '';
				answers.staffTable.forEach(({ jobTitle, employeeCount, monthlySalary }) => {
					const row = document.createElement('div');
					row.className = 'dynamic-field';
					row.innerHTML = '<input type="text" placeholder="Job title (e.g., Store manager)" class="employee-title">\n\t\t\t\t\t<input type="number" placeholder="Number" class="employee-count">\n\t\t\t\t\t<input type="number" placeholder="Salary" class="employee-salary">\n\t\t\t\t\t<button class="remove-btn" onclick="removeField(this)">?</button>';
					const t = row.querySelector('.employee-title');
					const c = row.querySelector('.employee-count');
					const s = row.querySelector('.employee-salary');
					if (t) t.value = jobTitle;
					if (c) c.value = employeeCount;
					if (s) s.value = monthlySalary;
					employeesListContainer.appendChild(row);
				});
			}
			// Save on any change within the container
			employeesListContainer.addEventListener('input', updateStaffAnswersFromDOM);
			// Also observe clicks (for remove buttons)
			employeesListContainer.addEventListener('click', (e) => {
				const target = e.target;
				if (target && target.classList && target.classList.contains('remove-btn')) {
					setTimeout(updateStaffAnswersFromDOM, 0);
				}
			});
			// Initial compute
			updateStaffAnswersFromDOM();
		}

		if (elDailyOperations) {
			if (answers.dailyOperations) elDailyOperations.value = answers.dailyOperations;
			elDailyOperations.addEventListener('input', () => {
				answers.dailyOperations = normalizeString(elDailyOperations.value);
				saveAnswers(answers);
			});
		}

		if (operationsRadios && operationsRadios.length) {
			const saved = answers.operationalEfficiency; // mapped label
			if (saved) {
				const map = { 'Yes, possible': 'yes', 'Potential challenges': 'challenges', 'Unclear': 'unclear' };
				const v = map[saved];
				operationsRadios.forEach(r => { r.checked = r.value === v; });
			}
			operationsRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'yes': 'Yes, possible', 'challenges': 'Potential challenges', 'unclear': 'Unclear' };
					answers.operationalEfficiency = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}

		if (elOperationsNotes) {
			if (answers.operationalNotes) elOperationsNotes.value = answers.operationalNotes;
			elOperationsNotes.addEventListener('input', () => {
				answers.operationalNotes = normalizeString(elOperationsNotes.value);
				saveAnswers(answers);
			});
		}

		// Technological Data wiring
		const technologyListContainer = document.getElementById('technology-list');
		function collectTechnologyTable() {
			const items = [];
			if (!technologyListContainer) return items;
			const rows = technologyListContainer.querySelectorAll('.dynamic-field');
			rows.forEach(row => {
				const typeEl = row.querySelector('.technology-type');
				const costEl = row.querySelector('.technology-value');
				const type = normalizeString(typeEl ? typeEl.value : '');
				const costRaw = normalizeString(costEl ? costEl.value : '');
				if (!type && !costRaw) return; // skip empty row
				const costNum = parseFloat(costRaw);
				if (!type) return; // require both
				if (!Number.isFinite(costNum)) return; // numeric validation
				items.push({ type, cost: costNum });
			});
			return items;
		}

		if (technologyListContainer) {
			// Initialize from saved answers
			if (Array.isArray(answers.technologyTable) && answers.technologyTable.length) {
				// Clear to one template row then rebuild
				technologyListContainer.innerHTML = '';
				answers.technologyTable.forEach(({ type, cost }) => {
					const row = document.createElement('div');
					row.className = 'dynamic-field';
					row.innerHTML = '<input type="text" placeholder="Technology type (e.g., POS system)" class="technology-type">\n\t\t\t\t\t\t<input type="number" placeholder="Value" class="technology-value">\n\t\t\t\t\t\t<button class="remove-btn" onclick="removeField(this)">?</button>';
					const t = row.querySelector('.technology-type');
					const c = row.querySelector('.technology-value');
					if (t) t.value = type;
					if (c) c.value = cost;
					technologyListContainer.appendChild(row);
				});
			}
			// Save on any input within container
			technologyListContainer.addEventListener('input', () => {
				answers.technologyTable = collectTechnologyTable();
				saveAnswers(answers);
			});
			// Also observe clicks (for remove buttons)
			technologyListContainer.addEventListener('click', (e) => {
				const target = e.target;
				if (target && target.classList && target.classList.contains('remove-btn')) {
					setTimeout(() => { // after DOM removal
						answers.technologyTable = collectTechnologyTable();
						saveAnswers(answers);
					}, 0);
				}
			});
		}

		// Technology modernity
		const techModernRadios = document.querySelectorAll('input[name="tech-modern"]');
		if (techModernRadios && techModernRadios.length) {
			const saved = answers.technologyModernity; // "Yes" | "No" | "Partially"
			if (saved) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Partially': 'partial' };
				const v = map[saved];
				techModernRadios.forEach(r => { r.checked = r.value === v; });
			}
			techModernRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { 'yes': 'Yes', 'no': 'No', 'partial': 'Partially' };
					answers.technologyModernity = mapBack[r.value] || '';
					saveAnswers(answers);
				});
			});
		}

		// Maintenance difficulties
		const maintenanceRadios = document.querySelectorAll('input[name="maintenance"]');
		const maintenanceExplanation = document.getElementById('maintenance-explanation');
		const maintenanceExplanationContainer = document.getElementById('maintenance-explanation-container');
		function setMaintenanceVisibility(val) {
			if (!maintenanceExplanationContainer) return;
			const show = val === 'yes';
			maintenanceExplanationContainer.style.display = show ? 'block' : 'none';
		}
		if (maintenanceRadios && maintenanceRadios.length) {
			const saved = answers.maintenanceDifficulties; // "Yes" | "No" | "Not sure"
			if (saved) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Not sure': 'unsure' };
				const v = map[saved];
				maintenanceRadios.forEach(r => { r.checked = r.value === v; });
				setMaintenanceVisibility(v);
			}
			maintenanceRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { 'yes': 'Yes', 'no': 'No', 'unsure': 'Not sure' };
					const v = r.value;
					answers.maintenanceDifficulties = mapBack[v] || '';
					if (v !== 'yes' && maintenanceExplanation) {
						maintenanceExplanation.value = '';
						answers.maintenanceExplanation = '';
					}
					setMaintenanceVisibility(v);
					saveAnswers(answers);
				});
			});
		}
		if (maintenanceExplanation) {
			if (answers.maintenanceExplanation) maintenanceExplanation.value = answers.maintenanceExplanation;
			maintenanceExplanation.addEventListener('input', () => {
				answers.maintenanceExplanation = normalizeString(maintenanceExplanation.value);
				saveAnswers(answers);
			});
		}

		// Supplier dependence
		const dependencyRadios = document.querySelectorAll('input[name="dependency"]');
		if (dependencyRadios && dependencyRadios.length) {
			const saved = answers.supplierDependence; // mapped label
			if (saved) {
				const map = { 'Full dependence': 'full', 'Partial dependence': 'partial', 'No dependence': 'none' };
				const v = map[saved];
				dependencyRadios.forEach(r => { r.checked = r.value === v; });
			}
			dependencyRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { 'full': 'Full dependence', 'partial': 'Partial dependence', 'none': 'No dependence' };
					answers.supplierDependence = mapBack[r.value] || '';
					saveAnswers(answers);
				});
			});
		}

		// Technology safety and notes
		const techSafetyRadios = document.querySelectorAll('input[name="tech-safety"]');
		const techSafeNotes = document.getElementById('tech-safe-notes');
		if (techSafetyRadios && techSafetyRadios.length) {
			const saved = answers.technologySafety; // mapped label
			if (saved) {
				const map = { 'Yes, sustainable': 'yes', 'Technical risks': 'risk', 'Needs evaluation': 'need' };
				const v = map[saved];
				techSafetyRadios.forEach(r => { r.checked = r.value === v; });
			}
			techSafetyRadios.forEach(r => {
				r.addEventListener('change', () => {
					const mapBack = { 'yes': 'Yes, sustainable', 'risk': 'Technical risks', 'need': 'Needs evaluation' };
					answers.technologySafety = mapBack[r.value] || '';
					saveAnswers(answers);
				});
			});
		}
		if (techSafeNotes) {
			if (answers.technologyNotes) techSafeNotes.value = answers.technologyNotes;
			techSafeNotes.addEventListener('input', () => {
				answers.technologyNotes = normalizeString(techSafeNotes.value);
				saveAnswers(answers);
			});
		}

		// Organizational Data wiring
		const adminStructureCheckboxes = document.querySelectorAll('input[name="structure"]');
		const elOtherStructureText = document.getElementById('otherStructureText'); // optional, may not exist

		function adminDomToKey(val) {
			const map = {
				'owner-manager': 'ownerManager',
				'sales-staff': 'salesStaff',
				'customer-service': 'customerService',
				'accounting': 'adminStaff',
				'other': 'otherStructure'
			};
			return map[val] || '';
		}
		function adminKeyToDom(key) {
			const map = {
				'ownerManager': 'owner-manager',
				'salesStaff': 'sales-staff',
				'customerService': 'customer-service',
				'adminStaff': 'accounting',
				'otherStructure': 'other'
			};
			return map[key] || '';
		}
		function getSelectedAdminStructureKeys() {
			const keys = [];
			adminStructureCheckboxes.forEach(cb => { if (cb && cb.checked) { const k = adminDomToKey(cb.value); if (k) keys.push(k); } });
			return keys;
		}
		function updateOtherStructureVisibility() {
			if (!elOtherStructureText) return;
			// show when there is a checkbox with value 'other' and it is checked
			let anyOtherChecked = false;
			adminStructureCheckboxes.forEach(cb => { if (cb && cb.value === 'other' && cb.checked) anyOtherChecked = true; });
			elOtherStructureText.style.display = anyOtherChecked ? 'block' : 'none';
			if (!anyOtherChecked) {
				elOtherStructureText.value = '';
				answers.otherStructureText = '';
			}
		}
		if (adminStructureCheckboxes && adminStructureCheckboxes.length) {
			// initialize from saved answers
			if (Array.isArray(answers.adminStructure) && answers.adminStructure.length) {
				const domVals = answers.adminStructure.map(k => adminKeyToDom(k)).filter(Boolean);
				adminStructureCheckboxes.forEach(cb => { cb.checked = domVals.includes(cb.value); });
			}
			updateOtherStructureVisibility();
			adminStructureCheckboxes.forEach(cb => {
				cb.addEventListener('change', () => {
					answers.adminStructure = getSelectedAdminStructureKeys();
					updateOtherStructureVisibility();
					saveAnswers(answers);
				});
			});
		}
		if (elOtherStructureText) {
			if (answers.otherStructureText) elOtherStructureText.value = answers.otherStructureText;
			elOtherStructureText.addEventListener('input', () => {
				answers.otherStructureText = normalizeString(elOtherStructureText.value);
				saveAnswers(answers);
			});
		}

		// Decision making (radio group)
		const decisionRadios = document.querySelectorAll('input[name="decision"]');
		if (decisionRadios && decisionRadios.length) {
			const saved = answers.decisionMaking;
			if (saved) {
				const map = {
					"Central decisions from owner": 'central',
					"Delegated to store manager": 'delegated',
					"Team-based decisions": 'team'
				};
				const v = map[saved];
				decisionRadios.forEach(r => { r.checked = r.value === v; });
			}
			decisionRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'central': "Central decisions from owner", 'delegated': "Delegated to store manager", 'team': "Team-based decisions" };
					answers.decisionMaking = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}

		// Governance requirements (radio group + conditional explanation)
		const governanceRadios = document.querySelectorAll('input[name="governance"]');
		const governanceExplanationContainer = document.getElementById('governance-explanation-container');
		const governanceExplanation = document.getElementById('governance-explanation');
		function setGovernanceVisibility(val) {
			if (!governanceExplanationContainer) return;
			const show = val === 'yes';
			governanceExplanationContainer.style.display = show ? 'block' : 'none';
			if (!show && governanceExplanation) {
				governanceExplanation.value = '';
				answers.governanceExplanation = '';
			}
		}
		if (governanceRadios && governanceRadios.length) {
			const saved = answers.governanceRequirements; // "Yes" | "No" | "Not sure"
			if (saved) {
				const map = { 'Yes': 'yes', 'No': 'no', 'Not sure': 'unsure' };
				const v = map[saved];
				governanceRadios.forEach(r => { r.checked = r.value === v; });
				setGovernanceVisibility(v);
			}
			governanceRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const v = radio.value;
					const mapBack = { 'yes': 'Yes', 'no': 'No', 'unsure': 'Not sure' };
					answers.governanceRequirements = mapBack[v] || '';
					setGovernanceVisibility(v);
					saveAnswers(answers);
				});
			});
		}
		if (governanceExplanation) {
			if (answers.governanceExplanation) governanceExplanation.value = answers.governanceExplanation;
			governanceExplanation.addEventListener('input', () => {
				answers.governanceExplanation = normalizeString(governanceExplanation.value);
				saveAnswers(answers);
			});
		}

		// Organizational effectiveness (radio group) + notes
		const organizedRadios = document.querySelectorAll('input[name="organized"]');
		const organizedNotes = document.getElementById('organized-notes');
		if (organizedRadios && organizedRadios.length) {
			const saved = answers.organizationalEffectiveness; // "Yes, effective" | "Needs improvement" | "Unclear"
			if (saved) {
				const map = { 'Yes, effective': 'yes', 'Needs improvement': 'improve', 'Unclear': 'unclear' };
				const v = map[saved];
				organizedRadios.forEach(r => { r.checked = r.value === v; });
			}
			organizedRadios.forEach(radio => {
				radio.addEventListener('change', () => {
					const mapBack = { 'yes': 'Yes, effective', 'improve': 'Needs improvement', 'unclear': 'Unclear' };
					answers.organizationalEffectiveness = mapBack[radio.value] || '';
					saveAnswers(answers);
				});
			});
		}
		if (organizedNotes) {
			if (answers.organizationalNotes) organizedNotes.value = answers.organizationalNotes;
			organizedNotes.addEventListener('input', () => {
				answers.organizationalNotes = normalizeString(organizedNotes.value);
				saveAnswers(answers);
			});
		}

			// Market Data wiring
			if (elMarketSize) {
				if (answers.marketSize !== undefined && answers.marketSize !== '') elMarketSize.value = answers.marketSize;
				elMarketSize.addEventListener('input', () => {
					const v = parseNumberOrEmpty(elMarketSize.value);
					answers.marketSize = v;
					saveAnswers(answers);
				});
			}

			if (elPotentialCustomers) {
				if (answers.potentialCustomers !== undefined && answers.potentialCustomers !== '') elPotentialCustomers.value = answers.potentialCustomers;
				elPotentialCustomers.addEventListener('input', () => {
					const v = parseNumberOrEmpty(elPotentialCustomers.value);
					answers.potentialCustomers = v;
					saveAnswers(answers);
				});
			}

			if (elGrowthRate) {
				if (answers.growthRate !== undefined && answers.growthRate !== '') elGrowthRate.value = answers.growthRate;
				elGrowthRate.addEventListener('input', () => {
					const v = parseNumberOrEmpty(elGrowthRate.value);
					answers.growthRate = v;
					saveAnswers(answers);
				});
			}

			if (elGrowthFactors) {
				if (answers.growthFactors) elGrowthFactors.value = answers.growthFactors;
				elGrowthFactors.addEventListener('input', () => {
					answers.growthFactors = normalizeString(elGrowthFactors.value);
					saveAnswers(answers);
				});
			}

			if (elCompetitors) {
			if (answers.competitorsCount !== undefined && answers.competitorsCount !== '') elCompetitors.value = answers.competitorsCount;
				elCompetitors.addEventListener('input', () => {
					const v = parseNumberOrEmpty(elCompetitors.value);
					answers.competitorsCount = v;
					saveAnswers(answers);
				});
			}

			function setGapExplanationVisibility(choiceValue) {
				if (!elGapExplanationContainer) return;
				const show = choiceValue === 'yes';
				elGapExplanationContainer.style.display = show ? 'block' : 'none';
			}

			if (marketGapRadios && marketGapRadios.length) {
				// Initialize from saved
				const savedGap = answers.marketGap; // expected "Yes" | "No" | "Not sure"
				if (savedGap) {
					const map = { 'Yes': 'yes', 'No': 'no', 'Not sure': 'unsure' };
					const v = map[savedGap];
					marketGapRadios.forEach(r => { r.checked = r.value === v; });
					setGapExplanationVisibility(v);
				}
				marketGapRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const v = radio.value; // 'yes' | 'no' | 'unsure'
						const mapBack = { 'yes': 'Yes', 'no': 'No', 'unsure': 'Not sure' };
						answers.marketGap = mapBack[v] || '';
						setGapExplanationVisibility(v);
						saveAnswers(answers);
					});
				});
			}

			if (elGapExplanation) {
				if (answers.gapExplanation) elGapExplanation.value = answers.gapExplanation;
				elGapExplanation.addEventListener('input', () => {
					answers.gapExplanation = normalizeString(elGapExplanation.value);
					saveAnswers(answers);
				});
			}

			if (marketDemandRadios && marketDemandRadios.length) {
				// Initialize from saved
				const savedFeas = answers.marketFeasibility; // mapped label string
				if (savedFeas) {
					const map = {
						"Yes, sufficient demand": 'yes',
						"No, market is saturated": 'no',
						"Needs deeper study": 'need'
					};
					const v = map[savedFeas];
					marketDemandRadios.forEach(r => { r.checked = r.value === v; });
				}
				marketDemandRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const v = radio.value; // 'yes' | 'no' | 'need'
						const mapBack = {
							'yes': "Yes, sufficient demand",
							'no': "No, market is saturated",
							'need': "Needs deeper study"
						};
						answers.marketFeasibility = mapBack[v] || '';
						saveAnswers(answers);
					});
				});
			}

			if (elDemandNotes) {
				if (answers.marketNotes) elDemandNotes.value = answers.marketNotes;
				elDemandNotes.addEventListener('input', () => {
					answers.marketNotes = normalizeString(elDemandNotes.value);
					saveAnswers(answers);
				});
			}

			// Risk Data wiring
			function collectRisksTable() {
				const rows = risksListContainer ? risksListContainer.querySelectorAll('.dynamic-field') : [];
				const items = [];
				rows.forEach(row => {
					const nameEl = row.querySelector('.risk-name');
					const probEl = row.querySelector('.risk-probability');
					const impactEl = row.querySelector('.risk-impact');
					const type = normalizeString(nameEl ? nameEl.value : '');
					const probabilityRaw = normalizeString(probEl ? probEl.value : '');
					const impactRaw = normalizeString(impactEl ? impactEl.value : '');
					if (!type && !probabilityRaw && !impactRaw) return; // empty row

					const probabilityNum = clampToScale(probabilityRaw);
					const impactNum = clampToScale(impactRaw);
					// Require type; probability and impact must be within 1-5 if provided
					if (!type) return;
					if (probabilityRaw !== '' && probabilityNum === '') return;
					if (impactRaw !== '' && impactNum === '') return;
					items.push({ type, probability: probabilityRaw === '' ? '' : probabilityNum, impact: impactRaw === '' ? '' : impactNum });
				});
				return items;
			}

			function computeRiskAverages(risks) {
				let probSum = 0; let probCount = 0;
				let impactSum = 0; let impactCount = 0;
				(risks || []).forEach(r => {
					const p = parseFloat(r && r.probability);
					const i = parseFloat(r && r.impact);
					if (Number.isFinite(p)) { probSum += p; probCount++; }
					if (Number.isFinite(i)) { impactSum += i; impactCount++; }
				});
				return {
					avgProbability: probCount ? (probSum / probCount) : '',
					avgImpact: impactCount ? (impactSum / impactCount) : ''
				};
			}

			function updateRisksFromDOM() {
				const data = collectRisksTable();
				answers.risksTable = data;
				const avgs = computeRiskAverages(data);
				answers.riskAvgProbability = avgs.avgProbability === '' ? '' : parseFloat(avgs.avgProbability.toFixed(2));
				answers.riskAvgImpact = avgs.avgImpact === '' ? '' : parseFloat(avgs.avgImpact.toFixed(2));
				saveAnswers(answers);
			}

			function setContingencyVisibility(v) {
				if (!contingencyExplanationContainer) return;
				const show = v === 'yes';
				contingencyExplanationContainer.style.display = show ? 'block' : 'none';
				if (!show && elContingencyExplanation) {
					elContingencyExplanation.value = '';
					answers.planExplanation = '';
				}
				if (elContingencyExplanation && typeof elContingencyExplanation.required !== 'undefined') {
					elContingencyExplanation.required = show;
				}
				if (!show && elContingencyExplanation && elContingencyExplanation.setCustomValidity) {
					elContingencyExplanation.setCustomValidity('');
				}
			}

			// Initialize from saved answers for Risk Data
			if (risksListContainer && Array.isArray(answers.risksTable) && answers.risksTable.length) {
				// rebuild rows from saved
				risksListContainer.innerHTML = '';
				answers.risksTable.forEach(({ type, probability, impact }) => {
					const row = document.createElement('div');
					row.className = 'dynamic-field';
					row.innerHTML = '<input type="text" placeholder="Risk (e.g., Rising material prices)" class="risk-name">\n\t\t\t\t\t<input type="number" placeholder="Probability (1-5)" min="1" max="5" class="risk-probability">\n\t\t\t\t\t<input type="number" placeholder="Impact (1-5)" min="1" max="5" class="risk-impact">\n\t\t\t\t\t<button class="remove-btn" onclick="removeField(this)">?</button>';
					const n = row.querySelector('.risk-name');
					const p = row.querySelector('.risk-probability');
					const i = row.querySelector('.risk-impact');
					if (n) n.value = type || '';
					if (p && (probability || probability === 0)) p.value = probability;
					if (i && (impact || impact === 0)) i.value = impact;
					risksListContainer.appendChild(row);
				});
			}
			if (risksListContainer) {
				// Listen for input and clicks for dynamic rows
				risksListContainer.addEventListener('input', updateRisksFromDOM);
				risksListContainer.addEventListener('click', (e) => {
					const target = e.target;
					if (target && target.classList && target.classList.contains('remove-btn')) {
						setTimeout(updateRisksFromDOM, 0);
					}
				});
				// initial compute
				updateRisksFromDOM();
			}

			// Contingency plan radios
			if (contingencyRadios && contingencyRadios.length) {
				if (answers.contingencyPlan) {
					const map = { 'Yes': 'yes', 'No': 'no', 'Partially': 'partial' };
					const v = map[answers.contingencyPlan];
					contingencyRadios.forEach(r => { r.checked = r.value === v; });
					setContingencyVisibility(v);
				}
				contingencyRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const v = radio.value; // 'yes' | 'no' | 'partial'
						const mapBack = { 'yes': 'Yes', 'no': 'No', 'partial': 'Partially' };
						answers.contingencyPlan = mapBack[v] || '';
						setContingencyVisibility(v);
						saveAnswers(answers);
					});
				});
			}
			if (elContingencyExplanation) {
				if (answers.planExplanation) elContingencyExplanation.value = answers.planExplanation;
				elContingencyExplanation.addEventListener('input', () => {
					answers.planExplanation = normalizeString(elContingencyExplanation.value);
					// live validation if Yes selected
					if (contingencyRadios && [...contingencyRadios].some(r => r.checked && r.value === 'yes')) {
						if (elContingencyExplanation.setCustomValidity) {
							elContingencyExplanation.setCustomValidity(answers.planExplanation ? '' : 'Please provide an explanation.');
						}
					}
					saveAnswers(answers);
				});
			}

			// Risk control radios + notes
			if (riskControlRadios && riskControlRadios.length) {
				if (answers.riskControl) {
					const map = { 'Yes, can be controlled': 'yes', 'Major challenges': 'challenges', 'Very high risk': 'high' };
					const v = map[answers.riskControl];
					riskControlRadios.forEach(r => { r.checked = r.value === v; });
				}
				riskControlRadios.forEach(radio => {
					radio.addEventListener('change', () => {
						const mapBack = { 'yes': 'Yes, can be controlled', 'challenges': 'Major challenges', 'high': 'Very high risk' };
						answers.riskControl = mapBack[radio.value] || '';
						saveAnswers(answers);
					});
				});
			}
			if (elRiskNotes) {
				if (answers.riskNotes || answers.riskNotes === '') elRiskNotes.value = answers.riskNotes;
				elRiskNotes.addEventListener('input', () => {
					answers.riskNotes = normalizeString(elRiskNotes.value);
					saveAnswers(answers);
				});
			}

        function updateBMFromDOM() {
            const selected = [];
            bmInputs.forEach((el) => {
                if (el.checked) selected.push(el.value);
            });
            answers.businessModel = selected;
            saveAnswers(answers);
        }

        bmInputs.forEach((el) => {
            el.addEventListener('change', updateBMFromDOM);
        });

        function updateDistFromDOM() {
            const selected = [];
            distInputs.forEach((el) => {
                if (el.checked) selected.push(el.value);
            });
            answers.distributionChannels = selected;
            saveAnswers(answers);
        }

        distInputs.forEach((el) => {
            el.addEventListener('change', updateDistFromDOM);
        });

        // Initialize checkbox states from saved answers
        if (answers.businessModel && answers.businessModel.length) {
            bmInputs.forEach((el) => { el.checked = answers.businessModel.includes(el.value); });
        }
        if (answers.distributionChannels && answers.distributionChannels.length) {
            distInputs.forEach((el) => { el.checked = answers.distributionChannels.includes(el.value); });
        }

        if (reportBtn && reportOut) {
            reportBtn.addEventListener('click', async () => {
                const latest = await getInitialAnswers();
                const p1 = generateBusinessIdea(latest.projectIdea);
                const p2 = generateProblemSolution(latest.problemSolution);
                const p3 = generateBusinessModel(latest.businessModel);
                const p4 = generateDistributionChannels(latest.distributionChannels);
				const pAnnualCosts = generateAnnualOperationalCosts(latest.annualOperationalCosts);

				const pFinancial = generateFinancialAnalysis();
				const parts = [p1, p2, p3, p4, pAnnualCosts, pFinancial].filter(Boolean);
                const finalReport = parts.length ? parts.join('\n\n') : 'No answers provided yet.';
                reportOut.textContent = finalReport;
            });
        }
        }
    });
})();


// ===== VALIDATION AND MONITORING SYSTEM =====

function validateDataIntegration() {
    // Quiet by default; enable detailed logs only when explicitly toggled
    const __LOGS_ENABLED = !!(typeof window !== 'undefined' && window.__ENABLE_INTEGRATION_LOGS);
    if (__LOGS_ENABLED) console.log('=== Data Integration Validation ===');
    
    const tests = [
        {
            name: 'Field Mapping',
            test: () => {
                const testFields = [
                    { html: 'main-product', expected: 'projectIdea' },
                    { html: 'problem-solved', expected: 'problemSolution' },
                    { html: 'market-size', expected: 'marketSize' },
                    { html: 'employees-list', expected: 'staffTable' },
                    { html: 'technology-list', expected: 'technologyTable' },
                    { html: 'licenses-list', expected: 'licensesTable' },
                    { html: 'risks-list', expected: 'risksTable' },
                    { html: 'investments-list', expected: 'investmentsTable' }
                ];
                
                return testFields.every(test => {
                    const result = (typeof mapHtmlToJsField === 'function') ? mapHtmlToJsField(test.html) : test.html;
                    const passed = result === test.expected;
                    if (__LOGS_ENABLED) console.log(`Mapping: ${test.html} ? ${result} ${passed ? '?' : '?'}`);
                    return passed;
                });
            }
        },
        {
            name: 'Financial Statements',
            test: () => {
                const extractor = (typeof extractStructuredFinancialStatements === 'function') ? extractStructuredFinancialStatements : null;
                const statements = extractor ? extractor() : null;
                const hasStatements = statements !== null;
                const hasStructure = hasStatements && 
                    statements.incomeStatement && 
                    statements.balanceSheet && 
                    statements.cashFlow;
                
                if (__LOGS_ENABLED) console.log(`Financial Statements: ${hasStatements ? 'EXISTS' : 'MISSING'}`);
                if (__LOGS_ENABLED) console.log(`Complete Structure: ${hasStructure ? '?' : '?'}`);
                
                return hasStatements;
            }
        },
        {
            name: 'Data Storage',
            test: async () => {
                const surveyData = (typeof window !== 'undefined' && window.FeasibilityDB) ? (await window.FeasibilityDB.getJSON('feasibilityStudyAnswers', {})) : {};
                const simulatedData = (typeof window !== 'undefined' && window.FeasibilityDB) ? (await window.FeasibilityDB.getJSON('simulatedFeasibilityAnswers', {})) : {};
                
                const hasSurveyData = surveyData && Object.keys(surveyData).length > 0;
                const hasSimulatedData = simulatedData && Object.keys(simulatedData).length > 0;
                const hasFinancialData = simulatedData && simulatedData.financialStatements !== undefined;
                const hasDynamicTables = ['staffTable', 'technologyTable', 'licensesTable', 'risksTable', 'investmentsTable'].every(
                    table => simulatedData && simulatedData[table] !== undefined
                );
                
                if (__LOGS_ENABLED) console.log(`Survey Data: ${hasSurveyData ? 'EXISTS' : 'MISSING'}`);
                if (__LOGS_ENABLED) console.log(`Simulated Data: ${hasSimulatedData ? 'EXISTS' : 'MISSING'}`);
                if (__LOGS_ENABLED) console.log(`Financial Data: ${hasFinancialData ? 'EXISTS' : 'MISSING'}`);
                if (__LOGS_ENABLED) console.log(`Dynamic Tables: ${hasDynamicTables ? 'ALL EXIST' : 'SOME MISSING'}`);
                
                return hasSurveyData && hasSimulatedData && hasDynamicTables;
            }
        }
    ];
    
    let allPassed = true;
    
    tests.forEach(async (test) => {
        if (__LOGS_ENABLED) console.log(`\n--- ${test.name} ---`);
        const passed = await test.test();
        allPassed = allPassed && passed;
        if (__LOGS_ENABLED) console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    if (__LOGS_ENABLED) console.log(`\n=== Overall Integration: ${allPassed ? 'SUCCESS' : 'FAILED'} ===`);
    return allPassed;
}

// Initialize system
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        // Validation moved to major events to prevent repeated console logs
        // If needed, call validateDataIntegration() manually from the console.
    }, 2000);
});

// Storage monitoring disabled to avoid repeated validation logs due to frequent writes
// function setupDataMonitoring() {
//     window.addEventListener('storage', function(e) {
//         if (e.key === 'feasibilityStudyAnswers' || e.key === 'simulatedFeasibilityAnswers') {
//             console.log(`Data updated: ${e.key}`);
//             validateDataIntegration();
//         }
//     });
// }
// setupDataMonitoring();

