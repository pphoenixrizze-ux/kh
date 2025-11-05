/**
 * Structured section builder and completeness utilities shared between
 * pre-feasibility survey collection and report generation.
 *
 * The module exposes two functions:
 *   - buildStructuredSections(flatAnswers)
 *   - computeSectionCompleteness(structuredSections, rawAnswers?)
 */

(function (root, factory) {
	const mod = factory();
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = mod;
	}
	if (root && !root.StructuredSections) {
		root.StructuredSections = mod;
	}
	if (root && typeof root.__createStructuredSectionsModule !== 'function') {
		root.__createStructuredSectionsModule = factory;
	}
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
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
		const source = flat && typeof flat === 'object' ? flat : {};
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
});
