// ── Category Theme Configuration ──────────────────────────────
// A pure config map that drives all category-aware UI labels,
// metric names, headings, icons, and accent colors across the app.

export interface CategoryTheme {
  /** Dashboard greeting subtitle */
  dashboardTitle: string;
  /** Setup page description text */
  setupSubtext: string;
  /** Metric card labels */
  metrics: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  /** Public review page heading */
  reviewHeading: string;
  /** Public review page star-tap subtext */
  reviewSubtext: string;
  /** Default question count for AI generation */
  questionCount: number;
  /** Lucide icon key identifier */
  iconKey: "utensils" | "graduation-cap";
  /** Emoji shown on the review page */
  emoji: string;
  /** Primary accent color (hex) */
  accentColor: string;
  /** Accent gradient CSS */
  accentGradient: string;
  /** Settings page subtext */
  settingsSubtext: string;
  /** Report specific branding strings */
  reports: {
    title: string;
    totalLabel: string;
    qualityLabel: string;
  };
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  restaurant: {
    dashboardTitle: "Restaurant Analytics Hub",
    setupSubtext:
      "Configure your food station, cafe, or cloud kitchen profile.",
    metrics: {
      primary: "Total Diners",
      secondary: "Food Quality Rating",
      tertiary: "Table Turnover Rate",
    },
    reviewHeading: "How was your dining experience?",
    reviewSubtext: "Tap a star to rate your meal at",
    questionCount: 5,
    iconKey: "utensils",
    emoji: "⭐",
    accentColor: "#7c3aed",
    accentGradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    settingsSubtext:
      "Manage your restaurant profile, menu context, and feedback questions.",
    reports: {
      title: "Weekly Restaurant Performance Report",
      totalLabel: "Total Diners This Week",
      qualityLabel: "Food Quality Metrics",
    },
  },

  teaching_session: {
    dashboardTitle: "Academic & Session Insights",
    setupSubtext:
      "Configure your classroom, bootcamp, or workshop profile.",
    metrics: {
      primary: "Total Students",
      secondary: "Concept Clarity Score",
      tertiary: "Engagement Rate",
    },
    reviewHeading: "How was your learning session?",
    reviewSubtext: "Tap a star to rate your session with",
    questionCount: 10,
    iconKey: "graduation-cap",
    emoji: "📝",
    accentColor: "#2563eb",
    accentGradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    settingsSubtext:
      "Manage your session profile, curriculum context, and feedback questions.",
    reports: {
      title: "Weekly Session Performance Report",
      totalLabel: "Total Students This Week",
      qualityLabel: "Concept Clarity Analytics",
    },
  },
};

/**
 * Returns the full theme config for the given category.
 * Falls back to `restaurant` for any unknown category.
 */
export function getCategoryTheme(category: string | null | undefined): CategoryTheme {
  if (category && CATEGORY_THEMES[category]) {
    return CATEGORY_THEMES[category];
  }
  return CATEGORY_THEMES.restaurant;
}
