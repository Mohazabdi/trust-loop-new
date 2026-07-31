import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useEffect, useState } from "react";

export type DiscoverableGroup = {
  group_id: string;
  group_name: string;
  group_description: string | null;
  member_count: number;
  created_at: string;
};

export function useDiscoverableGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<DiscoverableGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscoverable = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabaseGroups.rpc("list_discoverable_groups", {
        p_user_id: userId,
        p_limit: 50,
      });
      if (rpcError) throw new Error(rpcError.message);
      setGroups(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscoverable();
  }, [userId]);

  return { groups, loading, error, refetch: fetchDiscoverable };
}