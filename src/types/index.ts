// ── User & Auth ──────────────────────────────────────────────
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ── Business ─────────────────────────────────────────────────
export type BusinessCategory = "restaurant" | "teaching_session";

export type RestaurantSubCategory =
  | "cafe"
  | "fine_dining"
  | "pure_veg"
  | "fast_food"
  | "cloud_kitchen"
  | "food_truck"
  | "bakery"
  | "bar_lounge"
  | "buffet"
  | "other";

export type TeachingSubCategory =
  | "workshop"
  | "bootcamp"
  | "private_tuition"
  | "university_lecture"
  | "corporate_training"
  | "online_course"
  | "other";

export type BusinessSubCategory = RestaurantSubCategory | TeachingSubCategory;

/** Dropdown options for each category's sub-types */
export const SUBCATEGORY_OPTIONS: Record<BusinessCategory, { value: string; label: string }[]> = {
  restaurant: [
    { value: "cafe", label: "Café" },
    { value: "fine_dining", label: "Fine Dining" },
    { value: "pure_veg", label: "Pure Veg Restaurant" },
    { value: "fast_food", label: "Fast Food / QSR" },
    { value: "cloud_kitchen", label: "Cloud Kitchen" },
    { value: "food_truck", label: "Food Truck" },
    { value: "bakery", label: "Bakery & Patisserie" },
    { value: "bar_lounge", label: "Bar & Lounge" },
    { value: "buffet", label: "Buffet Restaurant" },
    { value: "other", label: "Other" },
  ],
  teaching_session: [
    { value: "workshop", label: "Workshop" },
    { value: "bootcamp", label: "Bootcamp" },
    { value: "private_tuition", label: "Private Tuition" },
    { value: "university_lecture", label: "University Lecture" },
    { value: "corporate_training", label: "Corporate Training" },
    { value: "online_course", label: "Online Course" },
    { value: "other", label: "Other" },
  ],
};

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  category: BusinessCategory;
  googlePlaceId?: string;
  googleAccountId?: string;
  googleLocationId?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  plan: "free" | "pro";
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Review ───────────────────────────────────────────────────
export interface Review {
  id: string;
  businessId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  generatedText: string;
  editedText?: string;
  postedToGoogle: boolean;
  postedAt?: string;
  createdAt: string;
}

// ── AI Generation ────────────────────────────────────────────
export interface GenerateReviewRequest {
  rating: 1 | 2 | 3 | 4 | 5;
  businessName: string;
  category: BusinessCategory;
  customContext?: string; // optional product/service name
}

export interface GenerateReviewResponse {
  reviewText: string;
  tone: string;
}

// ── Google Business ──────────────────────────────────────────
export interface PostReviewRequest {
  businessId: string;
  reviewText: string;
  rating: number;
}

export interface PostReviewResponse {
  success: boolean;
  reviewUrl?: string;
  error?: string;
}

// ── Dashboard Analytics ──────────────────────────────────────
export interface RatingTrend {
  date: string;
  avgRating: number;
  count: number;
}

export interface DashboardStats {
  totalReviews: number;
  avgRating: number;
  postedToGoogle: number;
  thisMonth: number;
  ratingTrends: RatingTrend[];
  ratingDistribution: { stars: number; count: number }[];
}

// ── Frictionless Review Experience ───────────────────────────

/** Which review mode the customer used */
export type ReviewMode = "standard" | "voice" | "express_emoji";

/** Analytics payload attached to every submission */
export interface ReviewAnalytics {
  review_mode: ReviewMode;
  time_to_completion_ms: number;
  recommended_rating: number;
  final_submitted_rating: number;
  qr_source: string | null;
  completion_rate: 1;
}

/** QR-code tracking parameters parsed from the public review URL */
export interface QRTrackingParams {
  source: string | null;       // ?source=qr_table
  table_number: string | null; // ?table=A12
}

/** Result returned by /api/process-voice */
export interface VoiceFeedbackResult {
  review_text: string;
  answers: Record<string, any>;
  generated_rating: number;
  sentiment: "positive" | "neutral" | "negative";
}

/** Emoji express-mode options */
export type EmojiChoice = "poor" | "okay" | "great" | "amazing";

export const EMOJI_SCORE_MAP: Record<EmojiChoice, number> = {
  poor: 2,
  okay: 3,
  great: 4,
  amazing: 5,
};

// ── Weekly AI Reports ─────────────────────────────────────────

/**
 * Compact aggregate object produced by calculateWeeklyMetrics().
 * Contains ONLY statistical aggregates — never raw customer text.
 */
export interface WeeklyMetrics {
  /** ISO date bounds used for the query */
  weekStart: string;
  weekEnd: string;

  /** Total reviews in the current window */
  totalReviewsThisWeek: number;
  /** Total reviews in the prior 7-day window */
  totalReviewsLastWeek: number;
  /** Percentage change vs last week (positive = growth) */
  reviewCountDeltaPercent: number;

  /** Mean overall star rating (1-5) */
  avgOverallRating: number;
  /** Mean of the highest-scored question/dimension (food proxy) */
  avgFoodRating: number | null;
  /** Mean of the mid-tier question/dimension (service proxy) */
  avgServiceRating: number | null;
  /** Mean of the third question/dimension (ambience proxy) */
  avgAmbienceRating: number | null;

  /** Reviews rated 4-5 stars */
  positiveCount: number;
  /** Reviews rated 1-3 stars */
  negativeCount: number;

  /** Tag/dimension with the highest average score */
  praisedTopic: string | null;
  /** Tag/dimension with the lowest average score */
  commonComplaint: string | null;

  /** Percentage of reviews that were also posted to Google */
  conversionRate: number;
}

/**
 * Strict shape the LLM must return.
 * Validated before persisting to the database.
 */
export interface WeeklyReportAIOutput {
  executive_summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[]; // 3-5 items
}

/**
 * Full WeeklyReport record (mirrors the Prisma model for client-side use).
 */
export interface WeeklyReport {
  id: string;
  businessId: string;
  weekStart: string;
  weekEnd: string;
  averageRating: number;
  totalReviews: number;
  structuredMetrics: WeeklyMetrics | null;
  aiSummary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  recommendations: string[] | null;
  pdfUrl: string | null;
  createdAt: string;
}
