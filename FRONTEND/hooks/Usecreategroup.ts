import { useState } from 'react';
import { supabase, supabaseGroups  } from "@/lib/mysupabase/supabase";
import { MemberProfile } from "@/lib/types/member";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "./use-auth-context";


// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateGroupPayload = {
  groupName: string;
  description?: string;
  currency: string;         // kept in payload for future finance-layer wiring; not sent to groups.create_group
  minMembers: number;
  maxMembers: number;
  visibility: 'public' | 'private';
};

export type CreateGroupResult = {
  group_id: string;
  group_ref: string;
  entity_id: string;
  member_code: string;
  status: string;
};

type UseCreateGroupReturn = {
  loading: boolean;
  error: string | null;
  createGroup: (payload: CreateGroupPayload) => Promise<CreateGroupResult | null>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateGroup(): UseCreateGroupReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Step 1 — resolve the authenticated user's member UUID.
   *
   * auth.users.id  →  get_member_entity(auth_id)  →  public.members.id
   *
   * We need public.members.id (not auth_id) because groups.create_group
   * validates the creator against public.members(id).
   */
  async function resolveMemberId(): Promise<string> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      throw new Error('You must be logged in to create a group.');
    }

    const authId = session.user.id;

    const { data, error: rpcError } = await supabase.rpc('get_member_entity', {
      p_auth_id: authId,
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Failed to resolve member identity.');
    }

    // get_member_entity returns: { success, data: { id, ... } } | { success: false, message }
    if (!data?.success) {
      throw new Error(data?.message || 'Member account not found. Please contact support.');
    }

    const memberId: string = data.data?.id;
    if (!memberId) {
      throw new Error('Member ID could not be retrieved.');
    }

    return memberId;
  }

  /**
   * Step 2 — call groups.create_group with validated parameters.
   *
   * Parameters passed to the DB function:
   *   p_created_by        → public.members.id  (resolved above)
   *   p_group_name        → groupName
   *   p_group_description → description (optional)
   *   p_group_visibility  → 'public' | 'private'
   *   p_max_capacity      → maxMembers
   *   p_min_capacity      → minMembers
   *
   * NOT passed:
   *   groupType  — no such column in public.groups (per architecture docs)
   *   currency   — belongs to the finance layer (create_group_entity), not groups.create_group
   */
  async function createGroup(payload: CreateGroupPayload): Promise<CreateGroupResult | null> {
    setLoading(true);
    setError(null);

    try {
      // 1. Resolve member UUID
      const memberId = await resolveMemberId();

      // 2. Call the groups schema RPC
      //    supabaseGroups targets the 'groups' schema so Supabase PostgREST
      //    routes this to groups.create_group
      const { data, error: rpcError } = await supabaseGroups.rpc('create_group', {
        p_created_by:        memberId,
        p_group_name:        payload.groupName.trim(),
        p_currency_code :   'KES',
        p_group_description: payload.description?.trim() ?? null,
        p_group_visibility:  payload.visibility,
        p_max_capacity:      payload.maxMembers,
        p_min_capacity:      payload.minMembers,
      });

      if (rpcError) {
        // Supabase wraps Postgres RAISE EXCEPTION messages in rpcError.message
        throw new Error(rpcError.message || 'Group creation failed. Please try again.');
      }

      // groups.create_group returns a plain jsonb object (not wrapped in success/data)
      // Shape: { group_id, group_ref, entity_id, member_code, status }
      if (!data?.group_id) {
        throw new Error('Unexpected response from server. Please try again.');
      }

      return data as CreateGroupResult;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      return null;

    } finally {
      setLoading(false);
    }
  }

  return { loading, error, createGroup };
}