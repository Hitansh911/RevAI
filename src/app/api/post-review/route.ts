import { NextRequest, NextResponse } from "next/server";

// TODO: Implement Google Business Profile API integration in Phase 2
// Requires: OAuth 2.0 token, accountId, locationId
export async function POST(req: NextRequest) {
  try {
    const { businessId, reviewText, rating } = await req.json();

    console.log("Posting review:", { businessId, rating, reviewText: reviewText.substring(0, 50) });

    // Simulate posting delay
    await new Promise((res) => setTimeout(res, 1000));

    // TODO: Replace with actual Google Business Profile API call:
    // POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews

    return NextResponse.json({ success: true, reviewUrl: "https://g.page/example" });
  } catch (error) {
    console.error("Post review error:", error);
    return NextResponse.json({ error: "Failed to post review" }, { status: 500 });
  }
}
