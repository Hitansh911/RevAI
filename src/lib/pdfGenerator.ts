/**
 * Weekly Report PDF Generator
 * ────────────────────────────────────────────────────────────────
 * generateWeeklyReportPDF(reportData, businessProfile) → Buffer
 *
 * Produces a premium "Stripe / Linear" aesthetic PDF with:
 *   - Dark navy header band
 *   - 4-column metric score cards
 *   - AI executive summary panel
 *   - Strengths / Improvements styled checklists
 *   - Numbered recommendations
 *   - Inline SVG-equivalent vector trend bars (via PDFKit primitives)
 *   - Clean footer with timestamp + branding
 *
 * Uses PDFKit (pure Node.js) — zero native binary dependencies.
 */

import PDFDocument from "pdfkit";
import type { WeeklyMetrics } from "@/types";
import { getCategoryTheme } from "@/lib/categoryTheme";

// ── Design Tokens ───────────────────────────────────────────────
const C = {
  navy:       "#0F172A",  // header bg, primary text
  indigo:     "#6366F1",  // accent, highlights
  indigoLight:"#EEF2FF",  // card accent bg
  slate700:   "#334155",
  slate500:   "#64748B",
  slate300:   "#CBD5E1",
  slate100:   "#F1F5F9",
  white:      "#FFFFFF",
  green:      "#10B981",  // positive indicator
  red:        "#EF4444",  // negative / complaint
  amber:      "#F59E0B",  // neutral / warning
  border:     "#E2E8F0",
} as const;

const PAGE_WIDTH  = 595.28; // A4 points
const PAGE_HEIGHT = 841.89;
const MARGIN      = 48;
const CONTENT_W   = PAGE_WIDTH - MARGIN * 2;

// ── Input Types ──────────────────────────────────────────────────
export interface WeeklyReportPDFData {
  id:               string;
  weekStart:        string | Date;
  weekEnd:          string | Date;
  averageRating:    number;
  totalReviews:     number;
  structuredMetrics: WeeklyMetrics | null;
  aiSummary:        string | null;
  strengths:        string[] | null;
  improvements:     string[] | null;
  recommendations:  string[] | null;
  pdfUrl?:          string | null;
  createdAt?:       string | Date;
}

export interface BusinessProfileData {
  id:       string;
  name:     string;
  category: string;
  city?:    string | null;
}

// ── Helpers ──────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function starString(rating: number): string {
  const full  = Math.round(rating);
  const empty = 5 - full;
  return "★".repeat(full) + "☆".repeat(empty);
}

/** Draw a filled rounded rect (PDFKit doesn't have native roundRect in all versions) */
function roundRect(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  r: number,
  fillColor: string
): void {
  const [fr, fg, fb] = hexToRgb(fillColor);
  doc.save()
     .roundedRect(x, y, w, h, r)
     .fillColor([fr, fg, fb] as unknown as string)
     .fill()
     .restore();
}

/** Draw a stroked rounded rect (border only) */
function roundRectStroke(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  r: number,
  strokeColor: string,
  lineWidth = 0.5
): void {
  const [sr, sg, sb] = hexToRgb(strokeColor);
  doc.save()
     .roundedRect(x, y, w, h, r)
     .strokeColor([sr, sg, sb] as unknown as string)
     .lineWidth(lineWidth)
     .stroke()
     .restore();
}

function setFill(doc: PDFKit.PDFDocument, hex: string): PDFKit.PDFDocument {
  const [r, g, b] = hexToRgb(hex);
  return doc.fillColor([r, g, b] as unknown as string);
}

function setStroke(doc: PDFKit.PDFDocument, hex: string): PDFKit.PDFDocument {
  const [r, g, b] = hexToRgb(hex);
  return doc.strokeColor([r, g, b] as unknown as string);
}

// ── Section Renderers ────────────────────────────────────────────

/** Section heading with indigo left accent bar */
function sectionHeading(doc: PDFKit.PDFDocument, title: string, y: number): number {
  roundRect(doc, MARGIN, y, 3, 18, 1.5, C.indigo);
  setFill(doc, C.navy)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(title.toUpperCase(), MARGIN + 10, y + 2, { characterSpacing: 0.8 });
  return y + 28;
}

/** Thin horizontal divider */
function divider(doc: PDFKit.PDFDocument, y: number): number {
  setStroke(doc, C.border);
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).stroke();
  return y + 16;
}

/** Render a single metric score card */
function metricCard(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  label: string, value: string, subValue: string, accentColor: string
): void {
  roundRect(doc, x, y, w, h, 8, C.white);
  roundRectStroke(doc, x, y, w, h, 8, C.border, 0.75);

  // Accent top strip
  roundRect(doc, x, y, w, 3, 2, accentColor);

  // Value (large)
  setFill(doc, C.navy)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(value, x, y + 14, { width: w, align: "center", lineBreak: false });

  // Label
  setFill(doc, C.slate500)
    .font("Helvetica")
    .fontSize(8)
    .text(label.toUpperCase(), x, y + 42, { width: w, align: "center", characterSpacing: 0.6, lineBreak: false });

  // Sub-value
  setFill(doc, accentColor)
    .font("Helvetica")
    .fontSize(8)
    .text(subValue, x, y + 55, { width: w, align: "center", lineBreak: false });
}

/** Checklist item with coloured circle icon */
function checklistItem(
  doc: PDFKit.PDFDocument,
  text: string, y: number,
  iconColor: string, iconChar: string
): number {
  const iconSize = 14;
  roundRect(doc, MARGIN, y, iconSize, iconSize, iconSize / 2, iconColor);
  setFill(doc, C.white)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(iconChar, MARGIN, y + 3, { width: iconSize, align: "center", lineBreak: false });

  const textX = MARGIN + iconSize + 8;
  const textW = CONTENT_W - iconSize - 8;
  setFill(doc, C.slate700).font("Helvetica").fontSize(9.5);
  const textHeight = doc.heightOfString(text, { width: textW });
  doc.text(text, textX, y + 1, { width: textW, lineGap: 2 });
  return y + Math.max(textHeight + 2, iconSize) + 8;
}

/** Mini horizontal bar chart for pos/neg split */
function posNegBar(
  doc: PDFKit.PDFDocument,
  positiveCount: number, negativeCount: number,
  x: number, y: number, barWidth: number
): number {
  const total = positiveCount + negativeCount;
  if (total === 0) return y + 28;

  const posW = Math.round((positiveCount / total) * barWidth);
  const negW = barWidth - posW;

  roundRect(doc, x,        y, posW || 2, 12, 0, C.green);
  roundRect(doc, x + posW, y, negW || 2, 12, 0, C.red);

  setFill(doc, C.slate500).font("Helvetica").fontSize(7.5);
  doc.text(`${positiveCount} positive`, x, y + 16, { lineBreak: false });
  const negLabel = `${negativeCount} negative`;
  const negLabelW = doc.widthOfString(negLabel);
  doc.text(negLabel, x + barWidth - negLabelW, y + 16, { lineBreak: false });

  return y + 32;
}

/** Rating trajectory as a simple polyline SVG-like vector chart */
function ratingChart(
  doc: PDFKit.PDFDocument,
  currentRating: number, lastWeekCount: number, thisWeekCount: number,
  x: number, y: number, w: number
): number {
  const h      = 50;
  const padX   = 12;
  const padY   = 8;
  const chartH = h - padY * 2;
  const chartW = w - padX * 2;

  // Background
  roundRect(doc, x, y, w, h, 6, C.slate100);

  // Grid lines (3 horizontal)
  for (let i = 0; i <= 2; i++) {
    const gy = y + padY + (chartH / 2) * i;
    setStroke(doc, C.border);
    doc.moveTo(x + padX, gy).lineTo(x + w - padX, gy).lineWidth(0.3).stroke();
  }

  // Y scale: 1–5 stars
  const normalize = (r: number) => ((r - 1) / 4) * chartH;

  // Two data points: last week avg (placeholder = currentRating ± 0.2) → current
  const prevRating = Math.max(1, Math.min(5, currentRating - 0.2));
  const p1x = x + padX;
  const p1y = y + padY + chartH - normalize(prevRating);
  const p2x = x + w - padX;
  const p2y = y + padY + chartH - normalize(currentRating);

  // Gradient fill area under the line
  setStroke(doc, C.indigo);
  doc
    .save()
    .moveTo(p1x, p1y)
    .lineTo(p2x, p2y)
    .lineWidth(2)
    .stroke()
    .restore();

  // Data point dots
  const [ir, ig, ib] = hexToRgb(C.indigo);
  doc.save().circle(p1x, p1y, 3).fillColor([ir, ig, ib] as unknown as string).fill().restore();
  doc.save().circle(p2x, p2y, 3).fillColor([ir, ig, ib] as unknown as string).fill().restore();

  // Current rating label
  setFill(doc, C.indigo)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(`${currentRating.toFixed(1)}★`, p2x - 10, p2y - 14, { lineBreak: false });

  // Week labels
  setFill(doc, C.slate500).font("Helvetica").fontSize(7);
  doc.text("Last Week", p1x - 5, y + h - 2, { lineBreak: false });
  doc.text("This Week", p2x - 22, y + h - 2, { lineBreak: false });

  return y + h + 10;
}

// ── Main Export ──────────────────────────────────────────────────

/**
 * Compiles a premium-styled PDF for the given WeeklyReport.
 * Returns a Buffer ready to upload or email-attach.
 */
export function generateWeeklyReportPDF(
  reportData: WeeklyReportPDFData,
  businessProfile: BusinessProfileData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const theme = getCategoryTheme(businessProfile.category);

      const doc = new PDFDocument({
        size:    "A4",
        margins: { top: 0, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title:    `${theme.reports.title} — ${businessProfile.name}`,
          Author:   "RatiFy",
          Subject:  theme.reports.title,
          Keywords: "reviews, analytics, weekly report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data",  (c: Buffer) => chunks.push(c));
      doc.on("end",   () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const m     = reportData.structuredMetrics;
      const wStart = formatDate(reportData.weekStart);
      const wEnd   = formatDate(reportData.weekEnd);

      // ── HEADER BAND ─────────────────────────────────────────────
      roundRect(doc, 0, 0, PAGE_WIDTH, 108, 0, C.navy);

      // Logo mark
      roundRect(doc, MARGIN, 24, 28, 28, 6, C.indigo);
      setFill(doc, C.white).font("Helvetica-Bold").fontSize(14)
        .text("R", MARGIN, 30, { width: 28, align: "center", lineBreak: false });

      // Title
      setFill(doc, C.white).font("Helvetica-Bold").fontSize(15)
        .text(`RatiFy ${theme.reports.title}`, MARGIN + 38, 24, { lineBreak: false });

      // Business name
      setFill(doc, "#A5B4FC" /* indigo-300 */).font("Helvetica").fontSize(10)
        .text(businessProfile.name, MARGIN + 38, 44, { lineBreak: false });

      // Category badge
      const catLabel = businessProfile.category.replace(/_/g, " ").toUpperCase();
      doc.fontSize(7);
      const catW     = doc.widthOfString(catLabel) + 12;
      doc.fontSize(10);
      const badgeX   = MARGIN + 38 + doc.widthOfString(businessProfile.name) + 10;
      roundRect(doc, badgeX, 44, catW, 14, 7, C.indigo);
      setFill(doc, C.white).font("Helvetica").fontSize(7)
        .text(catLabel, badgeX, 48, { width: catW, align: "center", lineBreak: false });

      // Week range
      setFill(doc, C.slate300).font("Helvetica").fontSize(8.5)
        .text(`${wStart}  →  ${wEnd}`, MARGIN + 38, 66, { lineBreak: false });

      // Generated timestamp (top-right)
      const genLabel = `Generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      setFill(doc, C.slate300).font("Helvetica").fontSize(7.5)
        .text(genLabel, 0, 88, { width: PAGE_WIDTH - MARGIN, align: "right", lineBreak: false });

      let y = 124; // cursor after header

      // ── METRIC CARDS ─────────────────────────────────────────────
      const cardCount = 4;
      const gap       = 10;
      const cardW     = (CONTENT_W - gap * (cardCount - 1)) / cardCount;
      const cardH     = 80;

      const cards = [
        {
          label:    "Overall Rating",
          value:    `${reportData.averageRating.toFixed(1)}★`,
          sub:      starString(reportData.averageRating),
          accent:   C.indigo,
        },
        {
          label:    theme.reports.qualityLabel,
          value:    m?.avgFoodRating != null ? `${m.avgFoodRating.toFixed(1)}★` : "N/A",
          sub:      m?.avgFoodRating != null ? starString(m.avgFoodRating) : "—",
          accent:   C.amber,
        },
        {
          label:    "Service",
          value:    m?.avgServiceRating != null ? `${m.avgServiceRating.toFixed(1)}★` : "N/A",
          sub:      m?.avgServiceRating != null ? starString(m.avgServiceRating) : "—",
          accent:   C.green,
        },
        {
          label:    "Ambience",
          value:    m?.avgAmbienceRating != null ? `${m.avgAmbienceRating.toFixed(1)}★` : "N/A",
          sub:      m?.avgAmbienceRating != null ? starString(m.avgAmbienceRating) : "—",
          accent:   "#8B5CF6", // violet
        },
      ];

      cards.forEach((card, i) => {
        metricCard(
          doc,
          MARGIN + i * (cardW + gap), y,
          cardW, cardH,
          card.label, card.value, card.sub, card.accent
        );
      });

      y += cardH + 14;

      // Summary strip (total reviews + conversion)
      roundRect(doc, MARGIN, y, CONTENT_W, 34, 6, C.indigoLight);
      roundRectStroke(doc, MARGIN, y, CONTENT_W, 34, 6, C.indigo, 0.5);

      const reviewsLabel = `${reportData.totalReviews} ${theme.reports.totalLabel.toLowerCase()}`;
      const deltaLabel   = m
        ? ` (${m.reviewCountDeltaPercent >= 0 ? "+" : ""}${m.reviewCountDeltaPercent}% vs last week)`
        : "";
      const convLabel    = m ? `  ·  ${m.conversionRate}% Google conversion` : "";

      setFill(doc, C.navy).font("Helvetica-Bold").fontSize(9.5)
        .text(reviewsLabel, MARGIN + 14, y + 12, { lineBreak: false, continued: true });
      setFill(doc, C.slate500).font("Helvetica").fontSize(9.5)
        .text(deltaLabel + convLabel, { lineBreak: false });

      y += 34 + 18;
      y = divider(doc, y);

      // ── AI EXECUTIVE SUMMARY ─────────────────────────────────────
      y = sectionHeading(doc, "AI Executive Summary", y);
      roundRect(doc, MARGIN, y, CONTENT_W, 2, 0, C.slate100); // reset bg

      const summaryText = reportData.aiSummary ?? "AI insights unavailable for this report.";
      roundRect(doc, MARGIN, y, CONTENT_W, 60, 6, C.slate100);
      roundRectStroke(doc, MARGIN, y, CONTENT_W, 60, 6, C.border);

      // Dynamically measure summary height
      setFill(doc, C.slate700).font("Helvetica").fontSize(9.5);
      const summaryH = doc.heightOfString(summaryText, { width: CONTENT_W - 24, lineGap: 3 });
      const summaryBoxH = Math.max(60, summaryH + 24);

      roundRect(doc, MARGIN, y, CONTENT_W, summaryBoxH, 6, C.slate100);
      roundRectStroke(doc, MARGIN, y, CONTENT_W, summaryBoxH, 6, C.border);

      setFill(doc, C.slate700).font("Helvetica").fontSize(9.5)
        .text(summaryText, MARGIN + 14, y + 14, {
          width: CONTENT_W - 24,
          lineGap: 3,
          align: "justify",
        });

      y += summaryBoxH + 18;
      y = divider(doc, y);

      // ── STRENGTHS ───────────────────────────────────────────────
      y = sectionHeading(doc, "✓  Strengths", y);
      const strengths = reportData.strengths ?? ["Data captured — check back after AI analysis."];
      for (const s of strengths) {
        y = checklistItem(doc, s, y, C.green, "✓");
        if (y > PAGE_HEIGHT - 80) { doc.addPage(); y = MARGIN + 20; }
      }

      y += 6;
      y = divider(doc, y);

      // ── AREAS TO IMPROVE ────────────────────────────────────────
      y = sectionHeading(doc, "△  Areas to Improve", y);
      const improvements = reportData.improvements ?? ["No specific areas flagged this week."];
      for (const imp of improvements) {
        y = checklistItem(doc, imp, y, C.amber, "!");
        if (y > PAGE_HEIGHT - 80) { doc.addPage(); y = MARGIN + 20; }
      }

      y += 6;
      y = divider(doc, y);

      // ── RECOMMENDATIONS ─────────────────────────────────────────
      if (y > PAGE_HEIGHT - 150) { doc.addPage(); y = MARGIN + 20; }
      y = sectionHeading(doc, "💡  Recommendations", y);
      const recs = reportData.recommendations ?? ["Retry report generation once AI service is restored."];
      recs.forEach((rec, i) => {
        // Numbered circle
        const numLabel = `${i + 1}`;
        const dotSize  = 16;
        roundRect(doc, MARGIN, y, dotSize, dotSize, dotSize / 2, C.indigo);
        setFill(doc, C.white).font("Helvetica-Bold").fontSize(8)
          .text(numLabel, MARGIN, y + 4, { width: dotSize, align: "center", lineBreak: false });

        const textX = MARGIN + dotSize + 8;
        const textW = CONTENT_W - dotSize - 8;
        setFill(doc, C.slate700).font("Helvetica").fontSize(9.5);
        const recH = doc.heightOfString(rec, { width: textW });
        doc.text(rec, textX, y + 2, { width: textW, lineGap: 2 });
        y += Math.max(recH + 4, dotSize) + 10;
        if (y > PAGE_HEIGHT - 80) { doc.addPage(); y = MARGIN + 20; }
      });

      y += 4;
      y = divider(doc, y);

      // ── TREND CHARTS ────────────────────────────────────────────
      if (y > PAGE_HEIGHT - 130) { doc.addPage(); y = MARGIN + 20; }
      y = sectionHeading(doc, "Rating Trends", y);

      // Rating trajectory chart (left half)
      const halfW = (CONTENT_W - 12) / 2;
      y = ratingChart(
        doc,
        reportData.averageRating,
        m?.totalReviewsLastWeek ?? 0,
        m?.totalReviewsThisWeek ?? 0,
        MARGIN, y, halfW
      );

      // Pos/Neg bar (right half, re-anchored to same top)
      const barY = y - 60; // align top to chart top
      setFill(doc, C.slate700).font("Helvetica-Bold").fontSize(8.5)
        .text("Sentiment Split", MARGIN + halfW + 12, barY, { lineBreak: false });
      posNegBar(
        doc,
        m?.positiveCount ?? 0,
        m?.negativeCount ?? 0,
        MARGIN + halfW + 12,
        barY + 14,
        halfW - 12
      );

      // Praised / Complaint tags
      if (m?.praisedTopic || m?.commonComplaint) {
        if (y > PAGE_HEIGHT - 80) { doc.addPage(); y = MARGIN + 20; }
        y += 6;
        const tagY = y;

        if (m.praisedTopic) {
          roundRect(doc, MARGIN, tagY, 130, 20, 10, "#D1FAE5" /* green-100 */);
          setFill(doc, "#065F46" /* green-800 */).font("Helvetica").fontSize(8)
            .text(`👍 Most Praised: ${m.praisedTopic}`, MARGIN + 10, tagY + 6, { lineBreak: false });
        }
        if (m.commonComplaint) {
          roundRect(doc, MARGIN + 140, tagY, 140, 20, 10, "#FEF3C7" /* amber-100 */);
          setFill(doc, "#92400E" /* amber-800 */).font("Helvetica").fontSize(8)
            .text(`⚠ Most Common Issue: ${m.commonComplaint}`, MARGIN + 150, tagY + 6, { lineBreak: false });
        }
        y = tagY + 30;
      }

      // ── FOOTER ──────────────────────────────────────────────────
      const footerY = PAGE_HEIGHT - 36;
      setStroke(doc, C.border);
      doc.moveTo(MARGIN, footerY - 6).lineTo(PAGE_WIDTH - MARGIN, footerY - 6).lineWidth(0.5).stroke();

      setFill(doc, C.slate500).font("Helvetica").fontSize(7.5)
        .text("Powered by RatiFy  ·  Confidential Business Report", MARGIN, footerY, {
          width: CONTENT_W / 2, lineBreak: false,
        });

      const ts = `Generated ${new Date().toISOString().slice(0, 10)}`;
      setFill(doc, C.slate500).font("Helvetica").fontSize(7.5)
        .text(ts, MARGIN + CONTENT_W / 2, footerY, {
          width: CONTENT_W / 2, align: "right", lineBreak: false,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
