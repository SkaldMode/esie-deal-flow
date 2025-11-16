import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Building2, Filter, Network } from "lucide-react";

interface Stakeholder {
  id: string;
  name: string;
  role_title: string;
  department: string | null;
  stance: string | null;
  power: string | null;
  communication_style: string | null;
  created_at: string;
  meeting_count?: number;
}

interface Deal {
  account_name: string;
}

export default function Stakeholders() {
  const { dealId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [filteredStakeholders, setFilteredStakeholders] = useState<Stakeholder[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [stanceFilter, setStanceFilter] = useState<string>("all");
  const [powerFilter, setPowerFilter] = useState<string>("all");

  useEffect(() => {
    if (!user || !dealId) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch deal info
        const { data: dealData, error: dealError } = await supabase
          .from("deals")
          .select("account_name")
          .eq("id", dealId)
          .single();

        if (dealError) throw dealError;
        setDeal(dealData);

        // Fetch stakeholders with meeting count
        const { data: stakeholderData, error: stakeholderError } = await supabase
          .from("stakeholders")
          .select(`
            *,
            stakeholder_mentions(count)
          `)
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false });

        if (stakeholderError) throw stakeholderError;

        // Transform data to include meeting count
        const transformedData = stakeholderData?.map(s => ({
          ...s,
          meeting_count: s.stakeholder_mentions?.[0]?.count || 0
        })) || [];

        setStakeholders(transformedData);
        setFilteredStakeholders(transformedData);
      } catch (error: any) {
        toast({
          title: "Error loading stakeholders",
          description: error.message,
          variant: "destructive",
        });
        navigate(`/deal/${dealId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dealId, navigate, toast]);

  // Apply filters whenever filter state or stakeholders change
  useEffect(() => {
    let filtered = [...stakeholders];

    if (stanceFilter !== "all") {
      filtered = filtered.filter(s => s.stance === stanceFilter);
    }

    if (powerFilter !== "all") {
      filtered = filtered.filter(s => s.power === powerFilter);
    }

    setFilteredStakeholders(filtered);
  }, [stanceFilter, powerFilter, stakeholders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading stakeholders...</p>
      </div>
    );
  }

  if (!deal) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/deal/${dealId}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deal
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">{deal.account_name}</h1>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Stakeholder profiles auto-extracted from meeting notes
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/deal/${dealId}/stakeholder-map`)}
              className="gap-2"
            >
              <Network className="h-4 w-4" />
              View Relationship Map
            </Button>
          </div>
        </div>

        {/* Filters */}
        {stakeholders.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filter Stakeholders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Stance</label>
                  <Select value={stanceFilter} onValueChange={setStanceFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stances</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Power Level</label>
                  <Select value={powerFilter} onValueChange={setPowerFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Power Levels</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(stanceFilter !== "all" || powerFilter !== "all") && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStanceFilter("all");
                        setPowerFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results count */}
        {stakeholders.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredStakeholders.length} of {stakeholders.length} stakeholder{stakeholders.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {stakeholders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No stakeholders yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Stakeholder profiles will be automatically created when you add meeting notes
              </p>
              <Button onClick={() => navigate(`/deal/${dealId}/add-meeting`)}>
                Add Meeting Notes
              </Button>
            </CardContent>
          </Card>
        ) : filteredStakeholders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No stakeholders match filters</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your filters to see more results
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setStanceFilter("all");
                  setPowerFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredStakeholders.map((stakeholder) => (
              <Card 
                key={stakeholder.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/deal/${dealId}/stakeholder/${stakeholder.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{stakeholder.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {stakeholder.role_title}
                        {stakeholder.department && ` • ${stakeholder.department}`}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* AI-extracted attributes */}
                    <div className="flex flex-wrap gap-2">
                      {stakeholder.stance && (
                        <Badge
                          variant={
                            stakeholder.stance === 'positive' ? 'default' :
                            stakeholder.stance === 'negative' ? 'destructive' : 'secondary'
                          }
                        >
                          {stakeholder.stance} stance
                        </Badge>
                      )}
                      {stakeholder.power && (
                        <Badge variant="outline">
                          {stakeholder.power} power
                        </Badge>
                      )}
                    </div>

                    {/* Communication style */}
                    {stakeholder.communication_style && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Communication Style</p>
                        <p className="text-sm">{stakeholder.communication_style}</p>
                      </div>
                    )}

                    {/* Meeting mentions */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Mentioned in {stakeholder.meeting_count || 0} meeting{stakeholder.meeting_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
