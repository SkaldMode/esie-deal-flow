# ESIE Product Backlog
## Implementation-Ready Epic & User Story Analysis

**Generated:** 2025-11-16
**Based on:** Codebase analysis + product feedback
**Target User:** Enterprise AEs, solo consultants, technical founders

---

## 1. GAP SUMMARY: Top 5 Product Gaps

### G1: Single-Deal Limitation Prevents Real Sales Workflows
**Location:** `supabase/migrations/20251115223221*.sql:15-18` (unique index), `src/pages/CreateDeal.tsx:124-129` (warning)
**Impact:** Sales reps juggle 5-20 deals concurrently. Forcing them to archive/switch breaks their workflow. This is a **critical adoption blocker** for the enterprise AE persona.

### G2: AI Extraction Too Shallow vs. "Intelligence" Promise
**Location:** `supabase/functions/extract-meeting-intelligence/index.ts:10-48` (extraction prompt)
**Current State:** Extracts name, role, department, stance_guess, power_guess, quotes, objections, risks
**Missing:** Competitor mentions, budget signals, decision criteria, timeline pressure, action items, next steps, sentiment trends
**Impact:** Users expect "intelligence" but get basic note-taking. Not differentiated vs. manual CRM entry.

### G3: Relationship Map is Semi-Manual, Not Truly AI-Inferred
**Location:** `src/pages/StakeholderMap.tsx` (ReactFlow visualization)
**Current State:** AI extracts relationships from notes with confidence scores, but users must manually verify/edit
**Missing:** Auto-generated org chart on first meeting, persistent layout (resets to circle), visual hierarchy by power, relationship strength indicators
**Impact:** Users expect "auto-magic" but get a tool that requires manual work. Breaks the automation promise.

### G4: Prep Brief is Generic Template, Not Deal-Specific Intelligence
**Location:** `supabase/functions/generate-prep-brief/index.ts:80-131` (system prompt)
**Current State:** Template-based brief aggregating stakeholders, last 3 meetings, top 5 risks
**Missing:** Personalized strategy per stakeholder, recommended talk tracks, competitive positioning, objection handling scripts, deal-specific insights
**Impact:** Users can generate this themselves in 5 minutes. Not worth paying for.

### G5: No Analytics, Feedback Loop, or Learning System
**Location:** No structured analytics implementation found
**Current State:** Implicit tracking (meeting count, extraction status) but no user-facing analytics or feedback collection
**Missing:** Deal velocity metrics, stakeholder engagement trends, AI accuracy feedback, usage analytics, conversion tracking
**Impact:** Users can't measure ROI. Product can't improve AI accuracy. No data to justify pricing.

---

## 2. EPICS

---

### Epic E-001: Multi-Deal Pipeline Support

**Goal:** Enable sales reps to manage 5-20 concurrent deals with easy switching, filtering, and pipeline views.

**Primary User Type:** Enterprise AE, Sales Manager

**Why now (from feedback):** Gap G1 - Single-deal limitation is the #1 adoption blocker for enterprise sales teams who juggle multiple opportunities simultaneously.

**Rough ICE Estimate:**
- **Impact:** 10/10 (Unlocks enterprise AE persona, critical for market fit)
- **Confidence:** 10/10 (Directly from user feedback, clear requirement)
- **Ease:** 7/10 (DB schema changes + UI refactor, but well-scoped)

---

### Epic E-002: Advanced Intelligence Extraction

**Goal:** Extract comprehensive deal intelligence including competitor mentions, budget signals, decision criteria, timeline pressure, action items, and sentiment trends.

**Primary User Type:** Enterprise AE, Sales Manager, Solo Consultant

**Why now (from feedback):** Gap G2 - Current extraction is too basic to justify "intelligence" positioning. Need to differentiate from manual CRM entry.

**Rough ICE Estimate:**
- **Impact:** 9/10 (Core value prop differentiation)
- **Confidence:** 9/10 (Clear user need from feedback)
- **Ease:** 8/10 (Prompt engineering + schema updates, no new infra)

---

### Epic E-003: Smart Org Chart & Relationship Inference

**Goal:** Auto-generate org charts from meeting notes, persist visual layouts, show relationship strength, and enable easy corrections.

**Primary User Type:** Enterprise AE, Solo Consultant

**Why now (from feedback):** Gap G3 - Relationship map is semi-manual, breaking the automation promise. Users expect visual hierarchy and persistent layouts.

**Rough ICE Estimate:**
- **Impact:** 8/10 (High-value visual feature, differentiator)
- **Confidence:** 8/10 (User feedback + technical feasibility)
- **Ease:** 6/10 (ReactFlow complexity, layout persistence, AI positioning logic)

---

### Epic E-004: Intelligent Prep Brief 2.0

**Goal:** Generate personalized, deal-specific prep briefs with stakeholder strategies, talk tracks, competitive positioning, and objection handling.

**Primary User Type:** Enterprise AE, Solo Consultant

**Why now (from feedback):** Gap G4 - Current prep brief is generic template, not differentiated value. Need AI-powered strategic insights.

**Rough ICE Estimate:**
- **Impact:** 9/10 (Core value prop for prep workflow)
- **Confidence:** 9/10 (Clear user need, technical feasibility)
- **Ease:** 8/10 (Prompt engineering, leverages existing data)

---

### Epic E-005: Analytics & Feedback Loop

**Goal:** Provide users with deal velocity metrics, stakeholder engagement trends, and AI accuracy feedback. Enable product team to measure AI performance.

**Primary User Type:** All users + Product Team

**Why now (from feedback):** Gap G5 - No analytics or feedback loop. Users can't measure ROI, product can't improve AI.

**Rough ICE Estimate:**
- **Impact:** 7/10 (Enabler for retention + product improvement)
- **Confidence:** 8/10 (Clear need, standard analytics patterns)
- **Ease:** 7/10 (New events table, simple dashboards)

---

### Epic E-006: Solo Consultant Power Features

**Goal:** Add contract milestone tracking, proposal templates, pricing scenarios, and deal timeline with critical path for solo consultants/founders.

**Primary User Type:** Solo Consultant, Technical Founder

**Why now (from feedback):** Identified strong niche - solo consultants doing few large deals per year. Differentiate with consultant-specific features.

**Rough ICE Estimate:**
- **Impact:** 8/10 (Unlocks high-value niche market)
- **Confidence:** 7/10 (Good niche fit, needs validation)
- **Ease:** 6/10 (New feature areas, some complexity)

---

## 3. USER STORIES & TASKS

---

## Epic E-001: Multi-Deal Pipeline Support

### User Story [E-001-US-01]
**As an** Enterprise AE, **I want to** view all my active deals in a pipeline-style list view **so that** I can quickly see status, value, and next actions for each opportunity.

**Acceptance Criteria:**
- Given I have 5+ active deals, when I visit the deals page, then I see a table/card view with all deals
- Given a deal list, when I view each deal card, then I see: account name, deal value, stage, expected close, days since last meeting, stakeholder count
- Given the deal list, when I click on a deal card, then I navigate to that deal's dashboard
- Given the deal list, when I filter by stage, then I see only deals matching that stage
- Given the deal list, when I sort by close date, then deals are ordered by expected_close_month

---

### User Story [E-001-US-02]
**As an** Enterprise AE, **I want to** create multiple active deals without archiving existing ones **so that** I can manage my full pipeline.

**Acceptance Criteria:**
- Given I have an active deal, when I create a new deal, then both deals remain active
- Given multiple active deals, when I switch between deals, then the UI updates to show the selected deal's data
- Given a deal, when I manually archive it, then it moves to archived state
- Given archived deals, when I view archived list, then I can view (read-only) or restore them

---

### User Story [E-001-US-03]
**As an** Enterprise AE, **I want to** see a visual pipeline board (Kanban-style) with deals organized by stage **so that** I can quickly assess my pipeline health.

**Acceptance Criteria:**
- Given multiple active deals, when I visit the pipeline view, then I see columns for: Discovery, Demo, Proposal, Negotiation, Closed Won, Closed Lost
- Given a deal card, when I drag it to a new stage column, then the deal stage updates
- Given a pipeline column, when I view it, then I see total value and deal count for that stage
- Given the pipeline, when I click on a deal card, then I navigate to the deal dashboard

---

### User Story [E-001-US-04]
**As an** Enterprise AE, **I want to** have a global navigation that persists across all pages **so that** I can quickly switch between deals and access features.

**Acceptance Criteria:**
- Given I'm on any page, when I view the navigation, then I see: deal selector dropdown, pipeline link, archived deals link
- Given the deal selector, when I click it, then I see a list of my active deals with search/filter
- Given a deal selected, when I navigate to meetings/stakeholders/map/brief, then I see data for that deal
- Given I switch deals via the selector, when I'm on the stakeholders page, then the page updates to show the new deal's stakeholders

---

### Tasks for E-001-US-01 (Pipeline List View)

#### Task E-001-T-01
**Related User Story:** E-001-US-01
**Scope:** Database
**Description:** Remove unique index constraint on `deals` table that enforces single active deal per user
**Notes:** Migration to drop `idx_one_active_deal_per_user` and `archive_old_active_deals()` trigger

#### Task E-001-T-02
**Related User Story:** E-001-US-01
**Scope:** Backend
**Description:** Add RLS policies to support multiple active deals per user
**Notes:** Update policies on deals, meetings, stakeholders to handle multi-deal context

#### Task E-001-T-03
**Related User Story:** E-001-US-01
**Scope:** Frontend
**Description:** Create new `DealsListPage.tsx` component with table/card view of all active deals
**Notes:** Use TanStack Table or custom card grid, show: account_name, deal_value, stage, expected_close_month, created_at

#### Task E-001-T-04
**Related User Story:** E-001-US-01
**Scope:** Frontend
**Description:** Add filter/sort controls to DealsListPage (by stage, close date, value)
**Notes:** Client-side filtering initially, consider server-side if >50 deals

#### Task E-001-T-05
**Related User Story:** E-001-US-01
**Scope:** Frontend
**Description:** Add computed field for "days since last meeting" using JOIN to meetings table
**Notes:** Query meetings.created_at MAX per deal, calculate diff from today

#### Task E-001-T-06
**Related User Story:** E-001-US-01
**Scope:** Frontend
**Description:** Add click handler to navigate from deal card to DealHome/:dealId
**Notes:** Update routing to preserve dealId context

---

### Tasks for E-001-US-02 (Multiple Active Deals)

#### Task E-001-T-07
**Related User Story:** E-001-US-02
**Scope:** Frontend
**Description:** Remove warning notice from CreateDeal.tsx about auto-archiving
**Notes:** Update lines 124-129 to generic "Create new deal" messaging

#### Task E-001-T-08
**Related User Story:** E-001-US-02
**Scope:** Frontend
**Description:** Update Index.tsx landing page to show DealsListPage instead of auto-redirecting to single deal
**Notes:** Remove auto-redirect logic (lines 23-41), route to /deals list

#### Task E-001-T-09
**Related User Story:** E-001-US-02
**Scope:** Frontend
**Description:** Add manual archive button to DealHome.tsx
**Notes:** Add "Archive Deal" button with confirmation dialog, updates status='archived'

#### Task E-001-T-10
**Related User Story:** E-001-US-02
**Scope:** Frontend
**Description:** Add restore functionality to ArchivedDeals.tsx
**Notes:** Add "Restore" button per deal, updates status='active'

---

### Tasks for E-001-US-03 (Kanban Pipeline View)

#### Task E-001-T-11
**Related User Story:** E-001-US-03
**Scope:** Frontend
**Description:** Create new `PipelineKanbanPage.tsx` using react-beautiful-dnd or similar
**Notes:** 6 columns: Discovery, Demo, Proposal, Negotiation, Closed Won, Closed Lost

#### Task E-001-T-12
**Related User Story:** E-001-US-03
**Scope:** Frontend
**Description:** Implement drag-and-drop handler to update deal.stage on drop
**Notes:** Optimistic UI update + Supabase mutation

#### Task E-001-T-13
**Related User Story:** E-001-US-03
**Scope:** Frontend
**Description:** Add column header stats (total value, deal count per stage)
**Notes:** Aggregate from deals array, format currency

#### Task E-001-T-14
**Related User Story:** E-001-US-03
**Scope:** Frontend
**Description:** Add deal card click navigation to DealHome/:dealId
**Notes:** Preserve pipeline view state in URL params

---

### Tasks for E-001-US-04 (Global Navigation)

#### Task E-001-T-15
**Related User Story:** E-001-US-04
**Scope:** Frontend
**Description:** Create `DealSelector.tsx` dropdown component in global nav
**Notes:** Fetch all active deals, show account_name + stage, search filter

#### Task E-001-T-16
**Related User Story:** E-001-US-04
**Scope:** Frontend
**Description:** Add deal context provider `DealContext.tsx` to manage selected deal globally
**Notes:** Store selectedDealId in React Context, persist to localStorage

#### Task E-001-T-17
**Related User Story:** E-001-US-04
**Scope:** Frontend
**Description:** Update all deal-specific pages to read from DealContext instead of single active deal
**Notes:** Update: DealHome, AddMeeting, Meetings, Stakeholders, StakeholderMap, PrepBrief

#### Task E-001-T-18
**Related User Story:** E-001-US-04
**Scope:** Frontend
**Description:** Add persistent navigation bar component with deal selector and pipeline/archived links
**Notes:** Integrate into App.tsx layout, sticky header

---

## Epic E-002: Advanced Intelligence Extraction

### User Story [E-002-US-01]
**As an** Enterprise AE, **I want to** see competitor mentions extracted from meeting notes **so that** I can track competitive threats and positioning.

**Acceptance Criteria:**
- Given meeting notes mentioning competitors, when extraction completes, then I see a "Competitors" section in MeetingDetails
- Given a competitor mention, when I view it, then I see: competitor name, context quote, mentioned by stakeholder
- Given multiple competitor mentions, when I view the list, then they're grouped by competitor name
- Given competitor data, when I view the deal dashboard, then I see a "Competitive Landscape" widget

---

### User Story [E-002-US-02]
**As an** Enterprise AE, **I want to** see budget signals and pricing discussions extracted **so that** I can understand financial constraints and willingness to pay.

**Acceptance Criteria:**
- Given meeting notes with budget/pricing talk, when extraction completes, then I see "Budget Signals" section
- Given a budget signal, when I view it, then I see: signal text, source stakeholder, sentiment (positive/neutral/concern)
- Given budget signals, when I view deal dashboard, then I see "Budget Health" indicator
- Given multiple budget discussions, when I view trends, then I can see if budget is expanding or contracting

---

### User Story [E-002-US-03]
**As an** Enterprise AE, **I want to** see decision criteria extracted from meetings **so that** I can align my pitch to what matters most.

**Acceptance Criteria:**
- Given meeting notes with decision criteria, when extraction completes, then I see "Decision Criteria" section
- Given a criterion, when I view it, then I see: criterion text, priority (high/medium/low), mentioned by stakeholder
- Given decision criteria, when I generate prep brief, then recommended questions align to these criteria
- Given multiple criteria, when I view them, then they're ranked by frequency/priority

---

### User Story [E-002-US-04]
**As an** Enterprise AE, **I want to** see action items and next steps extracted **so that** I don't miss commitments or follow-ups.

**Acceptance Criteria:**
- Given meeting notes with action items, when extraction completes, then I see "Action Items" section
- Given an action item, when I view it, then I see: action text, owner (me/stakeholder), due date (if mentioned)
- Given action items, when I view deal dashboard, then I see "Pending Actions" widget with count
- Given completed actions, when I mark them done, then they move to completed state

---

### User Story [E-002-US-05]
**As an** Enterprise AE, **I want to** see sentiment trends over time per stakeholder **so that** I can detect if relationships are improving or degrading.

**Acceptance Criteria:**
- Given multiple meetings with a stakeholder, when I view their profile, then I see sentiment trend chart (positive/neutral/negative over time)
- Given sentiment changes, when a stakeholder shifts negative, then I see a warning indicator
- Given sentiment data, when I view stakeholder list, then I can filter by recent sentiment change
- Given sentiment trends, when I generate prep brief, then it highlights stakeholders with declining sentiment

---

### Tasks for E-002-US-01 (Competitor Extraction)

#### Task E-002-T-01
**Related User Story:** E-002-US-01
**Scope:** Database
**Description:** Add `competitor_mentions` JSONB column to meetings table
**Notes:** Schema: `[{competitor_name, context, mentioned_by_name, timestamp}]`

#### Task E-002-T-02
**Related User Story:** E-002-US-01
**Scope:** AI
**Description:** Update extraction prompt in `extract-meeting-intelligence/index.ts` to extract competitor mentions
**Notes:** Add to system prompt: "Extract any competitor names mentioned, context, and who mentioned them"

#### Task E-002-T-03
**Related User Story:** E-002-US-01
**Scope:** Frontend
**Description:** Add "Competitors" section to MeetingDetails.tsx to display competitor_mentions
**Notes:** Card component with competitor name badges, context quotes

#### Task E-002-T-04
**Related User Story:** E-002-US-01
**Scope:** Frontend
**Description:** Create CompetitiveLandscape widget for DealHome.tsx
**Notes:** Aggregate competitor mentions across all meetings, show frequency

---

### Tasks for E-002-US-02 (Budget Signals)

#### Task E-002-T-05
**Related User Story:** E-002-US-02
**Scope:** Database
**Description:** Add `budget_signals` JSONB column to meetings table
**Notes:** Schema: `[{signal_text, source_name, sentiment: 'positive'|'neutral'|'concern'}]`

#### Task E-002-T-06
**Related User Story:** E-002-US-02
**Scope:** AI
**Description:** Update extraction prompt to extract budget/pricing discussions
**Notes:** Prompt: "Extract mentions of budget, pricing, cost concerns, ROI discussions with sentiment"

#### Task E-002-T-07
**Related User Story:** E-002-US-02
**Scope:** Frontend
**Description:** Add "Budget Signals" section to MeetingDetails.tsx
**Notes:** Display signal text with sentiment badges (green/yellow/red)

#### Task E-002-T-08
**Related User Story:** E-002-US-02
**Scope:** Frontend
**Description:** Create BudgetHealth widget for DealHome.tsx showing latest budget sentiment
**Notes:** Traffic light indicator based on most recent budget signals

---

### Tasks for E-002-US-03 (Decision Criteria)

#### Task E-002-T-09
**Related User Story:** E-002-US-03
**Scope:** Database
**Description:** Add `decision_criteria` JSONB column to meetings table
**Notes:** Schema: `[{criterion_text, priority: 'high'|'medium'|'low', mentioned_by_name}]`

#### Task E-002-T-10
**Related User Story:** E-002-US-03
**Scope:** AI
**Description:** Update extraction prompt to identify decision criteria
**Notes:** Prompt: "Extract what factors the client is using to make decisions, prioritize by frequency/emphasis"

#### Task E-002-T-11
**Related User Story:** E-002-US-03
**Scope:** Frontend
**Description:** Add "Decision Criteria" section to MeetingDetails.tsx
**Notes:** Display criteria with priority badges, group by priority

#### Task E-002-T-12
**Related User Story:** E-002-US-03
**Scope:** AI
**Description:** Update prep-brief prompt to align recommended questions with decision criteria
**Notes:** Pass decision_criteria to prep brief generation, tailor questions

---

### Tasks for E-002-US-04 (Action Items)

#### Task E-002-T-13
**Related User Story:** E-002-US-04
**Scope:** Database
**Description:** Create new `action_items` table
**Notes:** Columns: id, meeting_id, deal_id, user_id, action_text, owner (user/stakeholder_id), due_date, status (pending/completed), created_at

#### Task E-002-T-14
**Related User Story:** E-002-US-04
**Scope:** AI
**Description:** Update extraction prompt to extract action items with owner and due date
**Notes:** Prompt: "Extract action items, who is responsible, and any mentioned deadlines"

#### Task E-002-T-15
**Related User Story:** E-002-US-04
**Scope:** Backend
**Description:** Create action_items after extraction completes, link to meeting
**Notes:** Add to extract-meeting-intelligence function after stakeholder processing

#### Task E-002-T-16
**Related User Story:** E-002-US-04
**Scope:** Frontend
**Description:** Create ActionItems widget for DealHome.tsx showing pending actions
**Notes:** Display count, list items, mark complete functionality

#### Task E-002-T-17
**Related User Story:** E-002-US-04
**Scope:** Frontend
**Description:** Add "Action Items" section to MeetingDetails.tsx
**Notes:** Display actions with owner, due date, completion checkbox

---

### Tasks for E-002-US-05 (Sentiment Trends)

#### Task E-002-T-18
**Related User Story:** E-002-US-05
**Scope:** Database
**Description:** Add `sentiment_history` JSONB column to stakeholders table
**Notes:** Schema: `[{meeting_id, sentiment: 'positive'|'neutral'|'negative', date}]`

#### Task E-002-T-19
**Related User Story:** E-002-US-05
**Scope:** AI
**Description:** Update stakeholder extraction to include per-meeting sentiment
**Notes:** Extract sentiment from each stakeholder's quotes/mentions in meeting

#### Task E-002-T-20
**Related User Story:** E-002-US-05
**Scope:** Backend
**Description:** Update update-stakeholder-insights function to append to sentiment_history
**Notes:** Add new sentiment entry per meeting, keep full history

#### Task E-002-T-21
**Related User Story:** E-002-US-05
**Scope:** Frontend
**Description:** Add sentiment trend chart to StakeholderProfile.tsx using recharts
**Notes:** Line chart showing sentiment over time (meetings on x-axis)

#### Task E-002-T-22
**Related User Story:** E-002-US-05
**Scope:** Frontend
**Description:** Add sentiment change indicator to Stakeholders.tsx list view
**Notes:** Show arrow up/down/flat icon based on last 2 meetings

---

## Epic E-003: Smart Org Chart & Relationship Inference

### User Story [E-003-US-01]
**As an** Enterprise AE, **I want to** see an auto-generated org chart after my first meeting **so that** I don't have to manually map relationships.

**Acceptance Criteria:**
- Given a first meeting with 3+ stakeholders, when extraction completes, then an initial org chart is generated
- Given extracted relationships, when I view StakeholderMap, then nodes are positioned hierarchically (reports_to relationships determine levels)
- Given no relationship data, when I view the map, then stakeholders are positioned by power level (high at top)
- Given the org chart, when I make corrections, then the AI learns from my edits

---

### User Story [E-003-US-02]
**As an** Enterprise AE, **I want to** persist my custom org chart layout **so that** it doesn't reset to a circle every time I reload the page.

**Acceptance Criteria:**
- Given a customized node layout, when I drag nodes, then positions are saved to the database
- Given saved positions, when I reload the page, then nodes appear in my custom positions
- Given new stakeholders added, when they appear on the map, then they're placed near related nodes (not in the center)
- Given a reset option, when I click "Auto-layout", then the system regenerates positions based on current relationships

---

### User Story [E-003-US-03]
**As an** Enterprise AE, **I want to** see relationship strength indicators **so that** I can focus on strengthening weak or critical connections.

**Acceptance Criteria:**
- Given stakeholder relationships, when I view the map, then edge thickness reflects relationship strength (frequency of mentions together)
- Given relationships, when I hover over an edge, then I see: relationship type, confidence score, source meetings
- Given weak relationships, when I view the map, then weak edges are visually distinct (dashed line)
- Given critical relationships, when a decision-maker relationship is missing, then I see a warning indicator

---

### User Story [E-003-US-04]
**As an** Enterprise AE, **I want to** manually add or edit relationships **so that** I can correct AI mistakes or add insider knowledge.

**Acceptance Criteria:**
- Given two stakeholders, when I click "Add Relationship", then I can select relationship type and add notes
- Given an existing relationship, when I click on the edge, then I can edit type, confidence, or delete it
- Given a manual relationship, when I save it, then confidence is set to 1.0 and marked as "user-verified"
- Given user edits, when new meetings are processed, then user-verified relationships are not overwritten

---

### Tasks for E-003-US-01 (Auto-Generated Org Chart)

#### Task E-003-T-01
**Related User Story:** E-003-US-01
**Scope:** Frontend
**Description:** Create hierarchical layout algorithm for StakeholderMap.tsx
**Notes:** Use reports_to relationships to determine levels, dagre or elkjs for layout

#### Task E-003-T-02
**Related User Story:** E-003-US-01
**Scope:** Frontend
**Description:** Fallback layout by power level when no reports_to relationships exist
**Notes:** Position high-power at top, medium middle, low bottom in vertical layout

#### Task E-003-T-03
**Related User Story:** E-003-US-01
**Scope:** Frontend
**Description:** Add "Auto-layout" button to trigger re-layout based on current relationships
**Notes:** Button in StakeholderMap toolbar, recomputes positions

---

### Tasks for E-003-US-02 (Persist Layout)

#### Task E-003-T-04
**Related User Story:** E-003-US-02
**Scope:** Database
**Description:** Add `map_position` JSONB column to stakeholders table
**Notes:** Schema: `{x: number, y: number}` for ReactFlow node position

#### Task E-003-T-05
**Related User Story:** E-003-US-02
**Scope:** Frontend
**Description:** Add onNodeDragStop handler in StakeholderMap to save positions
**Notes:** Update stakeholder.map_position on drag stop, debounced update

#### Task E-003-T-06
**Related User Story:** E-003-US-02
**Scope:** Frontend
**Description:** Load saved map_position when rendering nodes
**Notes:** Check if position exists, use it; otherwise compute initial position

#### Task E-003-T-07
**Related User Story:** E-003-US-02
**Scope:** Frontend
**Description:** Smart placement for new stakeholders near related nodes
**Notes:** If new stakeholder has reports_to relationship, place near manager node

---

### Tasks for E-003-US-03 (Relationship Strength Indicators)

#### Task E-003-T-08
**Related User Story:** E-003-US-03
**Scope:** Database
**Description:** Add `mention_count` column to stakeholder_relationships table
**Notes:** Count how many meetings both stakeholders appear in together

#### Task E-003-T-09
**Related User Story:** E-003-US-03
**Scope:** Backend
**Description:** Update extract-meeting-intelligence to increment mention_count
**Notes:** When creating/updating relationship, increment count for co-mentions

#### Task E-003-T-10
**Related User Story:** E-003-US-03
**Scope:** Frontend
**Description:** Map mention_count to edge thickness in StakeholderMap
**Notes:** strokeWidth = Math.min(mention_count, 5) for visual scaling

#### Task E-003-T-11
**Related User Story:** E-003-US-03
**Scope:** Frontend
**Description:** Add edge hover tooltip showing relationship details
**Notes:** Custom EdgeLabel component with: type, confidence, mention_count, source meetings

#### Task E-003-T-12
**Related User Story:** E-003-US-03
**Scope:** Frontend
**Description:** Add dashed line style for low-confidence relationships (confidence < 0.5)
**Notes:** strokeDasharray conditional styling

---

### Tasks for E-003-US-04 (Manual Relationship Editing)

#### Task E-003-T-13
**Related User Story:** E-003-US-04
**Scope:** Database
**Description:** Add `user_verified` boolean column to stakeholder_relationships table
**Notes:** Default false, set true for manually created/edited relationships

#### Task E-003-T-14
**Related User Story:** E-003-US-04
**Scope:** Frontend
**Description:** Create AddRelationshipModal component
**Notes:** Select from_stakeholder, to_stakeholder, relationship_type, notes

#### Task E-003-T-15
**Related User Story:** E-003-US-04
**Scope:** Frontend
**Description:** Add "Add Relationship" button to StakeholderMap toolbar
**Notes:** Opens AddRelationshipModal

#### Task E-003-T-16
**Related User Story:** E-003-US-04
**Scope:** Frontend
**Description:** Add edge click handler to show EditRelationshipModal
**Notes:** Allow editing type, confidence, notes, or delete

#### Task E-003-T-17
**Related User Story:** E-003-US-04
**Scope:** Backend
**Description:** Update extract-meeting-intelligence to skip overwriting user_verified relationships
**Notes:** WHERE user_verified = false in UPDATE query

---

## Epic E-004: Intelligent Prep Brief 2.0

### User Story [E-004-US-01]
**As an** Enterprise AE, **I want to** see personalized talk tracks per stakeholder **so that** I can tailor my pitch to each person's concerns and communication style.

**Acceptance Criteria:**
- Given stakeholder profiles, when I generate prep brief, then I see "Stakeholder-Specific Strategies" section
- Given a stakeholder, when I view their strategy, then I see: key concerns, recommended approach, topics to avoid, talk track examples
- Given communication style, when prep brief is generated, then talk tracks match style (analytical vs emotional, formal vs casual)
- Given power level, when I view strategies, then high-power stakeholders get priority focus

---

### User Story [E-004-US-02]
**As an** Enterprise AE, **I want to** see competitive positioning guidance **so that** I know how to differentiate against competitors mentioned in meetings.

**Acceptance Criteria:**
- Given competitor mentions, when I generate prep brief, then I see "Competitive Positioning" section
- Given each competitor, when I view positioning, then I see: competitor name, their strengths (perceived), our differentiators, objections to expect
- Given multiple competitors, when I view the brief, then positioning is prioritized by mention frequency
- Given no competitors mentioned, when I generate brief, then this section shows proactive differentiation strategy

---

### User Story [E-004-US-03]
**As an** Enterprise AE, **I want to** see objection handling scripts **so that** I'm prepared for pushback.

**Acceptance Criteria:**
- Given previous objections, when I generate prep brief, then I see "Objection Handling" section
- Given an objection, when I view handling guidance, then I see: objection text, recommended response, supporting evidence/case studies
- Given recurring objections, when I view the brief, then they're flagged as "frequently raised"
- Given new objections, when they appear, then I see proactive responses even if not previously handled

---

### User Story [E-004-US-04]
**As a** Solo Consultant, **I want to** toggle prep brief mode between "AE" and "Consultant" **so that** I get guidance relevant to my role.

**Acceptance Criteria:**
- Given prep brief generation, when I select "Consultant Mode", then language shifts from sales to advisory (e.g., "close the deal" → "finalize engagement")
- Given consultant mode, when I view objectives, then they focus on: value demonstration, scope alignment, pricing justification
- Given AE mode, when I view objectives, then they focus on: pain discovery, champion building, closing tactics
- Given mode preference, when I save it, then future prep briefs default to my preferred mode

---

### Tasks for E-004-US-01 (Personalized Talk Tracks)

#### Task E-004-T-01
**Related User Story:** E-004-US-01
**Scope:** AI
**Description:** Update generate-prep-brief prompt to include stakeholder-specific strategies
**Notes:** For each stakeholder, generate: key_concerns, recommended_approach, topics_to_avoid, talk_track

#### Task E-004-T-02
**Related User Story:** E-004-US-01
**Scope:** AI
**Description:** Pass communication_style to prompt for talk track tone matching
**Notes:** If analytical: data-driven, if emotional: story-based, if formal: professional language

#### Task E-004-T-03
**Related User Story:** E-004-US-01
**Scope:** Frontend
**Description:** Add "Stakeholder Strategies" section to PrepBrief.tsx
**Notes:** Expandable cards per stakeholder, sorted by power level

#### Task E-004-T-04
**Related User Story:** E-004-US-01
**Scope:** Frontend
**Description:** Add visual indicators for stakeholder power in prep brief
**Notes:** Icons or badges: high-power (crown), medium (star), low (circle)

---

### Tasks for E-004-US-02 (Competitive Positioning)

#### Task E-004-T-05
**Related User Story:** E-004-US-02
**Scope:** AI
**Description:** Update generate-prep-brief prompt to include competitive positioning
**Notes:** For each competitor mentioned: perceived_strengths, our_differentiators, expected_objections

#### Task E-004-T-06
**Related User Story:** E-004-US-02
**Scope:** Backend
**Description:** Pass competitor_mentions to prep-brief function
**Notes:** Aggregate from meetings.competitor_mentions across all meetings

#### Task E-004-T-07
**Related User Story:** E-004-US-02
**Scope:** Frontend
**Description:** Add "Competitive Positioning" section to PrepBrief.tsx
**Notes:** Table or cards per competitor with positioning guidance

#### Task E-004-T-08
**Related User Story:** E-004-US-02
**Scope:** AI
**Description:** Add fallback positioning when no competitors mentioned
**Notes:** Prompt: "Proactively prepare positioning against likely competitors in [industry]"

---

### Tasks for E-004-US-03 (Objection Handling Scripts)

#### Task E-004-T-09
**Related User Story:** E-004-US-03
**Scope:** AI
**Description:** Update generate-prep-brief prompt to include objection handling
**Notes:** For each objection: recommended_response, supporting_evidence, deflection_strategy

#### Task E-004-T-10
**Related User Story:** E-004-US-03
**Scope:** Backend
**Description:** Pass aggregated objections with frequency counts to prep-brief
**Notes:** Count objections across meetings, mark recurring ones

#### Task E-004-T-11
**Related User Story:** E-004-US-03
**Scope:** Frontend
**Description:** Add "Objection Handling" section to PrepBrief.tsx
**Notes:** Display objection, response script, "Frequently Raised" badge

---

### Tasks for E-004-US-04 (Consultant vs AE Mode)

#### Task E-004-T-12
**Related User Story:** E-004-US-04
**Scope:** Database
**Description:** Add `prep_brief_mode` column to users table or user_preferences
**Notes:** ENUM: 'ae' | 'consultant', default 'ae'

#### Task E-004-T-13
**Related User Story:** E-004-US-04
**Scope:** Frontend
**Description:** Add mode toggle to PrepBrief.tsx (radio buttons: AE / Consultant)
**Notes:** Save to user preferences on change

#### Task E-004-T-14
**Related User Story:** E-004-US-04
**Scope:** AI
**Description:** Update generate-prep-brief prompt with mode-specific language
**Notes:** If consultant: use advisory tone, focus on scope/value, if AE: use sales tone, focus on closing

#### Task E-004-T-15
**Related User Story:** E-004-US-04
**Scope:** Backend
**Description:** Pass user.prep_brief_mode to prep-brief Edge Function
**Notes:** Fetch from users table, include in prompt context

---

## Epic E-005: Analytics & Feedback Loop

### User Story [E-005-US-01]
**As an** Enterprise AE, **I want to** see deal velocity metrics **so that** I can identify bottlenecks and forecast close dates.

**Acceptance Criteria:**
- Given a deal, when I view DealHome, then I see "Deal Velocity" widget showing: days in current stage, avg days per stage, projected close date
- Given stage changes, when I view history, then I see timeline of stage transitions with dates
- Given multiple deals, when I view pipeline analytics, then I see avg time-to-close by stage
- Given slow deals, when velocity drops below avg, then I see a warning indicator

---

### User Story [E-005-US-02]
**As an** Enterprise AE, **I want to** see stakeholder engagement metrics **so that** I know who I'm neglecting or over-engaging.

**Acceptance Criteria:**
- Given stakeholders, when I view Stakeholders page, then I see "Last Mentioned" date per stakeholder
- Given engagement data, when a stakeholder hasn't been mentioned in 30+ days, then I see a "Re-engage" warning
- Given meetings, when I view stakeholder profile, then I see engagement timeline (mentions over time)
- Given high-power stakeholders, when they're under-engaged, then I see priority warning

---

### User Story [E-005-US-03]
**As a** User, **I want to** provide feedback on AI extraction accuracy **so that** the product team can improve the AI.

**Acceptance Criteria:**
- Given extracted data, when I view MeetingDetails, then I see thumbs up/down buttons per section (stakeholders, risks, objections)
- Given feedback, when I click thumbs down, then I can optionally provide text feedback
- Given feedback submission, when I submit, then it's saved to a feedback table with meeting_id and section
- Given feedback collection, when product team reviews, then they see accuracy metrics per extraction type

---

### User Story [E-005-US-04]
**As a** User, **I want to** see my usage analytics **so that** I can understand my ROI and activity.

**Acceptance Criteria:**
- Given my usage, when I view Settings/Analytics page, then I see: total deals, total meetings, total stakeholders, avg meetings per deal
- Given time-based usage, when I view analytics, then I see monthly activity chart (meetings added over time)
- Given AI usage, when I view analytics, then I see: total extractions, total prep briefs generated, total simulations
- Given benchmarks, when I compare, then I see my usage vs. platform averages (anonymized)

---

### User Story [E-005-US-05]
**As a** Product Manager, **I want to** track feature usage events **so that** I can prioritize roadmap and measure adoption.

**Acceptance Criteria:**
- Given user actions, when key events occur, then they're logged to events table: created_deal, added_meeting, generated_prep_brief, ran_simulation
- Given events, when I query analytics, then I can see: DAU/WAU/MAU, feature adoption rates, retention cohorts
- Given performance, when I track AI costs, then I see cost per user, cost per extraction
- Given errors, when extractions fail, then I can see failure rates and error types

---

### Tasks for E-005-US-01 (Deal Velocity Metrics)

#### Task E-005-T-01
**Related User Story:** E-005-US-01
**Scope:** Database
**Description:** Create `deal_stage_history` table
**Notes:** Columns: id, deal_id, stage, changed_at, changed_by_user_id

#### Task E-005-T-02
**Related User Story:** E-005-US-01
**Scope:** Backend
**Description:** Create trigger on deals table to log stage changes to history
**Notes:** ON UPDATE deals WHERE stage != OLD.stage, INSERT into stage_history

#### Task E-005-T-03
**Related User Story:** E-005-US-01
**Scope:** Frontend
**Description:** Create DealVelocity widget for DealHome.tsx
**Notes:** Calculate: days_in_current_stage = today - last_stage_change, show timeline

#### Task E-005-T-04
**Related User Story:** E-005-US-01
**Scope:** Frontend
**Description:** Add stage transition timeline visualization
**Notes:** Horizontal timeline showing stage progression with dates

#### Task E-005-T-05
**Related User Story:** E-005-US-01
**Scope:** Backend
**Description:** Create view or query for avg_days_per_stage across user's deals
**Notes:** Aggregate stage_history to calculate averages

---

### Tasks for E-005-US-02 (Stakeholder Engagement Metrics)

#### Task E-005-T-06
**Related User Story:** E-005-US-02
**Scope:** Frontend
**Description:** Add "Last Mentioned" column to Stakeholders.tsx
**Notes:** Query MAX(meetings.created_at) JOIN stakeholder_mentions

#### Task E-005-T-07
**Related User Story:** E-005-US-02
**Scope:** Frontend
**Description:** Add warning badge for stakeholders not mentioned in 30+ days
**Notes:** Conditional render if last_mentioned < 30 days ago

#### Task E-005-T-08
**Related User Story:** E-005-US-02
**Scope:** Frontend
**Description:** Add engagement timeline to StakeholderProfile.tsx
**Notes:** Bar chart showing mentions per month

#### Task E-005-T-09
**Related User Story:** E-005-US-02
**Scope:** Frontend
**Description:** Add priority warning for under-engaged high-power stakeholders
**Notes:** If power=high AND last_mentioned > 21 days, show alert banner

---

### Tasks for E-005-US-03 (AI Accuracy Feedback)

#### Task E-005-T-10
**Related User Story:** E-005-US-03
**Scope:** Database
**Description:** Create `extraction_feedback` table
**Notes:** Columns: id, meeting_id, user_id, section (stakeholders/risks/objections/etc), rating (thumbs_up/thumbs_down), feedback_text, created_at

#### Task E-005-T-11
**Related User Story:** E-005-US-03
**Scope:** Frontend
**Description:** Add thumbs up/down buttons to each section in MeetingDetails.tsx
**Notes:** Position in section header, toggle state

#### Task E-005-T-12
**Related User Story:** E-005-US-03
**Scope:** Frontend
**Description:** Create FeedbackModal for optional text feedback on thumbs down
**Notes:** Optional textarea, submit to extraction_feedback table

#### Task E-005-T-13
**Related User Story:** E-005-US-03
**Scope:** Backend
**Description:** Create admin view/query for extraction accuracy metrics
**Notes:** Aggregate feedback by section, calculate thumbs_up / total ratio

---

### Tasks for E-005-US-04 (User Analytics Dashboard)

#### Task E-005-T-14
**Related User Story:** E-005-US-04
**Scope:** Frontend
**Description:** Create new AnalyticsPage.tsx (route: /analytics)
**Notes:** Dashboard layout with metric cards and charts

#### Task E-005-T-15
**Related User Story:** E-005-US-04
**Scope:** Frontend
**Description:** Add summary metrics cards to AnalyticsPage
**Notes:** Query counts: deals, meetings, stakeholders, simulations

#### Task E-005-T-16
**Related User Story:** E-005-US-04
**Scope:** Frontend
**Description:** Add monthly activity chart using recharts
**Notes:** Line chart: meetings created over last 6 months

#### Task E-005-T-17
**Related User Story:** E-005-US-04
**Scope:** Backend
**Description:** Create analytics view with user benchmarks
**Notes:** Aggregate platform averages: avg_meetings_per_deal, avg_stakeholders_per_deal

---

### Tasks for E-005-US-05 (Product Event Tracking)

#### Task E-005-T-18
**Related User Story:** E-005-US-05
**Scope:** Database
**Description:** Create `events` table for product analytics
**Notes:** Columns: id, user_id, event_type, event_properties (JSONB), created_at

#### Task E-005-T-19
**Related User Story:** E-005-US-05
**Scope:** Frontend
**Description:** Create trackEvent helper function
**Notes:** Wrapper to insert into events table, debounced for performance

#### Task E-005-T-20
**Related User Story:** E-005-US-05
**Scope:** Frontend
**Description:** Add event tracking to key actions
**Notes:** Track: created_deal, added_meeting, generated_prep_brief, started_simulation, viewed_stakeholder_map

#### Task E-005-T-21
**Related User Story:** E-005-US-05
**Scope:** Backend
**Description:** Create admin analytics queries for DAU/WAU/MAU
**Notes:** Count distinct users per day/week/month from events table

#### Task E-005-T-22
**Related User Story:** E-005-US-05
**Scope:** Backend
**Description:** Add AI cost tracking to extraction functions
**Notes:** Log tokens used, model, cost to events table on each extraction

---

## Epic E-006: Solo Consultant Power Features

### User Story [E-006-US-01]
**As a** Solo Consultant, **I want to** track contract milestones within a deal **so that** I can manage deliverables and payments.

**Acceptance Criteria:**
- Given a deal, when I add milestones, then I see a "Milestones" section in DealHome
- Given a milestone, when I create it, then I specify: title, deliverable, payment amount, due date, status (pending/in-progress/completed)
- Given milestones, when I view them, then they're sorted by due date
- Given completed milestones, when I mark them done, then payment amount is summed in "Revenue Collected" metric

---

### User Story [E-006-US-02]
**As a** Solo Consultant, **I want to** generate proposal templates **so that** I can quickly create SOWs based on deal context.

**Acceptance Criteria:**
- Given a deal, when I click "Generate Proposal", then I get a formatted proposal document
- Given proposal content, when I view it, then it includes: scope summary, stakeholder context, pricing, timeline, deliverables
- Given stakeholder intel, when proposal is generated, then it's tailored to key decision-maker concerns
- Given proposal templates, when I customize one, then I can save it for reuse

---

### User Story [E-006-US-03]
**As a** Solo Consultant, **I want to** model pricing scenarios **so that** I can test different pricing structures during negotiations.

**Acceptance Criteria:**
- Given a deal, when I access "Pricing Scenarios", then I can create multiple scenarios (hourly, fixed-fee, value-based, retainer)
- Given a scenario, when I configure it, then I input: rate, estimated hours, discount %, payment terms
- Given multiple scenarios, when I view them side-by-side, then I see total value, margin, cash flow timeline
- Given a selected scenario, when I apply it, then it updates deal_value and notes

---

### User Story [E-006-US-04]
**As a** Solo Consultant, **I want to** see a deal timeline with critical path **so that** I can manage project risks and dependencies.

**Acceptance Criteria:**
- Given milestones and meetings, when I view timeline, then I see Gantt-style visualization
- Given dependencies, when I link milestones, then critical path is highlighted
- Given delays, when a milestone is overdue, then downstream milestones show risk indicators
- Given timeline view, when I drag milestones, then due dates update

---

### Tasks for E-006-US-01 (Contract Milestones)

#### Task E-006-T-01
**Related User Story:** E-006-US-01
**Scope:** Database
**Description:** Create `milestones` table
**Notes:** Columns: id, deal_id, user_id, title, deliverable, payment_amount, due_date, status (pending/in_progress/completed), created_at

#### Task E-006-T-02
**Related User Story:** E-006-US-01
**Scope:** Frontend
**Description:** Create Milestones widget for DealHome.tsx
**Notes:** List of milestones, add button, edit/delete actions

#### Task E-006-T-03
**Related User Story:** E-006-US-01
**Scope:** Frontend
**Description:** Create AddMilestoneModal component
**Notes:** Form: title, deliverable, payment_amount, due_date

#### Task E-006-T-04
**Related User Story:** E-006-US-01
**Scope:** Frontend
**Description:** Add "Revenue Collected" metric to DealHome
**Notes:** SUM(payment_amount) WHERE status='completed'

---

### Tasks for E-006-US-02 (Proposal Generator)

#### Task E-006-T-05
**Related User Story:** E-006-US-02
**Scope:** Backend
**Description:** Create `generate-proposal` Edge Function
**Notes:** Similar to prep-brief, but outputs proposal format (scope, stakeholders, pricing, timeline)

#### Task E-006-T-06
**Related User Story:** E-006-US-02
**Scope:** AI
**Description:** Create proposal generation prompt
**Notes:** Template: Executive Summary, Scope, Stakeholder Alignment, Pricing, Deliverables, Timeline

#### Task E-006-T-07
**Related User Story:** E-006-US-02
**Scope:** Frontend
**Description:** Create ProposalPage.tsx to display/edit generated proposal
**Notes:** Editable rich text, export to PDF

#### Task E-006-T-08
**Related User Story:** E-006-US-02
**Scope:** Frontend
**Description:** Add "Generate Proposal" button to DealHome.tsx
**Notes:** Navigates to ProposalPage, triggers generation

---

### Tasks for E-006-US-03 (Pricing Scenarios)

#### Task E-006-T-09
**Related User Story:** E-006-US-03
**Scope:** Database
**Description:** Create `pricing_scenarios` table
**Notes:** Columns: id, deal_id, user_id, name, pricing_model (hourly/fixed/value/retainer), rate, hours, discount_pct, payment_terms, total_value

#### Task E-006-T-10
**Related User Story:** E-006-US-03
**Scope:** Frontend
**Description:** Create PricingScenariosPage.tsx
**Notes:** Table view of scenarios, add/edit/delete, comparison view

#### Task E-006-T-11
**Related User Story:** E-006-US-03
**Scope:** Frontend
**Description:** Create AddScenarioModal component
**Notes:** Form: name, pricing_model, rate, hours, discount, payment_terms

#### Task E-006-T-12
**Related User Story:** E-006-US-03
**Scope:** Frontend
**Description:** Add scenario comparison table with calculated totals
**Notes:** Side-by-side columns, highlight differences, cash flow timeline

---

### Tasks for E-006-US-04 (Deal Timeline with Critical Path)

#### Task E-006-T-13
**Related User Story:** E-006-US-04
**Scope:** Database
**Description:** Add `dependencies` JSONB column to milestones table
**Notes:** Array of milestone IDs that this milestone depends on

#### Task E-006-T-14
**Related User Story:** E-006-US-04
**Scope:** Frontend
**Description:** Create TimelinePage.tsx with Gantt chart using react-gantt-timeline or similar
**Notes:** Show milestones as bars, meetings as points, dependencies as arrows

#### Task E-006-T-15
**Related User Story:** E-006-US-04
**Scope:** Frontend
**Description:** Add critical path highlighting logic
**Notes:** Calculate longest path through dependencies, highlight in red

#### Task E-006-T-16
**Related User Story:** E-006-US-04
**Scope:** Frontend
**Description:** Add drag-to-reschedule functionality for milestones
**Notes:** Update due_date on drag, recalculate critical path

---

## 4. IMPLEMENTATION PRIORITY RECOMMENDATION

### Phase 1: Foundation (Weeks 1-3)
**Goal:** Remove single-deal blocker, enable basic multi-deal workflows

**Epics:**
- E-001: Multi-Deal Pipeline Support (All user stories)

**Why:** This is the #1 adoption blocker. Without this, enterprise AEs will churn immediately. All other features depend on having a usable multi-deal foundation.

**Deliverables:**
- Remove DB constraint
- Deals list page
- Global deal selector
- Kanban pipeline view

---

### Phase 2: Intelligence Depth (Weeks 4-6)
**Goal:** Make "intelligence" live up to its name

**Epics:**
- E-002: Advanced Intelligence Extraction (US-01, US-02, US-03, US-04)
- E-004: Intelligent Prep Brief 2.0 (US-01, US-02, US-03)

**Why:** With multi-deal support in place, users will quickly realize extraction is too shallow. Deepen AI before they churn. Prep brief improvements are high-impact, low-effort.

**Deliverables:**
- Competitor extraction
- Budget signals
- Decision criteria
- Action items
- Personalized prep brief with talk tracks
- Competitive positioning
- Objection handling

---

### Phase 3: Relationship Intelligence (Weeks 7-8)
**Goal:** Make the relationship map actually useful

**Epics:**
- E-003: Smart Org Chart & Relationship Inference (All user stories)

**Why:** Once extraction is deeper, users have enough data to make the map valuable. Auto-layout and persistence are table stakes for usability.

**Deliverables:**
- Hierarchical org chart layout
- Persistent map positions
- Relationship strength indicators
- Manual editing with user-verified flag

---

### Phase 4: Feedback & Learning (Weeks 9-10)
**Goal:** Enable product improvement and ROI measurement

**Epics:**
- E-005: Analytics & Feedback Loop (All user stories)

**Why:** By now, users have real usage data. Analytics help them justify ROI. Feedback helps you improve AI accuracy and prioritize features.

**Deliverables:**
- Deal velocity metrics
- Stakeholder engagement metrics
- AI accuracy feedback (thumbs up/down)
- User analytics dashboard
- Product event tracking

---

### Phase 5: Consultant Niche (Weeks 11-13) - OPTIONAL
**Goal:** Lock in high-value consultant niche

**Epics:**
- E-006: Solo Consultant Power Features (All user stories)
- E-004: Intelligent Prep Brief 2.0 (US-04: Consultant mode)

**Why:** If Phase 1-4 traction is strong with enterprise AEs, skip this. If consultant niche shows promise, double down with these features.

**Deliverables:**
- Contract milestones
- Proposal generator
- Pricing scenarios
- Deal timeline with critical path

---

## 5. TECHNICAL RISK MITIGATION

### Database Migration Strategy
**Risk:** Breaking existing single-deal installations

**Mitigation:**
1. Create backup migration to preserve all existing deals as active
2. Test migration on staging DB with production-like data
3. Add rollback migration in case of issues
4. Communicate upgrade plan to existing users (email notice)

### AI Cost Management
**Risk:** Advanced extraction significantly increases token usage

**Mitigation:**
1. Add token usage logging (E-005-T-22)
2. Set per-user monthly limits (e.g., 50 extractions/month on free tier)
3. Optimize prompts for brevity (remove verbose instructions)
4. Consider caching common extraction patterns

### ReactFlow Performance
**Risk:** Large org charts (20+ stakeholders) may lag

**Mitigation:**
1. Lazy load nodes outside viewport
2. Limit auto-layout to <50 nodes, require manual layout above
3. Add pagination/filtering for very large maps
4. Test with synthetic 100-stakeholder dataset

### Edge Function Timeout
**Risk:** Complex prep brief generation may exceed 60s timeout

**Mitigation:**
1. Stream responses incrementally (SSE)
2. Break into smaller prompts if needed (e.g., stakeholder strategies separate from competitive)
3. Add timeout handling with partial results
4. Monitor p95 latency in E-005 analytics

---

## 6. SUCCESS METRICS (Per Epic)

### E-001: Multi-Deal Pipeline Support
- **Adoption:** % of users with 2+ active deals within 30 days
- **Engagement:** Avg # active deals per user
- **Retention:** Week 4 retention (expect 20%+ lift vs. single-deal)

### E-002: Advanced Intelligence Extraction
- **Accuracy:** Thumbs up/down ratio per extraction type
- **Completeness:** % of meetings with 3+ competitor mentions, 2+ budget signals
- **Value Perception:** Survey: "How valuable is AI extraction?" (1-5 scale)

### E-003: Smart Org Chart & Relationship Inference
- **Usage:** % of users who view StakeholderMap weekly
- **Customization:** % of users who drag nodes (indicates engagement)
- **Manual Edits:** Avg user-verified relationships per deal (want >2)

### E-004: Intelligent Prep Brief 2.0
- **Generation Rate:** Avg prep briefs generated per user per month
- **Usefulness:** Post-meeting survey: "Did prep brief help?" (yes/no)
- **Feature Usage:** % of users who click stakeholder strategies, competitive positioning

### E-005: Analytics & Feedback Loop
- **Feedback Volume:** # feedback submissions per 100 extractions
- **Analytics Engagement:** % of users who view AnalyticsPage monthly
- **Deal Velocity Impact:** Correlation between velocity visibility and deal close rate

### E-006: Solo Consultant Power Features
- **Consultant Adoption:** % of users who enable consultant mode
- **Milestone Usage:** Avg milestones per consultant deal
- **Proposal Gen:** % of consultants who generate proposals

---

## 7. OPEN QUESTIONS FOR STAKEHOLDER REVIEW

1. **Pricing Strategy:** Should multi-deal support be gated behind a paid tier, or free for all to maximize adoption?

2. **Consultant vs. AE Focus:** If we can only do Phase 4 OR Phase 5, which persona is higher priority based on current user data?

3. **Integration Readiness:** Should we plan for Salesforce/HubSpot integration in Phase 6, or keep it pure standalone for now?

4. **AI Model:** Should we test GPT-4 vs. Gemini 2.5 Flash for extraction quality, or is cost optimization more important?

5. **Mobile:** Is a mobile-responsive web app sufficient, or do power users need a native iOS/Android app?

6. **Collaboration:** Should we plan for team features (shared deals, comments, @mentions) or stay solo-user focused?

---

## END OF BACKLOG

**Total Epics:** 6
**Total User Stories:** 23
**Total Tasks:** 106

**Estimated Timeline:** 13 weeks (solo developer, full-time)
**Estimated Cost:** $0 additional infra (Supabase free tier supports this scale), AI costs ~$50-200/mo depending on usage

**Next Steps:**
1. Review & prioritize epics with product stakeholders
2. Refine ICE scores based on actual user feedback/data
3. Create sprint plan for Phase 1 (Weeks 1-3)
4. Set up analytics tracking (E-005) ASAP to measure baseline
5. Schedule user interviews to validate E-006 (consultant features)
