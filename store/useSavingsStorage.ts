import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type SavingsFrequency = "daily" | "weekly" | "monthly";
export type SavingsStatus = "draft" | "active" | "completed" | "paused";
export type SavingsMemberStatus = "invited" | "active" | "removed";
export type WithdrawalStatus = "pending" | "approved" | "declined";

export interface SavingsMember {
  id: string;
  group_member_id: string;
  first_name: string;
  last_name: string;
  joined_at: string;
  status: SavingsMemberStatus;
}

export interface SavingsContribution {
  id: string;
  group_member_id: string;
  member_name: string;
  amount: number;
  contributed_at: string;
  cycle_number: number;
}

export interface WithdrawalApproval {
  id: string;
  group_member_id: string;
  approver_name: string;
  decision: "approve" | "decline";
  decided_at: string;
  comment?: string;
}

export interface WithdrawalRequest {
  withdrawal_id: string;
  savings_plan_id: string;
  requested_by_id: string;
  requested_by_name: string;
  amount: number;
  reason: string;
  note?: string;
  status: WithdrawalStatus;
  created_at: string;
  approvals: WithdrawalApproval[];
  resolved_at?: string;
  decline_reason?: string;
}

export interface SavingsPlan {
  savings_plan_id: string;
  group_id: string;
  created_by_id: string;
  wallet_id: string;
  savings_name: string;
  savings_description: string;
  target_amount: number;
  amount_per_contribution: number;
  frequency: SavingsFrequency;
  start_date: string;
  end_date?: string;
  currency_code: string;
  savings_status: SavingsStatus;
  created_at: string;
  members: SavingsMember[];
  contributions: SavingsContribution[];
  /** Number of approvals needed to release a withdrawal. Default 3. */
  approval_quorum: number;
  withdrawal_requests: WithdrawalRequest[];
}

export interface SavingsCreator {
  group_member_id: string;
  first_name: string;
  last_name: string;
}

export interface WithdrawalRequestInput {
  plan_id: string;
  requested_by_id: string;
  requested_by_name: string;
  amount: number;
  reason: string;
  note?: string;
}

interface SavingsState {
  plans: SavingsPlan[];

  getPlansForGroup: (groupId: string) => SavingsPlan[];
  getPlanById: (id: string) => SavingsPlan | undefined;

  createPlan: (
    input: Omit<
      SavingsPlan,
      | "savings_plan_id"
      | "created_at"
      | "members"
      | "contributions"
      | "savings_status"
      | "withdrawal_requests"
      | "approval_quorum"
    > & { approval_quorum?: number },
    creator?: SavingsCreator
  ) => SavingsPlan;

  updatePlan: (id: string, patch: Partial<SavingsPlan>) => void;
  removePlan: (id: string) => void;

  reconcileCreator: (planId: string, creator: SavingsCreator) => void;

  addMember: (
    planId: string,
    member: Omit<SavingsMember, "id" | "joined_at" | "status"> & {
      status?: SavingsMemberStatus;
    }
  ) => void;
  updateMemberStatus: (
    planId: string,
    memberRowId: string,
    status: SavingsMemberStatus
  ) => void;
  removeMember: (planId: string, memberRowId: string) => void;

  recordContribution: (
    planId: string,
    contribution: Omit<SavingsContribution, "id" | "contributed_at">
  ) => void;

  /* ── Withdrawal request flow ─────────────────────────────── */

  createWithdrawalRequest: (input: WithdrawalRequestInput) => WithdrawalRequest;

  approveWithdrawal: (
    planId: string,
    withdrawalId: string,
    approver: { group_member_id: string; full_name: string; comment?: string }
  ) => void;

  declineWithdrawal: (
    planId: string,
    withdrawalId: string,
    decliner: { group_member_id: string; full_name: string; reason: string }
  ) => void;

  cancelWithdrawal: (planId: string, withdrawalId: string) => void;

  clearAll: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const genId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const DEFAULT_QUORUM = 3;

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

export const useSavingsStorage = create<SavingsState>()(
  persist(
    (set, get) => ({
      plans: [],

      getPlansForGroup: (groupId) =>
        get().plans.filter((p) => p.group_id === groupId),

      getPlanById: (id) =>
        get().plans.find((p) => p.savings_plan_id === id),

      createPlan: (input, creator) => {
        const initialMembers: SavingsMember[] = creator
          ? [
              {
                id: genId(),
                group_member_id: creator.group_member_id,
                first_name: creator.first_name,
                last_name: creator.last_name,
                joined_at: new Date().toISOString(),
                status: "active",
              },
            ]
          : [];

        const newPlan: SavingsPlan = {
          ...input,
          approval_quorum: input.approval_quorum ?? DEFAULT_QUORUM,
          savings_plan_id: genId(),
          created_at: new Date().toISOString(),
          savings_status: "draft",
          members: initialMembers,
          contributions: [],
          withdrawal_requests: [],
        };
        set((state) => ({ plans: [...state.plans, newPlan] }));
        return newPlan;
      },

      updatePlan: (id, patch) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.savings_plan_id === id ? { ...p, ...patch } : p
          ),
        })),

      removePlan: (id) =>
        set((state) => ({
          plans: state.plans.filter((p) => p.savings_plan_id !== id),
        })),

      reconcileCreator: (planId, creator) => {
        set((state) => ({
          plans: state.plans.map((p) => {
            if (p.savings_plan_id !== planId) return p;
            if (
              p.members.some(
                (m) => m.group_member_id === creator.group_member_id
              )
            ) {
              return p;
            }
            return {
              ...p,
              members: [
                {
                  id: genId(),
                  group_member_id: creator.group_member_id,
                  first_name: creator.first_name,
                  last_name: creator.last_name,
                  joined_at: new Date().toISOString(),
                  status: "active",
                },
                ...p.members,
              ],
            };
          }),
        }));
      },

      addMember: (planId, member) =>
        set((state) => ({
          plans: state.plans.map((p) => {
            if (p.savings_plan_id !== planId) return p;
            if (
              p.members.some(
                (m) => m.group_member_id === member.group_member_id
              )
            ) {
              return p;
            }
            return {
              ...p,
              members: [
                ...p.members,
                {
                  ...member,
                  id: genId(),
                  joined_at: new Date().toISOString(),
                  status: member.status ?? "invited",
                },
              ],
            };
          }),
        })),

      updateMemberStatus: (planId, memberRowId, status) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.savings_plan_id === planId
              ? {
                  ...p,
                  members: p.members.map((m) =>
                    m.id === memberRowId ? { ...m, status } : m
                  ),
                }
              : p
          ),
        })),

      removeMember: (planId, memberRowId) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.savings_plan_id === planId
              ? {
                  ...p,
                  members: p.members.filter((m) => m.id !== memberRowId),
                }
              : p
          ),
        })),

      recordContribution: (planId, contribution) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.savings_plan_id === planId
              ? {
                  ...p,
                  contributions: [
                    ...p.contributions,
                    {
                      ...contribution,
                      id: genId(),
                      contributed_at: new Date().toISOString(),
                    },
                  ],
                }
              : p
          ),
        })),

      /* ── Withdrawal request flow ────────────────────────── */

      createWithdrawalRequest: (input) => {
        const request: WithdrawalRequest = {
          withdrawal_id: genId(),
          savings_plan_id: input.plan_id,
          requested_by_id: input.requested_by_id,
          requested_by_name: input.requested_by_name,
          amount: input.amount,
          reason: input.reason,
          note: input.note,
          status: "pending",
          created_at: new Date().toISOString(),
          approvals: [],
        };

        set((state) => ({
          plans: state.plans.map((p) =>
            p.savings_plan_id === input.plan_id
              ? { ...p, withdrawal_requests: [request, ...p.withdrawal_requests] }
              : p
          ),
        }));

        return request;
      },

      approveWithdrawal: (planId, withdrawalId, approver) => {
        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.savings_plan_id !== planId) return plan;

            const updated = plan.withdrawal_requests.map((w) => {
              if (w.withdrawal_id !== withdrawalId) return w;
              if (w.status !== "pending") return w;
              if (w.requested_by_id === approver.group_member_id) return w;
              if (
                w.approvals.some(
                  (a) => a.group_member_id === approver.group_member_id
                )
              ) {
                return w;
              }

              const newApproval: WithdrawalApproval = {
                id: genId(),
                group_member_id: approver.group_member_id,
                approver_name: approver.full_name,
                decision: "approve",
                decided_at: new Date().toISOString(),
                comment: approver.comment,
              };

              const approvals = [...w.approvals, newApproval];
              const approvalCount = approvals.filter(
                (a) => a.decision === "approve"
              ).length;

              /* Quorum reached → mark approved AND log the withdrawal */
              if (approvalCount >= plan.approval_quorum) {
                return {
                  ...w,
                  approvals,
                  status: "approved" as const,
                  resolved_at: new Date().toISOString(),
                };
              }

              return { ...w, approvals };
            });

            /* If a request was just approved, log the money movement */
            const justApproved = updated.find(
              (w) =>
                w.withdrawal_id === withdrawalId &&
                w.status === "approved" &&
                !plan.contributions.some(
                  (c) => c.member_name.includes(w.withdrawal_id)
                )
            );

            const extraContributions: SavingsContribution[] = justApproved
              ? [
                  {
                    id: genId(),
                    group_member_id: justApproved.requested_by_id,
                    member_name: `${justApproved.reason}${
                      justApproved.note ? ` · ${justApproved.note}` : ""
                    } [${justApproved.withdrawal_id.slice(0, 8)}]`,
                    amount: -justApproved.amount,
                    contributed_at: new Date().toISOString(),
                    cycle_number: plan.contributions.length + 1,
                  },
                ]
              : [];

            return {
              ...plan,
              withdrawal_requests: updated,
              contributions: [...plan.contributions, ...extraContributions],
            };
          }),
        }));
      },

      declineWithdrawal: (planId, withdrawalId, decliner) => {
        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.savings_plan_id !== planId) return plan;

            const updated = plan.withdrawal_requests.map((w) => {
              if (w.withdrawal_id !== withdrawalId) return w;
              if (w.status !== "pending") return w;

              const newApproval: WithdrawalApproval = {
                id: genId(),
                group_member_id: decliner.group_member_id,
                approver_name: decliner.full_name,
                decision: "decline",
                decided_at: new Date().toISOString(),
                comment: decliner.reason,
              };

              /* One decline kills the request */
              return {
                ...w,
                approvals: [...w.approvals, newApproval],
                status: "declined" as const,
                resolved_at: new Date().toISOString(),
                decline_reason: decliner.reason,
              };
            });

            return { ...plan, withdrawal_requests: updated };
          }),
        }));
      },

      cancelWithdrawal: (planId, withdrawalId) => {
        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.savings_plan_id === planId
              ? {
                  ...plan,
                  withdrawal_requests: plan.withdrawal_requests.filter(
                    (w) => w.withdrawal_id !== withdrawalId
                  ),
                }
              : plan
          ),
        }));
      },

      clearAll: () => set({ plans: [] }),
    }),
    {
      name: "trustloop-savings-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);