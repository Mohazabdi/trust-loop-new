/* ------------------------------------------------------------------ */
/*  SACCO domain types                                                */
/*                                                                    */
/*  These mirror the shape of the future Supabase tables. Local       */
/*  persistence today, RPC-backed rows later — no consumer changes.   */
/* ------------------------------------------------------------------ */

export type SasraLicenseCategory =
  | "dt_sacco"
  | "non_dt_sacco"
  | "not_regulated"
  | "undisclosed";

export type SaccoGroupVisibility = "public" | "private";
export type SaccoGroupStatus = "active" | "paused" | "archived";

export type SaccoMemberStatus = "invited" | "active" | "removed";
export type SaccoMemberRole = "admin" | "treasurer" | "secretary" | "member";

export type LoanStatus =
  | "pending"
  | "approved"
  | "declined"
  | "active"
  | "completed";

export type LoanDecision = "approve" | "decline";

/* ------------------------------------------------------------------ */
/*  Members                                                           */
/* ------------------------------------------------------------------ */

export interface SaccoMember {
  /** Row id — stable per SACCO membership, used for FK references. */
  id: string;
  /** Underlying member identity (public.members.id when integrated). */
  group_member_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  joined_at: string;
  status: SaccoMemberStatus;
  role: SaccoMemberRole;
}

/* ------------------------------------------------------------------ */
/*  Shares                                                            */
/* ------------------------------------------------------------------ */

export interface SharePurchase {
  id: string;
  sacco_id: string;
  member_row_id: string;
  member_name: string;
  quantity: number;
  value_per_share: number;
  total_value: number;
  purchased_at: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/*  Loans                                                             */
/* ------------------------------------------------------------------ */

export interface LoanApproval {
  id: string;
  member_row_id: string;
  member_name: string;
  decision: LoanDecision;
  comment?: string;
  decided_at: string;
}

export interface LoanRepayment {
  id: string;
  amount: number;
  paid_at: string;
  note?: string;
}

export interface SaccoLoan {
  id: string;
  sacco_id: string;
  member_row_id: string;
  member_name: string;
  amount: number;
  /** Annual reducing balance rate, in percent (e.g. 12). */
  interest_rate: number;
  duration_months: number;
  purpose: string;
  status: LoanStatus;
  applied_at: string;
  approvals: LoanApproval[];
  repayments: LoanRepayment[];
  decline_reason?: string;
  disbursed_at?: string;
  /** ISO date the loan is expected to be fully repaid. */
  due_date?: string;
}

/* ------------------------------------------------------------------ */
/*  Dividends                                                         */
/* ------------------------------------------------------------------ */

export interface DividendAllocation {
  member_row_id: string;
  member_name: string;
  shares: number;
  share_capital: number;
  deposits: number;
  dividend_gross: number;
  rebate_gross: number;
  tax: number;
  net_payout: number;
}

export interface SaccoDividendDeclaration {
  id: string;
  sacco_id: string;
  year: number;
  rate_on_shares: number;
  rebate_on_deposits: number;
  declared_at: string;
  allocations: DividendAllocation[];
}

/* ------------------------------------------------------------------ */
/*  The SACCO group                                                   */
/* ------------------------------------------------------------------ */

export interface SaccoGroup {
  sacco_id: string;
  group_ref: string;
  group_name: string;
  description: string;
  created_by_id: string;
  created_at: string;
  status: SaccoGroupStatus;
  visibility: SaccoGroupVisibility;

  /* Registration — self-declared, ops-verified later */
  ministry_registration_number?: string;
  sasra_license_category: SasraLicenseCategory;
  sasra_registration_number?: string;
  /** Populated only by TrustLoop ops after a PDF cross-check. */
  sasra_verified_at?: string;
  sasra_verified_by?: string;

  /* Share structure */
  share_value: number;
  minimum_shares_per_member: number;
  monthly_contribution?: number;

  /* Geography */
  county?: string;
  currency_code: string;

  /* Capacity */
  min_members: number;
  max_members: number;

  /* Governance */
  loan_approval_quorum: number;

  /* Related collections — always arrays, never nested objects */
  members: SaccoMember[];
  share_purchases: SharePurchase[];
  loans: SaccoLoan[];
  dividend_declarations: SaccoDividendDeclaration[];
}

/* ------------------------------------------------------------------ */
/*  Input shapes for store mutations                                  */
/* ------------------------------------------------------------------ */

export interface SaccoInput {
  group_name: string;
  description: string;
  ministry_registration_number?: string;
  sasra_license_category: SasraLicenseCategory;
  sasra_registration_number?: string;
  share_value: number;
  minimum_shares_per_member: number;
  monthly_contribution?: number;
  county?: string;
  currency_code: string;
  min_members: number;
  max_members: number;
  visibility: SaccoGroupVisibility;
  loan_approval_quorum: number;
}

export interface SaccoCreator {
  member_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

/* ------------------------------------------------------------------ */
/*  Convenience helpers (pure functions)                              */
/* ------------------------------------------------------------------ */

/**
 * Whether the SACCO's category implies it can take withdrawable
 * deposits. Only DT-SACCOs can, by SASRA rules.
 */
export function canTakeDeposits(category: SasraLicenseCategory): boolean {
  return category === "dt_sacco";
}

/**
 * Human-readable label for a category id.
 */
export function sasraCategoryShort(category: SasraLicenseCategory): string {
  switch (category) {
    case "dt_sacco":
      return "DT-SACCO";
    case "non_dt_sacco":
      return "BOSA-only";
    case "not_regulated":
      return "Not regulated";
    case "undisclosed":
      return "Undisclosed";
  }
}