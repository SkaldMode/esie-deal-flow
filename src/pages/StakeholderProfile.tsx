import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Briefcase, Building2, MessageSquare, Calendar } from "lucide-react";

interface Stakeholder {
  id: string;
  deal_id: string;
  name: string;
  role_title: string;
  department: string | null;
  stance: string | null;
  power: string | null;
  communication_style: string | null;
  created_at: string;
  updated_at: string;
}

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  channel: string;
}

interface Deal {
  account_name: string;
}

export default function StakeholderProfile() {
  const { dealId, stakeholderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !dealId || !stakeholderId) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch stakeholder details
        const { data: stakeholderData, error: stakeholderError } = await supabase
          .from("stakeholders")
          .select("*")
          .eq("id", stakeholderId)
          .eq("deal_id", dealId)
          .single();

        if (stakeholderError) throw stakeholderError;
        setStakeholder(stakeholderData);

        // Fetch deal info
        const { data: dealData, error: dealError } = await supabase
          .from("deals")
          .select("account_name")
          .eq("id", dealId)
          .single();

        if (dealError) throw dealError;
        setDeal(dealData);

        // Fetch meetings where this stakeholder was mentioned
        const { data: mentionsData, error: mentionsError } = await supabase
          .from("stakeholder_mentions")
          .select(`
            meeting_id,
            meetings (
              id,
              title,
              meeting_date,
              channel
            )
          `)
          .eq("stakeholder_id", stakeholderId);

        if (mentionsError) throw mentionsError;

        const meetingsData = mentionsData
          ?.map(m => m.meetings)
          .filter(Boolean)
          .sort((a: any, b: any) => 
            new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
          ) || [];

        setMeetings(meetingsData as Meeting[]);
      } catch (error: any) {
        toast({
          title: "Error loading stakeholder",
          description: error.message,
          variant: "destructive",
        });
        navigate(`/deal/${dealId}/stakeholders`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dealId, stakeholderId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading stakeholder profile...</p>
      </div>
    );
  }

  if (!stakeholder || !deal) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/deal/${dealId}/stakeholders`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stakeholders
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{stakeholder.name}</CardTitle>
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm">{stakeholder.role_title}</span>
                  </div>
                  {stakeholder.department && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm">{stakeholder.department}</span>
                    </div>
                  )}
                </div>
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
              </div>
            </div>
          </CardHeader>
          {stakeholder.communication_style && (
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Communication Style
                </h3>
                <p className="text-sm text-muted-foreground">
                  {stakeholder.communication_style}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Deal Context */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Deal Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Part of deal</p>
                <p className="font-semibold">{deal.account_name}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/deal/${dealId}`)}
              >
                View Deal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Meeting History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meeting History ({meetings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No meetings recorded with this stakeholder
              </p>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <Card
                    key={meeting.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold mb-1">{meeting.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{formatDate(meeting.meeting_date)}</span>
                          <Badge variant="outline" className="text-xs">
                            {meeting.channel}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View →
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
