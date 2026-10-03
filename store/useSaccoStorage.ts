import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  SACCO_DEFAULTS,
  SACCO_DIVIDEND_DEFAULTS,
} from "@/lib/config/sacco.config";
import type {
  DividendAllocation,
  LoanApproval,
  LoanDecision,
  LoanRepayment,
  SaccoCreator,
  SaccoDividendDeclaration,
  SaccoGroup,
  SaccoInput,
  SaccoLoan,
  SaccoMember,
  SaccoMemberStatus,
  SharePurchase,
} from "@/lib/types/sacco";

/* ------------------------------------------------------------------ */
/*  Local id + reference generators                                   */
/* ------------------------------------------------------------------ */

const genId = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const genGroupRef = (): string => {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `SAC-${t}-${r}`;
};

/* ------------------------------------------------------------------ */
/*  Store shape                                                       */
/* ------------------------------------------------------------------ */

interface SaccoState {
  saccos: SaccoGroup[];

  /* Queries */
  getSaccoById: (id: string) => SaccoGroup | undefined;
  getSaccosForMember: (memberId: string) => SaccoGroup[];

  /* Group lifecycle */
  createSacco: (input: SaccoInput, creator: SaccoCreator) => SaccoGroup;
  updateSacco: (id: string, patch: Partial<SaccoGroup>) => void;
  removeSacco: (id: string) => void;

  /* Members */
  addSaccoMember: (
    saccoId: string,
    member: Omit<SaccoMember, "id" | "joined_at"> & {
      status?: SaccoMemberStatus;
    }
  ) => void;
  updateSaccoMember: (
    saccoId: string,
    memberRowId: string,
    patch: Partial<SaccoMember>
  ) => void;
  removeSaccoMember: (saccoId: string, memberRowId: string) => void;

  /* Shares */
  purchaseShares: (
    saccoId: string,
    purchase: Omit<SharePurchase, "id" | "purchased_at" | "total_value">
  ) => void;

  /* Loans */
  applyForLoan: (
    saccoId: string,
    input: Omit<
      SaccoLoan,
      "id" | "sacco_id" | "applied_at" | "approvals" | "repayments" | "status"
    >
  ) => SaccoLoan;
  decideLoan: (
    saccoId: string,
    loanId: string,
    approver: {
      member_row_id: string;
      member_name: string;
      decision: LoanDecision;
      comment?: string;
      decline_reason?: string;
    }
  ) => void;
  recordLoanRepayment: (
    saccoId: string,
    loanId: string,
    repayment: Omit<LoanRepayment, "id" | "paid_at">
  ) => void;

  /* Dividends */
  declareDividends: (
    saccoId: string,
    input: {
      year: number;
      rate_on_shares: number;
      rebate_on_deposits: number;
    }
  ) => SaccoDividendDeclaration | null;

  /* Utility */
  clearAll: () => void;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                      */
/* ------------------------------------------------------------------ */

function netShareCapitalForMember(
  sacco: SaccoGroup,
  memberRowId: string
): number {
  return sacco.share_purchases
    .filter((p) => p.member_row_id === memberRowId)
    .reduce((sum, p) => sum + p.total_value, 0);
}

function totalSharesForMember(sacco: SaccoGroup, memberRowId: string): number {
  return sacco.share_purchases
    .filter((p) => p.member_row_id === memberRowId)
    .reduce((sum, p) => sum + p.quantity, 0);
}

/* ------------------------------------------------------------------ */
/*  Store implementation                                              */
/* ------------------------------------------------------------------ */

export const useSaccoStorage = create<SaccoState>()(
  persist(
    (set, get) => ({
      saccos: [],

      /* ── Queries ────────────────────────────────────────── */

      getSaccoById: (id) => get().saccos.find((s) => s.sacco_id === id),

      getSaccosForMember: (memberId) =>
        get().saccos.filter((s) =>
          s.members.some(
            (m) => m.group_member_id === memberId && m.status !== "removed"
          )
        ),

      /* ── Group lifecycle ────────────────────────────────── */

      createSacco: (input, creator) => {
        const saccoId = genId();
        const groupRef = genGroupRef();

        const initialMembers: SaccoMember[] = [
          {
            id: genId(),
            group_member_id: creator.member_id,
            first_name: creator.first_name,
            last_name: creator.last_name,
            email: creator.email,
            phone: creator.phone,
            joined_at: new Date().toISOString(),
            status: "active",
            role: "admin",
          },
        ];

        const newSacco: SaccoGroup = {
          sacco_id: saccoId,
          group_ref: groupRef,
          group_name: input.group_name.trim(),
          description: input.description.trim(),
          created_by_id: creator.member_id,
          created_at: new Date().toISOString(),
          status: "active",
          visibility: input.visibility,

          ministry_registration_number:
            input.ministry_registration_number?.trim() || undefined,
          sasra_license_category: input.sasra_license_category,
          sasra_registration_number:
            input.sasra_registration_number?.trim() || undefined,

          share_value: input.share_value,
          minimum_shares_per_member: input.minimum_shares_per_member,
          monthly_contribution: input.monthly_contribution,

          county: input.county,
          currency_code: input.currency_code,

          min_members: input.min_members,
          max_members: input.max_members,

          loan_approval_quorum: input.loan_approval_quorum,

          members: initialMembers,
          share_purchases: [],
          loans: [],
          dividend_declarations: [],
        };

        set((state) => ({ saccos: [...state.saccos, newSacco] }));
        return newSacco;
      },

      updateSacco: (id, patch) =>
        set((state) => ({
          saccos: state.saccos.map((s) =>
            s.sacco_id === id ? { ...s, ...patch } : s
          ),
        })),

      removeSacco: (id) =>
        set((state) => ({
          saccos: state.saccos.filter((s) => s.sacco_id !== id),
        })),

      /* ── Members ────────────────────────────────────────── */

      addSaccoMember: (saccoId, member) =>
        set((state) => ({
          saccos: state.saccos.map((s) => {
            if (s.sacco_id !== saccoId) return s;
            /* Skip duplicates by underlying member identity */
            if (
              s.members.some(
                (m) =>
                  m.group_member_id === member.group_member_id &&
                  m.status !== "removed"
              )
            ) {
              return s;
            }
            const row: SaccoMember = {
              ...member,
              id: genId(),
              joined_at: new Date().toISOString(),
              status: member.status ?? "invited",
            };
            return { ...s, members: [...s.members, row] };
          }),
        })),

      updateSaccoMember: (saccoId, memberRowId, patch) =>
        set((state) => ({
          saccos: state.saccos.map((s) =>
            s.sacco_id === saccoId
              ? {
                  ...s,
                  members: s.members.map((m) =>
                    m.id === memberRowId ? { ...m, ...patch } : m
                  ),
                }
              : s
          ),
        })),

      removeSaccoMember: (saccoId, memberRowId) =>
        set((state) => ({
          saccos: state.saccos.map((s) =>
            s.sacco_id === saccoId
              ? {
                  ...s,
                  members: s.members.map((m) =>
                    m.id === memberRowId ? { ...m, status: "removed" } : m
                  ),
                }
              : s
          ),
        })),

      /* ── Shares ─────────────────────────────────────────── */

      purchaseShares: (saccoId, purchase) =>
        set((state) => ({
          saccos: state.saccos.map((s) => {
            if (s.sacco_id !== saccoId) return s;
            const row: SharePurchase = {
              ...purchase,
              id: genId(),
              purchased_at: new Date().toISOString(),
              total_value: purchase.quantity * purchase.value_per_share,
            };
            return { ...s, share_purchases: [...s.share_purchases, row] };
          }),
        })),

      /* ── Loans ──────────────────────────────────────────── */

      applyForLoan: (saccoId, input) => {
        const loan: SaccoLoan = {
          ...input,
          id: genId(),
          sacco_id: saccoId,
          applied_at: new Date().toISOString(),
          status: "pending",
          approvals: [],
          repayments: [],
        };

        set((state) => ({
          saccos: state.saccos.map((s) =>
            s.sacco_id === saccoId ? { ...s, loans: [loan, ...s.loans] } : s
          ),
        }));

        return loan;
      },

      decideLoan: (saccoId, loanId, approver) => {
        set((state) => ({
          saccos: state.saccos.map((sacco) => {
            if (sacco.sacco_id !== saccoId) return sacco;

            const updatedLoans = sacco.loans.map((loan) => {
              if (loan.id !== loanId || loan.status !== "pending") return loan;

              /* Skip self-approval */
              if (loan.member_row_id === approver.member_row_id) return loan;

              /* Skip duplicate decisions */
              if (
                loan.approvals.some(
                  (a) => a.member_row_id === approver.member_row_id
                )
              ) {
                return loan;
              }

              const approval: LoanApproval = {
                id: genId(),
                member_row_id: approver.member_row_id,
                member_name: approver.member_name,
                decision: approver.decision,
                comment: approver.comment,
                decided_at: new Date().toISOString(),
              };

              if (approver.decision === "decline") {
                return {
                  ...loan,
                  approvals: [...loan.approvals, approval],
                  status: "declined" as const,
                  decline_reason: approver.decline_reason ?? "Declined",
                };
              }

              const approvals = [...loan.approvals, approval];
              const approvalCount = approvals.filter(
                (a) => a.decision === "approve"
              ).length;

              if (approvalCount >= sacco.loan_approval_quorum) {
                const disbursedAt = new Date();
                const dueDate = new Date(disbursedAt);
                dueDate.setMonth(dueDate.getMonth() + loan.duration_months);

                return {
                  ...loan,
                  approvals,
                  status: "active" as const,
                  disbursed_at: disbursedAt.toISOString(),
                  due_date: dueDate.toISOString(),
                };
              }

              return { ...loan, approvals };
            });

            return { ...sacco, loans: updatedLoans };
          }),
        }));
      },

      recordLoanRepayment: (saccoId, loanId, repayment) =>
        set((state) => ({
          saccos: state.saccos.map((sacco) => {
            if (sacco.sacco_id !== saccoId) return sacco;

            const updatedLoans = sacco.loans.map((loan) => {
              if (loan.id !== loanId) return loan;

              const row: LoanRepayment = {
                ...repayment,
                id: genId(),
                paid_at: new Date().toISOString(),
              };

              const repayments = [...loan.repayments, row];
              const totalRepaid = repayments.reduce(
                (sum, r) => sum + r.amount,
                0
              );

              const isFullyRepaid = totalRepaid >= loan.amount;

              return {
                ...loan,
                repayments,
                status: isFullyRepaid ? ("completed" as const) : loan.status,
              };
            });

            return { ...sacco, loans: updatedLoans };
          }),
        })),

      /* ── Dividends ──────────────────────────────────────── */

      declareDividends: (saccoId, input) => {
        const sacco = get().saccos.find((s) => s.sacco_id === saccoId);
        if (!sacco) return null;

        const wTax = SACCO_DIVIDEND_DEFAULTS.WITHHOLDING_TAX / 100;

        const allocations: DividendAllocation[] = sacco.members
          .filter((m) => m.status === "active")
          .map((m) => {
            const shares = totalSharesForMember(sacco, m.id);
            const share_capital = netShareCapitalForMember(sacco, m.id);
            const deposits = 0; /* Phase 3 will wire member deposits */

            const dividend_gross =
              share_capital * (input.rate_on_shares / 100);
            const rebate_gross =
              deposits * (input.rebate_on_deposits / 100);
            const tax = (dividend_gross + rebate_gross) * wTax;
            const net_payout = dividend_gross + rebate_gross - tax;

            return {
              member_row_id: m.id,
              member_name: `${m.first_name} ${m.last_name}`.trim(),
              shares,
              share_capital,
              deposits,
              dividend_gross,
              rebate_gross,
              tax,
              net_payout,
            };
          });

        const declaration: SaccoDividendDeclaration = {
          id: genId(),
          sacco_id: saccoId,
          year: input.year,
          rate_on_shares: input.rate_on_shares,
          rebate_on_deposits: input.rebate_on_deposits,
          declared_at: new Date().toISOString(),
          allocations,
        };

        set((state) => ({
          saccos: state.saccos.map((s) =>
            s.sacco_id === saccoId
              ? {
                  ...s,
                  dividend_declarations: [
                    declaration,
                    ...s.dividend_declarations,
                  ],
                }
              : s
          ),
        }));

        return declaration;
      },

      clearAll: () => set({ saccos: [] }),
    }),
    {
      name: "trustloop-sacco-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/* ------------------------------------------------------------------ */
/*  Re-export the pure helpers for consumers                          */
/* ------------------------------------------------------------------ */

export { netShareCapitalForMember, totalSharesForMember };


/* ------------------------------------------------------------------ */
/*  Loan amortization — reducing balance, monthly                    */
/* ------------------------------------------------------------------ */

export interface LoanAmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

/**
 * Build a full amortization schedule using monthly reducing balance.
 * Returns an empty array for invalid input so callers can guard once.
 */
export function amortizeLoan(
  principal: number,
  annualRatePercent: number,
  months: number
): LoanAmortizationRow[] {
  if (principal <= 0 || months <= 0) return [];

  const monthlyRate = annualRatePercent / 100 / 12;
  const rows: LoanAmortizationRow[] = [];

  if (monthlyRate === 0) {
    const flat = principal / months;
    let balance = principal;
    for (let m = 1; m <= months; m++) {
      balance = Math.max(balance - flat, 0);
      rows.push({
        month: m,
        payment: flat,
        interest: 0,
        principal: flat,
        balance,
      });
    }
    return rows;
  }

  const factor = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  let balance = principal;

  for (let m = 1; m <= months; m++) {
    const interest = balance * monthlyRate;
    const principalPart = emi - interest;
    balance = Math.max(balance - principalPart, 0);
    rows.push({
      month: m,
      payment: emi,
      interest,
      principal: principalPart,
      balance,
    });
  }

  return rows;
}

/**
 * Monthly payment only — useful for form previews.
 */
export function emiFor(
  principal: number,
  annualRatePercent: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}