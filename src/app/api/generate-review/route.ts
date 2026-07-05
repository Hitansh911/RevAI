import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";


const TONE_MAP: Record<number, string> = {
  1: "frustrated and very disappointed. Be honest about the poor experience.",
  2: "somewhat dissatisfied. Mention what could be improved.",
  3: "neutral and balanced. Mention both positives and areas to improve.",
  4: "happy and satisfied. Highlight the positive experience.",
  5: "enthusiastic and absolutely delighted. Express strong recommendation.",
};

const CATEGORY_HINTS: Record<string, string> = {
  restaurant: "food quality, service, ambience, and value for money",
  salon: "haircut/treatment quality, staff skills, cleanliness, and appointment ease",
  plumber: "punctuality, work quality, pricing transparency, and professionalism",
  dentist: "comfort, staff friendliness, wait times, and treatment explanation",
  gym: "equipment, cleanliness, staff helpfulness, and class variety",
  hotel: "room comfort, cleanliness, staff, and location",
  retail: "product selection, pricing, staff helpfulness, and checkout experience",
  other: "overall service and experience",
};

export async function POST(req: NextRequest) {
  try {
    const { rating, businessId, businessName, category = "other", customContext } = await req.json();

    const tone = TONE_MAP[rating as number] ?? TONE_MAP[3];
    const hints = CATEGORY_HINTS[category] ?? CATEGORY_HINTS.other;

    const prompt = `Write 4 realistic, first-person Google review variations for a business based on the customer's rating.

Business: ${businessName || "this business"}
Category: ${category}
Star rating: ${rating}/5
Tone: The customer feels ${tone}
Focus areas for this type of business: ${hints}
${customContext ? "Additional context: " + customContext : ""}

Requirements:
- Sound like a real customer wrote it (natural language, not formal)
- No hashtags, no emojis
- Do NOT mention the star count explicitly
- Match the overall tone exactly to the rating

You MUST return EXACTLY 4 distinct review drafts, following these specific styles:
1. Standard & Balanced: Covers the core experience naturally (2-3 sentences).
2. Short & Punchy: High impact, fast read (1-2 sentences max).
3. Detail & Service-Focused: Highlights hospitality and specific staff/service interactions (2-3 sentences).
4. Enthusiastic/Foodie: Focuses heavily on specific quality (taste/results) and a strong recommendation (2-3 sentences).

Return the output strictly as a JSON object containing a single key "reviews" which maps to an array of strings. Do not include markdown blocks or any other text.
Format:
{
  "reviews": [
    "Review option 1 text...",
    "Review option 2 text...",
    "Review option 3 text...",
    "Review option 4 text..."
  ]
}`;

    const response = await new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    }).chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs only valid JSON objects." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0].message.content?.trim();
    if (!rawContent) throw new Error("Empty response from Groq");

    let reviewOptions: string[] = [];
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.reviews && Array.isArray(parsed.reviews)) {
        reviewOptions = parsed.reviews;
      } else {
        throw new Error("Invalid JSON structure");
      }
    } catch (e) {
      throw new Error("Failed to parse JSON response from Groq");
    }

    return NextResponse.json({ reviewOptions });
  } catch (error: any) {
    console.error("Generate review error:", error);
    
    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json(
        { error: "API Rate limit exceeded. Please wait a minute before generating again." },
        { status: 429 }
      );
    }
    
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
