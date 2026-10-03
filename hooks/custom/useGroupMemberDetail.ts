
import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { GroupMemberDataDetail } from "@/lib/types/group_member_detail";
import { useQuery } from "@tanstack/react-query";
export function useGroupMemberDetail(
  group_id?:string,
  member_id?:string
) {
  return useQuery<GroupMemberDataDetail>({
    queryKey: ["group_member_data_detail",group_id,member_id ],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc("get_group_member_detail", {
        p_group_id:group_id,
        p_member_id:member_id
      });
      
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data?.message || "Unknown error");
      //console.log("DataForMemberDetail",data.group_member_data)
      return data.data.group_member_data;
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, 
  });
}
