import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ── Persona map based on category ────────────────────────────
const PERSONA: Record<string, string> = {
  restaurant: "a customer who just dined at a restaurant",
  salon: "a customer who just visited a salon",
  hotel: "a guest who just stayed at a hotel",
  gym: "a member who just worked out at a gym",
  retail: "a shopper who just visited a retail store",
  dentist: "a patient who just had a dental appointment",
  plumber: "a homeowner who just had a plumber service their home",
  teaching_session: "a student who just attended a teaching session",
};

export async function POST(req: NextRequest) {
  try {
    const { questions, rating, sessionTopic, category } = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Questions are required" }, { status: 400 });
    }

    const tone =
      rating <= 2 ? "honest but disappointed, pointing out real issues"
        : rating === 3 ? "balanced and neutral, with both positives and suggestions"
          : rating === 4 ? "positive and satisfied, with minor suggestions"
            : "enthusiastic and very positive";

    const persona = PERSONA[category] || PERSONA["restaurant"];
    const contextName = sessionTopic || "this business";

    const questionsText = questions
      .map((q: any) => `ID: ${q.id} | Type: ${q.type} | Question: ${q.text}`)
      .join("\n");

    const prompt = `You are ${persona} called "${contextName}".
Your overall experience was ${rating}/5 stars. Your tone should be ${tone}.

Answer each of the following feedback questions naturally, as a real person would.
For "rating" type questions, answer with just a number from 1 to 5 (consistent with your overall ${rating}-star experience).
For "text" type questions, write 1-2 natural, specific sentences.

Questions:
${questionsText}

Return ONLY a valid JSON object mapping the question ID to the answer. Ensure all string values are strictly enclosed in double quotes.
Format example:
{
  "q1": 4,
  "q3": "The grilled salmon was outstanding and the portion was generous."
}`;

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful assistant that always outputs valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const responseText = response.choices[0].message.content?.trim();
    if (!responseText) throw new Error("Empty response from Groq");

    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let answers;
    try {
      answers = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        answers = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse Groq response as JSON");
      }
    }

    if (typeof answers !== "object" || Array.isArray(answers) || answers === null) {
      throw new Error("Invalid answers format");
    }

    return NextResponse.json({ answers });

  } catch (error: any) {
    console.error("Generate answers error:", error);

    if (error.status === 429 || error.message?.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit hit. Wait a minute and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate answers." },
      { status: 500 }
    );
  }
}
