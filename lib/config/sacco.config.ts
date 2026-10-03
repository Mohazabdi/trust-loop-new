import type { SasraLicenseCategory } from "../types/sacco";

/* ------------------------------------------------------------------ */
/*  SASRA — external verification                                     */
/*                                                                    */
/*  SASRA does not expose a public API. The official source is the    */
/*  annual licensed-SACCOs PDF published on sasra.go.ke. This config  */
/*  centralises the URLs and last-verified date so we only need to    */
/*  swap a single constant per year — no app release required.        */
/* ------------------------------------------------------------------ */

export const SASRA = {
  HOMEPAGE_URL: "https://www.sasra.go.ke",
  LICENSED_SACCOS_PAGE_URL:
    "https://www.sasra.go.ke/index.php/regulated-entities/licensed-saccos",
  /**
   * Direct URL to the current year's SASRA licensed-SACCOs PDF.
   * SASRA updates this annually. Swap the year segment each January.
   */
  LICENSED_SACCOS_PDF_URL:
    "https://www.sasra.go.ke/images/2026_licensed_saccos.pdf",
  /** Date the URL above was last confirmed against sasra.go.ke */
  LAST_VERIFIED: "2026-01-15",
} as const;

/* ------------------------------------------------------------------ */
/*  SASRA license categories — the four states a Kenyan SACCO can     */
/*  honestly declare itself to be in.                                 */
/* ------------------------------------------------------------------ */

export interface SasraLicenseCategoryMeta {
  id: SasraLicenseCategory;
  label: string;
  short: string;
  description: string;
}

export const SASRA_LICENSE_CATEGORIES: ReadonlyArray<SasraLicenseCategoryMeta> =
  [
    {
      id: "dt_sacco",
      label: "Deposit-Taking SACCO (DT-SACCO)",
      short: "DT-SACCO",
      description:
        "Licensed by SASRA to operate BOSA and FOSA. Members can make withdrawable deposits.",
    },
    {
      id: "non_dt_sacco",
      label: "Non-Deposit-Taking SACCO (BOSA-only)",
      short: "BOSA-only",
      description:
        "Authorised by SASRA for non-deposit-taking business. No withdrawable deposits.",
    },
    {
      id: "not_regulated",
      label: "Not SASRA-regulated",
      short: "Not regulated",
      description:
        "Operates as a cooperative but is not currently licensed or authorised by SASRA.",
    },
    {
      id: "undisclosed",
      label: "Prefer not to disclose",
      short: "Undisclosed",
      description:
        "Registration information is not shared with TrustLoop at this time.",
    },
  ];

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

export const SACCO_DEFAULTS = {
  CURRENCY: "KES",
  SHARE_VALUE: 1000,
  MINIMUM_SHARES: 10,
  MIN_MEMBERS: 10,
  MAX_MEMBERS: 500,
  LOAN_APPROVAL_QUORUM: 3,
} as const;

/* ------------------------------------------------------------------ */
/*  Financial defaults — used for calculations, not enforced          */
/*  (each SACCO sets its own in the creation form).                   */
/* ------------------------------------------------------------------ */

export const SACCO_DIVIDEND_DEFAULTS = {
  /** Typical Kenyan range for dividends on share capital. */
  RATE_ON_SHARES: 15,
  /** Typical Kenyan range for rebates on member deposits. */
  REBATE_ON_DEPOSITS: 10,
  /** Statutory withholding tax on dividends and rebates. */
  WITHHOLDING_TAX: 5,
} as const;

export const SACCO_LOAN_DEFAULTS = {
  /** Reducing balance rate. Kenyan range is 10–14%; 12% is common. */
  INTEREST_RATE: 12,
  DURATION_MONTHS: 12,
  /** Multiplier on a member's share capital used as a soft limit. */
  BORROWING_MULTIPLIER: 3,
} as const;

/* ------------------------------------------------------------------ */
/*  Kenyan counties — 47 entries, alphabetical, matching the          */
/*  spelling used in official SASRA and Ministry registers.           */
/* ------------------------------------------------------------------ */

export const KENYAN_COUNTIES: ReadonlyArray<string> = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
];