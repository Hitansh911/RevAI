"use server";

import prisma from "@/lib/prisma";
import type { BusinessCategory } from "@/types";

// --- Users ---

export async function syncUserToDatabase(id: string, email: string, name?: string | null) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && existingUser.id !== id) {
    // The user logged in via Clerk, but their email is attached to an old Firebase ID.
    // We must migrate their business to the new Clerk ID.
    const business = await prisma.business.findUnique({ where: { ownerId: existingUser.id } });
    if (business) {
      await prisma.business.update({
        where: { ownerId: existingUser.id },
        data: { ownerId: id },
      });
    }
    
    // Delete the old user record so we can create the new one without email conflicts
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  return await prisma.user.upsert({
    where: { id },
    update: { email, name: name || undefined },
    create: { id, email, name: name || null },
  });
}

// --- Businesses ---

export async function saveBusinessProfile(
  ownerId: string, 
  name: string, 
  category: string, 
  questions?: any,
  city?: string,
  subCategory?: string,
  googleReviewUrl?: string
) {
  const business = await prisma.business.upsert({
    where: { ownerId },
    update: { name, category, questions, city, subCategory, googleReviewUrl },
    create: {
      id: ownerId, // Map id to ownerId so URLs like /review/[businessId] match the ownerId
      ownerId,
      name,
      category,
      questions,
      city,
      subCategory,
      googleReviewUrl,
      plan: "free",
    },
  });
  return business;
}

export async function getBusinessProfile(ownerId: string) {
  return await prisma.business.findUnique({
    where: { ownerId },
  });
}

// --- Reviews ---

export async function saveReview(businessId: string, rating: number, generatedText: string, postedToGoogle: boolean, answers?: any) {
  const review = await prisma.review.create({
    data: {
      businessId,
      rating,
      generatedText,
      postedToGoogle,
      postedAt: postedToGoogle ? new Date() : null,
      answers,
    },
  });

  // Increment review count on business
  await prisma.business.update({
    where: { id: businessId },
    data: { reviewCount: { increment: 1 } },
  });

  return review;
}

export async function getReviews(businessId: string) {
  return await prisma.review.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteReview(reviewId: string, businessId: string) {
  await prisma.review.delete({
    where: { id: reviewId },
  });

  await prisma.business.update({
    where: { id: businessId },
    data: { reviewCount: { decrement: 1 } },
  });
}

export async function getDashboardStats(ownerId: string) {
  const biz = await getBusinessProfile(ownerId);
  if (!biz) return null;
  const reviews = await getReviews(biz.id);
  
  const totalReviews = reviews.length;
  const postedToGoogle = reviews.filter(r => r.postedToGoogle).length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonth = reviews.filter(r => {
    const d = new Date(r.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const avgRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "—";

  // Compute rating distribution
  const ratingDistribution = [
    { stars: "1★", count: 0 },
    { stars: "2★", count: 0 },
    { stars: "3★", count: 0 },
    { stars: "4★", count: 0 },
    { stars: "5★", count: 0 },
  ];
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating - 1].count++;
    }
  });

  const ratingTrends = [
     { date: "Recent", avg: totalReviews > 0 ? Number(avgRating) : 0 }
  ];

  return {
    totalReviews,
    postedToGoogle,
    thisMonth,
    avgRating,
    ratingDistribution,
    ratingTrends
  };
}

export async function getWeeklyReports(businessId: string) {
  return await prisma.weeklyReport.findMany({
    where: { businessId },
    orderBy: { weekStart: "desc" },
  });
}

export async function deleteWeeklyReport(reportId: string, businessId: string) {
  // Ensure the report belongs to this business
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, businessId },
  });
  
  if (!report) {
    throw new Error("Report not found or unauthorized.");
  }
  
  await prisma.weeklyReport.delete({
    where: { id: reportId },
  });
}
