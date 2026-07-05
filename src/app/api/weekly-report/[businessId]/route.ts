/**
 * GET /api/weekly-report/[businessId]
 * ────────────────────────────────────────────────────────────────
 * Returns the most recent WeeklyReport for the given business.
 * Useful for rendering a dashboard summary card without triggering
 * a new report generation.
 *
 * Query params:
 *   ?limit=N   - Return the N most recent reports (default: 1, max: 12)
 *   ?all=true  - Return all reports for the business (overrides limit)
 *
 * Response:
 *   Single report object when limit=1 (default)
 *   Array of report objects when limit > 1 or all=true
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json({ error: "businessId is required." }, { status: 400 });
    }

    // ── Confirm business exists ───────────────────────────────
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

    // ── Parse query params ────────────────────────────────────
    const searchParams = req.nextUrl.searchParams;
    const fetchAll = searchParams.get("all") === "true";
    const rawLimit = parseInt(searchParams.get("limit") ?? "1", 10);
    const limit = isNaN(rawLimit) ? 1 : Math.min(Math.max(rawLimit, 1), 12);

    // ── Fetch reports ─────────────────────────────────────────
    const reports = await prisma.weeklyReport.findMany({
      where: { businessId },
      orderBy: { weekStart: "desc" },
      ...(fetchAll ? {} : { take: limit }),
    });

    if (reports.length === 0) {
      return NextResponse.json(
        { error: "No weekly reports found for this business." },
        { status: 404 }
      );
    }

    // Return a single object for the default single-report case,
    // an array for multi-report requests
    const result = !fetchAll && limit === 1 ? reports[0] : reports;

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    console.error("[GET /api/weekly-report/[businessId]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
