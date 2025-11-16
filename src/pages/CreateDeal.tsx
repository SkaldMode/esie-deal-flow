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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createDealSchema } from "@/lib/validations";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];
const STAGES = ["Discovery", "Demo", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

export default function CreateDeal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    account_name: "",
    deal_value: "",
    currency: "USD",
    stage: "Discovery",
    internal_notes: "",
  });
  const [expectedCloseDate, setExpectedCloseDate] = useState<Date>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setErrors({});
    setLoading(true);

    try {
      // Validate form
      const validated = createDealSchema.parse({
        ...formData,
        expected_close_month: expectedCloseDate,
      });

      // Format date as YYYY-MM-01 for the first day of the selected month
      const formattedDate = format(validated.expected_close_month, "yyyy-MM-01");

      const { data, error } = await supabase
        .from("deals")
        .insert({
          user_id: user.id,
          account_name: validated.account_name,
          deal_value: parseFloat(validated.deal_value),
          currency: validated.currency,
          stage: validated.stage,
          expected_close_month: formattedDate,
          internal_notes: validated.internal_notes || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Deal created!",
        description: `${validated.account_name} has been added to your workspace.`,
      });

      navigate(`/deal/${data.id}`);
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
          title: "Error creating deal",
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
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Multi-Deal Support:</strong> You can manage multiple active deals concurrently.
                  Switch between them using the deal selector in the navigation bar.
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
                  className={errors.account_name ? "border-destructive" : ""}
                />
                {errors.account_name && (
                  <p className="text-sm text-destructive">{errors.account_name}</p>
                )}
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
                    className={errors.deal_value ? "border-destructive" : ""}
                  />
                  {errors.deal_value && (
                    <p className="text-sm text-destructive">{errors.deal_value}</p>
                  )}
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
                <Label>Expected Close Month *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expectedCloseDate && "text-muted-foreground",
                        errors.expected_close_month && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedCloseDate ? (
                        format(expectedCloseDate, "MMMM yyyy")
                      ) : (
                        <span>Select expected close month</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedCloseDate}
                      onSelect={setExpectedCloseDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {errors.expected_close_month && (
                  <p className="text-sm text-destructive">{errors.expected_close_month}</p>
                )}
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
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Deal"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}