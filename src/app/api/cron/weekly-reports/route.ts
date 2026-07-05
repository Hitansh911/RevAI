/**
 * GET /api/cron/weekly-reports
 * ────────────────────────────────────────────────────────────────
 * Vercel Cron job endpoint — fires every Monday at 00:00 UTC.
 *
 * Full pipeline per business:
 *   1. Verify CRON_SECRET header (reject unauthorised callers)
 *   2. Fetch all Business records (with owner User for email)
 *   3. For each business (sequential — respects Groq rate limits):
 *      a. calculateWeeklyMetrics()
 *      b. generateWeeklyReportAI()       (error-safe, always resolves)
 *      c. generateWeeklyReportPDF()      (error-safe wrapper)
 *      d. uploadPDFToStorage()           (error-safe wrapper)
 *      e. Upsert WeeklyReport row with pdfUrl
 *      f. sendWeeklyReportEmail()        (error-isolated, never throws)
 *   4. Returns structured JSON summary: { processed, failed, results }
 *
 * Dry-run mode: ?dry=true skips DB writes and email dispatch.
 * Used for manual testing and verification.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateWeeklyMetrics } from "@/lib/weeklyAnalytics";
import { generateWeeklyReportAI } from "@/lib/weeklyReportPrompt";
import { generateWeeklyReportPDF } from "@/lib/pdfGenerator";
import { uploadPDFToStorage } from "@/lib/firebaseStorageAdmin";
import { sendWeeklyReportEmail } from "@/lib/weeklyReportMailer";
import type { BusinessProfileData } from "@/lib/pdfGenerator";

// ── Auth guard ────────────────────────────────────────────────────
function isAuthorised(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  // In Vercel production, Vercel injects the secret automatically.
  // In development, allow the request if CRON_SECRET is unset.
  if (!cronSecret) {
    console.warn("[CronJob] CRON_SECRET not set — allowing request in dev mode.");
    return true;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

// ── Date window helpers ───────────────────────────────────────────
function lastWeekWindow(): { startDate: Date; endDate: Date } {
  const now      = new Date();
  // End = last Sunday 23:59:59 UTC
  const endDate  = new Date(now);
  endDate.setUTCHours(23, 59, 59, 999);
  endDate.setUTCDate(now.getUTCDate() - now.getUTCDay() - 1); // last Sunday

  // Start = 7 days before endDate (Monday)
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - 6);
  startDate.setUTCHours(0, 0, 0, 0);

  return { startDate, endDate };
}

// ── Per-business pipeline ─────────────────────────────────────────
interface BusinessRecord {
  id:       string;
  name:     string;
  category: string;
  city:     string | null;
  ownerId:  string;
}

interface UserRecord {
  id:    string;
  email: string;
  name:  string | null;
}

interface PipelineResult {
  businessId:   string;
  businessName: string;
  status:       "success" | "failed" | "skipped";
  pdfUrl?:      string;
  emailSent?:   boolean;
  error?:       string;
  aiAvailable?: boolean;
}

async function processBusiness(
  business: BusinessRecord,
  owner: UserRecord | null,
  startDate: Date,
  endDate: Date,
  dryRun: boolean
): Promise<PipelineResult> {
  const tag = `[${business.name} / ${business.id}]`;

  try {
    // ── a. Calculate metrics ──────────────────────────────────────
    console.log(`${tag} Calculating metrics…`);
    const metrics = await calculateWeeklyMetrics(business.id, startDate, endDate);

    // Skip businesses with zero reviews this week — nothing to report
    if (metrics.totalReviewsThisWeek === 0) {
      console.log(`${tag} No reviews this week — skipping.`);
      return { businessId: business.id, businessName: business.name, status: "skipped" };
    }

    // ── b. Generate AI narrative ──────────────────────────────────
    console.log(`${tag} Generating AI narrative…`);
    const aiOutput = await generateWeeklyReportAI(metrics);
    const { _aiAvailable, ...aiFields } = aiOutput;

    // ── c. Build report data shape ────────────────────────────────
    const reportData = {
      id:               "temp",
      weekStart:        startDate,
      weekEnd:          endDate,
      averageRating:    metrics.avgOverallRating,
      totalReviews:     metrics.totalReviewsThisWeek,
      structuredMetrics: metrics,
      aiSummary:        aiFields.executive_summary,
      strengths:        aiFields.strengths,
      improvements:     aiFields.improvements,
      recommendations:  aiFields.recommendations,
      pdfUrl:           null,
      createdAt:        new Date(),
    };

    const profileData: BusinessProfileData = {
      id:       business.id,
      name:     business.name,
      category: business.category,
      city:     business.city,
    };

    // ── d. Generate PDF ───────────────────────────────────────────
    let pdfBuffer: Buffer | null = null;
    let pdfUrl:    string        = "";

    try {
      console.log(`${tag} Compiling PDF…`);
      pdfBuffer = await generateWeeklyReportPDF(reportData, profileData);
    } catch (pdfErr: unknown) {
      const msg = pdfErr instanceof Error ? pdfErr.message : "PDF generation failed";
      console.error(`${tag} PDF generation error:`, msg);
      // Continue without PDF — record still gets created
    }

    // ── e. Upload to Firebase Storage ────────────────────────────
    if (pdfBuffer && !dryRun) {
      try {
        console.log(`${tag} Uploading PDF to Firebase Storage…`);
        pdfUrl = await uploadPDFToStorage(
          pdfBuffer,
          business.id,
          startDate.toISOString().slice(0, 10)
        );
        console.log(`${tag} PDF uploaded → ${pdfUrl}`);
      } catch (uploadErr: unknown) {
        const msg = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
        console.error(`${tag} Storage upload error:`, msg);
        // Continue — pdfUrl stays empty, DB row still saves
      }
    }

    // ── f. Upsert DB row ─────────────────────────────────────────
    if (!dryRun) {
      console.log(`${tag} Upserting WeeklyReport row…`);
      const existingReport = await prisma.weeklyReport.findFirst({
        where: { businessId: business.id, weekStart: startDate },
      });

      const rowData = {
        weekEnd:           endDate,
        averageRating:     metrics.avgOverallRating,
        totalReviews:      metrics.totalReviewsThisWeek,
        structuredMetrics: metrics as object,
        aiSummary:         aiFields.executive_summary,
        strengths:         aiFields.strengths,
        improvements:      aiFields.improvements,
        recommendations:   aiFields.recommendations,
        pdfUrl:            pdfUrl || null,
      };

      if (existingReport) {
        await prisma.weeklyReport.update({
          where: { id: existingReport.id },
          data:  rowData,
        });
      } else {
        await prisma.weeklyReport.create({
          data: { businessId: business.id, weekStart: startDate, ...rowData },
        });
      }
    }

    // ── g. Send email ─────────────────────────────────────────────
    let emailSent = false;

    if (owner && pdfBuffer && !dryRun) {
      console.log(`${tag} Sending email to ${owner.email}…`);
      const mailResult = await sendWeeklyReportEmail(
        owner.email,
        owner.name ?? owner.email.split("@")[0],
        { name: business.name, category: business.category },
        { ...reportData, id: business.id },
        pdfBuffer,
        startDate.toISOString().slice(0, 10)
      );
      emailSent = mailResult.success;
    } else if (dryRun) {
      console.log(`${tag} [DRY RUN] Skipping DB write and email.`);
    }

    return {
      businessId:   business.id,
      businessName: business.name,
      status:       "success",
      pdfUrl:       pdfUrl || undefined,
      emailSent,
      aiAvailable:  _aiAvailable,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown pipeline error";
    console.error(`${tag} Pipeline failed:`, message);
    return {
      businessId:   business.id,
      businessName: business.name,
      status:       "failed",
      error:        message,
    };
  }
}

// ── Route Handler ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // ── Auth check ────────────────────────────────────────────────
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "true";
  if (dryRun) {
    console.log("[CronJob] DRY RUN mode — no DB writes or emails.");
  }

  // ── Date window ───────────────────────────────────────────────
  const { startDate, endDate } = lastWeekWindow();
  console.log(
    `[CronJob] Running for window: ${startDate.toISOString()} → ${endDate.toISOString()}`
  );

  try {
    // ── Fetch all businesses ──────────────────────────────────────
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true, category: true, city: true, ownerId: true },
    });

    console.log(`[CronJob] Processing ${businesses.length} businesses…`);

    // Build ownerId → User map for email lookup
    const ownerIds   = businesses.map((b) => b.ownerId);
    const userRecords = await prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(userRecords.map((u) => [u.id, u]));

    // ── Process each business sequentially ───────────────────────
    // Sequential (not Promise.all) to respect Groq rate limits.
    const results: PipelineResult[] = [];

    for (const biz of businesses) {
      const owner  = userMap.get(biz.ownerId) ?? null;
      const result = await processBusiness(biz, owner, startDate, endDate, dryRun);
      results.push(result);

      // Small delay between businesses to avoid hammering Groq
      if (businesses.indexOf(biz) < businesses.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // ── Summarise ─────────────────────────────────────────────────
    const processed = results.filter((r) => r.status === "success").length;
    const failed    = results.filter((r) => r.status === "failed").length;
    const skipped   = results.filter((r) => r.status === "skipped").length;
    const elapsed   = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[CronJob] Done in ${elapsed}s — processed: ${processed}, failed: ${failed}, skipped: ${skipped}`
    );

    return NextResponse.json({
      success:   true,
      dryRun,
      elapsed:   `${elapsed}s`,
      window:    { start: startDate.toISOString(), end: endDate.toISOString() },
      summary:   { processed, failed, skipped, total: businesses.length },
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected cron error";
    console.error("[CronJob] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
