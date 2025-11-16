import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Network, Plus } from "lucide-react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
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
                  {(s.stance || s.power) && (
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
                  )}
                </div>
              ),
            },
            draggable: true, // Enable dragging
            style: {
              background: "#ffffff",
              border: s.power === "high" ? "2px solid #3b82f6" : "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "12px",
              width: "auto",
              minWidth: "140px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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

  // Handle connection creation (drag from one node to another)
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target || !dealId) return;

    // Simple prompt for relationship type
    const relationshipType = window.prompt(
      'What is the relationship?\n\n' +
      '1 = reports to\n' +
      '2 = influences\n' +
      '3 = collaborates with\n\n' +
      'Enter number (1-3):'
    );

    const typeMap: Record<string, string> = {
      '1': 'reports_to',
      '2': 'influences',
      '3': 'collaborates_with',
    };

    const type = typeMap[relationshipType || ''] || 'collaborates_with';

    try {
      // Save to database
      const { data, error } = await supabase
        .from('stakeholder_relationships')
        .insert({
          deal_id: dealId,
          from_stakeholder_id: connection.source,
          to_stakeholder_id: connection.target,
          relationship_type: type,
          confidence: 1.0, // Manual = high confidence
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create relationship:', error);
        toast({
          title: "Failed to create relationship",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Add edge to UI
      setEdges((eds) => addEdge({
        ...connection,
        id: data.id,
        label: type.replace('_', ' '),
        type: 'smoothstep',
        animated: type === 'influences',
        style: {
          stroke: type === 'reports_to' ? '#8b5cf6' :
                 type === 'influences' ? '#f59e0b' : '#6b7280',
        },
      }, eds));

      toast({
        title: "Relationship created",
        description: `Added ${type.replace('_', ' ')} relationship`,
      });
    } catch (error: any) {
      console.error('Error creating relationship:', error);
      toast({
        title: "Error",
        description: "Failed to create relationship",
        variant: "destructive",
      });
    }
  }, [dealId, setEdges, supabase, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading relationship map...</p>
      </div>
    );
  }

  if (!deal) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Simple header */}
      <header className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/deal/${dealId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Network className="h-5 w-5" />
                Stakeholder Map
              </h1>
              <p className="text-sm text-muted-foreground">
                Drag cards to organize. Drag between cards to connect.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/deal/${dealId}/stakeholders`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Stakeholder
          </Button>
        </div>
      </header>

      {/* Map area */}
      <div className="flex-1">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Network className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No stakeholders yet</h3>
              <p className="text-sm mb-4">Add meeting notes to extract stakeholders</p>
              <Button onClick={() => navigate(`/deal/${dealId}/add-meeting`)}>
                Add Meeting
              </Button>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
