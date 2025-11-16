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
  department: string;
  stance_guess: string;
  power_guess: string;
}

interface Quote {
  speaker_name: string;
  quote_text: string;
  context: string;
}

interface Objection {
  objection_text: string;
  source_name: string;
}

interface Risk {
  risk_description: string;
  severity: string;
}

interface ApprovalClue {
  clue_text: string;
  source_name: string;
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
  quotes: Quote[];
  objections: Objection[];
  risks: Risk[];
  approval_clues: ApprovalClue[];
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
  const [editedStakeholders, setEditedStakeholders] = useState<Stakeholder[]>([]);
  const [editedRisks, setEditedRisks] = useState<Risk[]>([]);
  const [editedObjections, setEditedObjections] = useState<Objection[]>([]);

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
          quotes: (Array.isArray(meetingData.quotes) ? meetingData.quotes : []) as unknown as Quote[],
          objections: (Array.isArray(meetingData.objections) ? meetingData.objections : []) as unknown as Objection[],
          risks: (Array.isArray(meetingData.risks) ? meetingData.risks : []) as unknown as Risk[],
          approval_clues: (Array.isArray(meetingData.approval_clues) ? meetingData.approval_clues : []) as unknown as ApprovalClue[],
        };
        
        setMeeting(parsedMeeting);
        setEditedStakeholders([...parsedMeeting.stakeholders]);
        setEditedRisks([...parsedMeeting.risks]);
        setEditedObjections([...parsedMeeting.objections]);

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
          stakeholders: editedStakeholders as any,
          risks: editedRisks as any,
          objections: editedObjections as any,
        })
        .eq("id", meeting.id);

      if (error) throw error;

      setMeeting({
        ...meeting,
        stakeholders: editedStakeholders,
        risks: editedRisks,
        objections: editedObjections,
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
    setEditedStakeholders([...meeting.stakeholders]);
    setEditedRisks([...meeting.risks]);
    setEditedObjections([...meeting.objections]);
    setIsEditing(false);
  };

  const addStakeholder = () => {
    setEditedStakeholders([
      ...editedStakeholders,
      {
        name: "",
        role_title: "",
        department: "",
        stance_guess: "neutral",
        power_guess: "medium",
      },
    ]);
  };

  const updateStakeholder = (index: number, field: keyof Stakeholder, value: string) => {
    const updated = [...editedStakeholders];
    updated[index] = { ...updated[index], [field]: value };
    setEditedStakeholders(updated);
  };

  const deleteStakeholder = (index: number) => {
    setEditedStakeholders(editedStakeholders.filter((_, i) => i !== index));
  };

  const rejectRisk = (index: number) => {
    setEditedRisks(editedRisks.filter((_, i) => i !== index));
  };

  const rejectObjection = (index: number) => {
    setEditedObjections(editedObjections.filter((_, i) => i !== index));
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
                      <div className="space-y-3">
                        {meeting.stakeholders.map((stakeholder: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold">{stakeholder.name}</p>
                                <p className="text-sm text-muted-foreground">{stakeholder.role}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant={
                                  stakeholder.sentiment === 'positive' ? 'default' :
                                  stakeholder.sentiment === 'negative' ? 'destructive' : 'secondary'
                                }>
                                  {stakeholder.sentiment}
                                </Badge>
                                <Badge variant="outline">{stakeholder.influence} influence</Badge>
                              </div>
                            </div>
                            {stakeholder.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {stakeholder.notes}
                              </p>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quotes */}
                  {meeting.quotes && meeting.quotes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Key Quotes ({meeting.quotes.length})
                      </h3>
                      <div className="space-y-2">
                        {meeting.quotes.map((quote: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <p className="text-sm italic mb-2">"{quote.quote}"</p>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>— {quote.speaker}</span>
                              {quote.context && <span>{quote.context}</span>}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objections */}
                  {meeting.objections && meeting.objections.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Objections ({meeting.objections.length})
                      </h3>
                      <div className="space-y-2">
                        {meeting.objections.map((objection: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-semibold text-sm">{objection.topic}</p>
                              <Badge variant={
                                objection.severity === 'high' ? 'destructive' :
                                objection.severity === 'medium' ? 'default' : 'secondary'
                              }>
                                {objection.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {objection.description}
                            </p>
                            {objection.stakeholder && (
                              <p className="text-xs text-muted-foreground">
                                Raised by: {objection.stakeholder}
                              </p>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risks */}
                  {meeting.risks && meeting.risks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Risks ({meeting.risks.length})
                      </h3>
                      <div className="space-y-2">
                        {meeting.risks.map((risk: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <Badge variant="outline" className="mb-1">{risk.category}</Badge>
                                <p className="text-sm">{risk.description}</p>
                              </div>
                              <Badge variant={
                                risk.severity === 'high' ? 'destructive' :
                                risk.severity === 'medium' ? 'default' : 'secondary'
                              }>
                                {risk.severity}
                              </Badge>
                            </div>
                            {risk.mitigation && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <span className="font-semibold">Mitigation: </span>
                                {risk.mitigation}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approval Clues */}
                  {meeting.approval_clues && meeting.approval_clues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Approval Signals ({meeting.approval_clues.length})
                      </h3>
                      <div className="space-y-2">
                        {meeting.approval_clues.map((clue: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <Badge variant="default" className="mb-1">{clue.type}</Badge>
                                <p className="text-sm">{clue.description}</p>
                                {clue.stakeholder && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    From: {clue.stakeholder}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No insights found */}
                  {(!meeting.stakeholders || meeting.stakeholders.length === 0) &&
                   (!meeting.quotes || meeting.quotes.length === 0) &&
                   (!meeting.objections || meeting.objections.length === 0) &&
                   (!meeting.risks || meeting.risks.length === 0) &&
                   (!meeting.approval_clues || meeting.approval_clues.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No insights extracted from the meeting notes.</p>
                      <p className="text-xs mt-2">Try adding more detailed notes.</p>
                    </div>
                  )}
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