import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";
export interface RotationPlanMembers{
            id:string;
            rotation_plan_id:string;
            rotation_name:string;
            group_member_id:string;
            member_first_name:string;
            member_last_name:string;
            member_role:string;
            invitation_status:string;
}
export function useGetRotationPlanMemberInvites(rotation_plan_id?:string) {
  return useQuery<RotationPlanMembers[]|[]>({
    queryKey: ["group_member_rotation_invites", rotation_plan_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc("get_rotation_plan_members", {
        p_rotation_plan_id: rotation_plan_id!,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      //console.log("The Backend",data.data.group_member_rotation_invites)
      return data.data.group_member_rotation_invites; 
    },
    enabled: true, 
    staleTime: 10 * 60 * 1000, 
  });
}
