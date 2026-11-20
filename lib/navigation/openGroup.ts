import type { useRouter } from "expo-router";

export type GroupKind = "community" | "sacco";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Single source of truth for opening a group from anywhere in the app
 * (Home dashboard, Groups tab, notifications, deep links...).
 * Keeping it in one place means both tabs always land on the same screen
 * with the same params.
 */
export function openGroup(
  router: AppRouter,
  group: { id: string; kind: GroupKind },
  memberId?: string
) {
  router.push({
    pathname: group.kind === "sacco" ? "/(tabs)/groups/sacco/home" : "/(tabs)/groups/group",
    params:
      group.kind === "sacco"
        ? { sacco_id: group.id, group_member_id: memberId }
        : { group_id: group.id },
  });
}
