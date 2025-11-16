import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Network } from "lucide-react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

interface Stakeholder {
  id: string;
  name: string;
  role_title: string;
  stance: string | null;
  power: string | null;
}

interface Relationship {
  from_stakeholder_id: string;
  to_stakeholder_id: string;
  relationship_type: string;
}

interface Deal {
  account_name: string;
}

export default function StakeholderMap() {
  const { dealId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

        // Fetch stakeholders
        const { data: stakeholders, error: stakeholdersError } = await supabase
          .from("stakeholders")
          .select("id, name, role_title, stance, power")
          .eq("deal_id", dealId);

        if (stakeholdersError) throw stakeholdersError;

        // Fetch relationships
        const { data: relationships, error: relationshipsError } = await supabase
          .from("stakeholder_relationships")
          .select("from_stakeholder_id, to_stakeholder_id, relationship_type")
          .eq("deal_id", dealId);

        if (relationshipsError) throw relationshipsError;

        // Create nodes from stakeholders
        const flowNodes: Node[] = (stakeholders || []).map((s, index) => {
          const angle = (index / (stakeholders?.length || 1)) * 2 * Math.PI;
          const radius = 250;
          const x = 400 + radius * Math.cos(angle);
          const y = 300 + radius * Math.sin(angle);

          return {
            id: s.id,
            type: "default",
            position: { x, y },
            data: {
              label: (
                <div className="text-center px-2">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.role_title}</div>
                  <div className="flex gap-1 justify-center mt-1">
                    {s.stance && (
                      <Badge
                        variant={
                          s.stance === "positive" ? "default" :
                          s.stance === "negative" ? "destructive" : "secondary"
                        }
                        className="text-xs px-1 py-0"
                      >
                        {s.stance}
                      </Badge>
                    )}
                    {s.power && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {s.power}
                      </Badge>
                    )}
                  </div>
                </div>
              ),
            },
            draggable: false, // Static for MVP
            style: {
              background: s.stance === "positive" ? "#22c55e" :
                         s.stance === "negative" ? "#ef4444" : "#e2e8f0",
              color: s.stance ? "white" : "#1e293b",
              border: s.power === "high" ? "3px solid #3b82f6" : "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px",
              width: "auto",
              minWidth: "120px",
            },
          };
        });

        // Create edges from relationships
        const flowEdges: Edge[] = (relationships || []).map((r, index) => ({
          id: `e${index}`,
          source: r.from_stakeholder_id,
          target: r.to_stakeholder_id,
          type: "smoothstep",
          animated: r.relationship_type === "influences",
          label: r.relationship_type.replace("_", " "),
          style: {
            stroke: r.relationship_type === "reports_to" ? "#8b5cf6" :
                   r.relationship_type === "influences" ? "#f59e0b" : "#6b7280",
          },
          labelStyle: {
            fontSize: "10px",
            fill: "#64748b",
          },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (error: any) {
        toast({
          title: "Error loading relationship map",
          description: error.message,
          variant: "destructive",
        });
        navigate(`/deal/${dealId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dealId, navigate, toast, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    navigate(`/deal/${dealId}/stakeholder/${node.id}`);
  }, [dealId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading relationship map...</p>
      </div>
    );
  }

  if (!deal) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/deal/${dealId}/stakeholders`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stakeholders
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">{deal.account_name}</h1>
          </div>
          <p className="text-muted-foreground mb-4">
            Stakeholder relationship map with AI-inferred connections
          </p>

          {/* Legend */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="h-4 w-4" />
                Map Legend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="font-semibold mb-1">Node Colors:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Positive stance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-slate-300" />
                      <span>Neutral stance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span>Negative stance</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-1">Border:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded border-2 border-blue-500" />
                      <span>High power</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded border border-slate-400" />
                      <span>Medium/Low power</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-1">Edge Types:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-purple-500" />
                      <span>Reports to</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-amber-500" />
                      <span>Influences</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-gray-500" />
                      <span>Collaborates</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-1">Interaction:</p>
                  <p className="text-muted-foreground">Click any node to view stakeholder profile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* React Flow Map */}
        <Card>
          <CardContent className="p-0">
            {nodes.length === 0 ? (
              <div className="text-center py-20">
                <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No stakeholders to map</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add meeting notes to extract stakeholders and their relationships
                </p>
                <Button onClick={() => navigate(`/deal/${dealId}/add-meeting`)}>
                  Add Meeting Notes
                </Button>
              </div>
            ) : (
              <div style={{ height: "600px" }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  fitView
                  attributionPosition="bottom-left"
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
