import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Video } from "lucide-react";

interface Meeting {
  id: string;
  deal_id: string;
  meeting_date: string;
  title: string;
  channel: string;
  raw_notes: string;
  created_at: string;
}

interface Deal {
  account_name: string;
}

export default function MeetingDetails() {
  const { meetingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !meetingId) {
      navigate("/");
      return;
    }

    const fetchMeeting = async () => {
      try {
        const { data: meetingData, error: meetingError } = await supabase
          .from("meetings")
          .select("*")
          .eq("id", meetingId)
          .single();

        if (meetingError) throw meetingError;
        setMeeting(meetingData);

        // Fetch deal info
        const { data: dealData, error: dealError } = await supabase
          .from("deals")
          .select("account_name")
          .eq("id", meetingData.deal_id)
          .single();

        if (dealError) throw dealError;
        setDeal(dealData);
      } catch (error: any) {
        toast({
          title: "Error loading meeting",
          description: error.message,
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [user, meetingId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading meeting...</p>
      </div>
    );
  }

  if (!meeting || !deal) return null;

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
          onClick={() => navigate(`/deal/${meeting.deal_id}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {deal.account_name}
        </Button>

        <div className="space-y-6">
          {/* Meeting Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">{meeting.title}</CardTitle>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(meeting.meeting_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      <Badge variant="outline">{meeting.channel}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Raw Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-muted-foreground">
                {meeting.raw_notes}
              </div>
            </CardContent>
          </Card>

          {/* AI Extraction Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">Coming soon:</p>
                <ul className="space-y-1 text-sm">
                  <li>• Stakeholder extraction</li>
                  <li>• Key quotes and objections</li>
                  <li>• Next steps identification</li>
                  <li>• Risk detection</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}