import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Loader2, Printer } from "lucide-react";
import { generatePrepBrief, type PrepBriefData } from "@/lib/prepBriefTemplate";

export default function PrepBrief() {
  const { dealId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [brief, setBrief] = useState<PrepBriefData | null>(null);
  const [dealInfo, setDealInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  useEffect(() => {
    if (!user || !dealId) {
      navigate("/");
      return;
    }

    generateBrief();
  }, [user, dealId]);

  const generateBrief = async () => {
    setLoading(true);
    try {
      // Fetch deal data
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;

      // Fetch stakeholders
      const { data: stakeholders, error: stakeholdersError } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('deal_id', dealId);

      if (stakeholdersError) throw stakeholdersError;

      // Fetch recent meetings (last 3)
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('deal_id', dealId)
        .order('meeting_date', { ascending: false })
        .limit(3);

      if (meetingsError) throw meetingsError;

      // Generate brief using template (no AI)
      const generatedBrief = generatePrepBrief(
        deal,
        stakeholders || [],
        meetings || []
      );

      setBrief(generatedBrief);
      setDealInfo(deal);
      setGeneratedAt(new Date().toISOString());
    } catch (error: any) {
      toast({
        title: "Error generating brief",
        description: error.message,
        variant: "destructive",
      });
      navigate(`/deal/${dealId}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Generating your prep brief...</p>
        </div>
      </div>
    );
  }

  if (!brief || !dealInfo) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hidden when printing */}
      <header className="border-b bg-card print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/deal/${dealId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deal
              </Button>
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Meeting Prep Brief
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generated {new Date(generatedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Brief Content - optimized for printing */}
      <main className="container mx-auto px-4 py-8 max-w-4xl print:px-0 print:py-4">
        {/* Deal Header */}
        <div className="mb-6 print:mb-4">
          <h2 className="text-3xl font-bold mb-2">{dealInfo.account_name}</h2>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: dealInfo.currency }).format(dealInfo.deal_value)}</span>
            <span>•</span>
            <span>Stage: {dealInfo.stage}</span>
            <span>•</span>
            <span>Expected Close: {new Date(dealInfo.expected_close_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Executive Summary */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle className="text-lg">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{brief.executive_summary}</p>
          </CardContent>
        </Card>

        {/* Meeting Objectives */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle className="text-lg">Meeting Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.meeting_objectives.map((obj, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-primary font-semibold">{idx + 1}.</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Stakeholder Summary */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle className="text-lg">Stakeholder Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {brief.stakeholder_summary.map((stakeholder, idx) => (
                <div key={idx} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{stakeholder.name}</h4>
                    <Badge variant="outline" className="text-xs">{stakeholder.role}</Badge>
                    <Badge 
                      variant={
                        stakeholder.stance.toLowerCase().includes('positive') ? 'default' :
                        stakeholder.stance.toLowerCase().includes('negative') ? 'destructive' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {stakeholder.stance}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{stakeholder.key_point}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risks to Address */}
        {brief.risks_to_address.length > 0 && (
          <Card className="mb-6 print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-lg">Risks to Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brief.risks_to_address.map((risk, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          risk.severity === 'high' ? 'destructive' :
                          risk.severity === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        {risk.severity}
                      </Badge>
                      <span className="font-medium">{risk.risk}</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-16">
                      <span className="font-medium">Mitigation:</span> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Meeting Takeaways */}
        {brief.last_meeting_key_takeaways.length > 0 && (
          <Card className="mb-6 print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-lg">Last Meeting Key Takeaways</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {brief.last_meeting_key_takeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recommended Questions */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle className="text-lg">Recommended Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {brief.recommended_questions.map((q, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="font-medium text-foreground">Q{idx + 1}: {q.question}</p>
                  <p className="text-sm text-muted-foreground pl-6">
                    <span className="font-medium">Purpose:</span> {q.purpose}
                  </p>
                  {q.stakeholder && (
                    <p className="text-sm text-muted-foreground pl-6">
                      <span className="font-medium">Ask:</span> {q.stakeholder}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prep Notes */}
        {brief.prep_notes.length > 0 && (
          <Card className="print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle className="text-lg">Quick Prep Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {brief.prep_notes.map((note, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
