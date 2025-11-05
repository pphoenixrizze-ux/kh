# Feasibility Report Generation Schema and Mappings

This document describes the JSON output schema used by `ai-report.js`, the data mappings from user inputs, and the AI prompt requirements.

## Output JSON Schema

Top-level fields:
- `title`: string — Report title.
- `language`: string — Must match the user's selected language.
- `executiveSummary`: string — 500–700 words.
- `coverPage`: object — First-page content.
  - `studyType`: string
  - `projectName`: string
  - `projectDescription`: string
  - `visionMission`: string
  - `basicInfo`: object
    - `sector`, `projectType`, `specifiedProjectType`, `country`, `city`, `area`,
      `fundingMethod`, `personalContribution`, `loanAmount`, `interestValue`,
      `currency`, `totalCapital`, `loanMonths`, `targetAudience`, `projectStatus`,
      `duration`, `durationUnit`
  - `author`: { `fullName`, `email` }
  - `timestamp`: { `iso`, `date`, `time` }
  - `confidentiality`: string
- `sections`: array of 19 objects, each containing ALL of the following keys INSIDE the same section object (no parallel arrays, no top‑level `tables`):
  - `id`: string — e.g. "1-1", "1-2", ..., "1-19" (in order)
  - `title`: string — section title
  - `content`: string — 300–500+ words, justified when rendered
  - `tables`: array of tables, each as `{ title: string, headers: string[], rows: string[][] }`
  - `wordCount`: number — computed if omitted

Each element inside the `sections` array MUST be a single object that includes its own `content` and `tables`. Do NOT place `content` or `tables` in a separate structure.

Minimal valid example of two ordered sections:

```
{
  "sections": [
    {
      "id": "1-1",
      "title": "Introduction",
      "content": "... 300–500 words ...",
      "tables": [ { "title": "Key Metrics", "headers": ["Metric","Value"], "rows": [["Assumption","Estimate"]] } ],
      "wordCount": 420
    },
    {
      "id": "1-2",
      "title": "Project Concept Analysis",
      "content": "...",
      "tables": [],
      "wordCount": 350
    }
  ]
}
```
- `financial`: object|null — mirrored financial structures for downstream consumers. All financial analysis belongs in section `1-18`, with a subsection `1-18-1: Financial Projections and Statements`.
  - `assumptions`: string[]
  - `incomeStatement`/`balanceSheet`/`cashFlow`: { headers: string[], rows: string[][] }
  - `ratios`: array of { metric, value }
  - `roi`: { npv, irr, paybackPeriod }
- `comparison`: { enabled: boolean, table?: { headers, rows }, notes: string } | null
- `keywords`: string[] — rendered on the Executive Summary page (Page 2)
- `disclaimers`: string[]

Missing values must be replaced with localized "No data provided" text.

## Output JSON Schema – Revised Structure

Main pages order:
- Page 1: `coverPage` (no change)
- Page 2: `executiveSummary` (500–700 words) + `keywords` (on the same page)
- Page 3: Table of Contents (generated automatically)
- Page 4: `1-1` Introduction (start of the numbered sections)

## Section Order (19 sections)
`1-1` .. `1-19` in this exact order. Default titles when AI omits titles use professional “Analysis” style:
1-1: Introduction
1-2: Project Concept Analysis
1-3: Market Feasibility Study
1-4: Marketing Strategy Analysis
1-5: Technical Feasibility Assessment
1-6: Technology Infrastructure Analysis
1-7: Operational Requirements Analysis
1-8: Organizational Structure Design
1-9: Legal and Regulatory Compliance
1-10: Environmental Impact Assessment
1-11: Social Impact Analysis
1-12: Cultural Context Analysis
1-13: Consumer Behavior Analysis
1-14: Political and Regulatory Environment
1-15: Project Timeline and Milestones
1-16: Risk Assessment and Mitigation
1-17: Economic Viability Analysis
1-18: Financial Feasibility Study
1-19: Additional Investment Requirements

## Data Collection
- `collectStartFeasibilityData()` reads individual fields plus `startFeasibilityForm` object.
  - Ensures presence of: `studyType`, `projectName`, `projectDescription`, `visionMission`, and all basic info fields.
- `collectAuthorInfo()` captures: full name, email, country, city, and adds `timestamp`.
- `collectSurveyAnswers()` returns all survey answers from `feasibilityStudyAnswers`.

## Data Mapping to Sections
AI receives `sectionInputs` derived from survey and start form data. Update mapping as follows:
- 1-2: `projectName`, `description`, `visionMission`
- 1-3: `marketSize`, `growthRate`, `competitorsCount`, `marketGap`
- 1-4: `marketingCost`, `positioning`
- 1-5: `equipmentList`, `productionCapacity`
- 1-6: `technologyStack`, `technologyMaturity`, `technologyTable` (preserve full table rows)
- 1-7: `staffTable`, `dailyOperations`
- 1-8: `adminStructure`, `governance`
- 1-9: `licensesTable`, `legalNotes`
- 1-10: `environmentExplained`, `emissions`
- 1-11: `socialNotes`, `communityImpact`
- 1-12: `culturalNotes`
- 1-13: `behavioralNotes`
- 1-14: `politicalNotes`
- 1-15: `implementationSchedule`, `duration`, `durationUnit`
- 1-16: `risksTable`
- 1-17: `economicValue`, `gdpContribution`
- 1-18: `currency` and `financialStatements` (structured: income statement, balance sheet, cash flow, ratios, ROI)
- 1-19: `additionalInvestments`

Note: `1-1` (Introduction) continues to summarize core project context and may merge selected `startFeasibilityForm` fields (e.g., `projectName`, `sector`, `projectType`, `targetAudience`).

If a field is absent, it is included with localized "No data provided" in the final report.

## Prompt Enhancements
- Executive Summary 500–700 words in a formal professional style.
- Enforce exactly 19 sections in order.
- All section titles follow professional “Analysis” naming (see list above).
- Financial analysis belongs to section `1-18`; include a subsection `1-18-1: Financial Projections and Statements` with income statement, balance sheet, cash flow, ratios, and ROI. Populate these tables with the provided structured financial data exactly.
- Table of contents on Page 3; Introduction starts on Page 4.
- Keywords rendered on the Executive Summary page.
- Explicit formatting instructions (justified alignment). Support localized academic tone (e.g., Arabic) if selected.
- Include `coverPage` and mirrored `financial` structures.

## Implementation Notes (pho-project)
- ai-survey-report.js now builds a single unified prompt that merges: professional instructions, the full numbered template, front page text with user and project data inline, and sector survey insights grouped by section. No JSON block is sent to the model.
- Missing values are rendered as an em dash (—) in the prompt to make gaps explicit.
- The preview renders the entire front page and full Section 2.0 Executive Summary as text/HTML.
- PDF export uses pdfmake with: no watermark on page 1; logo header from page 2 onward; repeated faint watermark on subsequent pages; RTL direction for Arabic via pageDirection.
- If the AI output misses required headings, the module logs both the unified prompt and the AI response to the console for QA.

### Test Scenarios Used
- English project with complete dashboard + start-feasibility + sector data: verified all headings 2.0–21.0 present, user data on cover, correct logo/watermark in PDF.
- Arabic language selection with partial data: verified RTL layout, em dashes for missing fields, and watermark suppression on the cover.
- Stress test with long sector survey fields: verified prompt trimming of grouped pointers and successful PDF generation.

## PDF Formatting
- Cover page centered, with logo, study type, project name, description, vision/mission, basic info, author, timestamp, confidentiality.
- Page 2 contains Executive Summary and Keywords.
- Table of contents auto-built (Page 3).
- Section `1-1` begins on a new page after the TOC.
- Comparison appears after the main sections (if enabled).
- Disclaimers are rendered at the end.

## API Integration
- Uses Chat Completions with `messages`.
- No `input`, no `text.format`, no unsupported parameters.
- Authorization via `Bearer ${OPENAI_API_KEY}` header.

## Validation
- Ensure exactly 19 sections in the new order (`1-1` .. `1-19`).
- Update `DEFAULT_SECTION_TITLES` and `REQUIRED_SECTION_IDS` in `ai-report.js` to match this taxonomy.
- `wordCount` computed if missing.
- Executive Summary must target 500–700 words and not be a placeholder.
- Ensure data from `start-feasibility.html` (e.g., `duration`, `durationUnit`, and `currency`) is merged into the appropriate sections (`1-15`, `1-18`).

Maintenance notes:
- Update `DEFAULT_SECTION_TITLES` and `REQUIRED_SECTION_IDS` in `ai-report.js` when the section taxonomy changes.
- Extend `buildSectionInputsOrdered()` (a.k.a. `mapSurveyToSectionInputs`) when adding new survey fields or renaming mapped keys.
