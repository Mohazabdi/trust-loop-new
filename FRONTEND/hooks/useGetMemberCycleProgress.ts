import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";

export function useGetMemberCycleProgress(memberRotationPlanId?: string) {
  return useQuery({
    queryKey: ['member_cycle_progress', memberRotationPlanId],
    queryFn: async () => {
      const { data } = await supabaseGroups.rpc('get_member_cycle_progress', {
        p_rotation_plan_member_id: memberRotationPlanId,
      });
      if (!data?.success) throw new Error(data?.message);
      return data.data;
    },
    enabled: !!memberRotationPlanId,
  });
}