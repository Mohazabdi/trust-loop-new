
// types/rotationReports.ts
export interface MemberReport {
  member_info: {
    rotation_plan_member_id: string;
    member_name: string;
    rotation_name: string;
    rotation_description: string;
    amount_collectable: number;
    start_date: string;
    end_date: string;
    rotation_status: string;
    currency_code: string;
  };
  contributions: Array<{
    transaction_id: string;
    trans_amount: number;
    trans_type: string;
    transaction_date: string;
  }>;
  collections: Array<{
    collection_id: string;
    amount_recorded: number;
    date_collected: string;
    date_scheduled: string;
    rotation_schedule_index: number;
  }>;
  disbursements: Array<{
    disbursement_id: string;
    amount_recorded: number;
    date_collected: string;
    date_scheduled: string;
    rotation_schedule_index: number;
  }>;
  totals: {
    total_contributed: number;
    total_collected: number;
    total_disbursed: number;
  };
  cycles: Array<{
    date_scheduled: string;
    rotation_schedule_index: number;
    collected: number;
    disbursed: number;
  }>;
}

export interface PlanReport {
  plan_info: {
    rotation_name: string;
    rotation_description: string;
    amount_collectable: number;
    start_date: string;
    end_date: string;
    rotation_status: string;
    currency_code: string;
    total_members: number;
  };
  members: Array<{
    member_name: string;
    total_contributed: number;
    total_collected: number;
    total_disbursed: number;
    net_balance: number;
}>;
overall_totals: {
      
    total_contributed_all: number;
    total_collected_all: number;
    total_disbursed_all: number;
    
  };
}


export function generateMemberReportHTML(report: MemberReport): string {
  const mi = report.member_info;
  const tot = report.totals;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { dateStyle: "medium" });

  // Helper to build an HTML table from an array of objects
  const buildTable = (rows: any[], columns: string[]) => `
    <table style="width:100%; border-collapse: collapse; margin: 8px 0;">
      <thead>
        <tr style="background: #f1f5f9;">
          ${columns.map((col) => `<th style="padding: 6px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #cbd5e1;">${col}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            ${columns.map((col) => `<td style="padding: 6px 8px; font-size: 13px;">${row[col] ?? ""}</td>`).join("")}
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  return `
    <html>
    <head>
      <meta charset="utf-8">
      <title>Member Rotation Report</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 20px; }
        .container { max-width: 700px; margin: auto; }
        .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
        .brand { font-size: 28px; font-weight: 800; color: #0f172a; }
        .title { font-size: 16px; color: #64748b; font-weight: 600; }
        .section-title { font-size: 14px; font-weight: 700; color: #334155; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .kv { display: flex; justify-content: space-between; font-size: 14px; margin: 4px 0; }
        .label { color: #64748b; }
        .value { font-weight: 600; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">TrustLoop</div>
          <div class="title">Member Rotation Report</div>
        </div>

        <div class="section-title">Plan Details</div>
        <div class="kv"><span class="label">Member Name:</span><span class="value">${mi.member_name}</span></div>
        <div class="kv"><span class="label">Rotation Name:</span><span class="value">${mi.rotation_name}</span></div>
        <div class="kv"><span class="label">Description:</span><span class="value">${mi.rotation_description || "—"}</span></div>
        <div class="kv"><span class="label">Amount per Cycle:</span><span class="value">${mi.amount_collectable.toLocaleString()} ${mi.currency_code}</span></div>
        <div class="kv"><span class="label">Start Date:</span><span class="value">${formatDate(mi.start_date)}</span></div>
        <div class="kv"><span class="label">End Date:</span><span class="value">${mi.end_date ? formatDate(mi.end_date) : "N/A"}</span></div>
        <div class="kv"><span class="label">Status:</span><span class="value">${mi.rotation_status}</span></div>

        <div class="section-title">Financial Summary</div>
        <div class="kv"><span class="label">Total Contributed:</span><span class="value">${tot.total_contributed.toLocaleString()} ${mi.currency_code}</span></div>
        <div class="kv"><span class="label">Total Collected:</span><span class="value">${tot.total_collected.toLocaleString()} ${mi.currency_code}</span></div>
        <div class="kv"><span class="label">Total Disbursed (to you):</span><span class="value">${tot.total_disbursed.toLocaleString()} ${mi.currency_code}</span></div>
        <div class="kv"><span class="label">Net Reserve Balance:</span><span class="value">${(tot.total_contributed - tot.total_collected).toLocaleString()} ${mi.currency_code}</span></div>

        <div class="section-title">Contribution History</div>
        ${
          report.contributions.length > 0
            ? buildTable(
                report.contributions.map((c) => ({
                  Date: formatDate(c.transaction_date),
                  Amount: `+${c.trans_amount.toLocaleString()}`,
                  Type: c.trans_type,
                })),
                ["Date", "Amount", "Type"]
              )
            : "<p style='font-size:13px; color:#64748b;'>No contributions recorded.</p>"
        }

        <div class="section-title">Collection History</div>
        ${
          report.collections.length > 0
            ? buildTable(
                report.collections.map((c) => ({
                  Date: formatDate(c.date_collected),
                  Amount: `-${c.amount_recorded.toLocaleString()}`,
                  "Scheduled Date": formatDate(c.date_scheduled),
                  Cycle: c.rotation_schedule_index,
                })),
                ["Date", "Amount", "Scheduled Date", "Cycle"]
              )
            : "<p style='font-size:13px; color:#64748b;'>No collections recorded.</p>"
        }

        <div class="section-title">Disbursements Received</div>
        ${
          report.disbursements.length > 0
            ? buildTable(
                report.disbursements.map((d) => ({
                  Date: formatDate(d.date_collected),
                  Amount: `+${d.amount_recorded.toLocaleString()}`,
                  "Scheduled Date": formatDate(d.date_scheduled),
                  Cycle: d.rotation_schedule_index,
                })),
                ["Date", "Amount", "Scheduled Date", "Cycle"]
              )
            : "<p style='font-size:13px; color:#64748b;'>No disbursements received.</p>"
        }

        <div class="section-title">Cycle Breakdown</div>
        ${
          report.cycles.length > 0
            ? buildTable(
                report.cycles.map((cy) => ({
                  "Cycle Index": cy.rotation_schedule_index,
                  "Date": formatDate(cy.date_scheduled),
                  "Collected": cy.collected.toLocaleString(),
                  "Disbursed": cy.disbursed.toLocaleString(),
                })),
                ["Cycle Index", "Date", "Collected", "Disbursed"]
              )
            : "<p style='font-size:13px; color:#64748b;'>No cycle data.</p>"
        }

        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generatePlanReportHTML(report: PlanReport): string {
  const pi = report.plan_info;
  const ot = report.overall_totals;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { dateStyle: "medium" });

  const buildTable = (rows: any[], columns: string[]) => `
    <table style="width:100%; border-collapse: collapse; margin: 8px 0;">
      <thead>
        <tr style="background: #f1f5f9;">
          ${columns.map((col) => `<th style="padding: 6px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #cbd5e1;">${col}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            ${columns.map((col) => `<td style="padding: 6px 8px; font-size: 13px;">${row[col] ?? ""}</td>`).join("")}
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  return `
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rotation Plan Report</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 20px; }
        .container { max-width: 700px; margin: auto; }
        .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
        .brand { font-size: 28px; font-weight: 800; color: #0f172a; }
        .title { font-size: 16px; color: #64748b; font-weight: 600; }
        .section-title { font-size: 14px; font-weight: 700; color: #334155; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .kv { display: flex; justify-content: space-between; font-size: 14px; margin: 4px 0; }
        .label { color: #64748b; }
        .value { font-weight: 600; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">TrustLoop</div>
          <div class="title">Rotation Plan Report</div>
        </div>

        <div class="section-title">Plan Overview</div>
        <div class="kv"><span class="label">Rotation Name:</span><span class="value">${pi.rotation_name}</span></div>
        <div class="kv"><span class="label">Description:</span><span class="value">${pi.rotation_description || "—"}</span></div>
        <div class="kv"><span class="label">Amount per Cycle:</span><span class="value">${pi.amount_collectable.toLocaleString()} ${pi.currency_code}</span></div>
        <div class="kv"><span class="label">Start Date:</span><span class="value">${formatDate(pi.start_date)}</span></div>
        <div class="kv"><span class="label">End Date:</span><span class="value">${pi.end_date ? formatDate(pi.end_date) : "N/A"}</span></div>
        <div class="kv"><span class="label">Status:</span><span class="value">${pi.rotation_status}</span></div>
        <div class="kv"><span class="label">Total Members:</span><span class="value">${pi.total_members}</span></div>

        <div class="section-title">Overall Financial Summary</div>
        <div class="kv"><span class="label">Total Contributed (all):</span><span class="value">${ot.total_contributed_all.toLocaleString()} ${pi.currency_code}</span></div>
        <div class="kv"><span class="label">Total Collected (all):</span><span class="value">${ot.total_collected_all.toLocaleString()} ${pi.currency_code}</span></div>
        <div class="kv"><span class="label">Total Disbursed (all):</span><span class="value">${ot.total_disbursed_all.toLocaleString()} ${pi.currency_code}</span></div>

        <div class="section-title">Member Balances</div>
        ${
          report.members.length > 0
            ? buildTable(
                report.members.map((m) => ({
                  "Member": m.member_name,
                  "Contributed": m.total_contributed.toLocaleString(),
                  "Collected": m.total_collected.toLocaleString(),
                  "Disbursed": m.total_disbursed.toLocaleString(),
                  "Net Balance": m.net_balance.toLocaleString(),
                })),
                ["Member", "Contributed", "Collected", "Disbursed", "Net Balance"]
              )
            : "<p style='font-size:13px; color:#64748b;'>No members.</p>"
        }

        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
}