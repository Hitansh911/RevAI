/**
 * Firebase Storage Admin — Server-side PDF uploader
 * ─────────────────────────────────────────────────
 * Initialises the Firebase Admin SDK as a singleton and exposes
 * `uploadPDFToStorage()` to save PDF buffers under:
 *   weekly-reports/{businessId}/{weekStart}.pdf
 *
 * Returns a long-lived signed URL (10 years) that is written
 * into the WeeklyReport.pdfUrl column.
 */

import { getApps, initializeApp, cert, type App, type ServiceAccount } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// ── Singleton initialisation ────────────────────────────────────
function getAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey: privateKey!,
  };

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

/**
 * Uploads a PDF buffer to Firebase Storage.
 *
 * @param buffer     - Raw PDF bytes from generateWeeklyReportPDF()
 * @param businessId - Business ID (used as directory name)
 * @param weekStart  - ISO date string (e.g. "2024-01-01") used as filename
 * @returns Publicly accessible download URL (signed, 10-year expiry)
 */
export async function uploadPDFToStorage(
  buffer: Buffer,
  businessId: string,
  weekStart: string
): Promise<string> {
  const app = getAdminApp();
  const bucket = getStorage(app).bucket();

  // Sanitise weekStart to a safe filename token
  const safeDate = weekStart.slice(0, 10).replace(/[^0-9-]/g, "");
  const destinationPath = `weekly-reports/${businessId}/${safeDate}.pdf`;

  const file = bucket.file(destinationPath);

  await file.save(buffer, {
    metadata: {
      contentType: "application/pdf",
      cacheControl: "public, max-age=31536000",
    },
  });

  // Generate a signed URL valid for ~10 years
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  });

  return signedUrl;
}
