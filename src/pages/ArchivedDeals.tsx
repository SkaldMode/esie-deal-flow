import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Archive, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Deal {
  id: string;
  account_name: string;
  deal_value: number;
  currency: string;
  expected_close_month: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

export default function ArchivedDeals() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivatingDealId, setReactivatingDealId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchArchivedDeals();
  }, [user, navigate]);

  const fetchArchivedDeals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "archived")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setArchivedDeals(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading deals",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from("deals")
        .update({ status: "active" })
        .eq("id", dealId);

      if (error) throw error;

      toast({
        title: "Deal reactivated!",
        description: "Your previous active deal has been archived.",
      });

      navigate(`/deal/${dealId}`);
    } catch (error: any) {
      toast({
        title: "Error reactivating deal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold">Archived Deals</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {archivedDeals.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Archived Deals</h3>
                <p className="text-muted-foreground">
                  When you create a new deal, your previous deal will be archived here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {archivedDeals.map((deal) => (
              <Card key={deal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{deal.account_name}</CardTitle>
                      <CardDescription className="mt-2">
                        Archived on {formatDate(deal.updated_at)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setReactivatingDealId(deal.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reactivate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Value</p>
                      <p className="font-semibold">
                        {formatCurrency(deal.deal_value, deal.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stage</p>
                      <Badge variant="outline">{deal.stage}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Close</p>
                      <p className="font-semibold">
                        {formatDate(deal.expected_close_month)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!reactivatingDealId} onOpenChange={() => setReactivatingDealId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive your current active deal and make this one active. All meetings, 
              stakeholders, and simulations from both deals will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => reactivatingDealId && handleReactivate(reactivatingDealId)}>
              Reactivate Deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}