import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, DollarSign, Calendar, FileText, Users, AlertTriangle, 
  Video, Plus, Network, MessageSquare, Presentation, Sparkles, 
  Target, TrendingUp, ThumbsUp
} from "lucide-react";
import SimulationDebrief from "@/components/SimulationDebrief";

interface Deal {
  id: string;
  account_name: string;
  deal_value: number;
  currency: string;
  expected_close_month: string;
  internal_notes: string | null;
  status: string;
  stage: string;
  created_at: string;
}

export default function DealHome() {
  const { dealId } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [recentMeeting, setRecentMeeting] = useState<any>(null);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !dealId) return;

    const fetchDeal = async () => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("*")
          .eq("id", dealId)
          .single();

        if (error) throw error;
        setDeal(data);

        // Fetch most recent meeting
        const { data: meetingData } = await supabase
          .from("meetings")
          .select("*")
          .eq("deal_id", dealId)
          .order("meeting_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (meetingData) {
          setRecentMeeting(meetingData);
        }

        // Fetch stakeholder profiles for this deal
        const { data: stakeholderData } = await supabase
          .from("stakeholders")
          .select("*")
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false });

        if (stakeholderData) {
          setStakeholders(stakeholderData);
        }

        // Fetch completed simulations with debriefs
        const { data: simulationsData } = await supabase
          .from("simulations")
          .select("*")
          .eq("deal_id", dealId)
          .eq("status", "completed")
          .not("debrief", "is", null)
          .order("ended_at", { ascending: false })
          .limit(5);

        if (simulationsData) {
          setSimulations(simulationsData);
        }
      } catch (error: any) {
        toast({
          title: "Oops! Something went wrong",
          description: error.message,
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchDeal();
  }, [user, dealId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <p className="text-lg text-foreground">Loading your mission...</p>
        </div>
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getStanceEmoji = (stance: string | null) => {
    if (stance === 'positive') return '👍';
    if (stance === 'negative') return '⚠️';
    return '🤔';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
            <h1 className="text-xl font-semibold">{deal.account_name}</h1>
            <Badge variant={deal.status === "active" ? "default" : "secondary"}>
              {deal.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => navigate("/archived-deals")}
            >
              View Archived
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">
              Let's win {deal.account_name} 🎯
            </h1>
          </div>
          <div className="flex items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(deal.deal_value, deal.currency)}
              </span>
            </div>
            <Badge variant="outline" className="text-base px-4 py-1">
              {deal.stage}
            </Badge>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(deal.expected_close_month)}</span>
            </div>
          </div>
        </div>

        {/* What would you like to do? */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            What would you like to do?
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => navigate(`/deal/${deal.id}/add-meeting`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">Just had a call?</CardTitle>
                <CardDescription>Drop your notes here and I'll extract the key insights</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => navigate(`/deal/${deal.id}/prep-brief`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Presentation className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">Need a game plan?</CardTitle>
                <CardDescription>I'll create a personalized prep brief for your next meeting</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => navigate(`/deal/${deal.id}/stakeholders`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">Who's who?</CardTitle>
                <CardDescription>View all the key players and their roles</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => navigate(`/deal/${deal.id}/stakeholder-map`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Network className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">See connections</CardTitle>
                <CardDescription>Visualize how everyone's related</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => navigate(`/deal/${deal.id}/simulation-setup`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">Practice makes perfect</CardTitle>
                <CardDescription>Run a simulation with AI stakeholders</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Latest Intel */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Latest Intel */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                Latest Intel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentMeeting ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">{recentMeeting.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(recentMeeting.meeting_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-primary"
                    onClick={() => navigate(`/meeting/${recentMeeting.id}`)}
                  >
                    Read the full story →
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm mb-3">No intel yet!</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/deal/${deal.id}/add-meeting`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first notes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Players */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Key Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stakeholders.length > 0 ? (
                <div className="space-y-3">
                  {stakeholders.slice(0, 3).map((stakeholder) => (
                    <div key={stakeholder.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          {getStanceEmoji(stakeholder.stance)}
                          {stakeholder.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stakeholder.role_title}
                        </p>
                      </div>
                      {stakeholder.power && (
                        <Badge variant="outline" className="text-xs">
                          {stakeholder.power}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {stakeholders.length > 3 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto w-full text-primary"
                      onClick={() => navigate(`/deal/${deal.id}/stakeholders`)}
                    >
                      +{stakeholders.length - 3} more people →
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm mb-2">No players tracked yet</p>
                  <p className="text-xs">
                    Add meeting notes and I'll spot them for you!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Watch Out For */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Watch Out For
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentMeeting?.risks && Array.isArray(recentMeeting.risks) && recentMeeting.risks.length > 0 ? (
                <div className="space-y-3">
                  {recentMeeting.risks.slice(0, 3).map((risk: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Badge 
                        variant={
                          risk.severity === 'high' ? 'destructive' :
                          risk.severity === 'medium' ? 'default' : 'secondary'
                        }
                        className="mt-0.5 text-xs"
                      >
                        {risk.severity}
                      </Badge>
                      <p className="text-sm flex-1">{risk.risk_description}</p>
                    </div>
                  ))}
                  {recentMeeting.risks.length > 3 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto w-full text-primary"
                      onClick={() => navigate(`/meeting/${recentMeeting.id}`)}
                    >
                      See {recentMeeting.risks.length - 3} more →
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm mb-2 flex items-center justify-center gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    All clear!
                  </p>
                  <p className="text-xs">
                    No risks spotted yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Practice Sessions */}
        {simulations.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Your Practice Sessions
              </CardTitle>
              <CardDescription>
                Here's what I noticed from your simulations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {simulations.map((sim) => (
                <div key={sim.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {new Date(sim.ended_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {sim.meeting_goal && (
                        <p className="text-sm text-muted-foreground">Goal: {sim.meeting_goal}</p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {sim.stakeholder_ids.length} stakeholder{sim.stakeholder_ids.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {sim.debrief && <SimulationDebrief debrief={sim.debrief} />}
                  {simulations.indexOf(sim) < simulations.length - 1 && (
                    <div className="border-t mt-6" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Your Private Notes */}
        {deal.internal_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Your Private Notes
              </CardTitle>
              <CardDescription>
                Just between us 🤫
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {deal.internal_notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}