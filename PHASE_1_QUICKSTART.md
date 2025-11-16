# Phase 1 Quick Start: Multi-Deal Pipeline Support
## 3-Week Implementation Guide

**Goal:** Remove single-deal limitation and enable sales reps to manage 5-20 concurrent deals

**Timeline:** 3 weeks (18 tasks)
**Priority:** 🔴 CRITICAL - This blocks all enterprise AE adoption

---

## Week 1: Database & Backend Foundation

### Day 1-2: Remove Single-Deal Constraint

#### ✅ Task E-001-T-01: Drop Unique Index
**File:** Create `supabase/migrations/[timestamp]_remove_single_deal_limit.sql`

```sql
-- Remove the unique index that enforces one active deal per user
DROP INDEX IF EXISTS idx_one_active_deal_per_user;

-- Remove the auto-archive trigger
DROP TRIGGER IF EXISTS auto_archive_deals ON deals;

-- Remove the trigger function
DROP FUNCTION IF EXISTS archive_old_active_deals();
```

**Test:**
```sql
-- Try creating 2 active deals for same user
INSERT INTO deals (user_id, account_name, deal_value, status)
VALUES
  ('test-user-id', 'Acme Corp', 100000, 'active'),
  ('test-user-id', 'Beta Inc', 50000, 'active');

-- Should succeed (no constraint error)
SELECT * FROM deals WHERE user_id = 'test-user-id' AND status = 'active';
-- Expected: 2 rows
```

---

#### ✅ Task E-001-T-02: Update RLS Policies
**File:** Same migration as above

```sql
-- Deals table policies already support multiple deals
-- Just verify they work correctly

-- Test query: User should see all their deals
SELECT id, account_name, status
FROM deals
WHERE user_id = auth.uid();

-- Add index for performance with many deals
CREATE INDEX IF NOT EXISTS idx_deals_user_status
ON deals(user_id, status)
WHERE status = 'active';

-- Add index for deal selector dropdown
CREATE INDEX IF NOT EXISTS idx_deals_user_created
ON deals(user_id, created_at DESC);
```

**Test:**
```bash
# In Supabase Dashboard > SQL Editor
# Switch to user context and verify:
# 1. Can see all own deals
# 2. Cannot see other users' deals
# 3. Can create/update/delete own deals
```

---

### Day 3-4: Frontend Infrastructure

#### ✅ Task E-001-T-16: Create Deal Context Provider
**File:** `src/contexts/DealContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

interface DealContextType {
  selectedDealId: string | null;
  setSelectedDealId: (dealId: string | null) => void;
  isLoading: boolean;
}

const DealContext = createContext<DealContextType | undefined>(undefined);

export function DealProvider({ children }: { children: React.ReactNode }) {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('esie_selected_deal_id');
    if (saved) {
      setSelectedDealId(saved);
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (selectedDealId) {
      localStorage.setItem('esie_selected_deal_id', selectedDealId);
    } else {
      localStorage.removeItem('esie_selected_deal_id');
    }
  }, [selectedDealId]);

  return (
    <DealContext.Provider value={{ selectedDealId, setSelectedDealId, isLoading }}>
      {children}
    </DealContext.Provider>
  );
}

export function useDeal() {
  const context = useContext(DealContext);
  if (!context) {
    throw new Error('useDeal must be used within DealProvider');
  }
  return context;
}
```

**Integration:** Update `src/App.tsx`

```typescript
import { DealProvider } from '@/contexts/DealContext';

function App() {
  return (
    <AuthProvider>
      <DealProvider>
        {/* existing app content */}
      </DealProvider>
    </AuthProvider>
  );
}
```

---

#### ✅ Task E-001-T-07: Remove Warning from CreateDeal
**File:** `src/pages/CreateDeal.tsx`

**Find and remove (lines 124-129):**
```typescript
// DELETE THIS:
<div className="text-amber-600 text-sm">
  Creating a new deal will automatically archive your current active deal.
</div>
```

**Replace with:**
```typescript
<p className="text-sm text-muted-foreground">
  You can manage multiple active deals. Switch between them using the deal selector in the navigation.
</p>
```

---

### Day 5: Update Landing Page

#### ✅ Task E-001-T-08: Redirect to Deals List
**File:** `src/pages/Index.tsx`

**Replace (lines 23-54):**
```typescript
// OLD: Auto-redirect to single active deal
useEffect(() => {
  if (!user) {
    navigate("/auth");
    return;
  }

  const fetchActiveDeal = async () => {
    const { data, error } = await supabase
      .from("deals")
      .select("id")
      .eq("status", "active")
      .maybeSingle();

    if (data) {
      navigate(`/deal/${data.id}`);
    } else {
      navigate("/create-deal");
    }
  };

  fetchActiveDeal();
}, [user, navigate]);
```

**NEW: Redirect to deals list**
```typescript
useEffect(() => {
  if (!user) {
    navigate("/auth");
    return;
  }

  // Redirect to deals list (will be created in Week 2)
  navigate("/deals");
}, [user, navigate]);
```

---

## Week 2: Core UI Components

### Day 1-3: Deals List Page

#### ✅ Task E-001-T-03: Create DealsListPage
**File:** `src/pages/DealsListPage.tsx`

```typescript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeal } from "@/contexts/DealContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, DollarSign, Calendar, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Deal {
  id: string;
  account_name: string;
  deal_value: number;
  currency: string;
  stage: string;
  expected_close_month: string;
  created_at: string;
  stakeholder_count?: number;
  last_meeting_date?: string;
}

export default function DealsListPage() {
  const { user } = useAuth();
  const { setSelectedDealId } = useDeal();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created" | "close_date" | "value">("created");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchDeals();
  }, [user]);

  const fetchDeals = async () => {
    try {
      setLoading(true);

      // Fetch active deals with aggregated data
      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select(`
          id,
          account_name,
          deal_value,
          currency,
          stage,
          expected_close_month,
          created_at
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (dealsError) throw dealsError;

      // Fetch stakeholder counts for each deal
      const dealsWithCounts = await Promise.all(
        (dealsData || []).map(async (deal) => {
          const { count: stakeholderCount } = await supabase
            .from("stakeholders")
            .select("*", { count: "exact", head: true })
            .eq("deal_id", deal.id);

          const { data: lastMeeting } = await supabase
            .from("meetings")
            .select("created_at")
            .eq("deal_id", deal.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...deal,
            stakeholder_count: stakeholderCount || 0,
            last_meeting_date: lastMeeting?.created_at || null,
          };
        })
      );

      setDeals(dealsWithCounts);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = (dealId: string) => {
    setSelectedDealId(dealId);
    navigate(`/deal/${dealId}`);
  };

  const filteredDeals = deals.filter((deal) => {
    if (filterStage === "all") return true;
    return deal.stage.toLowerCase() === filterStage.toLowerCase();
  });

  const sortedDeals = [...filteredDeals].sort((a, b) => {
    if (sortBy === "created") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "close_date") {
      return a.expected_close_month.localeCompare(b.expected_close_month);
    } else {
      return b.deal_value - a.deal_value;
    }
  });

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      "Discovery": "bg-blue-100 text-blue-800",
      "Demo": "bg-purple-100 text-purple-800",
      "Proposal": "bg-yellow-100 text-yellow-800",
      "Negotiation": "bg-orange-100 text-orange-800",
      "Closed Won": "bg-green-100 text-green-800",
      "Closed Lost": "bg-gray-100 text-gray-800",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Pipeline</h1>
          <p className="text-muted-foreground">
            {deals.length} active {deals.length === 1 ? "deal" : "deals"}
          </p>
        </div>
        <Button onClick={() => navigate("/create-deal")}>
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          <Button
            variant={filterStage === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStage("all")}
          >
            All
          </Button>
          {["Discovery", "Demo", "Proposal", "Negotiation"].map((stage) => (
            <Button
              key={stage}
              variant={filterStage === stage ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStage(stage)}
            >
              {stage}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="created">Recently Created</option>
            <option value="close_date">Close Date</option>
            <option value="value">Deal Value</option>
          </select>
        </div>
      </div>

      {/* Deals Grid */}
      {loading ? (
        <div className="text-center py-12">Loading deals...</div>
      ) : sortedDeals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deals found</h3>
            <p className="text-muted-foreground mb-4">
              {filterStage === "all"
                ? "Create your first deal to get started"
                : `No deals in ${filterStage} stage`}
            </p>
            {filterStage === "all" && (
              <Button onClick={() => navigate("/create-deal")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Deal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedDeals.map((deal) => (
            <Card
              key={deal.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleDealClick(deal.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{deal.account_name}</CardTitle>
                  <Badge className={getStageColor(deal.stage)}>{deal.stage}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-semibold">
                    {deal.deal_value.toLocaleString()} {deal.currency}
                  </span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Close: {deal.expected_close_month}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{deal.stakeholder_count} stakeholders</span>
                </div>
                {deal.last_meeting_date && (
                  <div className="text-xs text-muted-foreground">
                    Last activity:{" "}
                    {formatDistanceToNow(new Date(deal.last_meeting_date), {
                      addSuffix: true,
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

#### ✅ Task E-001-T-04: Add Route
**File:** `src/App.tsx` or your routing file

```typescript
import DealsListPage from "@/pages/DealsListPage";

// Add route:
<Route path="/deals" element={<DealsListPage />} />
```

---

### Day 4-5: Global Navigation

#### ✅ Task E-001-T-15: Create Deal Selector Component
**File:** `src/components/DealSelector.tsx`

```typescript
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDeal } from "@/contexts/DealContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface DealOption {
  id: string;
  account_name: string;
  stage: string;
}

export function DealSelector() {
  const { user } = useAuth();
  const { selectedDealId, setSelectedDealId } = useDeal();
  const navigate = useNavigate();
  const location = useLocation();
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDeals();
    }
  }, [user]);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("id, account_name, stage")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeals(data || []);

      // If no deal selected but deals exist, select first one
      if (!selectedDealId && data && data.length > 0) {
        setSelectedDealId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealChange = (dealId: string) => {
    setSelectedDealId(dealId);

    // If on a deal-specific page, navigate to that page for the new deal
    if (location.pathname.startsWith("/deal/")) {
      const pathSuffix = location.pathname.split("/").slice(3).join("/");
      navigate(`/deal/${dealId}${pathSuffix ? "/" + pathSuffix : ""}`);
    }
  };

  if (loading || deals.length === 0) {
    return null;
  }

  return (
    <Select value={selectedDealId || undefined} onValueChange={handleDealChange}>
      <SelectTrigger className="w-[250px]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <SelectValue placeholder="Select a deal" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {deals.map((deal) => (
          <SelectItem key={deal.id} value={deal.id}>
            <div className="flex flex-col">
              <span className="font-medium">{deal.account_name}</span>
              <span className="text-xs text-muted-foreground">{deal.stage}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

#### ✅ Task E-001-T-18: Add Global Navigation Bar
**File:** `src/components/Navigation.tsx` (create new)

```typescript
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DealSelector } from "@/components/DealSelector";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Archive, LogOut } from "lucide-react";

export function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/deals" className="text-xl font-bold">
            Esie
          </Link>

          <DealSelector />

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/deals">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Pipeline
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/archived-deals">
                <Archive className="h-4 w-4 mr-2" />
                Archived
              </Link>
            </Button>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
```

**Add to App.tsx:**
```typescript
import { Navigation } from "@/components/Navigation";

function App() {
  return (
    <AuthProvider>
      <DealProvider>
        <Navigation />
        {/* existing routes */}
      </DealProvider>
    </AuthProvider>
  );
}
```

---

#### ✅ Task E-001-T-17: Update Deal Pages to Use Context
**Files:** `src/pages/DealHome.tsx`, `src/pages/Stakeholders.tsx`, etc.

**Find (in each page):**
```typescript
// OLD: Fetch single active deal
const { data: dealData } = await supabase
  .from("deals")
  .select("*")
  .eq("status", "active")
  .maybeSingle();
```

**Replace with:**
```typescript
import { useDeal } from "@/contexts/DealContext";

export default function DealHome() {
  const { selectedDealId } = useDeal();

  // NEW: Fetch selected deal
  const { data: dealData } = await supabase
    .from("deals")
    .select("*")
    .eq("id", selectedDealId)
    .single();
}
```

**Pages to update:**
- `src/pages/DealHome.tsx`
- `src/pages/Stakeholders.tsx`
- `src/pages/StakeholderMap.tsx`
- `src/pages/PrepBrief.tsx`
- (Any page that fetches deal data)

---

## Week 3: Pipeline View & Polish

### Day 1-3: Kanban Pipeline Board

#### ✅ Task E-001-T-11: Install Dependencies
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

#### ✅ Task E-001-T-11-14: Create Pipeline Kanban Page
**File:** `src/pages/PipelineKanbanPage.tsx`

```typescript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeal } from "@/contexts/DealContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STAGES = [
  "Discovery",
  "Demo",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

interface Deal {
  id: string;
  account_name: string;
  deal_value: number;
  currency: string;
  stage: string;
}

function DealCard({ deal }: { deal: Deal }) {
  const { setSelectedDealId } = useDeal();
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = () => {
    setSelectedDealId(deal.id);
    navigate(`/deal/${deal.id}`);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-move hover:shadow-md transition-shadow mb-3">
        <CardContent className="p-4">
          <h3
            className="font-semibold mb-2 cursor-pointer hover:text-primary"
            onClick={handleClick}
          >
            {deal.account_name}
          </h3>
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 mr-1" />
            <span>
              {deal.deal_value.toLocaleString()} {deal.currency}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PipelineKanbanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDeals();
  }, [user]);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("id, account_name, deal_value, currency, stage")
        .eq("status", "active");

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const dealId = active.id as string;
    const newStage = over.id as string;

    // Optimistic update
    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === dealId ? { ...deal, stage: newStage } : deal
      )
    );

    // Update in database
    try {
      const { error } = await supabase
        .from("deals")
        .update({ stage: newStage })
        .eq("id", dealId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating deal stage:", error);
      // Revert on error
      fetchDeals();
    }

    setActiveId(null);
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter((deal) => deal.stage === stage);
  };

  const getStageValue = (stage: string) => {
    const stageDeals = getDealsByStage(stage);
    return stageDeals.reduce((sum, deal) => sum + deal.deal_value, 0);
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading pipeline...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Pipeline Board</h1>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-6 gap-4">
          {STAGES.map((stage) => {
            const stageDeals = getDealsByStage(stage);
            const stageValue = getStageValue(stage);

            return (
              <SortableContext key={stage} id={stage} items={stageDeals.map((d) => d.id)}>
                <div>
                  <Card className="mb-3">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-semibold">{stage}</CardTitle>
                      <div className="text-xs text-muted-foreground">
                        {stageDeals.length} deals
                      </div>
                      <div className="text-sm font-semibold">
                        ${(stageValue / 1000).toFixed(0)}K
                      </div>
                    </CardHeader>
                  </Card>

                  <div className="min-h-[400px]">
                    {stageDeals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <DealCard deal={deals.find((d) => d.id === activeId)!} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
```

**Add route:**
```typescript
<Route path="/pipeline" element={<PipelineKanbanPage />} />
```

---

### Day 4: Add Archive Functionality

#### ✅ Task E-001-T-09: Add Archive Button to DealHome
**File:** `src/pages/DealHome.tsx`

**Add to actions section:**
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Archive } from "lucide-react";

// In the component:
const handleArchive = async () => {
  if (!deal) return;

  try {
    const { error } = await supabase
      .from("deals")
      .update({ status: "archived" })
      .eq("id", deal.id);

    if (error) throw error;

    toast({
      title: "Deal archived",
      description: "This deal has been moved to archived deals.",
    });

    navigate("/deals");
  } catch (error) {
    console.error("Error archiving deal:", error);
    toast({
      title: "Error",
      description: "Failed to archive deal",
      variant: "destructive",
    });
  }
};

// Add button:
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline">
      <Archive className="h-4 w-4 mr-2" />
      Archive Deal
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Archive this deal?</AlertDialogTitle>
      <AlertDialogDescription>
        This will move the deal to archived status. You can restore it later.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

#### ✅ Task E-001-T-10: Add Restore to ArchivedDeals
**File:** `src/pages/ArchivedDeals.tsx`

**Add restore button to each deal card:**
```typescript
const handleRestore = async (dealId: string) => {
  try {
    const { error } = await supabase
      .from("deals")
      .update({ status: "active" })
      .eq("id", dealId);

    if (error) throw error;

    toast({
      title: "Deal restored",
      description: "This deal has been restored to active status.",
    });

    // Refresh list
    fetchArchivedDeals();
  } catch (error) {
    console.error("Error restoring deal:", error);
    toast({
      title: "Error",
      description: "Failed to restore deal",
      variant: "destructive",
    });
  }
};

// In the deal card:
<Button variant="outline" size="sm" onClick={() => handleRestore(deal.id)}>
  Restore
</Button>
```

---

### Day 5: Testing & Polish

#### ✅ Final Testing Checklist

- [ ] Create 3+ deals with different stages
- [ ] Switch between deals using selector
- [ ] Verify stakeholders/meetings/map show correct data per deal
- [ ] Drag deals between stages in pipeline board
- [ ] Filter deals by stage in list view
- [ ] Sort deals by value/close date/created
- [ ] Archive a deal, verify it disappears from active list
- [ ] Restore archived deal, verify it appears in active list
- [ ] Test navigation: selector should update current page to new deal
- [ ] Verify localStorage persists selected deal on page reload

---

## Success Criteria (Phase 1)

✅ **Phase 1 is complete when:**

1. Users can create unlimited active deals (no DB constraint error)
2. Deals list page shows all active deals with filters/sort
3. Global deal selector in nav switches between deals
4. All deal-specific pages (dashboard, stakeholders, map, etc.) respect selected deal
5. Pipeline Kanban board displays deals by stage with drag-to-update
6. Archive/restore functionality works correctly
7. Navigation persists across page reloads (localStorage)
8. No breaking changes to existing single-deal users

---

## Database Queries for Validation

**Check multi-deal support:**
```sql
SELECT user_id, COUNT(*) as active_deals
FROM deals
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

**Expected:** Multiple rows (users with 2+ active deals)

**Check performance with many deals:**
```sql
EXPLAIN ANALYZE
SELECT id, account_name, deal_value, stage, created_at
FROM deals
WHERE user_id = 'test-user-id' AND status = 'active'
ORDER BY created_at DESC;
```

**Expected:** Index scan on `idx_deals_user_status`, <10ms

---

## Common Issues & Solutions

### Issue 1: Selector doesn't update page content
**Cause:** Page components still fetching by status='active' instead of selectedDealId

**Fix:** Update all deal pages to use:
```typescript
const { selectedDealId } = useDeal();
// Query by .eq("id", selectedDealId) instead of .eq("status", "active")
```

### Issue 2: Layout breaks with 20+ deals in pipeline
**Cause:** Too many columns in grid

**Fix:** Make grid scrollable horizontally:
```css
<div className="grid grid-cols-6 gap-4 overflow-x-auto min-w-max">
```

### Issue 3: Drag-drop feels laggy
**Cause:** Re-fetching data on every drop

**Fix:** Optimistic updates (already implemented in code above)

---

## Next Steps After Phase 1

Once Phase 1 is shipped and validated:

1. **Measure baseline metrics** (E-005 Analytics):
   - % users with 2+ active deals
   - Avg deals per user
   - Week 4 retention vs. pre-Phase 1

2. **Gather user feedback**:
   - Survey: "How useful is multi-deal support?" (1-5)
   - Watch for feature requests (competitor tracking, budget signals)

3. **Plan Phase 2** (Advanced Intelligence):
   - Review `PRODUCT_BACKLOG.md` tasks E-002-T-01 through E-002-T-22
   - Prioritize: Competitor > Budget Signals > Decision Criteria
   - Sprint planning for 3-week implementation

---

**Questions?** Refer to full backlog: `PRODUCT_BACKLOG.md`
**Stuck?** Check code references in each task - all point to real files
