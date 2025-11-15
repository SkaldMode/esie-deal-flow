import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, DollarSign, Calendar, FileText, Users, AlertTriangle, Video, Plus } from "lucide-react";

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
      } catch (error: any) {
        toast({
          title: "Error loading deal",
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
        <p className="text-muted-foreground">Loading deal...</p>
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
        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deal.account_name}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(deal.deal_value, deal.currency)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-base font-semibold">
                {deal.stage}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expected Close</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDate(deal.expected_close_month)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button 
            className="gap-2"
            onClick={() => navigate(`/deal/${deal.id}/add-meeting`)}
          >
            <Plus className="h-4 w-4" />
            Add Meeting Notes
          </Button>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            View Stakeholders
          </Button>
          <Button variant="outline" className="gap-2">
            <Video className="h-4 w-4" />
            Run Simulation
          </Button>
        </div>

        {/* Three Main Widgets */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Next Meeting Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Meeting
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
                    className="p-0 h-auto"
                    onClick={() => navigate(`/meeting/${recentMeeting.id}`)}
                  >
                    View details →
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm mb-2">No meetings yet</p>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => navigate(`/deal/${deal.id}/add-meeting`)}
                  >
                    Add your first meeting
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stakeholders Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Stakeholders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm mb-2">No stakeholders mapped</p>
                <Button variant="link" size="sm">
                  Add stakeholders
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Risks Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm mb-2">No risks identified</p>
                <Button variant="link" size="sm">
                  Track risks
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Internal Notes Section */}
        {deal.internal_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Internal Notes
              </CardTitle>
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