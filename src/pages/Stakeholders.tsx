import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Building2 } from "lucide-react";

interface Stakeholder {
  id: string;
  name: string;
  role_title: string;
  department: string | null;
  stance: string | null;
  power: string | null;
  communication_style: string | null;
  created_at: string;
  meeting_count?: number;
}

interface Deal {
  account_name: string;
}

export default function Stakeholders() {
  const { dealId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
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
          .select("account_name")
          .eq("id", dealId)
          .single();

        if (dealError) throw dealError;
        setDeal(dealData);

        // Fetch stakeholders with meeting count
        const { data: stakeholderData, error: stakeholderError } = await supabase
          .from("stakeholders")
          .select(`
            *,
            stakeholder_mentions(count)
          `)
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false });

        if (stakeholderError) throw stakeholderError;

        // Transform data to include meeting count
        const transformedData = stakeholderData?.map(s => ({
          ...s,
          meeting_count: s.stakeholder_mentions?.[0]?.count || 0
        })) || [];

        setStakeholders(transformedData);
      } catch (error: any) {
        toast({
          title: "Error loading stakeholders",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading stakeholders...</p>
      </div>
    );
  }

  if (!deal) return null;

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
            <h1 className="text-3xl font-bold">{deal.account_name}</h1>
          </div>
          <p className="text-muted-foreground">
            Stakeholder profiles auto-extracted from meeting notes
          </p>
        </div>

        {stakeholders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No stakeholders yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Stakeholder profiles will be automatically created when you add meeting notes
              </p>
              <Button onClick={() => navigate(`/deal/${dealId}/add-meeting`)}>
                Add Meeting Notes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stakeholders.map((stakeholder) => (
              <Card key={stakeholder.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{stakeholder.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {stakeholder.role_title}
                        {stakeholder.department && ` • ${stakeholder.department}`}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* AI-extracted attributes */}
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

                    {/* Communication style */}
                    {stakeholder.communication_style && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Communication Style</p>
                        <p className="text-sm">{stakeholder.communication_style}</p>
                      </div>
                    )}

                    {/* Meeting mentions */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Mentioned in {stakeholder.meeting_count || 0} meeting{stakeholder.meeting_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
