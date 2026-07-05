import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { sendWeeklyReportEmail } from "@/lib/weeklyReportMailer";
import type { WeeklyReportPDFData } from "@/lib/pdfGenerator";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    // 1. Fetch report and verify ownership
    const report = await prisma.weeklyReport.findUnique({
      where: { id: reportId },
      include: {
        business: {
          select: { id: true, name: true, category: true, ownerId: true, plan: true },
        },
      },
    });

    if (!report || !report.business) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.business.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!report.pdfUrl) {
      return NextResponse.json(
        { error: "No PDF associated with this report" },
        { status: 400 }
      );
    }

    // 2. Get owner email from User table
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!owner?.email) {
      return NextResponse.json({ error: "Owner email not found" }, { status: 400 });
    }

    // 3. Download the PDF into memory
    const pdfResponse = await fetch(report.pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF from storage: ${pdfResponse.statusText}`);
    }
    const arrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // 4. Construct PDF Data format
    const pdfData: WeeklyReportPDFData = {
      id: report.id,
      weekStart: report.weekStart,
      weekEnd: report.weekEnd,
      averageRating: report.averageRating,
      totalReviews: report.totalReviews,
      structuredMetrics: report.structuredMetrics as any,
      aiSummary: report.aiSummary,
      strengths: report.strengths as string[] | null,
      improvements: report.improvements as string[] | null,
      recommendations: report.recommendations as string[] | null,
      pdfUrl: report.pdfUrl,
      createdAt: report.createdAt,
    };

    // 5. Send email
    const weekStartStr = report.weekStart.toISOString();
    const mailResult = await sendWeeklyReportEmail(
      owner.email,
      owner.name ?? owner.email.split("@")[0],
      { name: report.business.name, category: report.business.category },
      pdfData,
      pdfBuffer,
      weekStartStr
    );

    if (!mailResult.success) {
      throw new Error(mailResult.error || "Failed to dispatch email");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SendAgainRoute] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
