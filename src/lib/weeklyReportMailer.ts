/**
 * Weekly Report Email Dispatcher
 * ────────────────────────────────────────────────────────────────
 * sendWeeklyReportEmail(ownerEmail, ownerName, reportData, pdfBuffer)
 *
 * Sends a personalised HTML email via Resend with the PDF attached.
 * Subject: "📊 Your Weekly Business Performance Report is Ready"
 *
 * CRITICAL DESIGN CONTRACT:
 *   This function is fully error-isolated — it NEVER throws.
 *   Email failure is logged for observability but does NOT propagate,
 *   so a blocked mail queue can never affect database state integrity.
 */

import { Resend } from "resend";
import type { WeeklyReportPDFData } from "@/lib/pdfGenerator";
import { getCategoryTheme } from "@/lib/categoryTheme";

// Lazy getter — avoids top-level instantiation during Next.js build-time
// static analysis when RESEND_API_KEY is not available in the build env.
function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
}

// ── HTML Email Template ──────────────────────────────────────────

function buildEmailHTML(
  ownerName: string,
  businessProfile: { name: string; category: string },
  reportData: WeeklyReportPDFData
): string {
  const m = reportData.structuredMetrics;
  const theme = getCategoryTheme(businessProfile.category);

  const weekStart = new Date(reportData.weekStart).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  const weekEnd = new Date(reportData.weekEnd).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const delta = m
    ? (m.reviewCountDeltaPercent >= 0
        ? `<span style="color:#10B981;">↑ +${m.reviewCountDeltaPercent}%</span>`
        : `<span style="color:#EF4444;">↓ ${m.reviewCountDeltaPercent}%</span>`)
    : "—";

  const summaryPoints = [
    {
      icon: "⭐",
      label: "Overall Rating",
      value: `${reportData.averageRating.toFixed(1)} / 5.0 stars`,
    },
    {
      icon: "📋",
      label: "Total Reviews This Week",
      value: `${reportData.totalReviews} reviews ${m ? `(${delta} vs last week)` : ""}`,
    },
    {
      icon: "👍",
      label: "Most Praised Area",
      value: m?.praisedTopic ?? "No data yet",
    },
    {
      icon: "⚠️",
      label: "Top Improvement Area",
      value: m?.commonComplaint ?? "No issues flagged",
    },
    {
      icon: "📈",
      label: "Google Conversion Rate",
      value: m ? `${m.conversionRate}% of reviews posted to Google` : "—",
    },
  ];

  const summaryPointsHTML = summaryPoints
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 16px; border-bottom:1px solid #F1F5F9;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="32" style="font-size:18px; vertical-align:top; padding-top:2px;">${p.icon}</td>
              <td style="padding-left:10px;">
                <div style="font-size:11px; color:#64748B; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;">${p.label}</div>
                <div style="font-size:14px; color:#1E293B; font-weight:500;">${p.value}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  const strengthsHTML = (reportData.strengths ?? [])
    .slice(0, 3)
    .map((s) => `<li style="margin-bottom:6px; color:#1E293B;">${s}</li>`)
    .join("");

  const aiSummary =
    reportData.aiSummary ?? "AI insights are captured in your attached PDF report.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${theme.reports.title}</title>
</head>
<body style="margin:0; padding:0; background-color:#F0EDF5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDF5; padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0F172A; padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block; background:#6366F1; width:32px; height:32px; border-radius:8px; text-align:center; line-height:32px; font-size:16px; font-weight:bold; color:white; margin-bottom:12px;">R</div>
                  <div style="font-size:11px; color:#A5B4FC; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">ReviewAI</div>
                  <div style="font-size:20px; color:#FFFFFF; font-weight:700; margin-bottom:6px;">Your ${theme.reports.title}</div>
                  <div style="font-size:12px; color:#94A3B8;">${weekStart} → ${weekEnd}  ·  ${businessProfile.name}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 16px;">
            <p style="font-size:15px; color:#1E293B; margin:0 0 12px;">Hi ${ownerName || "there"},</p>
            <p style="font-size:14px; color:#475569; line-height:1.6; margin:0 0 20px;">
              Your weekly AI-powered performance report for <strong>${businessProfile.name}</strong> is ready.
              Here's a quick snapshot of this week's highlights — your full detailed report is attached as a PDF.
            </p>
          </td>
        </tr>

        <!-- Summary Points Card -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden;">
              <div style="background:#6366F1; padding:10px 16px;">
                <span style="font-size:11px; color:#EEF2FF; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">📊 This Week's Key Metrics</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${summaryPointsHTML}
              </table>
            </div>
          </td>
        </tr>

        <!-- AI Summary -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:#EEF2FF; border-left:4px solid #6366F1; border-radius:0 8px 8px 0; padding:16px 20px;">
              <div style="font-size:11px; color:#6366F1; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">AI Executive Summary</div>
              <p style="font-size:13px; color:#334155; line-height:1.65; margin:0;">${aiSummary}</p>
            </div>
          </td>
        </tr>

        <!-- Top Strengths -->
        ${
          strengthsHTML
            ? `<tr>
          <td style="padding:0 32px 24px;">
            <div style="font-size:11px; color:#10B981; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px;">✓ Top Strengths This Week</div>
            <ul style="margin:0; padding-left:20px; font-size:13px; line-height:1.7;">
              ${strengthsHTML}
            </ul>
          </td>
        </tr>`
            : ""
        }

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;">
            <p style="font-size:13px; color:#64748B; margin:0 0 16px;">
              Your complete report — including detailed improvement areas, recommendations, and trend charts — is attached as a PDF to this email.
            </p>
            <p style="font-size:12px; color:#94A3B8; margin:0; line-height:1.5;">
              This report was automatically generated every Monday by ReviewAI.<br/>
              To manage your notification preferences, visit your dashboard settings.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC; border-top:1px solid #E2E8F0; padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:11px; color:#94A3B8;">Powered by <strong style="color:#6366F1;">ReviewAI</strong></td>
                <td align="right" style="font-size:11px; color:#94A3B8;">Confidential — For internal use only</td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Mailer Function ──────────────────────────────────────────────

/**
 * Dispatches the weekly report email with the PDF as an attachment.
 *
 * ✅ ALWAYS resolves — never throws.
 * Email failures are logged but do not affect DB writes.
 *
 * @param ownerEmail   - Recipient's email address
 * @param ownerName    - Recipient's display name (for personalisation)
 * @param businessProfile - Business name and category for theming
 * @param reportData   - The full WeeklyReport data object
 * @param pdfBuffer    - Raw PDF bytes to attach
 * @param weekStart    - ISO date string for attachment filename
 */
export async function sendWeeklyReportEmail(
  ownerEmail: string,
  ownerName: string,
  businessProfile: { name: string; category: string },
  reportData: WeeklyReportPDFData,
  pdfBuffer: Buffer,
  weekStart: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[WeeklyReportMailer] RESEND_API_KEY not set — skipping email.");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const safeDate    = weekStart.slice(0, 10);
    const safeName    = businessProfile.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename    = `reviewai-weekly-report-${safeName}-${safeDate}.pdf`;
    const htmlContent = buildEmailHTML(ownerName, businessProfile, reportData);
    const theme       = getCategoryTheme(businessProfile.category);

    const { data, error } = await getResendClient().emails.send({
      from:    getFromEmail(),
      to:      ownerEmail,
      subject: `📊 Your ${theme.reports.title} is Ready`,
      html:    htmlContent,
      attachments: [
        {
          filename,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (error) {
      console.error(`[WeeklyReportMailer] Resend API error for ${ownerEmail}:`, error);
      return { success: false, error: JSON.stringify(error) };
    }

    console.log(`[WeeklyReportMailer] Email sent → ${ownerEmail} (id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    // ── Non-blocking error isolation ─────────────────────────────
    // Log the failure for observability but NEVER rethrow.
    // This guarantees a blocked mail queue cannot impact DB state.
    const message = err instanceof Error ? err.message : "Unknown mailer error";
    console.error(`[WeeklyReportMailer] Unhandled error for ${ownerEmail}:`, message);
    return { success: false, error: message };
  }
}
