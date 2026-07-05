/**
 * Weekly Report AI Prompt Utility
 * ────────────────────────────────────────────────────────────────
 * generateWeeklyReportAI(metrics: WeeklyMetrics)
 *
 * Accepts ONLY the compact WeeklyMetrics aggregate object.
 * Never passes raw customer review text to the LLM.
 *
 * Returns a WeeklyReportAIOutput object — always.
 * If the LLM is unavailable (timeout, 429, parse failure, network
 * error), the catch block intercepts the crash and returns
 * well-formed fallback defaults so the DB row can be created
 * without interruption.
 */

import OpenAI from "openai";
import type { WeeklyMetrics, WeeklyReportAIOutput } from "@/types";

// ── Groq client — lazy getter to avoid top-level instantiation ──────
// Prevents Next.js build-time crash when GROQ_API_KEY is not in the
// build environment (only needed at request-time, not build-time).
function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

// ── Fallback defaults returned on any LLM failure ────────────────
export const WEEKLY_REPORT_FALLBACK: WeeklyReportAIOutput = {
  executive_summary: "AI insights unavailable for this report. Aggregate metrics are still captured below.",
  strengths: ["Data captured — AI narrative will be available once the service recovers."],
  improvements: ["AI analysis could not be completed for this period."],
  recommendations: [
    "Retry generating the report once the AI service is restored.",
    "Review the structured metrics below for manual analysis.",
    "Ensure your Groq API key is valid and within rate limits.",
  ],
};

// ── System prompt (tightly scoped — JSON-only output) ────────────
const SYSTEM_PROMPT =
  "You are a precise business analytics assistant. You ALWAYS return valid JSON and nothing else. " +
  "No markdown, no prose, no code fences — only a raw JSON object.";

/**
 * Builds the user-facing prompt from the WeeklyMetrics aggregate.
 * All values are numeric aggregates — no customer text is included.
 */
function buildPrompt(m: WeeklyMetrics): string {
  const delta =
    m.reviewCountDeltaPercent >= 0
      ? `+${m.reviewCountDeltaPercent}%`
      : `${m.reviewCountDeltaPercent}%`;

  const categoryLines = [
    m.avgFoodRating !== null ? `  • Food quality avg:     ${m.avgFoodRating}/5` : null,
    m.avgServiceRating !== null ? `  • Service avg:          ${m.avgServiceRating}/5` : null,
    m.avgAmbienceRating !== null ? `  • Ambience avg:         ${m.avgAmbienceRating}/5` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are preparing a concise weekly performance report for a business owner.

Below are the ONLY data points you have access to — interpret them as an expert hospitality analyst:

WEEKLY AGGREGATE DATA:
  Period:                 ${m.weekStart.slice(0, 10)} → ${m.weekEnd.slice(0, 10)}
  Reviews this week:      ${m.totalReviewsThisWeek}
  Reviews last week:      ${m.totalReviewsLastWeek}  (WoW change: ${delta})
  Overall avg rating:     ${m.avgOverallRating}/5
${categoryLines}
  Positive (4-5★):        ${m.positiveCount}
  Negative (1-3★):        ${m.negativeCount}
  Most praised area:      ${m.praisedTopic ?? "N/A"}
  Most common complaint:  ${m.commonComplaint ?? "N/A"}
  Google conversion rate: ${m.conversionRate}%

Return EXACTLY this JSON structure (no extra keys, no markdown):
{
  "executive_summary": "<2-3 sentence professional overview of this week's performance and guest sentiment>",
  "strengths": [
    "<specific strength inferred from the data>",
    "<second strength>"
  ],
  "improvements": [
    "<specific area requiring attention, inferred from the data>",
    "<second improvement area>"
  ],
  "recommendations": [
    "<actionable recommendation #1>",
    "<actionable recommendation #2>",
    "<actionable recommendation #3>"
  ]
}

Rules:
- executive_summary: exactly 2-3 sentences, professional tone.
- strengths: 2-4 items.
- improvements: 2-4 items.
- recommendations: exactly 3-5 items, each directly actionable.
- Reference the numeric data — do NOT invent facts.
- Output ONLY the JSON object.`;
}

/**
 * Validates the parsed LLM response matches our required schema.
 * Throws if critical fields are missing.
 */
function validateAIOutput(raw: unknown): WeeklyReportAIOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("AI returned a non-object response.");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.executive_summary !== "string" || !obj.executive_summary.trim()) {
    throw new Error("Missing or empty executive_summary.");
  }
  if (!Array.isArray(obj.strengths) || obj.strengths.length < 1) {
    throw new Error("Missing or empty strengths array.");
  }
  if (!Array.isArray(obj.improvements) || obj.improvements.length < 1) {
    throw new Error("Missing or empty improvements array.");
  }
  if (
    !Array.isArray(obj.recommendations) ||
    obj.recommendations.length < 3 ||
    obj.recommendations.length > 5
  ) {
    throw new Error("recommendations must contain 3-5 items.");
  }

  return {
    executive_summary: obj.executive_summary,
    strengths: obj.strengths as string[],
    improvements: obj.improvements as string[],
    recommendations: obj.recommendations as string[],
  };
}

/**
 * Calls the Groq LLM with the compact metrics object.
 *
 * ✅ ALWAYS resolves — never rejects.
 * On any failure (network error, 429 rate-limit, timeout, invalid
 * JSON, schema validation error) the catch block returns
 * WEEKLY_REPORT_FALLBACK so the upstream DB write is never blocked.
 *
 * @param metrics - Pre-calculated WeeklyMetrics from calculateWeeklyMetrics()
 * @param timeoutMs - Optional per-request timeout in milliseconds (default: 20s)
 */
export async function generateWeeklyReportAI(
  metrics: WeeklyMetrics,
  timeoutMs = 20_000
): Promise<WeeklyReportAIOutput & { _aiAvailable: boolean }> {
  try {
    // Abort signal for timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let rawContent: string;

    try {
      const response = await getGroqClient().chat.completions.create(
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(metrics) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3, // Low temperature for deterministic, factual output
          max_tokens: 512,
        },
        { signal: controller.signal as AbortSignal }
      );
      rawContent = response.choices[0]?.message?.content?.trim() ?? "{}";
    } finally {
      clearTimeout(timer);
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(`LLM returned unparseable JSON: ${rawContent.slice(0, 200)}`);
    }

    // Validate schema
    const validated = validateAIOutput(parsed);

    return { ...validated, _aiAvailable: true };
  } catch (error: unknown) {
    // ── Graceful fallback ─────────────────────────────────────
    // Log the failure for observability but do NOT rethrow.
    // The caller can check `_aiAvailable` to know if LLM succeeded.
    const message =
      error instanceof Error ? error.message : "Unknown AI error";
    console.warn("[WeeklyReport] AI generation failed — using fallback defaults.", message);

    return { ...WEEKLY_REPORT_FALLBACK, _aiAvailable: false };
  }
}
