/**
 * Weekly Report Cron Orchestrator
 * ────────────────────────────────────────────────────────────────
 * runWeeklyReportCron() → CronRunSummary
 *
 * The background runner that fires every Monday 00:00 UTC.
 * Called exclusively by GET /api/cron/weekly-reports.
 *
 * Pipeline per business:
 *   1.  Pull all Business records from the database
 *   2.  Compute previous Mon–Sun date window
 *   3.  calculateWeeklyMetrics()       → compact aggregate
 *   4.  generateWeeklyReportAI()       → LLM narrative
 *   5.  Upsert WeeklyReport DB row     ← always written (all plans)
 *   6.  [pro plan only]
 *       generateWeeklyReportPDF()      → Buffer
 *       uploadPDFToStorage()           → Firebase signed URL
 *       prisma.weeklyReport.update()   → pdfUrl persisted
 *       sendWeeklyReportEmail()        → Resend attachment dispatch
 *
 * Resilience contract:
 *   - Each business runs inside its own try/catch.
 *     One failure NEVER aborts the full loop.
 *   - AI and email both have their own graceful fallbacks.
 *   - 200 ms pause between businesses to respect Groq rate limits.
 */

import prisma from "@/lib/prisma";
import { calculateWeeklyMetrics } from "@/lib/weeklyAnalytics";
import { generateWeeklyReportAI } from "@/lib/weeklyReportPrompt";
import { generateWeeklyReportPDF } from "@/lib/pdfGenerator";
import { uploadPDFToStorage } from "@/lib/firebaseStorageAdmin";
import { sendWeeklyReportEmail } from "@/lib/weeklyReportMailer";
import type { WeeklyReportPDFData, BusinessProfileData } from "@/lib/pdfGenerator";

// ── Types ────────────────────────────────────────────────────────

export interface BusinessCronResult {
  businessId:   string;
  businessName: string;
  plan:         string;
  status:       "success" | "skipped" | "failed";
  pdfUploaded:  boolean;
  emailSent:    boolean;
  error?:       string;
}

export interface CronRunSummary {
  startedAt:    string;
  completedAt:  string;
  totalBusinesses: number;
  processed:    number;
  skipped:      number;
  failed:       number;
  pdfUploaded:  number;
  emailsSent:   number;
  results:      BusinessCronResult[];
}

// ── Date Window Helper ────────────────────────────────────────────

/**
 * Returns the previous calendar week as Monday 00:00:00 → Sunday 23:59:59 UTC.
 * On Monday 2024-01-08: returns { start: 2024-01-01, end: 2024-01-07 23:59:59 }
 */
function getPreviousWeekWindow(): { start: Date; end: Date } {
  const now = new Date();

  // Most-recent Monday (start of current week, UTC)
  const dayOfWeek    = now.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday   = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysToMonday,
    0, 0, 0, 0
  ));

  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);

  const lastSunday = new Date(thisMonday);
  lastSunday.setUTCMilliseconds(-1); // one millisecond before this Monday

  return { start: lastMonday, end: lastSunday };
}

/** 200ms pause — keeps Groq LLM requests within rate limits */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main Cron Runner ─────────────────────────────────────────────

/**
 * Full-scan cron orchestrator.
 * Always resolves — surface individual failures in CronRunSummary.
 */
export async function runWeeklyReportCron(): Promise<CronRunSummary> {
  const startedAt = new Date().toISOString();
  const results: BusinessCronResult[] = [];

  // ── 1. Pull all business records + owner emails ────────────────
  const businesses = await prisma.business.findMany({
    select: {
      id:       true,
      ownerId:  true,
      name:     true,
      category: true,
      city:     true,
      plan:     true,
    },
  });

  // Batch-fetch owner emails from User table
  const ownerIds = [...new Set(businesses.map((b) => b.ownerId))];
  const users    = await prisma.user.findMany({
    where:  { id: { in: ownerIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // ── 2. Date window (previous Mon → Sun) ───────────────────────
  const { start: weekStart, end: weekEnd } = getPreviousWeekWindow();

  console.log(
    `[CronRunner] Starting weekly report run for ${businesses.length} businesses. ` +
    `Window: ${weekStart.toISOString().slice(0, 10)} → ${weekEnd.toISOString().slice(0, 10)}`
  );

  // ── 3. Process each business sequentially ─────────────────────
  for (const business of businesses) {
    const result: BusinessCronResult = {
      businessId:   business.id,
      businessName: business.name,
      plan:         business.plan,
      status:       "failed",
      pdfUploaded:  false,
      emailSent:    false,
    };

    try {
      const owner = userMap.get(business.ownerId);

      // ── 3a. Calculate metrics ──────────────────────────────────
      const metrics = await calculateWeeklyMetrics(
        business.id,
        weekStart,
        weekEnd
      );

      // ── 3b. Generate AI narrative (always resolves) ────────────
      const aiOutput = await generateWeeklyReportAI(metrics);
      const { _aiAvailable, ...aiFields } = aiOutput;

      if (!_aiAvailable) {
        console.warn(`[CronRunner] AI fallback used for business ${business.id}`);
      }

      // ── 3c. Upsert WeeklyReport DB row (ALL plans) ─────────────
      const existing = await prisma.weeklyReport.findFirst({
        where: { businessId: business.id, weekStart },
        select: { id: true },
      });

      const reportPayload = {
        weekEnd,
        averageRating:     metrics.avgOverallRating,
        totalReviews:      metrics.totalReviewsThisWeek,
        structuredMetrics: metrics as object,
        aiSummary:         aiFields.executive_summary,
        strengths:         aiFields.strengths,
        improvements:      aiFields.improvements,
        recommendations:   aiFields.recommendations,
      };

      const savedReport = existing
        ? await prisma.weeklyReport.update({
            where: { id: existing.id },
            data:  reportPayload,
          })
        : await prisma.weeklyReport.create({
            data: {
              businessId: business.id,
              weekStart,
              ...reportPayload,
            },
          });

      console.log(
        `[CronRunner] DB row saved for ${business.name} (id: ${savedReport.id})`
      );

      // ── 3d. PDF + email pipeline (pro plan only) ───────────────
      if (business.plan === "pro" && owner?.email) {
        // Build typed PDF data object
        const pdfData: WeeklyReportPDFData = {
          id:               savedReport.id,
          weekStart:        savedReport.weekStart,
          weekEnd:          savedReport.weekEnd,
          averageRating:    savedReport.averageRating,
          totalReviews:     savedReport.totalReviews,
          structuredMetrics: metrics,
          aiSummary:        savedReport.aiSummary,
          strengths:        (savedReport.strengths as string[] | null),
          improvements:     (savedReport.improvements as string[] | null),
          recommendations:  (savedReport.recommendations as string[] | null),
          pdfUrl:           savedReport.pdfUrl,
          createdAt:        savedReport.createdAt,
        };

        const businessProfile: BusinessProfileData = {
          id:       business.id,
          name:     business.name,
          category: business.category,
          city:     business.city,
        };

        // Generate PDF buffer
        const pdfBuffer = await generateWeeklyReportPDF(pdfData, businessProfile);
        console.log(
          `[CronRunner] PDF compiled for ${business.name} (${pdfBuffer.length} bytes)`
        );

        // Upload to Firebase Storage
        const pdfUrl = await uploadPDFToStorage(
          pdfBuffer,
          business.id,
          weekStart.toISOString()
        );

        // Persist pdfUrl to the DB row
        await prisma.weeklyReport.update({
          where: { id: savedReport.id },
          data:  { pdfUrl },
        });
        result.pdfUploaded = true;
        console.log(`[CronRunner] PDF uploaded → ${pdfUrl}`);

        // Dispatch email — never throws, errors are isolated
        const mailResult = await sendWeeklyReportEmail(
          owner.email,
          owner.name || owner.email.split("@")[0],
          { name: business.name, category: business.category },
          pdfData,
          pdfBuffer,
          weekStart.toISOString()
        );

        result.emailSent = mailResult.success;
        if (!mailResult.success) {
          console.warn(
            `[CronRunner] Email failed for ${business.name}: ${mailResult.error}`
          );
        }
      } else if (business.plan !== "pro") {
        // Free plan: DB row written, PDF/email skipped
        result.status = "skipped";
      } else if (!owner?.email) {
        console.warn(
          `[CronRunner] No owner email found for business ${business.id} — email skipped.`
        );
      }

      if (result.status !== "skipped") {
        result.status = "success";
      }
    } catch (err: unknown) {
      // Per-business error isolation — loop continues
      const message = err instanceof Error ? err.message : "Unknown error";
      result.status = "failed";
      result.error  = message;
      console.error(
        `[CronRunner] Failed for business ${business.id} (${business.name}): ${message}`
      );
    }

    results.push(result);

    // Rate-limit guard between Groq calls
    await sleep(200);
  }

  // ── 4. Build summary ──────────────────────────────────────────
  const completedAt  = new Date().toISOString();
  const summary: CronRunSummary = {
    startedAt,
    completedAt,
    totalBusinesses: businesses.length,
    processed:  results.filter((r) => r.status === "success").length,
    skipped:    results.filter((r) => r.status === "skipped").length,
    failed:     results.filter((r) => r.status === "failed").length,
    pdfUploaded: results.filter((r) => r.pdfUploaded).length,
    emailsSent:  results.filter((r) => r.emailSent).length,
    results,
  };

  console.log(
    `[CronRunner] Run complete. ` +
    `Processed: ${summary.processed}  Skipped: ${summary.skipped}  ` +
    `Failed: ${summary.failed}  PDFs: ${summary.pdfUploaded}  Emails: ${summary.emailsSent}`
  );

  return summary;
}
