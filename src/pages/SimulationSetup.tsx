import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Building2, Target, Play } from "lucide-react";

interface Stakeholder {
  id: string;
  name: string;
  role_title: string;
  department: string | null;
  stance: string | null;
  power: string | null;
  communication_style: string | null;
}

interface Deal {
  id: string;
  account_name: string;
  deal_value: number;
  currency: string;
  stage: string;
}

export default function SimulationSetup() {
  const { dealId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedStakeholderIds, setSelectedStakeholderIds] = useState<string[]>([]);
  const [meetingGoal, setMeetingGoal] = useState("");
  const [loading, setLoading] = useState(true);

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
          .select("*")
          .eq("id", dealId)
          .single();

        if (dealError) throw dealError;
        setDeal(dealData);

        // Fetch stakeholders
        const { data: stakeholdersData, error: stakeholdersError } = await supabase
          .from("stakeholders")
          .select("*")
          .eq("deal_id", dealId)
          .order("power", { ascending: false });

        if (stakeholdersError) throw stakeholdersError;
        setStakeholders(stakeholdersData || []);
      } catch (error: any) {
        toast({
          title: "Error loading data",
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

  const toggleStakeholder = (stakeholderId: string) => {
    setSelectedStakeholderIds((prev) => {
      if (prev.includes(stakeholderId)) {
        return prev.filter((id) => id !== stakeholderId);
      } else if (prev.length < 3) {
        return [...prev, stakeholderId];
      } else {
        toast({
          title: "Maximum reached",
          description: "You can select up to 3 stakeholders for simulation",
          variant: "destructive",
        });
        return prev;
      }
    });
  };

  const handleStartSimulation = () => {
    if (selectedStakeholderIds.length === 0) {
      toast({
        title: "No stakeholders selected",
        description: "Please select at least one stakeholder",
        variant: "destructive",
      });
      return;
    }

    // Navigate to simulation chat with selected stakeholders and goal
    const params = new URLSearchParams({
      stakeholders: selectedStakeholderIds.join(","),
      ...(meetingGoal && { goal: meetingGoal }),
    });
    navigate(`/deal/${dealId}/simulation?${params.toString()}`);
  };

  const selectedStakeholders = stakeholders.filter((s) =>
    selectedStakeholderIds.includes(s.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading simulation setup...</p>
      </div>
    );
  }

  if (!deal) return null;

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  };

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
            <h1 className="text-3xl font-bold">Setup Meeting Simulation</h1>
          </div>
          <p className="text-muted-foreground">
            {deal.account_name} • {formatCurrency(deal.deal_value, deal.currency)} • {deal.stage}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Stakeholder Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Stakeholders (1-3)
                </CardTitle>
                <CardDescription>
                  Choose who you want to practice your pitch with
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stakeholders.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No stakeholders available</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add meeting notes to extract stakeholders first
                    </p>
                    <Button onClick={() => navigate(`/deal/${dealId}/add-meeting`)}>
                      Add Meeting Notes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stakeholders.map((stakeholder) => {
                      const isSelected = selectedStakeholderIds.includes(stakeholder.id);
                      return (
                        <Card
                          key={stakeholder.id}
                          className={`p-4 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => toggleStakeholder(stakeholder.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleStakeholder(stakeholder.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-semibold">{stakeholder.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {stakeholder.role_title}
                                    {stakeholder.department && ` • ${stakeholder.department}`}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  {stakeholder.stance && (
                                    <Badge
                                      variant={
                                        stakeholder.stance === "positive"
                                          ? "default"
                                          : stakeholder.stance === "negative"
                                          ? "destructive"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {stakeholder.stance}
                                    </Badge>
                                  )}
                                  {stakeholder.power && (
                                    <Badge variant="outline" className="text-xs">
                                      {stakeholder.power}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {stakeholder.communication_style && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  <strong>Style:</strong> {stakeholder.communication_style}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Simulation Setup */}
          <div className="space-y-6">
            {/* Selected Stakeholders Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected ({selectedStakeholderIds.length}/3)</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStakeholders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No stakeholders selected yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedStakeholders.map((s) => (
                      <div key={s.id} className="text-sm">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.role_title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meeting Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4" />
                  Meeting Goal (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="goal" className="text-xs">
                  What do you want to achieve in this meeting?
                </Label>
                <Textarea
                  id="goal"
                  value={meetingGoal}
                  onChange={(e) => setMeetingGoal(e.target.value)}
                  placeholder="E.g., Get buy-in for technical features, address budget concerns, secure commitment for next steps..."
                  className="mt-2 min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {meetingGoal.length}/500 characters
                </p>
              </CardContent>
            </Card>

            {/* Start Button */}
            <Button
              onClick={handleStartSimulation}
              disabled={selectedStakeholderIds.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              <Play className="h-5 w-5" />
              Start Simulation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
