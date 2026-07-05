import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";


// ── Category defaults ────────────────────────────────────────
const RESTAURANT_CATEGORIES = ["restaurant"];

const DEFAULT_COUNTS: Record<string, number> = {
  restaurant: 5,
  teaching_session: 10,
};

const CATEGORY_FOCUS: Record<string, string> = {
  restaurant: "upselling efficiency (drinks, desserts, appetizers), speed and table turnover satisfaction, hero dish identification, pricing perception vs. value, staff recommendation influence, and return visit intent",
};

// ── Fixed questions prepended to every restaurant/cafe survey ─
const FIXED_RESTAURANT_QUESTIONS = [
  {
    id: "q1",
    text: "How would you rate the quality and taste of the food?",
    type: "rating",
    default_rating: 5,
    auto_answer_rationale: "The food was delicious and well-presented — exactly what I was hoping for.",
  },
  {
    id: "q2",
    text: "How would you rate the service provided by our staff?",
    type: "rating",
    default_rating: 5,
    auto_answer_rationale: "The staff were friendly, attentive, and quick to respond to our needs.",
  },
  {
    id: "q3",
    text: "How would you rate the overall ambience and dining experience?",
    type: "rating",
    default_rating: 5,
    auto_answer_rationale: "The atmosphere was warm and comfortable, making the meal even more enjoyable.",
  },
];

// ── Prompt builders ──────────────────────────────────────────

function buildRestaurantPrompt(topic: string, category: string, count: number): string {
  // The first 3 slots are always the fixed questions; the LLM generates the rest
  const dynamicCount = Math.max(0, count - FIXED_RESTAURANT_QUESTIONS.length);

  if (dynamicCount === 0) {
    // Nothing dynamic needed — caller will use only the fixed questions
    return "";
  }

  return `You are an expert restaurant operations consultant, customer experience analyst, and revenue optimization strategist.

Your task is to generate customer feedback questions for restaurants, cafes, food courts, bakeries, cloud kitchens, and other food-service businesses.
${topic ? `\nBusiness context: "${topic}"` : ""}

## Your Task
Generate exactly ${dynamicCount} additional customer feedback questions to follow the 3 mandatory core questions that are already included (food quality, staff service, ambience). Do NOT re-generate or duplicate those.

## What These Questions Should Help Owners Understand
- Customer satisfaction & loyalty
- Repeat visit potential & recommendation likelihood
- Upselling opportunities & menu effectiveness
- Service speed, waiting time, & staff behaviour
- Pricing perception & value for money
- Order accuracy & cleanliness
- Direct revenue growth opportunities

## Question Style Rules
- Short and easy to understand (under 15 words)
- Sound natural and customer-friendly
- Answerable using a 1–5 star rating
- No technical language
- Focus on measurable experiences
- No duplicates or highly similar questions
- Do NOT ask about food quality/taste, staff service, or ambience — those are already covered

Good examples:
- How satisfied were you with the speed of service?
- How would you rate the value for money of your order?
- How likely are you to visit us again?

Bad examples:
- Did our operational workflow meet your expectations?
- Explain your thoughts about our service process.

## Auto-Answer Rules
For every question provide:
- default_rating: typically 4 or 5
- auto_answer_rationale: realistic, concise, human-like sentence directly relating to the question

## Output Format
Return ONLY a valid JSON array. No markdown block markers, no backticks, no explanations.
Generate EXACTLY ${dynamicCount} objects. IDs must be integers starting at 4.

[
  {"id":4,"question":"How satisfied were you with the speed of service?","default_rating":4,"auto_answer_rationale":"Our food arrived quickly even though the restaurant was busy."},
  {"id":5,"question":"How would you rate the value for money of your order?","default_rating":4,"auto_answer_rationale":"The portion sizes were generous and the price felt very fair."}
]`;
}

function buildTeachingPrompt(topic: string, count: number): string {
  const ratingCount = Math.max(Math.ceil(count * 0.75), count - 3);
  const textCount = count - ratingCount;

  return `You are an expert business consultant and customer psychology architect for a dynamic feedback application. Your job is to generate a structured dataset of feedback questions with optimized "auto-answers" for a teaching session.

Session topic: "${topic}"

CATEGORY: Teaching Session

### RULES:
1. Generate exactly ${count} questions.
2. Focus on educational metrics: clarity of concepts, engagement, pace, instructor knowledge, practical utility, content relevance, and actionable takeaways.
3. Questions should help the instructor improve delivery and identify what resonates with learners.

### QUESTION MIX:
- ${ratingCount} rating questions (type: "rating") — answerable on a 1-5 star scale
- ${textCount} open text questions (type: "text") — invite constructive feedback
- Order: ALL rating questions FIRST, then text questions at the END
- Keep each question concise and clear (under 15 words)

### AUTO-ANSWERING LOGIC:
For each question, predict and generate a default "Smart Auto-Answer":
- For rating questions: a realistic default_rating (1-5, assume a generally positive baseline of 4 or 5)
- For all questions: a brief auto_answer_rationale (a short placeholder text explaining the rating)
- Auto-answers should sound like a real, engaged student

### OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no backticks, no explanation. Use this exact structure:

[
  {"id":"q1","text":"How would you rate the clarity of explanations?","type":"rating","default_rating":4,"auto_answer_rationale":"The concepts were well-explained with good examples."},
  {"id":"q2","text":"What was the most valuable takeaway for you?","type":"text","default_rating":null,"auto_answer_rationale":"Learning the practical framework I can apply immediately at work."}
]`;
}

// ── API handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { topic, category, questionCount } = await req.json();

    if (!topic && !category) {
      return NextResponse.json({ error: "Topic or category is required" }, { status: 400 });
    }

    // Resolve count: user override → category default → 6
    const defaultCount = DEFAULT_COUNTS[category] || 6;
    const count = questionCount ? Math.max(2, Math.min(20, Number(questionCount))) : defaultCount;

    // ── Teaching session: unchanged path ─────────────────────
    if (category === "teaching_session") {
      const prompt = buildTeachingPrompt(topic || "a teaching session", count);

      const response = await new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }).chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an expert business consultant and customer psychology architect. You always output valid JSON arrays with no markdown prose." },
          { role: "user", content: prompt }
        ],
      });

      const responseText = response.choices[0].message.content?.trim();
      if (!responseText) throw new Error("Empty response from Groq");

      const cleaned = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let questions;
      try {
        questions = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) questions = JSON.parse(match[0]);
        else throw new Error("Could not parse Groq response as JSON");
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid questions format returned");
      }

      const validated = questions
        .map((q: any, i: number) => ({
          id: q.id || `q${i + 1}`,
          text: q.text || "",
          type: q.type === "text" ? "text" : "rating",
          default_rating: q.type === "text" ? null : (typeof q.default_rating === "number" ? Math.min(5, Math.max(1, q.default_rating)) : 4),
          auto_answer_rationale: q.auto_answer_rationale || "",
        }))
        .filter((q: any) => q.text.length > 0);

      return NextResponse.json({ questions: validated });
    }

    // ── Restaurant / all other categories: fixed-first path ──
    const prompt = buildRestaurantPrompt(topic || "", category || "restaurant", count);
    const dynamicCount = Math.max(0, count - FIXED_RESTAURANT_QUESTIONS.length);

    let dynamicQuestions: any[] = [];

    if (dynamicCount > 0 && prompt) {
      const response = await new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }).chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an expert business consultant and customer psychology architect. You always output valid JSON arrays with no markdown prose." },
          { role: "user", content: prompt }
        ],
      });

      const responseText = response.choices[0].message.content?.trim();
      if (!responseText) throw new Error("Empty response from Groq");

      const cleaned = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        dynamicQuestions = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) dynamicQuestions = JSON.parse(match[0]);
        else throw new Error("Could not parse Groq response as JSON");
      }

      if (!Array.isArray(dynamicQuestions)) dynamicQuestions = [];
    }

    // Validate dynamic questions (re-index starting at q4)
    // Accept both `question` (new prompt format) and `text` (legacy) field names
    const validatedDynamic = dynamicQuestions
      .map((q: any, i: number) => ({
        id: `q${FIXED_RESTAURANT_QUESTIONS.length + i + 1}`,
        text: (q.question || q.text || "").trim(),
        type: "rating" as const,
        default_rating: typeof q.default_rating === "number" ? Math.min(5, Math.max(1, q.default_rating)) : 4,
        auto_answer_rationale: (q.auto_answer_rationale || "").trim(),
      }))
      .filter((q: any) => q.text.length > 0);

    // Merge: 3 fixed first, then dynamic
    const questions = [...FIXED_RESTAURANT_QUESTIONS, ...validatedDynamic];

    return NextResponse.json({ questions });

  } catch (error: any) {
    console.error("Generate questions error:", error);

    if (error.message?.includes("429") || error.status === 429) {
      return NextResponse.json(
        { error: "Rate limit hit. Wait a minute and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate questions." },
      { status: 500 }
    );
  }
}