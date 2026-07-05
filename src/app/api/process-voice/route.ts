import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const HF_SENTIMENT_MODEL =
  "cardiffnlp/twitter-roberta-base-sentiment-latest";


// ── Hugging Face sentiment helper ─────────────────────────────
async function getSentimentFromHF(
  text: string
): Promise<"positive" | "neutral" | "negative"> {
  if (!process.env.HF_API_KEY) return inferSentimentLocally(text);

  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/models/${HF_SENTIMENT_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!res.ok) {
      console.warn("HF sentiment API error:", res.status);
      return inferSentimentLocally(text);
    }

    const data = await res.json();
    // HF returns [[{label, score}, ...]] — pick highest score
    const scores: { label: string; score: number }[] =
      Array.isArray(data[0]) ? data[0] : data;

    const best = scores.reduce((a, b) => (b.score > a.score ? b : a));
    const label = best.label.toLowerCase();

    if (label.includes("pos")) return "positive";
    if (label.includes("neg")) return "negative";
    return "neutral";
  } catch (err) {
    console.warn("HF sentiment fetch failed, falling back:", err);
    return inferSentimentLocally(text);
  }
}

// Simple local fallback — no external call needed
function inferSentimentLocally(
  text: string
): "positive" | "neutral" | "negative" {
  const lower = text.toLowerCase();
  const positiveWords = [
    "great", "amazing", "love", "excellent", "fantastic", "good",
    "wonderful", "perfect", "best", "happy", "enjoyed", "brilliant",
    "outstanding", "recommend", "delicious", "fresh",
  ];
  const negativeWords = [
    "bad", "terrible", "awful", "horrible", "poor", "disappointing",
    "slow", "cold", "rude", "dirty", "worst", "never", "hate",
  ];

  const pos = positiveWords.filter((w) => lower.includes(w)).length;
  const neg = negativeWords.filter((w) => lower.includes(w)).length;

  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

// Map sentiment → star rating
function sentimentToRating(
  sentiment: "positive" | "neutral" | "negative"
): number {
  return sentiment === "positive" ? 5 : sentiment === "neutral" ? 3 : 2;
}

// ── API handler ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { transcript, category = "restaurant", questions } = await req.json();

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }

    // Step 1: Analyse sentiment via Hugging Face
    const sentiment = await getSentimentFromHF(transcript.trim());
    const generated_rating = sentimentToRating(sentiment);

    // Step 2: Use Groq to generate a polished review draft + predict answers
    const questionsContext =
      questions && Array.isArray(questions) && questions.length > 0
        ? `\nThe customer filled out these feedback questions:\n${questions
            .map((q: any) => `- ${q.text || q.question}`)
            .join("\n")}`
        : "";

    const prompt = `You are an AI assistant that polishes raw voice transcripts into professional customer reviews.

Raw transcript from customer: "${transcript.trim()}"
Business category: ${category}
Detected sentiment: ${sentiment} (${generated_rating}/5 stars)
${questionsContext}

Tasks:
1. Rewrite the transcript into a natural, polished 2-4 sentence Google review. Keep the customer's authentic voice and specific details.
2. If questions were provided, predict likely star ratings (1-5) for each question based on the transcript sentiment.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "review_text": "The polished review text here.",
  "answers": {
    "q1": 5,
    "q2": 4,
    "q3": 5
  }
}

If no questions were provided, return an empty object for answers.`;

    const response = await new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    }).chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Always output valid JSON with no prose.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content?.trim() || "{}";
    let parsed: { review_text?: string; answers?: Record<string, any> };

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { review_text: transcript, answers: {} };
    }

    return NextResponse.json({
      review_text: parsed.review_text || transcript,
      answers: parsed.answers || {},
      generated_rating,
      sentiment,
    });
  } catch (error: any) {
    console.error("Process voice error:", error);

    if (error.status === 429 || error.message?.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit hit. Wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process voice feedback." },
      { status: 500 }
    );
  }
}
