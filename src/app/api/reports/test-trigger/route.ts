import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { calculateWeeklyMetrics } from "@/lib/weeklyAnalytics";
import { generateWeeklyReportAI } from "@/lib/weeklyReportPrompt";
import { generateWeeklyReportPDF, type WeeklyReportPDFData, type BusinessProfileData } from "@/lib/pdfGenerator";
import { uploadPDFToStorage } from "@/lib/firebaseStorageAdmin";
import { sendWeeklyReportEmail } from "@/lib/weeklyReportMailer";

function getPreviousWeekWindow(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysToMonday,
    0, 0, 0, 0
  ));

  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);

  const lastSunday = new Date(thisMonday);
  lastSunday.setUTCMilliseconds(-1);

  return { start: lastMonday, end: lastSunday };
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await prisma.business.findUnique({
      where: { ownerId: userId },
    });

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    const owner = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!owner?.email) {
      return NextResponse.json({ error: "Owner email not found" }, { status: 400 });
    }

    const { start: weekStart, end: weekEnd } = getPreviousWeekWindow();
    const result: any = { status: "failed" };

    try {
      // 1. Calculate Metrics
      const metrics = await calculateWeeklyMetrics(business.id, weekStart, weekEnd);

      // 2. AI Narrative
      const aiOutput = await generateWeeklyReportAI(metrics);
      const { _aiAvailable, ...aiFields } = aiOutput;

      // 3. Save DB Row
      const existing = await prisma.weeklyReport.findFirst({
        where: { businessId: business.id, weekStart },
        select: { id: true },
      });

      const reportPayload = {
        weekEnd,
        averageRating: metrics.avgOverallRating,
        totalReviews: metrics.totalReviewsThisWeek,
        structuredMetrics: metrics as object,
        aiSummary: aiFields.executive_summary,
        strengths: aiFields.strengths,
        improvements: aiFields.improvements,
        recommendations: aiFields.recommendations,
      };

      const savedReport = existing
        ? await prisma.weeklyReport.update({
            where: { id: existing.id },
            data: reportPayload,
          })
        : await prisma.weeklyReport.create({
            data: {
              businessId: business.id,
              weekStart,
              ...reportPayload,
            },
          });

      // 4. PDF Generation (Simulate Pro Plan behavior for testing)
      const pdfData: WeeklyReportPDFData = {
        id: savedReport.id,
        weekStart: savedReport.weekStart,
        weekEnd: savedReport.weekEnd,
        averageRating: savedReport.averageRating,
        totalReviews: savedReport.totalReviews,
        structuredMetrics: metrics,
        aiSummary: savedReport.aiSummary,
        strengths: savedReport.strengths as string[] | null,
        improvements: savedReport.improvements as string[] | null,
        recommendations: savedReport.recommendations as string[] | null,
        pdfUrl: savedReport.pdfUrl,
        createdAt: savedReport.createdAt,
      };

      const businessProfile: BusinessProfileData = {
        id: business.id,
        name: business.name,
        category: business.category,
        city: business.city,
      };

      const pdfBuffer = await generateWeeklyReportPDF(pdfData, businessProfile);
      
      const pdfUrl = await uploadPDFToStorage(
        pdfBuffer,
        business.id,
        weekStart.toISOString()
      );

      await prisma.weeklyReport.update({
        where: { id: savedReport.id },
        data: { pdfUrl },
      });
      result.pdfUploaded = true;

      // 5. Send Email
      const mailResult = await sendWeeklyReportEmail(
        owner.email,
        owner.name || owner.email.split("@")[0],
        { name: business.name, category: business.category },
        pdfData,
        pdfBuffer,
        weekStart.toISOString()
      );

      result.emailSent = mailResult.success;
      result.status = "success";
      result.reportId = savedReport.id;
      
    } catch (error: any) {
      console.error("[TestTrigger] Simulation failed:", error);
      result.error = error.message;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[TestTrigger] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
