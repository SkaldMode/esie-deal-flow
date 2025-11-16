import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2, StopCircle, User, Users } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Stakeholder {
  id: string;
  name: string;
  role_title: string;
  department: string | null;
  stance: string | null;
  power: string | null;
  communication_style: string | null;
}

export default function SimulationChat() {
  const { dealId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [simulation, setSimulation] = useState<any>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [deal, setDeal] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !dealId) {
      navigate("/");
      return;
    }

    const initializeSimulation = async () => {
      try {
        const stakeholderIds = searchParams.get("stakeholders")?.split(",") || [];
        const goal = searchParams.get("goal") || null;

        // Fetch deal
        const { data: dealData, error: dealError } = await supabase
          .from("deals")
          .select("*")
          .eq("id", dealId)
          .single();

        if (dealError) throw dealError;
        setDeal(dealData);

        // Fetch stakeholders
        const { data: stakeholdersData, error: stakeholdersError } = await supabase
          .from("stakeholders")
          .select("*")
          .in("id", stakeholderIds);

        if (stakeholdersError) throw stakeholdersError;
        setStakeholders(stakeholdersData || []);

        // Create new simulation
        const { data: simData, error: simError } = await supabase
          .from("simulations")
          .insert({
            deal_id: dealId,
            user_id: user.id,
            stakeholder_ids: stakeholderIds,
            meeting_goal: goal,
            status: "active",
          })
          .select()
          .single();

        if (simError) throw simError;
        setSimulation(simData);

        // Add welcome message
        const welcomeMsg: Message = {
          role: "assistant",
          content: stakeholdersData && stakeholdersData.length > 1
            ? `Welcome to the meeting. ${stakeholdersData.map(s => s.name).join(", ")} have joined. How can we help you today?`
            : `Hello, I'm ${stakeholdersData?.[0]?.name}. What would you like to discuss?`,
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
      } catch (error: any) {
        toast({
          title: "Error initializing simulation",
          description: error.message,
          variant: "destructive",
        });
        navigate(`/deal/${dealId}/simulation-setup`);
      } finally {
        setLoading(false);
      }
    };

    initializeSimulation();
  }, [user, dealId, searchParams, navigate, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const sendMessage = async () => {
    if (!input.trim() || !simulation || sending) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);
    setStreamingMessage("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulation-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            simulationId: simulation.id,
            message: userMessage.content,
            stakeholderProfiles: stakeholders,
            dealContext: {
              account_name: deal.account_name,
              deal_value: deal.deal_value,
              currency: deal.currency,
              stage: deal.stage,
            },
            meetingGoal: simulation.meeting_goal,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                setStreamingMessage(fullResponse);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Add complete message
      const assistantMessage: Message = {
        role: "assistant",
        content: fullResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const endSimulation = async () => {
    if (!simulation) return;

    try {
      await supabase
        .from("simulations")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", simulation.id);

      toast({
        title: "Simulation ended",
        description: "Your session has been saved.",
      });

      navigate(`/deal/${dealId}`);
    } catch (error: any) {
      toast({
        title: "Error ending simulation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Starting simulation...</p>
      </div>
    );
  }

  if (!simulation || !deal) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/deal/${dealId}/simulation-setup`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Meeting Simulation</h1>
                <p className="text-sm text-muted-foreground">{deal.account_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {stakeholders.map((s) => (
                    <div
                      key={s.id}
                      className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                      title={s.name}
                    >
                      <span className="text-xs font-medium">
                        {s.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={endSimulation}>
                <StopCircle className="mr-2 h-4 w-4" />
                End Simulation
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stakeholder Info */}
      <div className="border-b bg-muted/30 py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-3">
            {stakeholders.map((s) => (
              <Card key={s.id} className="p-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role_title}</p>
                  </div>
                  {s.stance && (
                    <Badge
                      variant={
                        s.stance === "positive" ? "default" :
                        s.stance === "negative" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {s.stance}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                  }`}
                >
                  <CardContent className="p-4">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        msg.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <div className="flex justify-start">
                <Card className="max-w-[80%] bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm whitespace-pre-wrap">{streamingMessage}</p>
                    <Loader2 className="h-4 w-4 animate-spin mt-2" />
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-card sticky bottom-0">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="min-h-[60px] max-h-[200px]"
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              size="lg"
              className="px-6"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tip: Be specific about features, pricing, or concerns to get realistic responses
          </p>
        </div>
      </div>
    </div>
  );
}
