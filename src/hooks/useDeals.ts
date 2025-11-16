import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useDeals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
};

export const useDeal = (dealId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      if (!dealId) return null;

      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("id", dealId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!dealId,
    staleTime: 60000, // Cache for 1 minute
  });
};

export const useStakeholders = (dealId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["stakeholders", dealId],
    queryFn: async () => {
      if (!dealId) return [];

      const { data, error } = await supabase
        .from("stakeholders")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!dealId,
    staleTime: 30000,
  });
};

export const useMeetings = (dealId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["meetings", dealId],
    queryFn: async () => {
      if (!dealId) return [];

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("deal_id", dealId)
        .order("meeting_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!dealId,
    staleTime: 30000,
  });
};

export const useSimulations = (dealId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["simulations", dealId],
    queryFn: async () => {
      if (!dealId) return [];

      const { data, error } = await supabase
        .from("simulations")
        .select("*")
        .eq("deal_id", dealId)
        .eq("status", "completed")
        .not("debrief", "is", null)
        .order("ended_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!dealId,
    staleTime: 60000,
  });
};
