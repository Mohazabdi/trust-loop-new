import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";

export function useGetRotationProgress(rotation_plan_id?: string) {
  return useQuery({
    queryKey: ['rotation_progress', rotation_plan_id],
    queryFn: async () => {
      const { data } = await supabaseGroups.rpc('get_rotation_progress', {
        p_rotation_plan_id: rotation_plan_id,
      });
      if (!data?.success) throw new Error(data?.message);
      return data.data;
    },
    enabled: !!rotation_plan_id,
  });
}