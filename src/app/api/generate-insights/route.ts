import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * Generates AI-driven operational insights from an array of customer review texts.
 * Called from the owner dashboard; returns structured JSON insights.
 */
export async function POST(req: NextRequest) {
  try {
    const { reviews } = await req.json();

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { error: "No reviews provided." },
        { status: 400 }
      );
    }

    // Truncate to last 60 reviews & cap each to 500 chars to respect token limits
    const trimmed = reviews
      .slice(0, 60)
      .map(
        (r: any, i: number) =>
          `[Review ${i + 1} · ${r.rating ?? "?"}★]: ${(
            r.text || r.generatedText || ""
          )
            .slice(0, 500)
            .trim()}`
      )
      .join("\n");

    const prompt = `You are an elite Hospitality Business Consultant and Operational Auditor.

Analyze the following ${reviews.length} customer feedback entries and extract collective trends.

--- CUSTOMER FEEDBACK LOG ---
${trimmed}
--- END LOG ---

Return a clean, parseable JSON object matching this EXACT structure (no markdown, no explanation — only JSON):
{
  "executive_summary": "A concise, professional 2-3 sentence overview highlighting current guest sentiment and overall operational velocity.",
  "things_to_improve": [
    { "topic": "Short Label", "issue": "Specific pain point mentioned by customers", "urgency": "high" },
    { "topic": "Short Label", "issue": "Specific pain point mentioned by customers", "urgency": "medium" }
  ],
  "revenue_tips": [
    "Actionable upselling or operational tip based on what customers love.",
    "Tactical recommendation to improve service efficiency mentioned in feedback."
  ]
}

Rules:
- "things_to_improve" must contain 2-5 items. urgency must be "high" or "medium" only.
- "revenue_tips" must contain 2-4 items.
- Be specific. Reference patterns from the actual feedback, not generic advice.
- executive_summary must be exactly 2-3 sentences.
- Output ONLY the JSON object.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Always output valid JSON with no prose, no markdown.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content?.trim() || "{}";

    let parsed: {
      executive_summary?: string;
      things_to_improve?: { topic: string; issue: string; urgency: string }[];
      revenue_tips?: string[];
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 }
      );
    }

    // Validate minimum shape
    if (
      !parsed.executive_summary ||
      !Array.isArray(parsed.things_to_improve) ||
      !Array.isArray(parsed.revenue_tips)
    ) {
      return NextResponse.json(
        { error: "AI response missing required fields." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Generate insights error:", error);

    if (error.status === 429 || error.message?.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit hit. Wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate insights." },
      { status: 500 }
    );
  }
}
