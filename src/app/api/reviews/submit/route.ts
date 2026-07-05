import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const {
      business_id,
      category,
      total_score,
      reviews,
      // New optional fields — fully backward compatible
      overall_rating,
      metadata,
    } = await req.json();

    if (!business_id) {
      return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    }

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json({ error: "reviews array is required" }, { status: 400 });
    }

    // Build an aggregated review text from the individual answers
    const reviewLines = reviews
      .map((r: any) => {
        if (r.rating != null) return `${r.question}: ${r.rating}/5`;
        if (r.text) return `${r.question}: ${r.text}`;
        return null;
      })
      .filter(Boolean);

    const aggregatedText = reviewLines.join("\n");
    const rating = Math.round(total_score) || 4;

    // Resolve overall_rating: use explicit value if provided, otherwise fall back to total_score
    const resolvedOverallRating =
      typeof overall_rating === "number"
        ? Math.min(5, Math.max(1, Math.round(overall_rating)))
        : Math.min(5, Math.max(1, rating));

    // Save to database
    const review = await prisma.review.create({
      data: {
        businessId: business_id,
        rating: resolvedOverallRating,
        generatedText: aggregatedText,
        postedToGoogle: false,
        answers: reviews,
        overall_rating: resolvedOverallRating,
        // metadata carries: review_mode, analytics, tracking params, voice transcript
        ...(metadata ? { metadata } : {}),
      },
    });

    // Increment review count on business
    await prisma.business.update({
      where: { id: business_id },
      data: { reviewCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, reviewId: review.id });
  } catch (error: any) {
    console.error("Review submit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit review" },
      { status: 500 }
    );
  }
}

