

import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";
export interface GroupMemberRotationPlans{
            rotation_plan_id:string;
            rotation_name:string;
            rotation_description?:string;
            start_date:string;
            rotation_status:"active"|"dormant"|"completed"|"deleted";
            rotation_plan_member_id:string;
}


export function useGetGroupMemberRotationPlans(group_member_id?: string) {
  return useQuery<GroupMemberRotationPlans[] | []>({
    queryKey: ["group_member_rotation_plans", group_member_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc(
        "get_group_member_rotation_plans",
        {
          p_group_member_id: group_member_id,
        },
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      //console.log("group_member_rotation_plans", data.data.group_member_rotation_plans);
      return data.data.group_member_rotation_plans;
    },
    enabled: true, // always ready if user is logged in; add auth check if needed
    staleTime: 5 * 60 * 1000,
  });
}
