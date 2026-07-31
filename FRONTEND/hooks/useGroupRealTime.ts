import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useGroupRealtime(group_member_id?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!group_member_id) return;
    const channel = supabaseGroups
      .channel(`group-${group_member_id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "groups",
          table: "rotation_plan_invite",
          filter: `group_member_id=eq.${group_member_id}`
        },
        () => {
          console.log("Realtime: invite change detected");
          queryClient.invalidateQueries({
             queryKey: ["member_rotation_invites", group_member_id],
          });
        },
      ) .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "groups",
          table: "payout_request",
          filter: `requested_to=eq.${group_member_id}`,
        },
        () => {
          console.log("Realtime: payout request change detected");
          queryClient.invalidateQueries({
             queryKey: ["payout_requests", group_member_id],
          });
        },
      ) 
      .subscribe();
    return () => {
      supabaseGroups.removeChannel(channel);
    };
  }, [group_member_id, queryClient]);
}
