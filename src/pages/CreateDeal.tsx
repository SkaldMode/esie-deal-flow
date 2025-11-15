import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];
const STAGES = ["Discovery", "Demo", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

export default function CreateDeal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_name: "",
    deal_value: "",
    currency: "USD",
    stage: "Discovery",
    expected_close_month: "",
    internal_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          user_id: user.id,
          account_name: formData.account_name,
          deal_value: parseFloat(formData.deal_value),
          currency: formData.currency,
          stage: formData.stage,
          expected_close_month: formData.expected_close_month,
          internal_notes: formData.internal_notes || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Deal created!",
        description: `${formData.account_name} has been added to your workspace.`,
      });

      navigate(`/deal/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating deal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Deal</CardTitle>
            <CardDescription>
              Set up your deal workspace with key information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg border border-border mb-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Creating a new deal will automatically archive your current active deal. 
                  All data will be preserved and accessible from the Archived Deals page.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name *</Label>
                <Input
                  id="account_name"
                  placeholder="Acme Corporation"
                  value={formData.account_name}
                  onChange={(e) =>
                    setFormData({ ...formData, account_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deal_value">Deal Value *</Label>
                  <Input
                    id="deal_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="250000"
                    value={formData.deal_value}
                    onChange={(e) =>
                      setFormData({ ...formData, deal_value: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Deal Stage *</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stage: value })
                  }
                >
                  <SelectTrigger id="stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_close_month">Expected Close Month *</Label>
                <Input
                  id="expected_close_month"
                  type="month"
                  value={formData.expected_close_month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_close_month: e.target.value + "-01",
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internal_notes">Internal Notes</Label>
                <Textarea
                  id="internal_notes"
                  placeholder="Key details, strategic considerations, internal context..."
                  value={formData.internal_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, internal_notes: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Deal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}