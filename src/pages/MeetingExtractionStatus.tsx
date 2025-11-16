import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_error: string | null;
  stakeholders: any[];
  risks: any[];
}

export default function MeetingExtractionStatus() {
  const { meetingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !meetingId) {
      navigate("/");
      return;
    }

    const fetchMeeting = async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, extraction_status, extraction_error, stakeholders, risks")
        .eq("id", meetingId)
        .single();

      if (error || !data) {
        toast({
          title: "Meeting not found",
          description: "Could not find the meeting.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setMeeting(data);
      setLoading(false);

      // If extraction is already completed or failed, show it
      if (data.extraction_status === 'completed') {
        // Wait a moment to show success state, then redirect
        setTimeout(() => {
          navigate(`/meeting/${meetingId}`);
        }, 2000);
      }
    };

    fetchMeeting();

    // Poll every 2 seconds to check status
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("meetings")
        .select("extraction_status, extraction_error, stakeholders, risks")
        .eq("id", meetingId)
        .single();

      if (data) {
        setMeeting(prev => prev ? { ...prev, ...data } : null);

        if (data.extraction_status === 'completed') {
          clearInterval(interval);
          setTimeout(() => {
            navigate(`/meeting/${meetingId}`);
          }, 2000);
        } else if (data.extraction_status === 'failed') {
          clearInterval(interval);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, meetingId, navigate, toast]);

  if (loading || !meeting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusDisplay = () => {
    switch (meeting.extraction_status) {
      case 'pending':
      case 'processing':
        return {
          icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
          title: "Analyzing your meeting notes...",
          description: "Our AI is extracting stakeholders and risks. This usually takes 5-15 seconds.",
          color: "text-primary"
        };
      case 'completed':
        const stakeholderCount = meeting.stakeholders?.length || 0;
        const riskCount = meeting.risks?.length || 0;
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-green-600" />,
          title: "Extraction Complete!",
          description: `Found ${stakeholderCount} stakeholder${stakeholderCount !== 1 ? 's' : ''} and ${riskCount} risk${riskCount !== 1 ? 's' : ''}. Redirecting...`,
          color: "text-green-600"
        };
      case 'failed':
        return {
          icon: <XCircle className="h-12 w-12 text-destructive" />,
          title: "Extraction Failed",
          description: meeting.extraction_error || "An error occurred during extraction. You can still view your meeting notes.",
          color: "text-destructive"
        };
      default:
        return {
          icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
          title: "Processing...",
          description: "Please wait while we analyze your notes.",
          color: "text-primary"
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="mt-16">
          <CardHeader>
            <CardTitle className="text-center">{meeting.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              {status.icon}
              <div className="text-center space-y-2">
                <h3 className={`text-xl font-semibold ${status.color}`}>
                  {status.title}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {status.description}
                </p>
              </div>

              {meeting.extraction_status === 'failed' && (
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                  <Button
                    onClick={() => navigate(`/meeting/${meetingId}`)}
                  >
                    View Meeting Notes
                  </Button>
                </div>
              )}

              {meeting.extraction_status === 'pending' || meeting.extraction_status === 'processing' ? (
                <div className="text-center mt-4">
                  <p className="text-xs text-muted-foreground">
                    This page will automatically update when extraction is complete.
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
