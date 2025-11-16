import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar, 
  Video, 
  User, 
  MessageSquare, 
  AlertTriangle, 
  TrendingUp, 
  Loader2,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Check
} from "lucide-react";

interface Stakeholder {
  name: string;
  role_title: string;
}

interface Risk {
  risk_description: string;
  severity: string;
}

interface Meeting {
  id: string;
  deal_id: string;
  meeting_date: string;
  title: string;
  channel: string;
  raw_notes: string;
  created_at: string;
  stakeholders: Stakeholder[];
  risks: Risk[];
  extraction_status: string;
  extraction_error: string | null;
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit state
  const [editedRisks, setEditedRisks] = useState<Risk[]>([]);

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
        
        const parsedMeeting: Meeting = {
          ...meetingData,
          stakeholders: (Array.isArray(meetingData.stakeholders) ? meetingData.stakeholders : []) as unknown as Stakeholder[],
          risks: (Array.isArray(meetingData.risks) ? meetingData.risks : []) as unknown as Risk[],
        };

        setMeeting(parsedMeeting);
        setEditedRisks([...parsedMeeting.risks]);

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

  const handleSaveChanges = async () => {
    if (!meeting) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("meetings")
        .update({
          risks: editedRisks as any,
        })
        .eq("id", meeting.id);

      if (error) throw error;

      setMeeting({
        ...meeting,
        risks: editedRisks,
      });
      
      setIsEditing(false);
      toast({
        title: "Changes saved",
        description: "Your edits have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!meeting) return;
    setEditedRisks([...meeting.risks]);
    setIsEditing(false);
  };

  const removeRisk = (index: number) => {
    setEditedRisks(editedRisks.filter((_, i) => i !== index));
  };

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

  const displayStakeholders = isEditing ? editedStakeholders : meeting.stakeholders;
  const displayRisks = isEditing ? editedRisks : meeting.risks;
  const displayObjections = isEditing ? editedObjections : meeting.objections;

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

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.extraction_status === 'processing' && (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Extracting intelligence from your notes...</p>
                </div>
              )}

              {meeting.extraction_status === 'failed' && (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    AI extraction encountered an issue
                  </p>
                  {meeting.extraction_error && (
                    <p className="text-xs text-muted-foreground">
                      {meeting.extraction_error}
                    </p>
                  )}
                </div>
              )}

              {meeting.extraction_status === 'completed' && (
                <div className="space-y-6">
                  {/* Stakeholders */}
                  {meeting.stakeholders && meeting.stakeholders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Stakeholders ({meeting.stakeholders.length})
                      </h3>
                      <div className="space-y-2">
                        {meeting.stakeholders.map((stakeholder: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <p className="font-semibold">{stakeholder.name}</p>
                            <p className="text-sm text-muted-foreground">{stakeholder.role_title}</p>
                          </Card>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Visit the <button onClick={() => navigate(`/deal/${meeting.deal_id}/stakeholders`)} className="underline">Stakeholders page</button> to view and edit full profiles.
                      </p>
                    </div>
                  )}

                  {/* Risks */}
                  {isEditing ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Risks ({editedRisks.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {editedRisks.map((risk: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm mb-1">{risk.risk_description}</p>
                                <Badge variant={
                                  risk.severity === 'high' ? 'destructive' :
                                  risk.severity === 'medium' ? 'default' : 'secondary'
                                }>
                                  {risk.severity}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRisk(idx)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                        {editedRisks.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No risks identified</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    meeting.risks && meeting.risks.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Risks ({meeting.risks.length})
                        </h3>
                        <div className="space-y-2">
                          {meeting.risks.map((risk: any, idx: number) => (
                            <Card key={idx} className="p-3">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm flex-1">{risk.risk_description}</p>
                                <Badge variant={
                                  risk.severity === 'high' ? 'destructive' :
                                  risk.severity === 'medium' ? 'default' : 'secondary'
                                }>
                                  {risk.severity}
                                </Badge>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* No insights found */}
                  {!isEditing &&
                   (!meeting.stakeholders || meeting.stakeholders.length === 0) &&
                   (!meeting.risks || meeting.risks.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No insights extracted from the meeting notes.</p>
                      <p className="text-xs mt-2">Try adding more detailed notes about stakeholders and risks.</p>
                    </div>
                  )}

                  {/* Edit Controls */}
                  <div className="flex gap-2 pt-4">
                    {isEditing ? (
                      <>
                        <Button onClick={handleSaveChanges} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit Risks
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {meeting.extraction_status === 'pending' && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Extraction pending...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}