import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";

export interface GroupMemberRotationPlanInvites{
            id:string;
            group_member_id:string;
            expires_at:string;
            rotation_description?:string;
            plan_name:string;
            interval_name:string;
            days_in_interval:string;
            amount_collectable:number;
            invited_by:string;
            created_at:string;
}
export function useGetGroupMemberPlanInvites(group_member_id?: string) {
  //console.log("Member Id from the Backend",group_member_id);
  return useQuery<GroupMemberRotationPlanInvites[] | []>({
    queryKey: ["member_rotation_invites", group_member_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc(
        "get_member_rotation_invites",
        {
          p_group_member_id: group_member_id,
        },
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      //console.log("group_member_plan_invites", data.data.member_rotation_invites);
      return data.data.member_rotation_invites;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}