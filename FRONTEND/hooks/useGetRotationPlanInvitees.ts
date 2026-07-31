import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";
export interface RotationPlanInvitees{
                id:string;
                first_name:string;
                last_name:string;
                group_id:string;
                member_role?:string;
                  } 
export function useGetRotationPlanInvitees(rotation_plan_id?: string) {
  return useQuery<RotationPlanInvitees[] | []>({
    queryKey: ["rotation_plan_invitees", rotation_plan_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc(
        "get_rotation_plan_invitees",
        {
          p_rotation_plan_id: rotation_plan_id,
        },
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      console.log("plan_invitees", data.data.rotation_plan_invitees);
      return data.data.rotation_plan_invitees;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}
