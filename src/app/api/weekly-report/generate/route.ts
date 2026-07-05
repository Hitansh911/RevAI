/**
 * POST /api/weekly-report/generate
 * ────────────────────────────────────────────────────────────────
 * Orchestrates the full Weekly Report generation pipeline:
 *   1. Validate request body
 *   2. Default date window to last 7 days if omitted
 *   3. calculateWeeklyMetrics()  → compact aggregate object
 *   4. generateWeeklyReportAI()  → LLM narrative (error-safe)
 *   5. Upsert WeeklyReport row in Postgres
 *   6. Return the full persisted report as JSON
 *
 * Request body:
 *   {
 *     "businessId": "string",        // required
 *     "weekStart":  "2024-01-01",    // optional ISO date string
 *     "weekEnd":    "2024-01-07"     // optional ISO date string
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateWeeklyMetrics } from "@/lib/weeklyAnalytics";
import { generateWeeklyReportAI } from "@/lib/weeklyReportPrompt";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse & validate body ────────────────────────────────
    let body: { businessId?: string; weekStart?: string; weekEnd?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { businessId, weekStart: weekStartRaw, weekEnd: weekEndRaw } = body;

    if (!businessId || typeof businessId !== "string" || !businessId.trim()) {
      return NextResponse.json(
        { error: "businessId is required." },
        { status: 400 }
      );
    }

    // ── 2. Resolve date window (defaults to last 7 days) ────────
    const now = new Date();
    const endDate = weekEndRaw ? new Date(weekEndRaw) : now;
    const startDate = weekStartRaw
      ? new Date(weekStartRaw)
      : new Date(new Date(endDate).setDate(endDate.getDate() - 7));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "weekStart and weekEnd must be valid date strings." },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "weekStart must be before weekEnd." },
        { status: 400 }
      );
    }

    // ── 3. Confirm business exists ───────────────────────────────
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: `Business not found: ${businessId}` },
        { status: 404 }
      );
    }

    // ── 4. Calculate metrics ─────────────────────────────────────
    const metrics = await calculateWeeklyMetrics(businessId, startDate, endDate);

    // ── 5. Generate AI narrative (always resolves) ───────────────
    const aiOutput = await generateWeeklyReportAI(metrics);

    const { _aiAvailable, ...aiFields } = aiOutput;

    // ── 6. Upsert WeeklyReport row ───────────────────────────────
    // Unique constraint: one report per business per weekStart window.
    // We use updateOrCreate (upsert) keyed on businessId + weekStart
    // so re-running the same window refreshes rather than duplicates.
    const existingReport = await prisma.weeklyReport.findFirst({
      where: {
        businessId,
        weekStart: startDate,
      },
    });

    const reportData = {
      weekEnd: endDate,
      averageRating: metrics.avgOverallRating,
      totalReviews: metrics.totalReviewsThisWeek,
      structuredMetrics: metrics as object,
      aiSummary: aiFields.executive_summary,
      strengths: aiFields.strengths,
      improvements: aiFields.improvements,
      recommendations: aiFields.recommendations,
    };

    const report = existingReport
      ? await prisma.weeklyReport.update({
          where: { id: existingReport.id },
          data: reportData,
        })
      : await prisma.weeklyReport.create({
          data: {
            businessId,
            weekStart: startDate,
            ...reportData,
          },
        });

    // ── 7. Return ────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        aiAvailable: _aiAvailable,
        report,
      },
      { status: existingReport ? 200 : 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    console.error("[POST /api/weekly-report/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
