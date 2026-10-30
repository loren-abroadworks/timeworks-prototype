import type { NextRequest } from "next/server";
import { respond, respondWrite } from "@/mock/http";
import { screenshotViews, trackView } from "@/mock/screenshots";

/**
 * POST /api/v1/track-screenshot-detail-view/{org}?captured_at&timezone&user_id — body {}.
 * Fired when the screenshot lightbox shows a screenshot (view audit). Stored in memory only.
 */
export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return respondWrite(req, () => trackView({ captured_at: sp.get("captured_at"), timezone: sp.get("timezone"), user_id: sp.get("user_id") }));
}

/** GET — the views recorded so far (replica helper for tests). */
export async function GET(req: NextRequest) {
  return respond(req, () => ({ status: "success", data: screenshotViews() }));
}
