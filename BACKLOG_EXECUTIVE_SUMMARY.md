# Esie Product Backlog - Executive Summary

**Date:** 2025-11-16
**Analyst:** Technical Product Analysis
**Scope:** MVP Evolution Strategy for Esie (Enterprise Sales Intelligence Engine)

---

## TL;DR: Critical Findings

**Status:** 🔴 **CRITICAL ADOPTION BLOCKER IDENTIFIED**

The single-deal limitation (`supabase/migrations/20251115223221*.sql:15-18`) prevents enterprise AEs from using Esie in real workflows. Sales reps manage 5-20 concurrent deals; forcing them to archive/switch is a dealbreaker.

**Recommendation:** Implement Phase 1 (Multi-Deal Pipeline Support) immediately before marketing to enterprise segment.

---

## The 5 Critical Gaps

### 🔴 Gap 1: Single-Deal Limitation (P0 - BLOCKER)
**Current State:** Database enforces one active deal per user via unique constraint
**Impact:** Enterprise AEs cannot adopt product - incompatible with real sales workflows
**Fix:** E-001 (Multi-Deal Pipeline Support) - 3 weeks, 18 tasks
**Code Location:** `supabase/migrations/20251115223221*.sql:15-18`

### 🟡 Gap 2: Shallow AI Extraction (P1 - VALUE PROP)
**Current State:** Extracts 6 data types (stakeholders, quotes, objections, risks, approval clues, relationships)
**Missing:** Competitor mentions, budget signals, decision criteria, action items, sentiment trends
**Impact:** "Intelligence" feels like basic note-taking, not differentiated vs. manual CRM entry
**Fix:** E-002 (Advanced Intelligence Extraction) - 2 weeks, 22 tasks
**Code Location:** `supabase/functions/extract-meeting-intelligence/index.ts:10-48`

### 🟡 Gap 3: Semi-Manual Relationship Map (P1 - UX)
**Current State:** AI extracts relationships but layout resets to circle on every load
**Missing:** Auto org chart, persistent positions, visual hierarchy, relationship strength
**Impact:** Users expect "auto-magic" but get manual work - breaks automation promise
**Fix:** E-003 (Smart Org Chart) - 2 weeks, 17 tasks
**Code Location:** `src/pages/StakeholderMap.tsx`

### 🟡 Gap 4: Generic Prep Brief (P1 - VALUE PROP)
**Current State:** Template-based aggregation of stakeholders + last 3 meetings + top risks
**Missing:** Personalized talk tracks, competitive positioning, objection handling scripts
**Impact:** Users can create this themselves in 5 minutes - not worth paying for
**Fix:** E-004 (Intelligent Prep Brief 2.0) - 2 weeks, 15 tasks
**Code Location:** `supabase/functions/generate-prep-brief/index.ts:80-131`

### 🟢 Gap 5: No Analytics/Feedback Loop (P2 - LEARNING)
**Current State:** No user-facing metrics or AI accuracy feedback
**Missing:** Deal velocity, stakeholder engagement, ROI measurement, product improvement data
**Impact:** Users can't justify spend, product team can't improve AI
**Fix:** E-005 (Analytics & Feedback Loop) - 2 weeks, 22 tasks
**Code Location:** No existing implementation

---

## Strategic Roadmap

### Phase 1: Foundation (Weeks 1-3) 🔴 CRITICAL PATH
**Epic:** E-001 Multi-Deal Pipeline Support
**Goal:** Remove the #1 adoption blocker

**Deliverables:**
- ✅ Remove DB unique constraint
- ✅ Deals list page (table/card view with filters)
- ✅ Global deal selector in navigation
- ✅ Kanban pipeline board (drag-to-update stages)

**Success Metric:** 30%+ of users manage 2+ active deals within 30 days

**Why This First:** Without this, enterprise AEs will churn on day 1. All other improvements are irrelevant if users can't adopt the product.

---

### Phase 2: Intelligence Depth (Weeks 4-6) 🟡 HIGH VALUE
**Epics:** E-002 Advanced Extraction + E-004 Smart Prep Briefs
**Goal:** Make "intelligence" live up to the product promise

**Deliverables:**
- ✅ Competitor mentions extraction
- ✅ Budget signals & decision criteria
- ✅ Action items tracking
- ✅ Personalized stakeholder talk tracks
- ✅ Competitive positioning guidance
- ✅ Objection handling scripts

**Success Metric:** 70%+ thumbs-up on AI extraction accuracy

**Why This Second:** Once users can manage multiple deals, they'll quickly realize extraction is too shallow. Deepen AI before they churn.

---

### Phase 3: Relationship Intelligence (Weeks 7-8) 🟡 UX POLISH
**Epic:** E-003 Smart Org Chart & Relationship Inference
**Goal:** Make the relationship map actually useful

**Deliverables:**
- ✅ Auto-generated hierarchical org chart
- ✅ Persistent node positions (no more reset!)
- ✅ Relationship strength indicators
- ✅ Manual editing with user-verified flag

**Success Metric:** 40%+ weekly active usage of StakeholderMap

**Why This Third:** With deeper extraction, users have enough data to make the map valuable. Auto-layout and persistence are table stakes for usability.

---

### Phase 4: Feedback & Learning (Weeks 9-10) 🟢 ENABLER
**Epic:** E-005 Analytics & Feedback Loop
**Goal:** Enable ROI measurement and continuous improvement

**Deliverables:**
- ✅ Deal velocity metrics (stage transitions, time tracking)
- ✅ Stakeholder engagement tracking (re-engage warnings)
- ✅ AI accuracy feedback (thumbs up/down)
- ✅ User analytics dashboard
- ✅ Product event tracking (DAU/WAU/MAU)

**Success Metric:** 50%+ of users view analytics monthly

**Why This Fourth:** By now, users have real usage data. Analytics help them justify ROI and give you data to improve AI.

---

### Phase 5: Consultant Niche (Weeks 11-13) 🔵 OPTIONAL
**Epic:** E-006 Solo Consultant Power Features
**Goal:** Lock in high-value consultant niche

**Deliverables:**
- ✅ Contract milestone tracking
- ✅ Proposal template generator
- ✅ Pricing scenario modeler
- ✅ Deal timeline with critical path

**Success Metric:** 60%+ of consultants use milestones feature

**Decision Point:** Only pursue if Phase 1-4 shows strong consultant adoption. If enterprise AE traction is strong, skip this and focus on team features instead.

---

## Resource Requirements

### Development Effort
- **Total Timeline:** 13 weeks (solo developer, full-time)
- **Phase 1:** 3 weeks (18 tasks) - **START HERE**
- **Phase 2:** 3 weeks (37 tasks combined)
- **Phase 3:** 2 weeks (17 tasks)
- **Phase 4:** 2 weeks (22 tasks)
- **Phase 5:** 3 weeks (16 tasks) - optional

### Technical Stack (No Changes)
- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** Lovable AI Gateway (Gemini 2.5 Flash)

### Cost Impact
- **Infrastructure:** $0 (stays within Supabase free tier)
- **AI Usage:** $50-200/month (depends on extraction volume)
- **Total:** Minimal cost increase

---

## Quick Start: Implementing Phase 1

### Week 1: Database & API Foundation

**Day 1-2: Remove Single-Deal Constraint**
```sql
-- Task E-001-T-01
-- File: Create new migration
DROP INDEX IF EXISTS idx_one_active_deal_per_user;
DROP TRIGGER IF EXISTS auto_archive_deals ON deals;
DROP FUNCTION IF EXISTS archive_old_active_deals();
```

**Day 3-4: Update RLS Policies**
```sql
-- Task E-001-T-02
-- Allow users to have multiple active deals
-- Update existing policies to handle deal_id context
```

**Day 5: Test Data**
- Create test dataset with 10 deals per user
- Verify queries perform well (add indexes if needed)

---

### Week 2: Core UI Components

**Day 1-3: Deals List Page (Task E-001-T-03)**
- Create `src/pages/DealsListPage.tsx`
- Table/card view with: account_name, deal_value, stage, close_date
- Client-side filter/sort
- Click navigation to DealHome/:dealId

**Day 4-5: Deal Context Provider (Task E-001-T-16)**
- Create `src/contexts/DealContext.tsx`
- Manage selectedDealId globally
- Persist to localStorage
- Update all deal pages to read from context

---

### Week 3: Pipeline View & Polish

**Day 1-3: Kanban Pipeline (Tasks E-001-T-11 through E-001-T-14)**
- Create `src/pages/PipelineKanbanPage.tsx`
- Use react-beautiful-dnd or @dnd-kit
- 6 columns: Discovery → Demo → Proposal → Negotiation → Closed Won/Lost
- Drag-to-update stage with optimistic UI

**Day 4-5: Global Navigation (Tasks E-001-T-15, E-001-T-18)**
- Add DealSelector dropdown to nav bar
- Add Pipeline and Archived Deals links
- Test navigation flow across all pages

---

## Success Metrics Dashboard

Track these KPIs post-Phase 1 launch:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Adoption Rate** | 30%+ users with 2+ deals in 30 days | Query: `SELECT COUNT(DISTINCT user_id) FROM deals WHERE status='active' GROUP BY user_id HAVING COUNT(*) >= 2` |
| **Engagement** | 3.5 avg active deals per user | Query: `SELECT AVG(deal_count) FROM (SELECT user_id, COUNT(*) as deal_count FROM deals WHERE status='active' GROUP BY user_id)` |
| **Retention** | 20%+ lift in Week 4 retention | Compare cohorts before/after multi-deal launch |
| **Time to Value** | 50% reduce time to add 2nd deal | Track timestamps between deal creations |

Post-Phase 2 (Advanced Extraction):

| Metric | Target | Measurement |
|--------|--------|-------------|
| **AI Accuracy** | 70%+ thumbs up | Query: `extraction_feedback` table, ratio of thumbs_up / total |
| **Feature Usage** | 60%+ meetings have competitor data | Query: `SELECT COUNT(*) FROM meetings WHERE competitor_mentions IS NOT NULL` |
| **User Satisfaction** | 4.0+ on "AI extraction quality" | In-app survey after 10 meetings |

---

## Risk Mitigation

### Risk 1: Breaking Existing Users
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Write comprehensive migration tests
- Deploy to staging first with production-like data
- Email existing users 1 week before upgrade
- Provide rollback migration

### Risk 2: AI Cost Explosion
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Implement per-user monthly limits (e.g., 50 extractions/month free tier)
- Add token usage logging (E-005-T-22)
- Monitor cost per extraction, alert if >$0.10
- Optimize prompts for brevity

### Risk 3: Performance Degradation
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Add database indexes: `deals(user_id, status)`, `meetings(deal_id, created_at)`
- Test queries with 100+ deals per user
- Implement pagination on deals list (50 per page)
- Add loading states everywhere

### Risk 4: Scope Creep
**Probability:** High
**Impact:** Medium
**Mitigation:**
- Stick to defined user stories, no ad-hoc features
- Use ICE scores to ruthlessly prioritize
- Ship Phase 1 in 3 weeks max, no exceptions
- Defer nice-to-haves to Phase 5

---

## Decision Framework: AE vs. Consultant Focus

After Phase 1-4, you'll have data to decide on Phase 5 (Consultant Features). Use this framework:

### Pursue Consultant Niche (E-006) IF:
✅ 40%+ of users have `expected_close_month` > 6 months out (consultant deal cycles)
✅ Avg deal value > $50k (consultant project sizes)
✅ Users request features like: milestones, proposals, pricing scenarios
✅ <10 stakeholders per deal (smaller buying committees)
✅ User interviews confirm consultant pain points

### Focus on Enterprise AE Features INSTEAD IF:
✅ 60%+ of users have 5+ active deals (AE pipeline scale)
✅ Users request features like: Salesforce sync, team collaboration, forecasting
✅ High churn in first 30 days despite multi-deal support
✅ Avg deal velocity < 90 days (fast AE sales cycles)
✅ User feedback emphasizes "team selling" and "handoffs"

---

## Open Questions for Stakeholders

Before starting Phase 1, get alignment on:

### 1. Pricing Strategy
**Question:** Should multi-deal support be gated behind a paid tier?

**Option A (Free for All):**
- ✅ Maximizes adoption, removes friction
- ✅ Easier to gather usage data for pricing decisions later
- ❌ Harder to monetize base feature later
- ❌ May attract low-value users

**Option B (Paid Feature):**
- ✅ Clear value prop for paid tier
- ✅ Filters for serious users
- ❌ Limits adoption, harder to test product-market fit
- ❌ Complex to implement paywall mid-flow

**Recommendation:** Free for all in Phase 1, gate advanced features (E-002, E-004, E-006) behind paid tier in Phase 2.

### 2. Integration Roadmap
**Question:** Should we plan Salesforce/HubSpot integration after Phase 4?

**Considerations:**
- Enterprise AEs live in Salesforce - integration is table stakes
- But integration is 4-6 weeks of work (large scope)
- Could partner with Zapier for MVP integration instead (1 week)
- Wait until 100+ paid users to justify integration effort

**Recommendation:** Ship Zapier integration in Phase 4, delay native SFDC integration until $10k MRR.

### 3. AI Model Selection
**Question:** Stick with Gemini 2.5 Flash or test GPT-4?

**Current:** Gemini 2.5 Flash via Lovable AI Gateway ($0.001-0.003 per extraction)

**GPT-4 Option:**
- ✅ Better extraction accuracy (especially complex objections)
- ✅ Better relationship inference
- ❌ 5-10x more expensive ($0.015-0.050 per extraction)
- ❌ Requires OpenAI API integration

**Recommendation:** Stick with Gemini for Phase 1-2, A/B test GPT-4 on 10% of users in Phase 3 if accuracy feedback is <70%.

### 4. Mobile Strategy
**Question:** Is mobile-responsive web sufficient, or do we need native apps?

**Web-Only:**
- ✅ Faster to ship, maintain one codebase
- ✅ Most sales prep happens at desk before meeting
- ❌ Poor experience for in-meeting note-taking
- ❌ No offline support

**Native App:**
- ✅ Better UX for in-meeting scenarios
- ✅ Offline note capture, sync later
- ❌ 8-12 weeks additional dev time
- ❌ App store approval, maintenance burden

**Recommendation:** Ship mobile-responsive web in Phase 1-4. Build native app only if 30%+ of usage is mobile web (track with analytics in E-005).

### 5. Collaboration Features
**Question:** Should we plan team features (shared deals, @mentions, comments)?

**Solo-User Path:**
- ✅ Simpler product, faster iteration
- ✅ Fits consultant niche perfectly
- ❌ Limits enterprise sale (teams need collaboration)
- ❌ Harder to expand contract value

**Team-Enabled Path:**
- ✅ Higher ACV, land-and-expand motion
- ✅ Network effects (users invite teammates)
- ❌ 6-8 weeks of additional dev (permissions, sharing, notifications)
- ❌ Complex pricing tiers

**Recommendation:** Stay solo-user through Phase 4. Add team features in Phase 6 only if 40%+ of users request it in feedback.

---

## Next Steps: Get Started Today

### 1. Review & Validate (1 day)
- [ ] Read full `PRODUCT_BACKLOG.md` (1,395 lines)
- [ ] Validate epic priorities with product stakeholders
- [ ] Answer the 5 open questions above
- [ ] Get alignment on Phase 1 timeline

### 2. Sprint Planning (2 days)
- [ ] Create sprint board (use GitHub Projects or Lovable)
- [ ] Import tasks E-001-T-01 through E-001-T-18
- [ ] Assign tasks to weeks (Week 1: DB, Week 2: UI, Week 3: Pipeline)
- [ ] Set up daily standups (async if solo)

### 3. Set Up Analytics Baseline (1 day)
- [ ] Implement basic event tracking (create `events` table)
- [ ] Track: user_signup, deal_created, meeting_added
- [ ] Measure current baseline: avg deals per user, retention rates
- [ ] Set up dashboard (simple Supabase query or Metabase)

### 4. Start Phase 1 Development (Week 1)
- [ ] Create new migration file
- [ ] Remove `idx_one_active_deal_per_user` constraint
- [ ] Remove `archive_old_active_deals` trigger
- [ ] Test with multiple active deals per user
- [ ] Update RLS policies

### 5. User Validation (Ongoing)
- [ ] Schedule 5 user interviews (2 AEs, 2 consultants, 1 founder)
- [ ] Ask: "How many deals do you manage concurrently?"
- [ ] Validate: Competitor tracking, budget signals, decision criteria priorities
- [ ] Get early feedback on wireframes (DealsListPage, Pipeline Kanban)

---

## Resources & References

### Documentation
- **Full Backlog:** `PRODUCT_BACKLOG.md` (all 23 user stories, 106 tasks)
- **Codebase Analysis:** See exploration summary in backlog Section 1-11
- **Current Schema:** `supabase/migrations/` (8 migration files)

### Key Code Locations
- Single-deal constraint: `supabase/migrations/20251115223221*.sql:15-18`
- AI extraction: `supabase/functions/extract-meeting-intelligence/index.ts`
- Prep brief: `supabase/functions/generate-prep-brief/index.ts`
- Stakeholder map: `src/pages/StakeholderMap.tsx`
- Deal dashboard: `src/pages/DealHome.tsx` (453 lines)

### External Tools
- **React Beautiful DnD:** For Kanban drag-drop (Phase 1)
- **Recharts:** For analytics charts (Phase 4)
- **ReactFlow:** Already in use for StakeholderMap (Phase 3)
- **Dagre/ELK:** For auto-layout algorithm (Phase 3)

---

## Contact & Feedback

**Questions on this backlog?**
- Review the detailed task descriptions in `PRODUCT_BACKLOG.md`
- All tasks include: Scope, Description, Technical Notes, Code References

**Found gaps or disagreements?**
- This analysis is based on codebase state as of 2025-11-16
- Validate assumptions with real user interviews
- Adjust ICE scores based on your market data

**Ready to ship?**
- Start with Phase 1, Week 1, Task E-001-T-01
- Ship incrementally, get user feedback early
- Use analytics (E-005) to validate decisions

---

**Last Updated:** 2025-11-16
**Version:** 1.0
**Status:** ✅ Ready for Implementation
