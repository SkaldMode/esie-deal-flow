import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { addMeetingSchema } from "@/lib/validations";

const CHANNELS = ["In-Person", "Video Call", "Phone Call", "Email", "Other"];

export default function AddMeeting() {
  const { dealId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dealName, setDealName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    meeting_date: "",
    title: "",
    channel: "Video Call",
    raw_notes: "",
  });

  useEffect(() => {
    if (!user || !dealId) {
      navigate("/");
      return;
    }

    // Verify deal exists and is active
    const verifyDeal = async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("account_name, status")
        .eq("id", dealId)
        .eq("status", "active")
        .single();

      if (error || !data) {
        toast({
          title: "No active deal found",
          description: "You need an active deal to add meetings.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setDealName(data.account_name);
    };

    verifyDeal();
  }, [user, dealId, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dealId) return;

    setErrors({});
    setLoading(true);

    try {
      // Validate form
      const validated = addMeetingSchema.parse(formData);

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          deal_id: dealId,
          user_id: user.id,
          meeting_date: validated.meeting_date,
          title: validated.title,
          channel: validated.channel,
          raw_notes: validated.raw_notes,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Meeting saved!",
        description: "Extracting intelligence from your notes...",
      });

      // Trigger AI extraction (non-blocking)
      supabase.functions
        .invoke('extract-meeting-intelligence', {
          body: {
            meetingId: data.id,
            rawNotes: validated.raw_notes
          }
        })
        .then(({ error: extractError }) => {
          if (extractError) {
            console.error('Extraction error:', extractError);
          }
        });

      // Navigate to status page to show extraction progress
      navigate(`/meeting/${data.id}/extraction-status`);
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
        
        toast({
          title: "Validation Error",
          description: "Please check the form for errors.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error adding meeting",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/deal/${dealId}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deal
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add Meeting Notes</CardTitle>
            <CardDescription>
              Record a meeting for {dealName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting_date">Meeting Date *</Label>
                  <Input
                    id="meeting_date"
                    type="date"
                    value={formData.meeting_date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_date: e.target.value })
                    }
                    className={errors.meeting_date ? "border-destructive" : ""}
                  />
                  {errors.meeting_date && (
                    <p className="text-sm text-destructive">{errors.meeting_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel">Channel *</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, channel: value })
                    }
                  >
                    <SelectTrigger id="channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="Discovery call with CTO"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="raw_notes">Meeting Notes *</Label>
                <Textarea
                  id="raw_notes"
                  placeholder="Paste your meeting notes here. Include stakeholder names, key discussion points, and any risks or concerns mentioned..."
                  value={formData.raw_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, raw_notes: e.target.value })
                  }
                  rows={12}
                  className={errors.raw_notes ? "border-destructive" : ""}
                />
                {errors.raw_notes && (
                  <p className="text-sm text-destructive">{errors.raw_notes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  AI will automatically extract stakeholders and risks from your notes.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving & Analyzing...
                  </>
                ) : (
                  "Save Meeting"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}