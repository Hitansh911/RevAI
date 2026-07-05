import { NextRequest, NextResponse } from "next/server";
import { getBusinessProfile } from "@/app/actions";

// GET /api/business — get business details by ID (public, for customer review page)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Business ID required" }, { status: 400 });

  try {
    const business = await getBusinessProfile(id);
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    return NextResponse.json(business);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch business" }, { status: 500 });
  }
}
