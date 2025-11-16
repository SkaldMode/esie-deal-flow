/**
 * Deals List Page
 * Epic: E-001 Multi-Deal Pipeline Support
 * Task: E-001-T-03, E-001-T-04, E-001-T-05, E-001-T-06
 *
 * Displays all active deals in a grid/list view with filters and sorting.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeal } from "@/contexts/DealContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, DollarSign, Calendar, Users, Loader2, ArrowUpDown } from "lucide-react";
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

      // Fetch active deals
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

      // Fetch stakeholder counts and last meeting dates for each deal
      const dealsWithMetadata = await Promise.all(
        (dealsData || []).map(async (deal) => {
          // Get stakeholder count
          const { count: stakeholderCount } = await supabase
            .from("stakeholders")
            .select("*", { count: "exact", head: true })
            .eq("deal_id", deal.id);

          // Get last meeting date
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

      setDeals(dealsWithMetadata);
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

  // Filter deals by stage
  const filteredDeals = deals.filter((deal) => {
    if (filterStage === "all") return true;
    return deal.stage.toLowerCase() === filterStage.toLowerCase();
  });

  // Sort deals
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
      "Discovery": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      "Demo": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      "Proposal": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      "Negotiation": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
      "Closed Won": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      "Closed Lost": "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const getDaysSinceLastActivity = (lastMeetingDate: string | null) => {
    if (!lastMeetingDate) return null;
    const days = Math.floor(
      (new Date().getTime() - new Date(lastMeetingDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
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

      {/* Filters and Sort */}
      <div className="flex gap-4 mb-6 flex-wrap">
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

        <div className="ml-auto flex gap-2 items-center">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border rounded px-3 py-1.5 text-sm bg-background"
          >
            <option value="created">Recently Created</option>
            <option value="close_date">Close Date</option>
            <option value="value">Deal Value</option>
          </select>
        </div>
      </div>

      {/* Deals Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
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
          {sortedDeals.map((deal) => {
            const daysSinceActivity = getDaysSinceLastActivity(deal.last_meeting_date);
            const isStale = daysSinceActivity !== null && daysSinceActivity > 14;

            return (
              <Card
                key={deal.id}
                className="cursor-pointer hover:shadow-lg transition-shadow relative"
                onClick={() => handleDealClick(deal.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg line-clamp-2">{deal.account_name}</CardTitle>
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
                  {deal.last_meeting_date ? (
                    <div className={`text-xs ${isStale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      Last activity:{" "}
                      {formatDistanceToNow(new Date(deal.last_meeting_date), {
                        addSuffix: true,
                      })}
                      {isStale && " ⚠️"}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No meetings yet
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
