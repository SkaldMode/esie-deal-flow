import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeDeal, setActiveDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchActiveDeal = async () => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (error) throw error;
        setActiveDeal(data);
      } catch (error) {
        console.error("Error fetching deal:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveDeal();
  }, [user, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (activeDeal) {
    navigate(`/deal/${activeDeal.id}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">EISE</h1>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">Welcome to EISE</CardTitle>
            <CardDescription className="text-base">
              Enterprise Sales Intelligence Engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                You don't have an active deal yet. Create your first deal to get started.
              </p>
              <Button
                onClick={() => navigate("/create-deal")}
                size="lg"
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Your First Deal
              </Button>
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="font-semibold mb-3">What you'll be able to do:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Track meetings and stakeholder interactions</li>
                <li>• Map buying committee and decision-makers</li>
                <li>• Practice meetings with AI simulations</li>
                <li>• Get insights to move deals faster</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
