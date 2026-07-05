import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getRatingLabel(rating: number): string {
  const labels: Record<number, string> = {
    1: "Very Dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very Satisfied",
  };
  return labels[rating] ?? "Unknown";
}

export function getToneFromRating(rating: number): string {
  if (rating === 1) return "frustrated and disappointed";
  if (rating === 2) return "somewhat dissatisfied";
  if (rating === 3) return "neutral and balanced";
  if (rating === 4) return "satisfied and positive";
  return "enthusiastic and delighted";
}
