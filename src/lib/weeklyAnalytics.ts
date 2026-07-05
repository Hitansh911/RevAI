/**
 * Weekly Analytics Engine
 * ────────────────────────────────────────────────────────────────
 * calculateWeeklyMetrics(businessId, startDate, endDate)
 *
 * Queries the existing `reviews` table for the given business and
 * date window. Returns a compact WeeklyMetrics object of pure
 * statistical aggregates — NO raw customer text is ever included.
 *
 * Category-dimension extraction strategy:
 *   - Reviews store Q&A pairs in `answers Json?` as
 *       [{ question: "How was the food?", answer: "4" }, ...]
 *   - We scan question text for keyword buckets (food / service /
 *     ambience) to build per-dimension averages.
 *   - If the business is NOT a restaurant (or answers are absent),
 *     the engine falls back to generic "highest / lowest scored
 *     topic" labels so it works across all business categories.
 */

import prisma from "@/lib/prisma";
import type { WeeklyMetrics } from "@/types";

// ── Keyword buckets for category detection ──────────────────────
const FOOD_KEYWORDS = ["food", "dish", "meal", "taste", "menu", "cuisine", "flavou", "flavor", "portion", "ingredient"];
const SERVICE_KEYWORDS = ["service", "staff", "waiter", "server", "host", "attentive", "friendly", "helpful", "speed", "wait"];
const AMBIENCE_KEYWORDS = ["ambience", "ambiance", "atmosphere", "decor", "seating", "noise", "music", "lighting", "vibe", "environment"];

/** Parse a numeric answer value from a Q&A answer string (e.g. "4", "4/5", "Good (4)") */
function parseAnswerScore(answer: unknown): number | null {
  if (typeof answer === "number") return answer >= 1 && answer <= 5 ? answer : null;
  if (typeof answer === "string") {
    const match = answer.match(/\b([1-5])\b/);
    return match ? Number(match[1]) : null;
  }
  return null;
}

/** Returns which keyword bucket a question belongs to (or null) */
function classifyQuestion(question: string): "food" | "service" | "ambience" | null {
  const q = question.toLowerCase();
  if (FOOD_KEYWORDS.some((k) => q.includes(k))) return "food";
  if (SERVICE_KEYWORDS.some((k) => q.includes(k))) return "service";
  if (AMBIENCE_KEYWORDS.some((k) => q.includes(k))) return "ambience";
  return null;
}

interface DimensionAccumulator {
  sum: number;
  count: number;
}

interface RawDimensions {
  food: DimensionAccumulator;
  service: DimensionAccumulator;
  ambience: DimensionAccumulator;
  /** Catch-all for questions that didn't match any keyword bucket */
  generic: Record<string, DimensionAccumulator>;
}

function emptyDimensions(): RawDimensions {
  return {
    food: { sum: 0, count: 0 },
    service: { sum: 0, count: 0 },
    ambience: { sum: 0, count: 0 },
    generic: {},
  };
}

function safeAvg(acc: DimensionAccumulator): number | null {
  return acc.count > 0 ? Math.round((acc.sum / acc.count) * 100) / 100 : null;
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculates all weekly aggregate metrics for a given business and date range.
 *
 * @param businessId - The `Business.id` (= ownerId in the current schema)
 * @param startDate  - Start of the reporting window (inclusive)
 * @param endDate    - End of the reporting window (inclusive)
 */
export async function calculateWeeklyMetrics(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<WeeklyMetrics> {
  // ── 1. Fetch current-window reviews ──────────────────────────
  const currentReviews = await prisma.review.findMany({
    where: {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      rating: true,
      overall_rating: true,
      postedToGoogle: true,
      answers: true,
    },
  });

  // ── 2. Fetch prior-week reviews for WoW delta ────────────────
  const priorStart = new Date(startDate);
  priorStart.setDate(priorStart.getDate() - 7);
  const priorEnd = new Date(startDate);
  priorEnd.setMilliseconds(priorEnd.getMilliseconds() - 1);

  const priorReviews = await prisma.review.findMany({
    where: {
      businessId,
      createdAt: { gte: priorStart, lte: priorEnd },
    },
    select: { rating: true },
  });

  // ── 3. Basic counts ──────────────────────────────────────────
  const totalThisWeek = currentReviews.length;
  const totalLastWeek = priorReviews.length;

  const reviewCountDeltaPercent =
    totalLastWeek === 0
      ? totalThisWeek > 0 ? 100 : 0
      : round2(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100);

  // ── 4. Overall rating mean ───────────────────────────────────
  let ratingSum = 0;
  let ratingCount = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let postedCount = 0;

  for (const r of currentReviews) {
    // Use overall_rating if available, fall back to rating
    const score = r.overall_rating ?? r.rating;
    ratingSum += score;
    ratingCount++;

    if (score >= 4) positiveCount++;
    else negativeCount++;

    if (r.postedToGoogle) postedCount++;
  }

  const avgOverallRating =
    ratingCount > 0 ? round2(ratingSum / ratingCount) : 0;

  const conversionRate =
    totalThisWeek > 0 ? round2((postedCount / totalThisWeek) * 100) : 0;

  // ── 5. Category-dimension aggregation ───────────────────────
  const dims = emptyDimensions();

  for (const r of currentReviews) {
    if (!r.answers || !Array.isArray(r.answers)) continue;

    for (const qa of r.answers as { question?: unknown; answer?: unknown }[]) {
      const question = typeof qa.question === "string" ? qa.question : "";
      const score = parseAnswerScore(qa.answer);
      if (score === null || !question) continue;

      const bucket = classifyQuestion(question);

      if (bucket === "food") {
        dims.food.sum += score;
        dims.food.count++;
      } else if (bucket === "service") {
        dims.service.sum += score;
        dims.service.count++;
      } else if (bucket === "ambience") {
        dims.ambience.sum += score;
        dims.ambience.count++;
      } else {
        // Generic bucket keyed by a normalised question label
        const label = question.trim().slice(0, 60);
        if (!dims.generic[label]) dims.generic[label] = { sum: 0, count: 0 };
        dims.generic[label].sum += score;
        dims.generic[label].count++;
      }
    }
  }

  const avgFoodRating = safeAvg(dims.food);
  const avgServiceRating = safeAvg(dims.service);
  const avgAmbienceRating = safeAvg(dims.ambience);

  // ── 6. Praised topic & common complaint ─────────────────────
  // Build a flat score map of all resolvable dimensions
  const scoreMap: Record<string, number> = {};

  if (avgFoodRating !== null) scoreMap["Food"] = avgFoodRating;
  if (avgServiceRating !== null) scoreMap["Service"] = avgServiceRating;
  if (avgAmbienceRating !== null) scoreMap["Ambience"] = avgAmbienceRating;

  for (const [label, acc] of Object.entries(dims.generic)) {
    const avg = safeAvg(acc);
    if (avg !== null) scoreMap[label] = avg;
  }

  let praisedTopic: string | null = null;
  let commonComplaint: string | null = null;

  if (Object.keys(scoreMap).length > 0) {
    const sorted = Object.entries(scoreMap).sort(([, a], [, b]) => b - a);
    praisedTopic = sorted[0][0];
    commonComplaint = sorted[sorted.length - 1][0];
    // Only report a complaint if it genuinely scores lower than the top
    if (praisedTopic === commonComplaint) commonComplaint = null;
  }

  // ── 7. Return clean metrics object ──────────────────────────
  return {
    weekStart: startDate.toISOString(),
    weekEnd: endDate.toISOString(),
    totalReviewsThisWeek: totalThisWeek,
    totalReviewsLastWeek: totalLastWeek,
    reviewCountDeltaPercent,
    avgOverallRating,
    avgFoodRating,
    avgServiceRating,
    avgAmbienceRating,
    positiveCount,
    negativeCount,
    praisedTopic,
    commonComplaint,
    conversionRate,
  };
}
